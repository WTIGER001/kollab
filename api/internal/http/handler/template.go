package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"kollab/api/internal/domain"
	mid "kollab/api/internal/http/middleware"
	"kollab/api/internal/permissions"
)

type TemplateHandler struct {
	templateRepo domain.TemplateRepository
}

func NewTemplateHandler(repo domain.TemplateRepository) *TemplateHandler {
	return &TemplateHandler{templateRepo: repo}
}

func (h *TemplateHandler) CreateTemplate(w http.ResponseWriter, r *http.Request) {
	var t domain.Template
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	userID, ok := mid.GetUserID(r.Context())
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if t.Scope == domain.TemplateScopePersonal {
		t.UserID = &userID
		t.TeamID = nil
	}
	if !templateAccess(r, &t, "write") {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if err := h.templateRepo.Create(r.Context(), &t); err != nil {
		http.Error(w, "Failed to create template: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(t)
}

func (h *TemplateHandler) GetTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	t, err := h.templateRepo.GetByID(r.Context(), id)
	if err != nil {
		if err.Error() == "template not found" {
			http.Error(w, "Template not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get template: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if !templateAccess(r, t, "read") {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

func (h *TemplateHandler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	// Parse query params for filtering
	var scope *domain.TemplateScope
	if s := r.URL.Query().Get("scope"); s != "" {
		sc := domain.TemplateScope(s)
		scope = &sc
	}

	var tType *domain.TemplateType
	if tt := r.URL.Query().Get("templateType"); tt != "" {
		typ := domain.TemplateType(tt)
		tType = &typ
	}

	var teamID *string
	if t := r.URL.Query().Get("teamId"); t != "" {
		teamID = &t
	}

	var userID *string
	if u := r.URL.Query().Get("userId"); u != "" {
		userID = &u
	}

	templates, err := h.templateRepo.GetByContext(r.Context(), scope, tType, teamID, userID)
	if err != nil {
		http.Error(w, "Failed to get templates: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if templates == nil {
		templates = []*domain.Template{}
	}

	w.Header().Set("Content-Type", "application/json")
	visible := make([]*domain.Template, 0, len(templates))
	for _, t := range templates {
		if templateAccess(r, t, "read") {
			visible = append(visible, t)
		}
	}
	json.NewEncoder(w).Encode(visible)
}

func (h *TemplateHandler) UpdateTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var t domain.Template
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	existing, err := h.templateRepo.GetByID(r.Context(), id)
	if err != nil {
		http.Error(w, "Template not found", http.StatusNotFound)
		return
	}
	if !templateAccess(r, existing, "write") {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	t.ID = id
	t.Scope = existing.Scope
	t.TeamID = existing.TeamID
	t.UserID = existing.UserID

	if err := h.templateRepo.Update(r.Context(), &t); err != nil {
		if err.Error() == "template not found" {
			http.Error(w, "Template not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to update template: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

func (h *TemplateHandler) DeleteTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	existing, err := h.templateRepo.GetByID(r.Context(), id)
	if err != nil {
		http.Error(w, "Template not found", http.StatusNotFound)
		return
	}
	if !templateAccess(r, existing, "write") {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	if err := h.templateRepo.Delete(r.Context(), id); err != nil {
		if err.Error() == "template not found" {
			http.Error(w, "Template not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to delete template: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func templateAccess(r *http.Request, t *domain.Template, action string) bool {
	userID, _ := mid.GetUserID(r.Context())
	id := ""
	if t.Scope == domain.TemplateScopePersonal && t.UserID != nil {
		id = *t.UserID
	}
	if t.Scope == domain.TemplateScopeTeam && t.TeamID != nil {
		id = *t.TeamID
	}
	return permissions.CanAccessScope(r.Context(), userID, string(t.Scope), id, action)
}
