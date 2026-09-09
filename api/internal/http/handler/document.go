package handler

import (
	"archive/zip"
	"bytes"
	"context"
	cryptoRand "crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	docExporter "kollab/api/internal/document"
	"kollab/api/internal/domain"
	"kollab/api/internal/http/middleware"
	"kollab/api/internal/permissions"
	"kollab/api/internal/ws"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	goperm "github.com/wtiger001/go-permissions"
	"golang.org/x/crypto/bcrypt"
)

type DocumentHandler struct {
	docService domain.DocumentService
	hub        *ws.Hub
	db         *pgxpool.Pool
	evaluator  *permissions.AccessEvaluator
}

func NewDocumentHandler(docService domain.DocumentService, hub *ws.Hub, db *pgxpool.Pool, evaluator *permissions.AccessEvaluator) *DocumentHandler {
	return &DocumentHandler{
		docService: docService,
		hub:        hub,
		db:         db,
		evaluator:  evaluator,
	}
}

// Service exposes the application service for handlers composed by the router.
// It avoids duplicating document authorization, snapshots, and audit behavior.
func (h *DocumentHandler) Service() domain.DocumentService { return h.docService }

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

func (h *DocumentHandler) ListProperties(w http.ResponseWriter, r *http.Request) {
	projectID := r.URL.Query().Get("projectId")
	teamID := r.URL.Query().Get("teamId")
	if projectID == "" && teamID == "" {
		http.Error(w, "Bad Request: projectId or teamId query parameter is required", http.StatusBadRequest)
		return
	}
	properties, err := h.docService.ListDocumentProperties(r.Context(), projectID, teamID, r.URL.Query().Get("key"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(properties)
}

func (h *DocumentHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	doc, reqSlug, err := h.docService.GetDocument(r.Context(), id)
	if err != nil {
		http.Error(w, "Document not found", http.StatusNotFound)
		return
	}

	if userID, ok := middleware.GetUserID(r.Context()); ok {
		_ = h.docService.RecordView(r.Context(), doc.ID, userID)
	}

	w.Header().Set("Content-Type", "application/json")
	if reqSlug != "" {
		// If we fetched it via an alias, we can optionally send a header or wrapper.
		// For now, the frontend will just compare doc.Slug != id and auto-redirect.
		w.Header().Set("X-Kollab-Alias-Redirect", "true")
	}
	_ = json.NewEncoder(w).Encode(doc)
}

type createDocumentRequest struct {
	Title     string  `json:"title"`
	Slug      string  `json:"slug,omitempty"`
	ProjectID string  `json:"projectId"`
	TeamID    string  `json:"teamId"`
	ParentID  *string `json:"parentId"`
	Content   *string `json:"content"`
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
	doc, err := h.docService.CreateDocument(r.Context(), req.Title, req.Slug, req.ProjectID, req.TeamID, req.ParentID, userID, req.Content)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if h.hub != nil {
		h.hub.BroadcastToAll(ws.WSMessage{Type: "document-tree-updated"})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(doc)
}

func (h *DocumentHandler) CheckSlug(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Query().Get("slug")
	currentDocId := r.URL.Query().Get("documentId")
	if slug == "" {
		http.Error(w, "Bad Request: slug is required", http.StatusBadRequest)
		return
	}

	doc, _, err := h.docService.GetDocument(r.Context(), slug)
	if err != nil || doc == nil {
		// Not found, so it's available
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"available": true, "suggested": slug})
		return
	}

	// Found something
	if doc.ID == currentDocId {
		// Owned by the current document
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"available": true, "suggested": slug})
		return
	}

	// Used by someone else, auto-generate a suggestion if possible
	// To do this we can use the GenerateUniqueSlug method if it was exposed,
	// but it's easier to just call it (wait, it's not exported. Let's export it or just say unavailable).
	// For now we'll just say unavailable. We'd have to export GenerateUniqueSlug to suggest one.
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"available": false})
}

type updateDocumentRequest struct {
	Title         string `json:"title"`
	Slug          string `json:"slug,omitempty"`
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

	doc, err := h.docService.UpdateDocument(r.Context(), id, req.Title, req.Slug, req.Content, userID, req.ChangeSummary)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if h.hub != nil {
		h.hub.BroadcastToAll(ws.WSMessage{Type: "document-tree-updated"})
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

	if h.hub != nil {
		h.hub.BroadcastToAll(ws.WSMessage{Type: "document-tree-updated"})
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

	if h.hub != nil {
		h.hub.BroadcastToAll(ws.WSMessage{Type: "document-tree-updated"})
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

	if h.hub != nil {
		h.hub.BroadcastToAll(ws.WSMessage{Type: "document-tree-updated"})
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

func (h *DocumentHandler) GetPublished(w http.ResponseWriter, r *http.Request) {
	document, publication, err := h.docService.GetPublishedDocument(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(struct {
		Document    *domain.Document            `json:"document"`
		Publication *domain.DocumentPublication `json:"publication"`
	}{Document: document, Publication: publication})
}

func (h *DocumentHandler) Publish(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	publication, err := h.docService.PublishDocument(r.Context(), chi.URLParam(r, "id"), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(publication)
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

	if h.hub != nil {
		h.hub.BroadcastToAll(ws.WSMessage{Type: "document-tree-updated"})
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
	mode := r.URL.Query().Get("mode")

	docs, err := h.docService.SearchDocuments(r.Context(), query, projectId, mode)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	userID, _ := middleware.GetUserID(r.Context())

	// Filter docs that the user has permission to read
	permittedDocs := make([]*domain.Document, 0)
	for _, doc := range docs {
		allowed, _, err := h.evaluator.EvaluateDocumentAccess(r.Context(), userID, doc.ID, "read", "", "")
		if err == nil && allowed {
			permittedDocs = append(permittedDocs, doc)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(permittedDocs)
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

	doc, _, err := h.docService.GetDocument(r.Context(), id)
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

func (h *DocumentHandler) AddWatch(w http.ResponseWriter, r *http.Request) {
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
	if err := h.docService.AddWatch(r.Context(), userID, documentID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *DocumentHandler) RemoveWatch(w http.ResponseWriter, r *http.Request) {
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
	if err := h.docService.RemoveWatch(r.Context(), userID, documentID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *DocumentHandler) IsWatching(w http.ResponseWriter, r *http.Request) {
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
	isWatching, err := h.docService.IsWatching(r.Context(), userID, documentID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"isWatching": isWatching})
}

func (h *DocumentHandler) ListNotifications(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	notifications, err := h.docService.ListNotifications(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	// Watches can outlive a user's document access. Filter at read time so an
	// old notification cannot disclose a page title after access is revoked.
	visibleNotifications := make([]*domain.DocumentNotification, 0, len(notifications))
	for _, notification := range notifications {
		allowed, _, accessErr := h.evaluator.EvaluateDocumentAccess(r.Context(), userID, notification.DocumentID, "read", "", "")
		if accessErr == nil && allowed {
			visibleNotifications = append(visibleNotifications, notification)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(visibleNotifications)
}

func (h *DocumentHandler) MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if err := h.docService.MarkNotificationRead(r.Context(), userID, chi.URLParam(r, "notificationId")); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type documentReviewRequest struct {
	Status       string     `json:"status"`
	NextReviewAt *time.Time `json:"nextReviewAt"`
}

func (h *DocumentHandler) GetReview(w http.ResponseWriter, r *http.Request) {
	review, err := h.docService.GetDocumentReview(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(review)
}

func (h *DocumentHandler) UpdateReview(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	var request documentReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	review, err := h.docService.UpdateDocumentReview(r.Context(), chi.URLParam(r, "id"), request.Status, request.NextReviewAt, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(review)
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

func (h *DocumentHandler) GetMentions(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		http.Error(w, "Bad Request: username query parameter is required", http.StatusBadRequest)
		return
	}

	docs, err := h.docService.GetDocumentsWithMention(r.Context(), username)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(docs)
}

func (h *DocumentHandler) Export(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	doc, _, err := h.docService.GetDocument(r.Context(), id)
	if err != nil {
		http.Error(w, "Document not found", http.StatusNotFound)
		return
	}

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "json"
	}
	hierarchy := r.URL.Query().Get("hierarchy") == "true"

	var allDocs []*domain.Document
	if hierarchy {
		if doc.ProjectID != "" {
			allDocs, err = h.docService.ListDocumentsByProject(r.Context(), doc.ProjectID)
		} else {
			allDocs, err = h.docService.ListDocumentsByTeam(r.Context(), doc.TeamID)
		}
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to fetch space documents: %s", err.Error()), http.StatusInternalServerError)
			return
		}
	}

	fileName := sanitizeFileName(doc.Title)

	switch format {
	case "json":
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.json\"", fileName))
		if hierarchy {
			tree := docExporter.BuildHierarchyJSON(doc, allDocs)
			_ = json.NewEncoder(w).Encode(tree)
		} else {
			tree := docExporter.JSONTree{
				Title:   doc.Title,
				Content: doc.Content,
			}
			_ = json.NewEncoder(w).Encode(tree)
		}

	case "html":
		if hierarchy {
			w.Header().Set("Content-Type", "application/zip")
			w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s_hierarchy.zip\"", fileName))

			var buf bytes.Buffer
			zw := zip.NewWriter(&buf)
			if err := docExporter.WriteHTMLZip(zw, doc, allDocs, ""); err != nil {
				http.Error(w, fmt.Sprintf("HTML ZIP generation failed: %s", err.Error()), http.StatusInternalServerError)
				return
			}
			_ = zw.Close()
			_, _ = w.Write(buf.Bytes())
		} else {
			htmlContent, err := docExporter.TiptapToHTML(doc.Title, doc.Content)
			if err != nil {
				http.Error(w, fmt.Sprintf("HTML generation failed: %s", err.Error()), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.html\"", fileName))
			_, _ = w.Write([]byte(htmlContent))
		}

	case "pdf":
		var htmlContent string
		if hierarchy {
			htmlContent, err = docExporter.BuildCombinedHTML(doc, allDocs)
		} else {
			htmlContent, err = docExporter.TiptapToHTML(doc.Title, doc.Content)
		}
		if err != nil {
			http.Error(w, fmt.Sprintf("HTML translation failed: %s", err.Error()), http.StatusInternalServerError)
			return
		}

		pdfBytes, err := docExporter.PrintPDF(r.Context(), htmlContent)
		if err != nil {
			// Fallback to html raw export on error/chromedp failure
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.html\"", fileName))
			_, _ = w.Write([]byte(htmlContent))
			return
		}

		w.Header().Set("Content-Type", "application/pdf")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.pdf\"", fileName))
		_, _ = w.Write(pdfBytes)

	case "word":
		var docxBytes []byte
		if hierarchy {
			docxBytes, err = docExporter.BuildCombinedDOCX(doc, allDocs)
		} else {
			docxBytes, err = docExporter.BuildDOCX(doc.Title, doc.Content)
		}
		if err != nil {
			http.Error(w, fmt.Sprintf("Word DOCX generation failed: %s", err.Error()), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.docx\"", fileName))
		_, _ = w.Write(docxBytes)

	default:
		http.Error(w, "Unsupported export format", http.StatusBadRequest)
	}
}

type importRequest struct {
	TeamID    string               `json:"teamId"`
	ProjectID string               `json:"projectId"`
	ParentID  *string              `json:"parentId"`
	Tree      docExporter.JSONTree `json:"tree"`
}

func (h *DocumentHandler) Import(w http.ResponseWriter, r *http.Request) {
	var req importRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.TeamID == "" && req.ProjectID == "" {
		http.Error(w, "Either teamId or projectId is required", http.StatusBadRequest)
		return
	}

	userID, _ := middleware.GetUserID(r.Context())
	doc, err := h.importTree(r.Context(), req.Tree, req.TeamID, req.ProjectID, req.ParentID, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Hierarchy import failed: %s", err.Error()), http.StatusInternalServerError)
		return
	}

	if h.hub != nil {
		h.hub.BroadcastToAll(ws.WSMessage{Type: "document-tree-updated"})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(doc)
}

func (h *DocumentHandler) importTree(ctx context.Context, node docExporter.JSONTree, teamID, projectID string, parentID *string, userID string) (*domain.Document, error) {
	doc, err := h.docService.CreateDocument(ctx, node.Title, "", projectID, teamID, parentID, userID, nil)
	if err != nil {
		return nil, err
	}

	_, err = h.docService.UpdateDocument(ctx, doc.ID, node.Title, "", node.Content, userID, "Imported from JSON")
	if err != nil {
		return nil, err
	}

	for _, child := range node.Children {
		_, err = h.importTree(ctx, child, teamID, projectID, &doc.ID, userID)
		if err != nil {
			return nil, err
		}
	}

	return doc, nil
}

func sanitizeFileName(name string) string {
	invalid := []string{"/", "\\", "?", "%", "*", ":", "|", "\"", "<", ">", "."}
	res := name
	for _, char := range invalid {
		res = strings.ReplaceAll(res, char, "_")
	}
	res = strings.TrimSpace(res)
	if res == "" {
		res = "Untitled_Page"
	}
	return res
}

func (h *DocumentHandler) GetPermissions(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Document ID is required", http.StatusBadRequest)
		return
	}

	var classification string
	var inheritanceBroken bool
	var projectId string
	var teamId string
	err := h.db.QueryRow(r.Context(),
		"SELECT classification::text, inheritance_broken, COALESCE(project_id, ''), team_id FROM documents WHERE id = $1",
		id,
	).Scan(&classification, &inheritanceBroken, &projectId, &teamId)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to query document: %v", err), http.StatusInternalServerError)
		return
	}

	// Query principal_roles assignments and resolve usernames/team names
	query := `
		SELECT 
			pr.id, 
			pr.principal_kind, 
			pr.principal_id, 
			pr.role_id,
			COALESCE(u.display_name, u.username, '') as user_name,
			COALESCE(t.name, '') as team_name
		FROM principal_roles pr
		LEFT JOIN users u ON pr.principal_kind = 'user' AND pr.principal_id = u.id
		LEFT JOIN teams t ON pr.principal_kind = 'group' AND pr.principal_id = t.id
		WHERE pr.binding_values->>'id' = $1
	`
	rows, err := h.db.Query(r.Context(), query, id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to query role assignments: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Grant struct {
		ID          int64  `json:"id"`
		GranteeType string `json:"granteeType"`
		GranteeID   string `json:"granteeId"`
		GranteeName string `json:"granteeName"`
		RoleID      string `json:"roleId"`
	}

	var grants []Grant
	for rows.Next() {
		var g Grant
		var userName, teamName string
		if err := rows.Scan(&g.ID, &g.GranteeType, &g.GranteeID, &g.RoleID, &userName, &teamName); err != nil {
			http.Error(w, fmt.Sprintf("Failed to scan assignment: %v", err), http.StatusInternalServerError)
			return
		}
		if g.GranteeType == "user" && userName != "" {
			g.GranteeName = userName
		} else if g.GranteeType == "group" && teamName != "" {
			g.GranteeName = teamName
		} else {
			g.GranteeName = g.GranteeID
		}
		grants = append(grants, g)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"documentId":        id,
		"classification":    classification,
		"inheritanceBroken": inheritanceBroken,
		"projectId":         projectId,
		"teamId":            teamId,
		"grants":            grants,
	})
}

func (h *DocumentHandler) AddPermissionGrant(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Document ID is required", http.StatusBadRequest)
		return
	}

	var req struct {
		GranteeType string `json:"granteeType"`
		GranteeID   string `json:"granteeId"`
		RoleID      string `json:"roleId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var kind goperm.PrincipalKind
	switch req.GranteeType {
	case "user":
		kind = goperm.PrincipalUser
	case "group":
		kind = goperm.PrincipalGroup
	default:
		http.Error(w, "Invalid granteeType", http.StatusBadRequest)
		return
	}

	err := permissions.DocumentPermissions.GrantRole(r.Context(), req.RoleID, kind, req.GranteeID, id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to grant role: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *DocumentHandler) DeletePermissionGrant(w http.ResponseWriter, r *http.Request) {
	grantId := chi.URLParam(r, "grantId")
	if grantId == "" {
		http.Error(w, "Grant ID is required", http.StatusBadRequest)
		return
	}

	_, err := h.db.Exec(r.Context(), "DELETE FROM principal_roles WHERE id = $1", grantId)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to delete grant: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *DocumentHandler) UpdatePermissionSettings(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Document ID is required", http.StatusBadRequest)
		return
	}

	var req struct {
		Classification    string `json:"classification"`
		InheritanceBroken bool   `json:"inheritanceBroken"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err := h.db.Exec(r.Context(),
		"UPDATE documents SET classification = $1, inheritance_broken = $2 WHERE id = $3",
		req.Classification, req.InheritanceBroken, id,
	)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update document permissions settings: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *DocumentHandler) CreateShareLink(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Document ID is required", http.StatusBadRequest)
		return
	}

	var req struct {
		RoleID        string `json:"roleId"`
		Scope         string `json:"scope"`
		Password      string `json:"password"`
		ExpiresInDays int    `json:"expiresInDays"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Generate plain token
	rawBytes := make([]byte, 16)
	if _, err := cryptoRand.Read(rawBytes); err != nil {
		http.Error(w, "Failed to generate sharing token", http.StatusInternalServerError)
		return
	}
	plainToken := hex.EncodeToString(rawBytes)

	// Hash token
	hash := sha256.Sum256([]byte(plainToken))
	tokenHash := hex.EncodeToString(hash[:])

	// Hash password if set
	var passwordHash *string
	if req.Password != "" {
		pHashBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, "Failed to hash password", http.StatusInternalServerError)
			return
		}
		pHashStr := string(pHashBytes)
		passwordHash = &pHashStr
	}

	var expiresAt *time.Time
	if req.ExpiresInDays > 0 {
		exp := time.Now().AddDate(0, 0, req.ExpiresInDays)
		expiresAt = &exp
	}

	userID, _ := middleware.GetUserID(r.Context())

	_, err := h.db.Exec(r.Context(),
		`INSERT INTO sharing_links (token_hash, document_id, role_id, scope, password_hash, created_by, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		tokenHash, id, req.RoleID, req.Scope, passwordHash, userID, expiresAt,
	)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create sharing link: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"token":      plainToken,
		"documentId": id,
		"roleId":     req.RoleID,
		"scope":      req.Scope,
		"expiresAt":  expiresAt,
	})
}

func (h *DocumentHandler) ListShareLinks(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "Document ID is required", http.StatusBadRequest)
		return
	}

	rows, err := h.db.Query(r.Context(),
		`SELECT token_hash, role_id, scope, expires_at, created_at
		 FROM sharing_links
		 WHERE document_id = $1`,
		id,
	)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to query sharing links: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type ShareLink struct {
		TokenHash string     `json:"tokenHash"`
		RoleID    string     `json:"roleId"`
		Scope     string     `json:"scope"`
		ExpiresAt *time.Time `json:"expiresAt"`
		CreatedAt time.Time  `json:"createdAt"`
	}

	var links []ShareLink
	for rows.Next() {
		var l ShareLink
		if err := rows.Scan(&l.TokenHash, &l.RoleID, &l.Scope, &l.ExpiresAt, &l.CreatedAt); err != nil {
			http.Error(w, fmt.Sprintf("Failed to scan share link: %v", err), http.StatusInternalServerError)
			return
		}
		links = append(links, l)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(links)
}

func (h *DocumentHandler) DeleteShareLink(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	linkId := chi.URLParam(r, "linkId")
	if id == "" || linkId == "" {
		http.Error(w, "Document ID and linkId token hash are required", http.StatusBadRequest)
		return
	}

	_, err := h.db.Exec(r.Context(),
		"DELETE FROM sharing_links WHERE token_hash = $1 AND document_id = $2",
		linkId, id,
	)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to delete sharing link: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
