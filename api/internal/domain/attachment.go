package domain

import (
	"context"
	"time"
)

type Attachment struct {
	ID         string    `json:"id"`
	DocumentID string    `json:"documentId"`
	Filename   string    `json:"filename"`
	MimeType   string    `json:"mimeType"`
	FileSize   int64     `json:"fileSize"`
	StorageKey string    `json:"storageKey"`
	UploadedBy string    `json:"uploadedBy"`
	UploadedAt time.Time `json:"uploadedAt"`
}

type PreviewStatus struct {
	AttachmentID string    `json:"attachmentId"`
	Status       string    `json:"status"` // pending, converting_aspose, converting_libreoffice, completed, failed
	Progress     int       `json:"progress"`
	Format       string    `json:"format"` // html, pdf
	ErrorMessage string    `json:"errorMessage,omitempty"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type AttachmentRepository interface {
	Save(ctx context.Context, att *Attachment) error
	GetByID(ctx context.Context, id string) (*Attachment, error)
	ListByDocumentID(ctx context.Context, docID string) ([]*Attachment, error)
	Delete(ctx context.Context, id string) error
	SavePreviewStatus(ctx context.Context, status *PreviewStatus) error
	GetPreviewStatus(ctx context.Context, attachmentID string) (*PreviewStatus, error)
}

type AttachmentService interface {
	UploadAttachment(ctx context.Context, docID string, filename string, mimeType string, data []byte, userID string) (*Attachment, error)
	GetAttachmentFile(ctx context.Context, id string) ([]byte, *Attachment, error)
	GetAttachmentPreview(ctx context.Context, id string) ([]byte, *Attachment, error)
	ListAttachments(ctx context.Context, docID string) ([]*Attachment, error)
	DeleteAttachment(ctx context.Context, id string) error

	// New Preview Operations
	GetPreviewStatus(ctx context.Context, id string) (*PreviewStatus, error)
	RetryPreviewGeneration(ctx context.Context, id string) error
	GetPreviewFile(ctx context.Context, id string, filepath string) ([]byte, string, error)

	// Aspose Admin Settings
	GetAsposeConfig(ctx context.Context) (*AsposeConfig, error)
	UpdateAsposeConfig(ctx context.Context, enabled bool, licenseXml string) (*AsposeConfig, error)
}

type AsposeConfig struct {
	AsposeEnabled  bool   `json:"asposeEnabled"`
	AsposeLicensed bool   `json:"asposeLicensed"`
	AsposeLicense  string `json:"asposeLicense,omitempty"`
}

