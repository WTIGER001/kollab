package domain

import (
	"context"
	"time"
)

type Document struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Content     string     `json:"content"` // JSON string representation of Tiptap content
	ProjectID   string     `json:"projectId"`
	TeamID      string     `json:"teamId"`
	ParentID    *string    `json:"parentId"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	CreatedBy   string     `json:"createdBy"`   // display name or username
	UpdatedBy   string     `json:"updatedBy"`   // display name or username
	CreatedByID string     `json:"createdById"` // user ID
	UpdatedByID string     `json:"updatedById"` // user ID
	DeletedAt   *time.Time `json:"deletedAt,omitempty"`
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

type Favorite struct {
	UserID         string    `json:"userId"`
	DocumentID     string    `json:"documentId"`
	Title          string    `json:"title"`
	SpaceType      string    `json:"spaceType"` // "team" | "project" | "personal"
	SpaceName      string    `json:"spaceName"` // name of team or project
	TeamID         string    `json:"teamId"`
	ProjectID      string    `json:"projectId"`
	LastAccessedAt time.Time `json:"lastAccessedAt"`
	CreatedAt      time.Time `json:"createdAt"`
}

type DocumentRepository interface {
	GetByID(ctx context.Context, id string) (*Document, error)
	GetByProjectID(ctx context.Context, projectId string) ([]*Document, error)
	GetByTeamID(ctx context.Context, teamId string) ([]*Document, error)
	Create(ctx context.Context, doc *Document) error
	Update(ctx context.Context, doc *Document) error
	Delete(ctx context.Context, id string) error
	
	// Trash & Permanent Deletion
	GetTrashByProjectID(ctx context.Context, projectId string) ([]*Document, error)
	GetTrashByTeamID(ctx context.Context, teamId string) ([]*Document, error)
	Restore(ctx context.Context, id string) error
	DeletePermanently(ctx context.Context, id string) error

	// Versioning
	SaveVersion(ctx context.Context, version *DocumentVersion) error
	UpdateVersion(ctx context.Context, version *DocumentVersion) error
	GetVersions(ctx context.Context, docID string) ([]*DocumentVersion, error)
	GetVersionByID(ctx context.Context, versionID string) (*DocumentVersion, error)
	GetLatestVersion(ctx context.Context, docID string) (*DocumentVersion, error)

	// Search
	Search(ctx context.Context, query string, projectId string, embedding []float32) ([]*Document, error)
	UpdateEmbedding(ctx context.Context, docID string, embedding []float32) error

	// Analytics
	RecordView(ctx context.Context, id string, documentID string, userID string, viewedAt time.Time) error
	GetAnalytics(ctx context.Context, documentID string) (*DocumentAnalytics, error)
	GetRecent(ctx context.Context, userID string, filterType string) ([]*Document, error)

	// Favorites
	AddFavorite(ctx context.Context, userID string, documentID string) error
	RemoveFavorite(ctx context.Context, userID string, documentID string) error
	GetFavorites(ctx context.Context, userID string) ([]*Favorite, error)
	IsFavorite(ctx context.Context, userID string, documentID string) (bool, error)
}

type DocumentService interface {
	GetDocument(ctx context.Context, id string) (*Document, error)
	ListDocumentsByProject(ctx context.Context, projectId string) ([]*Document, error)
	ListDocumentsByTeam(ctx context.Context, teamId string) ([]*Document, error)
	CreateDocument(ctx context.Context, title string, projectId string, teamId string, parentId *string, userID string) (*Document, error)
	UpdateDocument(ctx context.Context, id string, title string, content string, userID string, changeSummary string) (*Document, error)
	MoveDocument(ctx context.Context, id string, parentID *string, projectID string, teamID string) (*Document, error)
	DeleteDocument(ctx context.Context, id string) error
	ListRecentDocuments(ctx context.Context, userID string, filterType string) ([]*Document, error)

	// Trash & Permanent Deletion
	ListTrashByProject(ctx context.Context, projectId string) ([]*Document, error)
	ListTrashByTeam(ctx context.Context, teamId string) ([]*Document, error)
	RestoreDocument(ctx context.Context, id string) (*Document, error)
	DeleteDocumentPermanently(ctx context.Context, id string) error

	// Versioning
	GetDocumentVersions(ctx context.Context, docID string) ([]*DocumentVersion, error)
	GetDocumentVersion(ctx context.Context, versionID string) (*DocumentVersion, error)
	RestoreDocumentVersion(ctx context.Context, docID string, versionID string, userID string) (*Document, error)
	CreateManualMilestone(ctx context.Context, docID string, summary string, userID string) (*DocumentVersion, error)
	GenerateSummary(ctx context.Context, title string, oldContent string, newContent string) (string, error)

	// Search
	SearchDocuments(ctx context.Context, query string, projectId string) ([]*Document, error)

	// Analytics
	RecordView(ctx context.Context, documentID string, userID string) error
	GetAnalytics(ctx context.Context, documentID string) (*DocumentAnalytics, error)

	// Favorites
	AddFavorite(ctx context.Context, userID string, documentID string) error
	RemoveFavorite(ctx context.Context, userID string, documentID string) error
	ListFavorites(ctx context.Context, userID string) ([]*Favorite, error)
	IsFavorite(ctx context.Context, userID string, documentID string) (bool, error)
	GetTasksByAssignee(ctx context.Context, username string) ([]*Task, error)
}

type AnalyticsDataPoint struct {
	Date           string `json:"date"`
	Views          int    `json:"views"`
	UniqueVisitors int    `json:"uniqueVisitors"`
}

type DocumentAnalytics struct {
	TotalViews      int                  `json:"totalViews"`
	TotalVisitors   int                  `json:"totalVisitors"`
	TrendPercentage float64              `json:"trendPercentage"`
	History         []AnalyticsDataPoint `json:"history"`
}
