package handler

import (
	"encoding/json"
	"net/http"

	"arkollab/api/internal/domain"
)

type UserHandler struct {
	authService  domain.AuthService
	themeService domain.ThemeService
	oidcConfig   map[string]string
}

func NewUserHandler(authService domain.AuthService, themeService domain.ThemeService, oidcConfig map[string]string) *UserHandler {
	return &UserHandler{
		authService:  authService,
		themeService: themeService,
		oidcConfig:   oidcConfig,
	}
}

func (h *UserHandler) GetOIDCConfig(w http.ResponseWriter, r *http.Request) {
	theme, _ := h.themeService.GetDefaultTheme(r.Context())

	resp := map[string]interface{}{
		"authority":   h.oidcConfig["authority"],
		"clientId":    h.oidcConfig["clientId"],
		"redirectUri": h.oidcConfig["redirectUri"],
		"theme":       theme,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

type authRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *UserHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.Username == "" || req.Password == "" {
		http.Error(w, "Username and password are required", http.StatusBadRequest)
		return
	}

	token, err := h.authService.Login(r.Context(), req.Username, req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"token": token})
}
