package handler

import (
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	goperm "github.com/wtiger001/go-permissions"
	"kollab/api/internal/domain"
	"kollab/api/internal/http/middleware"
	"kollab/api/internal/permissions"
)

type UserHandler struct {
	authService        domain.AuthService
	themeService       domain.ThemeService
	systemService      domain.SystemService
	oidcConfig         map[string]string
	loginAttempts      map[string]loginAttempt
	loginMu            sync.Mutex
	localSetupRequired bool
	localSetupMu       sync.RWMutex
}

type loginAttempt struct {
	failures     int
	lastAttempt  time.Time
	blockedUntil time.Time
}

func NewUserHandler(authService domain.AuthService, themeService domain.ThemeService, systemService domain.SystemService, oidcConfig map[string]string) *UserHandler {
	return &UserHandler{
		authService:        authService,
		themeService:       themeService,
		systemService:      systemService,
		oidcConfig:         oidcConfig,
		loginAttempts:      make(map[string]loginAttempt),
		localSetupRequired: oidcConfig["localSetupRequired"] == "true",
	}
}

const localLoginMaxFailures = 5
const localLoginBlockDuration = 15 * time.Minute

func (h *UserHandler) loginAttemptKey(r *http.Request, username string) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	return strings.ToLower(strings.TrimSpace(username)) + "|" + host
}

func (h *UserHandler) localLoginBlocked(key string) bool {
	h.loginMu.Lock()
	defer h.loginMu.Unlock()
	for existing, attempt := range h.loginAttempts {
		if time.Since(attempt.lastAttempt) > localLoginBlockDuration {
			delete(h.loginAttempts, existing)
		}
	}
	attempt, ok := h.loginAttempts[key]
	if !ok {
		return len(h.loginAttempts) >= 10000
	}
	if attempt.blockedUntil.IsZero() {
		return false
	}
	if time.Now().After(attempt.blockedUntil) {
		delete(h.loginAttempts, key)
		return false
	}
	return attempt.blockedUntil.After(time.Now())
}

func (h *UserHandler) recordLocalLoginFailure(key string) {
	h.loginMu.Lock()
	defer h.loginMu.Unlock()
	now := time.Now()
	for existing, attempt := range h.loginAttempts {
		if now.Sub(attempt.lastAttempt) > localLoginBlockDuration {
			delete(h.loginAttempts, existing)
		}
	}
	if len(h.loginAttempts) >= 10000 {
		return
	}
	attempt := h.loginAttempts[key]
	attempt.lastAttempt = now
	attempt.failures++
	if attempt.failures >= localLoginMaxFailures {
		attempt.blockedUntil = time.Now().Add(localLoginBlockDuration)
	}
	h.loginAttempts[key] = attempt
}

func (h *UserHandler) clearLocalLoginAttempts(key string) {
	h.loginMu.Lock()
	defer h.loginMu.Unlock()
	delete(h.loginAttempts, key)
}

func (h *UserHandler) GetOIDCConfig(w http.ResponseWriter, r *http.Request) {
	theme, _ := h.themeService.GetDefaultTheme(r.Context())

	welcomeTitle := "Welcome to Kollab"
	welcomeText := "Your workspace for shared notes, plans, and knowledge."
	logoUrl := ""
	logoSize := "Medium"
	legalDisclaimer := ""
	loginButtonText := "Log In to Workspace"
	if settings, err := h.systemService.GetSettings(r.Context()); err == nil && settings != nil {
		welcomeTitle = settings.WelcomeTitle
		welcomeText = settings.WelcomeText
		logoUrl = settings.AuthLogoURL
		if settings.AuthLogoSize != "" {
			logoSize = settings.AuthLogoSize
		}
		legalDisclaimer = settings.AuthLegalDisclaimer
		if settings.AuthLoginButtonText != "" {
			loginButtonText = settings.AuthLoginButtonText
		}
	}

	h.localSetupMu.RLock()
	localSetupRequired := h.localSetupRequired
	h.localSetupMu.RUnlock()
	if h.oidcConfig["authMode"] == "local" {
		users, err := h.authService.ListLocalUsers(r.Context())
		if err != nil {
			http.Error(w, "Unable to load authentication configuration", http.StatusServiceUnavailable)
			return
		}
		localSetupRequired = len(users) == 0
	}
	resp := map[string]interface{}{
		"authority":           h.oidcConfig["authority"],
		"clientId":            h.oidcConfig["clientId"],
		"redirectUri":         h.oidcConfig["redirectUri"],
		"apiAudience":         h.oidcConfig["apiAudience"],
		"apiScope":            h.oidcConfig["apiScope"],
		"authMode":            h.oidcConfig["authMode"],
		"localSetupRequired":  localSetupRequired,
		"theme":               theme,
		"welcomeTitle":        welcomeTitle,
		"welcomeText":         welcomeText,
		"authLogoUrl":         logoUrl,
		"authLogoSize":        logoSize,
		"legalDisclaimer":     legalDisclaimer,
		"authLoginButtonText": loginButtonText,
	}

	w.Header().Set("Content-Type", "application/json")
	// Setup status changes immediately after the first administrator is created.
	// It must never be served from a stale browser cache.
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(resp)
}

type authRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type localUserRequest struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
}

func (h *UserHandler) SetupInitialLocalAdmin(w http.ResponseWriter, r *http.Request) {
	h.localSetupMu.RLock()
	setupRequired := h.localSetupRequired
	h.localSetupMu.RUnlock()
	if !setupRequired {
		http.NotFound(w, r)
		return
	}
	var req localUserRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	user, created, err := h.authService.CreateInitialLocalAdmin(r.Context(), req.Username, req.Password, req.Email, req.DisplayName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if !created {
		http.Error(w, "Initial administrator has already been created", http.StatusConflict)
		return
	}
	if err := permissions.Service.AssignRoleToUser(r.Context(), user.ID, "builtin.admin", nil); err != nil {
		http.Error(w, "Unable to grant administrator access", http.StatusInternalServerError)
		return
	}
	token, err := h.authService.Login(r.Context(), user.Username, req.Password)
	if err != nil {
		http.Error(w, "Account created but sign-in failed", http.StatusInternalServerError)
		return
	}
	h.localSetupMu.Lock()
	h.localSetupRequired = false
	h.localSetupMu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{"token": token})
}

func requireSystemAdmin(w http.ResponseWriter, r *http.Request) bool {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return false
	}
	allowed, err := permissions.Service.HasPermission(r.Context(), goperm.Request{UserID: userID, Perm: "system.admin"})
	if err != nil || !allowed {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return false
	}
	return true
}

func (h *UserHandler) ListLocalUsers(w http.ResponseWriter, r *http.Request) {
	if !requireSystemAdmin(w, r) {
		return
	}
	users, err := h.authService.ListLocalUsers(r.Context())
	if err != nil {
		http.Error(w, "Unable to list users", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(users)
}

func (h *UserHandler) CreateLocalUser(w http.ResponseWriter, r *http.Request) {
	if !requireSystemAdmin(w, r) {
		return
	}
	var req localUserRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	req.Username = strings.TrimSpace(req.Username)
	user, err := h.authService.CreateLocalUser(r.Context(), req.Username, req.Password, strings.TrimSpace(req.Email), strings.TrimSpace(req.DisplayName))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) SetLocalUserActive(w http.ResponseWriter, r *http.Request) {
	if !requireSystemAdmin(w, r) {
		return
	}
	var req struct {
		IsActive bool `json:"isActive"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	id := strings.TrimSpace(chi.URLParam(r, "id"))
	if id == "" {
		http.Error(w, "User ID is required", http.StatusBadRequest)
		return
	}
	if !req.IsActive {
		if currentUserID, _ := middleware.GetUserID(r.Context()); currentUserID == id {
			http.Error(w, "You cannot disable the account you are signed in with", http.StatusBadRequest)
			return
		}
	}
	if err := h.authService.SetLocalUserActive(r.Context(), id, req.IsActive); err != nil {
		http.Error(w, "Unable to update user", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *UserHandler) SetLocalUserPassword(w http.ResponseWriter, r *http.Request) {
	if !requireSystemAdmin(w, r) {
		return
	}
	var req struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	id := strings.TrimSpace(chi.URLParam(r, "id"))
	if id == "" {
		http.Error(w, "User ID is required", http.StatusBadRequest)
		return
	}
	if err := h.authService.SetLocalUserPassword(r.Context(), id, req.Password); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *UserHandler) UpdateLocalUser(w http.ResponseWriter, r *http.Request) {
	if !requireSystemAdmin(w, r) {
		return
	}
	var req struct {
		Email       string `json:"email"`
		DisplayName string `json:"displayName"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	id := strings.TrimSpace(chi.URLParam(r, "id"))
	user, err := h.authService.UpdateLocalUser(r.Context(), id, req.Email, req.DisplayName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) DeleteLocalUser(w http.ResponseWriter, r *http.Request) {
	if !requireSystemAdmin(w, r) {
		return
	}
	id := strings.TrimSpace(chi.URLParam(r, "id"))
	if currentUserID, _ := middleware.GetUserID(r.Context()); currentUserID == id {
		http.Error(w, "You cannot remove the account you are signed in with", http.StatusBadRequest)
		return
	}
	if err := h.authService.DeleteLocalUser(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *UserHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req authRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.Username == "" || req.Password == "" {
		http.Error(w, "Username and password are required", http.StatusBadRequest)
		return
	}

	user, err := h.authService.Register(r.Context(), req.Username, req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req authRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.Username == "" || req.Password == "" {
		http.Error(w, "Username and password are required", http.StatusBadRequest)
		return
	}
	key := h.loginAttemptKey(r, req.Username)
	if h.localLoginBlocked(key) {
		w.Header().Set("Retry-After", "900")
		http.Error(w, "Too many sign-in attempts. Try again later.", http.StatusTooManyRequests)
		return
	}

	token, err := h.authService.Login(r.Context(), req.Username, req.Password)
	if err != nil {
		h.recordLocalLoginFailure(key)
		http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		return
	}
	h.clearLocalLoginAttempts(key)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"token": token})
}
