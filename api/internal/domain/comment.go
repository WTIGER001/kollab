package domain

import (
	"context"
	"time"
)

type Comment struct {
	ID            string    `json:"id"`
	DocumentID    string    `json:"documentId"`
	ParentID      *string   `json:"parentId,omitempty"`
	Content       string    `json:"content"`
	CreatedBy     string    `json:"createdBy"`
	CreatedByName string    `json:"createdByName"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type CommentRepository interface {
	GetByDocumentID(ctx context.Context, docID string) ([]*Comment, error)
	GetByID(ctx context.Context, id string) (*Comment, error)
	Create(ctx context.Context, comment *Comment) error
	Update(ctx context.Context, comment *Comment) error
	Delete(ctx context.Context, id string) error
}

type CommentService interface {
	ListByDocument(ctx context.Context, docID string) ([]*Comment, error)
	CreateComment(ctx context.Context, docID string, parentID *string, content, userID, userDisplayName string) (*Comment, error)
	UpdateComment(ctx context.Context, id, content, userID string) (*Comment, error)
	DeleteComment(ctx context.Context, id, userID string) error
}
