package handler

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"

	"kollab/api/internal/domain"
	"kollab/api/internal/http/middleware"
	"kollab/api/internal/permissions"
)

type LibraryImageHandler struct {
	service   domain.LibraryImageService
	evaluator *permissions.AccessEvaluator
}

func NewLibraryImageHandler(service domain.LibraryImageService) *LibraryImageHandler {
	return &LibraryImageHandler{
		service: service,
	}
}

func (h *LibraryImageHandler) SetAccessEvaluator(e *permissions.AccessEvaluator) { h.evaluator = e }

func (h *LibraryImageHandler) List(w http.ResponseWriter, r *http.Request) {
	if h.service == nil {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode([]*domain.LibraryImage{})
		return
	}
	scope := r.URL.Query().Get("scope")
	if scope == "" {
		scope = "personal" // Default to personal
	}

	teamIDStr := r.URL.Query().Get("teamId")
	var teamID *string
	if teamIDStr != "" {
		teamID = &teamIDStr
	}

	projectIDStr := r.URL.Query().Get("projectId")
	var projectID *string
	if projectIDStr != "" {
		projectID = &projectIDStr
	}

	images, err := h.service.List(r.Context(), scope, teamID, projectID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if images == nil {
		images = []*domain.LibraryImage{}
	}

	w.Header().Set("Content-Type", "application/json")
	userID, _ := middleware.GetUserID(r.Context())
	visible := make([]*domain.LibraryImage, 0, len(images))
	for _, img := range images {
		if h.evaluator != nil && h.evaluator.EvaluateLibraryImageAccess(r.Context(), userID, img.ID, "read") {
			visible = append(visible, img)
		}
	}
	_ = json.NewEncoder(w).Encode(visible)
}

func (h *LibraryImageHandler) Upload(w http.ResponseWriter, r *http.Request) {
	if h.service == nil {
		http.Error(w, "Service unavailable", http.StatusServiceUnavailable)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	// Parse multipart form
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB max upload size
		http.Error(w, "Bad Request: failed to parse multipart form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Bad Request: image form field is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Internal Server Error: failed to read file data", http.StatusInternalServerError)
		return
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	scope := r.FormValue("scope")
	if scope == "" {
		scope = "personal"
	}

	teamIDStr := r.FormValue("teamId")
	var teamID *string
	if teamIDStr != "" {
		teamID = &teamIDStr
	}

	projectIDStr := r.FormValue("projectId")
	var projectID *string
	if projectIDStr != "" {
		projectID = &projectIDStr
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	target := userID
	if scope == "team" {
		target = teamIDStr
	}
	if scope == "project" {
		target = projectIDStr
	}
	if !permissions.CanAccessScope(r.Context(), userID, scope, target, "write") {
		http.Error(w, "Forbidden", 403)
		return
	}
	img, err := h.service.Upload(r.Context(), data, header.Filename, mimeType, header.Filename, scope, teamID, projectID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(img)
}

type UpdateLibraryImageRequest struct {
	DisplayName string `json:"displayName"`
}

func (h *LibraryImageHandler) UpdateName(w http.ResponseWriter, r *http.Request) {
	if h.service == nil {
		http.Error(w, "Service unavailable", http.StatusServiceUnavailable)
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: id is required", http.StatusBadRequest)
		return
	}

	var req UpdateLibraryImageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request: invalid body", http.StatusBadRequest)
		return
	}

	if req.DisplayName == "" {
		http.Error(w, "Bad Request: displayName is required", http.StatusBadRequest)
		return
	}

	userID, _ := middleware.GetUserID(r.Context())
	if h.evaluator == nil || !h.evaluator.EvaluateLibraryImageAccess(r.Context(), userID, id, "write") {
		http.Error(w, "Forbidden", 403)
		return
	}
	img, err := h.service.UpdateName(r.Context(), id, req.DisplayName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(img)
}

func (h *LibraryImageHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if h.service == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: id is required", http.StatusBadRequest)
		return
	}

	userID, _ := middleware.GetUserID(r.Context())
	if h.evaluator == nil || !h.evaluator.EvaluateLibraryImageAccess(r.Context(), userID, id, "write") {
		http.Error(w, "Forbidden", 403)
		return
	}
	err := h.service.Delete(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
