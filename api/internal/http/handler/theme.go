package handler

import (
	"encoding/json"
	"net/http"

	"arkollab/api/internal/domain"
	"arkollab/api/internal/http/middleware"
)

type ThemeHandler struct {
	themeService domain.ThemeService
}

func NewThemeHandler(themeService domain.ThemeService) *ThemeHandler {
	return &ThemeHandler{
		themeService: themeService,
	}
}

type updateThemeRequest struct {
	Name      string             `json:"name"`
	LogoURL   string             `json:"logoUrl"`
	LightMode domain.ColorScheme `json:"lightMode"`
	DarkMode  domain.ColorScheme `json:"darkMode"`
}

func (h *ThemeHandler) UpdateTheme(w http.ResponseWriter, r *http.Request) {
	var req updateThemeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	theme := &domain.WorkspaceTheme{
		ID:        "theme_default",
		Name:      req.Name,
		LogoURL:   req.LogoURL,
		LightMode: req.LightMode,
		DarkMode:  req.DarkMode,
		IsDefault: true,
	}

	if err := h.themeService.UpdateTheme(r.Context(), theme); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(theme)
}

func (h *ThemeHandler) GetUserPreference(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok || userID == "" {
		http.Error(w, "Unauthorized: user ID not found in context", http.StatusUnauthorized)
		return
	}

	pref, err := h.themeService.GetUserPreference(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(pref)
}

type updateUserPreferenceRequest struct {
	ThemeMode string `json:"themeMode"`
}

func (h *ThemeHandler) UpdateUserPreference(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok || userID == "" {
		http.Error(w, "Unauthorized: user ID not found in context", http.StatusUnauthorized)
		return
	}

	var req updateUserPreferenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	pref, err := h.themeService.UpdateUserPreference(r.Context(), userID, req.ThemeMode)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(pref)
}
