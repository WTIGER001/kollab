package domain

import (
	"context"
	"time"
)

type Tag struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Color       string    `json:"color"`
	CreatedAt   time.Time `json:"createdAt"`
	PageCount   int       `json:"pageCount,omitempty"`
}

type TagRepository interface {
	Create(ctx context.Context, tag *Tag) error
	GetByID(ctx context.Context, id string) (*Tag, error)
	GetByName(ctx context.Context, name string) (*Tag, error)
	List(ctx context.Context) ([]*Tag, error)
	Update(ctx context.Context, tag *Tag) error
	Delete(ctx context.Context, id string) error

	AddTagToDocument(ctx context.Context, docID string, tagID string) error
	RemoveTagFromDocument(ctx context.Context, docID string, tagID string) error
	GetDocumentTags(ctx context.Context, docID string) ([]*Tag, error)
}

type TagService interface {
	CreateTag(ctx context.Context, name string, description string, color string) (*Tag, error)
	GetTag(ctx context.Context, id string) (*Tag, error)
	ListTags(ctx context.Context) ([]*Tag, error)
	UpdateTag(ctx context.Context, id string, name string, description string, color string) (*Tag, error)
	DeleteTag(ctx context.Context, id string) error

	AddTagToDocument(ctx context.Context, docID string, tagID string) error
	RemoveTagFromDocument(ctx context.Context, docID string, tagID string) error
	GetDocumentTags(ctx context.Context, docID string) ([]*Tag, error)
}
