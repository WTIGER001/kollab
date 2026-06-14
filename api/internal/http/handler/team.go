package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"arkollab/api/internal/domain"
	"arkollab/api/internal/http/middleware"
)

type TeamHandler struct {
	teamService domain.TeamService
}

func NewTeamHandler(teamService domain.TeamService) *TeamHandler {
	return &TeamHandler{
		teamService: teamService,
	}
}

func (h *TeamHandler) ListTeams(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized: User context not found", http.StatusUnauthorized)
		return
	}

	teams, err := h.teamService.ListTeams(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(teams)
}

func (h *TeamHandler) ListProjects(w http.ResponseWriter, r *http.Request) {
	teamID := r.URL.Query().Get("teamId")

	projects, err := h.teamService.ListProjects(r.Context(), teamID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(projects)
}

func (h *TeamHandler) ListTeamUsers(w http.ResponseWriter, r *http.Request) {
	teamID := chi.URLParam(r, "teamId")
	if teamID == "" {
		http.Error(w, "Bad Request: teamId path parameter is required", http.StatusBadRequest)
		return
	}

	users, err := h.teamService.ListTeamUsers(r.Context(), teamID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(users)
}
