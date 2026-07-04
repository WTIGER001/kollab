package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"kollab/api/internal/domain"
	"kollab/api/internal/http/middleware"
)

type CommentHandler struct {
	commentService domain.CommentService
	userRepo       domain.UserRepository
}

func NewCommentHandler(commentService domain.CommentService, userRepo domain.UserRepository) *CommentHandler {
	return &CommentHandler{
		commentService: commentService,
		userRepo:       userRepo,
	}
}

func (h *CommentHandler) List(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	if docID == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	comments, err := h.commentService.ListByDocument(r.Context(), docID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(comments)
}

type CreateCommentRequest struct {
	ParentID      *string `json:"parentId"`
	AnchorID      *string `json:"anchorId"`
	Content       string  `json:"content"`
	CreatedByName *string `json:"createdByName"`
}

func (h *CommentHandler) Create(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	if docID == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok || userID == "" {
		http.Error(w, "Unauthorized: user not authenticated", http.StatusUnauthorized)
		return
	}

	username, _ := middleware.GetUsername(r.Context())

	var req CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request: invalid request body", http.StatusBadRequest)
		return
	}

	displayName := username
	if req.CreatedByName != nil && *req.CreatedByName != "" {
		displayName = *req.CreatedByName
	} else if user, err := h.userRepo.GetByUsername(r.Context(), username); err == nil && user.DisplayName != "" {
		displayName = user.DisplayName
	}

	comment, err := h.commentService.CreateComment(r.Context(), docID, req.ParentID, req.AnchorID, req.Content, userID, displayName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(comment)
}

type UpdateCommentRequest struct {
	Content string `json:"content"`
}

func (h *CommentHandler) Update(w http.ResponseWriter, r *http.Request) {
	commentID := chi.URLParam(r, "commentId")
	if commentID == "" {
		http.Error(w, "Bad Request: comment ID is required", http.StatusBadRequest)
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok || userID == "" {
		http.Error(w, "Unauthorized: user not authenticated", http.StatusUnauthorized)
		return
	}

	var req UpdateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request: invalid request body", http.StatusBadRequest)
		return
	}

	comment, err := h.commentService.UpdateComment(r.Context(), commentID, req.Content, userID)
	if err != nil {
		if err.Error() == "comment not found" {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		if len(err.Error()) >= 12 && err.Error()[:12] == "unauthorized" {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(comment)
}

func (h *CommentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	commentID := chi.URLParam(r, "commentId")
	if commentID == "" {
		http.Error(w, "Bad Request: comment ID is required", http.StatusBadRequest)
		return
	}

	userID, ok := middleware.GetUserID(r.Context())
	if !ok || userID == "" {
		http.Error(w, "Unauthorized: user not authenticated", http.StatusUnauthorized)
		return
	}

	err := h.commentService.DeleteComment(r.Context(), commentID, userID)
	if err != nil {
		if err.Error() == "comment not found" {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		if len(err.Error()) >= 12 && err.Error()[:12] == "unauthorized" {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
