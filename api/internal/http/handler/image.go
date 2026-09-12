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

type ImageHandler struct {
	imageService domain.ImageService
	evaluator    *permissions.AccessEvaluator
}

func NewImageHandler(imageService domain.ImageService) *ImageHandler {
	return &ImageHandler{
		imageService: imageService,
	}
}

func (h *ImageHandler) SetAccessEvaluator(e *permissions.AccessEvaluator) { h.evaluator = e }

func (h *ImageHandler) Upload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	// 10MB max upload size
	if err := r.ParseMultipartForm(10 << 20); err != nil {
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

	mimeType := http.DetectContentType(data)
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	meta, err := h.imageService.UploadImage(r.Context(), header.Filename, mimeType, data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	userID, _ := middleware.GetUserID(r.Context())
	if h.evaluator == nil || h.evaluator.SetImageOwner(r.Context(), meta.ID, userID) != nil {
		h.imageService.DeleteImage(r.Context(), meta.ID)
		http.Error(w, "Unable to record image ownership", 500)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(meta)
}

func (h *ImageHandler) GetImage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	size := chi.URLParam(r, "size")

	if id == "" {
		http.Error(w, "Bad Request: id path parameter is required", http.StatusBadRequest)
		return
	}

	userID, _ := middleware.GetUserID(r.Context())
	if h.evaluator == nil || (!h.evaluator.EvaluateImageAccess(r.Context(), userID, id, "read") && !h.evaluator.CanReadSharedImage(r.Context(), r.URL.Query().Get("mediaToken"), id)) {
		http.Error(w, "Image not found", 404)
		return
	}
	data, mimeType, err := h.imageService.GetImageFile(r.Context(), id, size)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Content-Security-Policy", "sandbox; default-src 'none'; style-src 'unsafe-inline'")
	w.Header().Set("Cache-Control", "private, no-store") // Cache for 1 year since files are immutable
	_, _ = w.Write(data)
}

func (h *ImageHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: id path parameter is required", http.StatusBadRequest)
		return
	}

	userID, _ := middleware.GetUserID(r.Context())
	if h.evaluator == nil || !h.evaluator.EvaluateImageAccess(r.Context(), userID, id, "write") {
		http.Error(w, "Forbidden", 403)
		return
	}
	err := h.imageService.DeleteImage(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
