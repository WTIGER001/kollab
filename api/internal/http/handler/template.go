package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"kollab/api/internal/domain"
	mid "kollab/api/internal/http/middleware"
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

	// Simple authorization: Only allow users to create team or personal templates.
	// System templates could be restricted to admins, but for now we enforce via DB manually or trust the client.
	// Ideally, check if user is admin to create "system" templates.
	
	if t.Scope == domain.TemplateScopePersonal {
		t.UserID = &userID
		t.TeamID = nil
	} else if t.Scope == domain.TemplateScopeTeam {
		// user must provide TeamID
		t.UserID = nil
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
	json.NewEncoder(w).Encode(templates)
}

func (h *TemplateHandler) UpdateTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var t domain.Template
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	t.ID = id

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
