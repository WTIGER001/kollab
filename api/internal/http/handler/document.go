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
	teamId := r.URL.Query().Get("teamId")

	if projectId == "" && teamId == "" {
		http.Error(w, "Bad Request: projectId or teamId query parameter is required", http.StatusBadRequest)
		return
	}

	var docs []*domain.Document
	var err error

	if projectId != "" {
		docs, err = h.docService.ListDocumentsByProject(r.Context(), projectId)
	} else {
		docs, err = h.docService.ListDocumentsByTeam(r.Context(), teamId)
	}

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

	if userID, ok := middleware.GetUserID(r.Context()); ok {
		_ = h.docService.RecordView(r.Context(), id, userID)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(doc)
}

type createDocumentRequest struct {
	Title     string  `json:"title"`
	ProjectID string  `json:"projectId"`
	TeamID    string  `json:"teamId"`
	ParentID  *string `json:"parentId"`
}

func (h *DocumentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.Title == "" || (req.TeamID == "" && req.ProjectID == "") {
		http.Error(w, "Title and either projectId or teamId are required", http.StatusBadRequest)
		return
	}

	userID, _ := middleware.GetUserID(r.Context())
	doc, err := h.docService.CreateDocument(r.Context(), req.Title, req.ProjectID, req.TeamID, req.ParentID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(doc)
}

type updateDocumentRequest struct {
	Title         string `json:"title"`
	Content       string `json:"content"`
	ChangeSummary string `json:"changeSummary,omitempty"`
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

	doc, err := h.docService.UpdateDocument(r.Context(), id, req.Title, req.Content, userID, req.ChangeSummary)
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

	permanent := r.URL.Query().Get("permanent") == "true"
	var err error
	if permanent {
		err = h.docService.DeleteDocumentPermanently(r.Context(), id)
	} else {
		err = h.docService.DeleteDocument(r.Context(), id)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *DocumentHandler) ListTrash(w http.ResponseWriter, r *http.Request) {
	projectId := r.URL.Query().Get("projectId")
	teamId := r.URL.Query().Get("teamId")

	if projectId == "" && teamId == "" {
		http.Error(w, "Bad Request: projectId or teamId query parameter is required", http.StatusBadRequest)
		return
	}

	var docs []*domain.Document
	var err error

	if projectId != "" {
		docs, err = h.docService.ListTrashByProject(r.Context(), projectId)
	} else {
		docs, err = h.docService.ListTrashByTeam(r.Context(), teamId)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(docs)
}

func (h *DocumentHandler) Restore(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	doc, err := h.docService.RestoreDocument(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(doc)
}

type moveDocumentRequest struct {
	ParentID  *string `json:"parentId"`
	ProjectID string  `json:"projectId,omitempty"`
	TeamID    string  `json:"teamId,omitempty"`
}

func (h *DocumentHandler) Move(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	var req moveDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	doc, err := h.docService.MoveDocument(r.Context(), id, req.ParentID, req.ProjectID, req.TeamID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(doc)
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

func (h *DocumentHandler) GetAnalytics(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	analytics, err := h.docService.GetAnalytics(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(analytics)
}

type autogenSummaryRequest struct {
	Content string `json:"content"`
	Title   string `json:"title,omitempty"`
}

type autogenSummaryResponse struct {
	Summary string `json:"summary"`
}

func (h *DocumentHandler) AutogenSummary(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	var req autogenSummaryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	doc, err := h.docService.GetDocument(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	title := req.Title
	if title == "" {
		title = doc.Title
	}

	summary, err := h.docService.GenerateSummary(r.Context(), title, doc.Content, req.Content)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(autogenSummaryResponse{Summary: summary})
}

func (h *DocumentHandler) ListFavorites(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	favs, err := h.docService.ListFavorites(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(favs)
}

func (h *DocumentHandler) ListRecent(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	filterType := r.URL.Query().Get("type")
	if filterType == "" {
		filterType = "both"
	}

	docs, err := h.docService.ListRecentDocuments(r.Context(), userID, filterType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(docs)
}


func (h *DocumentHandler) AddFavorite(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	documentID := chi.URLParam(r, "documentId")
	if documentID == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	err := h.docService.AddFavorite(r.Context(), userID, documentID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *DocumentHandler) RemoveFavorite(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	documentID := chi.URLParam(r, "documentId")
	if documentID == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	err := h.docService.RemoveFavorite(r.Context(), userID, documentID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *DocumentHandler) IsFavorite(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	documentID := chi.URLParam(r, "documentId")
	if documentID == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	isFav, err := h.docService.IsFavorite(r.Context(), userID, documentID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"isFavorite": isFav})
}

func (h *DocumentHandler) GetTasks(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		http.Error(w, "Bad Request: username query parameter is required", http.StatusBadRequest)
		return
	}

	tasks, err := h.docService.GetTasksByAssignee(r.Context(), username)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(tasks)
}


