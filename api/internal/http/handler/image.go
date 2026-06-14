package handler

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"

	"arkollab/api/internal/domain"
)

type ImageHandler struct {
	imageService domain.ImageService
}

func NewImageHandler(imageService domain.ImageService) *ImageHandler {
	return &ImageHandler{
		imageService: imageService,
	}
}

func (h *ImageHandler) Upload(w http.ResponseWriter, r *http.Request) {
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

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	meta, err := h.imageService.UploadImage(r.Context(), header.Filename, mimeType, data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
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

	data, mimeType, err := h.imageService.GetImageFile(r.Context(), id, size)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Cache-Control", "public, max-age=31536000") // Cache for 1 year since files are immutable
	_, _ = w.Write(data)
}

func (h *ImageHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: id path parameter is required", http.StatusBadRequest)
		return
	}

	err := h.imageService.DeleteImage(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
