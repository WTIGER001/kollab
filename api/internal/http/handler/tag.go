package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"arkollab/api/internal/domain"
)

type TagHandler struct {
	tagService domain.TagService
}

func NewTagHandler(tagService domain.TagService) *TagHandler {
	return &TagHandler{
		tagService: tagService,
	}
}

func (h *TagHandler) List(w http.ResponseWriter, r *http.Request) {
	tags, err := h.tagService.ListTags(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(tags)
}

type CreateTagRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
}

func (h *TagHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateTagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request: invalid request body", http.StatusBadRequest)
		return
	}

	tag, err := h.tagService.CreateTag(r.Context(), req.Name, req.Description, req.Color)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(tag)
}

type UpdateTagRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
}

func (h *TagHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: tag ID is required", http.StatusBadRequest)
		return
	}

	var req UpdateTagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request: invalid request body", http.StatusBadRequest)
		return
	}

	tag, err := h.tagService.UpdateTag(r.Context(), id, req.Name, req.Description, req.Color)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(tag)
}

func (h *TagHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: tag ID is required", http.StatusBadRequest)
		return
	}

	if err := h.tagService.DeleteTag(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *TagHandler) GetDocumentTags(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	if docID == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	tags, err := h.tagService.GetDocumentTags(r.Context(), docID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(tags)
}

func (h *TagHandler) AddTagToDocument(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	tagID := chi.URLParam(r, "tagId")
	if docID == "" || tagID == "" {
		http.Error(w, "Bad Request: document ID and tag ID are required", http.StatusBadRequest)
		return
	}

	if err := h.tagService.AddTagToDocument(r.Context(), docID, tagID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *TagHandler) RemoveTagFromDocument(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	tagID := chi.URLParam(r, "tagId")
	if docID == "" || tagID == "" {
		http.Error(w, "Bad Request: document ID and tag ID are required", http.StatusBadRequest)
		return
	}

	if err := h.tagService.RemoveTagFromDocument(r.Context(), docID, tagID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *TagHandler) ListDocumentAssociations(w http.ResponseWriter, r *http.Request) {
	associations, err := h.tagService.GetAllDocumentTags(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(associations)
}
