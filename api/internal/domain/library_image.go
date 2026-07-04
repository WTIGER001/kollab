package domain

import (
	"context"
	"time"
)

// LibraryImage matches the frontend LibraryImage model.
type LibraryImage struct {
	ID          string    `json:"id"`
	ImageID     string    `json:"-"` // Internal use, for referencing the actual file
	Filename    string    `json:"filename"`
	DisplayName string    `json:"displayName"`
	MimeType    string    `json:"mimeType"`
	SizeBytes   int64     `json:"sizeBytes"`
	URL         string    `json:"url"`
	Scope       string    `json:"scope"`
	TeamID      *string   `json:"teamId,omitempty"`
	ProjectID   *string   `json:"projectId,omitempty"`
	UploadedBy   string    `json:"uploadedBy"` // This is the user ID
	UploaderName string    `json:"uploaderName"` // This is the user's display name
	CreatedAt    time.Time `json:"createdAt"`
}

type LibraryImageRepository interface {
	Save(ctx context.Context, img *LibraryImage) error
	List(ctx context.Context, scope string, teamID *string, projectID *string) ([]*LibraryImage, error)
	Get(ctx context.Context, id string) (*LibraryImage, error)
	UpdateName(ctx context.Context, id string, name string) error
	Delete(ctx context.Context, id string) error
}

type LibraryImageService interface {
	Upload(ctx context.Context, fileData []byte, filename string, mimeType string, displayName string, scope string, teamID *string, projectID *string, userID string) (*LibraryImage, error)
	List(ctx context.Context, scope string, teamID *string, projectID *string) ([]*LibraryImage, error)
	UpdateName(ctx context.Context, id string, name string) (*LibraryImage, error)
	Delete(ctx context.Context, id string) error
}
