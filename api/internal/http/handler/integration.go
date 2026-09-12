package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"kollab/api/internal/domain"
	mid "kollab/api/internal/http/middleware"
	"kollab/api/internal/permissions"
)

type IntegrationHandler struct {
	service domain.IntegrationService
}

func NewIntegrationHandler(service domain.IntegrationService) *IntegrationHandler {
	return &IntegrationHandler{service: service}
}

func (h *IntegrationHandler) Mount(r chi.Router) {
	r.Get("/", h.GetIntegrations)
	r.Post("/", h.CreateIntegration)
	r.Delete("/{id}", h.DeleteIntegration)
	r.Get("/{id}/proxy/gitlab/issues", h.ProxyGitLabIssues)
	r.Get("/{id}/proxy/gitlab/issue", h.ProxyGitLabIssue)
}

func (h *IntegrationHandler) GetIntegrations(w http.ResponseWriter, r *http.Request) {
	scopeStr := r.URL.Query().Get("scope")
	entityID := r.URL.Query().Get("entityId")

	if scopeStr == "" {
		http.Error(w, "scope is required", http.StatusBadRequest)
		return
	}

	scope := domain.IntegrationScope(scopeStr)

	if !integrationAccess(w, r, string(scope), entityID, "read") {
		return
	}

	integrations, err := h.service.GetByScope(r.Context(), scope, entityID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Security Rule: Scrub credentials before sending to client
	for _, integration := range integrations {
		if integration.Credentials != nil {
			scrubbed := make(map[string]string)
			for k := range integration.Credentials {
				scrubbed[k] = "••••••••••••"
			}
			integration.Credentials = scrubbed
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(integrations)
}

func (h *IntegrationHandler) CreateIntegration(w http.ResponseWriter, r *http.Request) {
	var integration domain.Integration
	if err := json.NewDecoder(r.Body).Decode(&integration); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if !integrationAccess(w, r, string(integration.Scope), integration.EntityID, "write") {
		return
	}

	if err := h.service.Create(r.Context(), &integration); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Scrub before returning the newly created object
	if integration.Credentials != nil {
		scrubbed := make(map[string]string)
		for k := range integration.Credentials {
			scrubbed[k] = "••••••••••••"
		}
		integration.Credentials = scrubbed
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(integration)
}

func (h *IntegrationHandler) DeleteIntegration(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	integration, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		http.Error(w, "Integration not found", http.StatusNotFound)
		return
	}
	if !integrationAccess(w, r, string(integration.Scope), integration.EntityID, "write") {
		return
	}

	if err := h.service.Delete(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func integrationAccess(w http.ResponseWriter, r *http.Request, scope, id, action string) bool {
	userID, _ := mid.GetUserID(r.Context())
	if !permissions.CanAccessScope(r.Context(), userID, scope, id, action) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return false
	}
	return true
}
