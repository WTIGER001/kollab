package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"arkollab/api/internal/domain"
	"arkollab/api/internal/http/middleware"
)

type DocumentHandler struct {
	docService domain.DocumentService
}

func NewDocumentHandler(docService domain.DocumentService) *DocumentHandler {
	return &DocumentHandler{
		docService: docService,
	}
}

func (h *DocumentHandler) List(w http.ResponseWriter, r *http.Request) {
	projectId := r.URL.Query().Get("projectId")
	if projectId == "" {
		http.Error(w, "Bad Request: projectId query parameter is required", http.StatusBadRequest)
		return
	}

	docs, err := h.docService.ListDocumentsByProject(r.Context(), projectId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(docs)
}

func (h *DocumentHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	doc, err := h.docService.GetDocument(r.Context(), id)
	if err != nil {
		http.Error(w, "Document not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(doc)
}

type createDocumentRequest struct {
	Title     string  `json:"title"`
	ProjectID string  `json:"projectId"`
	ParentID  *string `json:"parentId"`
}

func (h *DocumentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.Title == "" || req.ProjectID == "" {
		http.Error(w, "Title and projectId are required", http.StatusBadRequest)
		return
	}

	doc, err := h.docService.CreateDocument(r.Context(), req.Title, req.ProjectID, req.ParentID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(doc)
}

type updateDocumentRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

func (h *DocumentHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	var req updateDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	userID, _ := middleware.GetUserID(r.Context())

	doc, err := h.docService.UpdateDocument(r.Context(), id, req.Title, req.Content, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(doc)
}

func (h *DocumentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	err := h.docService.DeleteDocument(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *DocumentHandler) GetVersions(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	versions, err := h.docService.GetDocumentVersions(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(versions)
}

func (h *DocumentHandler) GetVersion(w http.ResponseWriter, r *http.Request) {
	versionID := chi.URLParam(r, "versionId")
	if versionID == "" {
		http.Error(w, "Bad Request: version ID is required", http.StatusBadRequest)
		return
	}

	version, err := h.docService.GetDocumentVersion(r.Context(), versionID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(version)
}

func (h *DocumentHandler) RestoreVersion(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	versionID := chi.URLParam(r, "versionId")
	if id == "" || versionID == "" {
		http.Error(w, "Bad Request: document ID and version ID are required", http.StatusBadRequest)
		return
	}

	userID, _ := middleware.GetUserID(r.Context())

	doc, err := h.docService.RestoreDocumentVersion(r.Context(), id, versionID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(doc)
}

type createMilestoneRequest struct {
	Summary string `json:"summary"`
}

func (h *DocumentHandler) CreateMilestone(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	var req createMilestoneRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	userID, _ := middleware.GetUserID(r.Context())

	version, err := h.docService.CreateManualMilestone(r.Context(), id, req.Summary, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(version)
}

func (h *DocumentHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	projectId := r.URL.Query().Get("projectId")
	if projectId == "" {
		http.Error(w, "Bad Request: projectId query parameter is required", http.StatusBadRequest)
		return
	}

	docs, err := h.docService.SearchDocuments(r.Context(), query, projectId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(docs)
}
