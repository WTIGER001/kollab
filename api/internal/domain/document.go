package domain

import (
	"context"
	"time"
)

type Document struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"` // JSON string representation of Tiptap content
	ProjectID string    `json:"projectId"`
	ParentID  *string   `json:"parentId"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type DocumentVersion struct {
	ID            string    `json:"id"`
	DocumentID    string    `json:"documentId"`
	Content       string    `json:"content"`
	VersionNumber int       `json:"versionNumber"`
	CreatedBy     *string   `json:"createdBy"`
	ChangeSummary *string   `json:"changeSummary"`
	CreatedAt     time.Time `json:"createdAt"`
}

type DocumentRepository interface {
	GetByID(ctx context.Context, id string) (*Document, error)
	GetByProjectID(ctx context.Context, projectId string) ([]*Document, error)
	Create(ctx context.Context, doc *Document) error
	Update(ctx context.Context, doc *Document) error
	Delete(ctx context.Context, id string) error
	
	// Versioning
	SaveVersion(ctx context.Context, version *DocumentVersion) error
	GetVersions(ctx context.Context, docID string) ([]*DocumentVersion, error)
	GetVersionByID(ctx context.Context, versionID string) (*DocumentVersion, error)
	GetLatestVersion(ctx context.Context, docID string) (*DocumentVersion, error)

	// Search
	Search(ctx context.Context, query string, projectId string, embedding []float32) ([]*Document, error)
	UpdateEmbedding(ctx context.Context, docID string, embedding []float32) error
}

type DocumentService interface {
	GetDocument(ctx context.Context, id string) (*Document, error)
	ListDocumentsByProject(ctx context.Context, projectId string) ([]*Document, error)
	CreateDocument(ctx context.Context, title string, projectId string, parentId *string) (*Document, error)
	UpdateDocument(ctx context.Context, id string, title string, content string, userID string) (*Document, error)
	DeleteDocument(ctx context.Context, id string) error

	// Versioning
	GetDocumentVersions(ctx context.Context, docID string) ([]*DocumentVersion, error)
	GetDocumentVersion(ctx context.Context, versionID string) (*DocumentVersion, error)
	RestoreDocumentVersion(ctx context.Context, docID string, versionID string, userID string) (*Document, error)
	CreateManualMilestone(ctx context.Context, docID string, summary string, userID string) (*DocumentVersion, error)

	// Search
	SearchDocuments(ctx context.Context, query string, projectId string) ([]*Document, error)
}
