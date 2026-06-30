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

func (h *TeamHandler) UpdateTeam(w http.ResponseWriter, r *http.Request) {
	teamID := chi.URLParam(r, "id")
	if teamID == "" {
		http.Error(w, "Bad Request: id is required", http.StatusBadRequest)
		return
	}

	var req struct {
		Name         string `json:"name"`
		Abbreviation string `json:"abbreviation"`
		Description  string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request: invalid request body", http.StatusBadRequest)
		return
	}

	team := &domain.Team{
		ID:           teamID,
		Name:         req.Name,
		Abbreviation: req.Abbreviation,
		Description:  req.Description,
	}

	if err := h.teamService.UpdateTeam(r.Context(), team); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(team)
}

func (h *TeamHandler) UpdateProject(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "id")
	if projectID == "" {
		http.Error(w, "Bad Request: id is required", http.StatusBadRequest)
		return
	}

	existing, err := h.teamService.GetProject(r.Context(), projectID)
	if err != nil {
		http.Error(w, "Project not found: "+err.Error(), http.StatusNotFound)
		return
	}

	var req struct {
		Name         string `json:"name"`
		LogoURL      string `json:"logoUrl"`
		Abbreviation string `json:"abbreviation"`
		Description  string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request: invalid request body", http.StatusBadRequest)
		return
	}

	project := &domain.Project{
		ID:           projectID,
		Name:         req.Name,
		TeamID:       existing.TeamID,
		LogoURL:      req.LogoURL,
		Abbreviation: req.Abbreviation,
		Description:  req.Description,
	}

	if err := h.teamService.UpdateProject(r.Context(), project); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(project)
}

func (h *TeamHandler) GetTeamByAbbreviation(w http.ResponseWriter, r *http.Request) {
	abbr := chi.URLParam(r, "abbr")
	if abbr == "" {
		http.Error(w, "Bad Request: abbreviation is required", http.StatusBadRequest)
		return
	}

	team, err := h.teamService.GetTeamByAbbreviation(r.Context(), abbr)
	if err != nil {
		http.Error(w, "Team not found: "+err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(team)
}

func (h *TeamHandler) CreateTeam(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized: User context not found", http.StatusUnauthorized)
		return
	}

	var req struct {
		Name         string `json:"name"`
		Abbreviation string `json:"abbreviation"`
		Description  string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request: invalid request body", http.StatusBadRequest)
		return
	}

	team, err := h.teamService.CreateTeam(r.Context(), req.Name, req.Abbreviation, req.Description, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(team)
}

func (h *TeamHandler) CreateProject(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TeamID       string `json:"teamId"`
		Name         string `json:"name"`
		LogoURL      string `json:"logoUrl"`
		Abbreviation string `json:"abbreviation"`
		Description  string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request: invalid request body", http.StatusBadRequest)
		return
	}

	project, err := h.teamService.CreateProject(r.Context(), req.TeamID, req.Name, req.LogoURL, req.Abbreviation, req.Description)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(project)
}

func (h *TeamHandler) AddTeamMember(w http.ResponseWriter, r *http.Request) {
	teamID := chi.URLParam(r, "teamId")
	if teamID == "" {
		http.Error(w, "Bad Request: teamId is required", http.StatusBadRequest)
		return
	}

	var req struct {
		UserID string `json:"userId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request: invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.teamService.AddTeamMember(r.Context(), teamID, req.UserID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *TeamHandler) RemoveTeamMember(w http.ResponseWriter, r *http.Request) {
	teamID := chi.URLParam(r, "teamId")
	userID := chi.URLParam(r, "userId")
	if teamID == "" || userID == "" {
		http.Error(w, "Bad Request: teamId and userId are required", http.StatusBadRequest)
		return
	}

	if err := h.teamService.RemoveTeamMember(r.Context(), teamID, userID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *TeamHandler) ListAllUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.teamService.ListAllUsers(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(users)
}
