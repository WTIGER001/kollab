package handler

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"

	"kollab/api/internal/domain"
	"kollab/api/internal/http/middleware"
)

type LibraryImageHandler struct {
	service domain.LibraryImageService
}

func NewLibraryImageHandler(service domain.LibraryImageService) *LibraryImageHandler {
	return &LibraryImageHandler{
		service: service,
	}
}

func (h *LibraryImageHandler) List(w http.ResponseWriter, r *http.Request) {
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
	_ = json.NewEncoder(w).Encode(images)
}

func (h *LibraryImageHandler) Upload(w http.ResponseWriter, r *http.Request) {
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

	img, err := h.service.UpdateName(r.Context(), id, req.DisplayName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(img)
}

func (h *LibraryImageHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: id is required", http.StatusBadRequest)
		return
	}

	err := h.service.Delete(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
