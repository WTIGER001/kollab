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

type AttachmentRepository interface {
	Save(ctx context.Context, att *Attachment) error
	GetByID(ctx context.Context, id string) (*Attachment, error)
	ListByDocumentID(ctx context.Context, docID string) ([]*Attachment, error)
	Delete(ctx context.Context, id string) error
}

type AttachmentService interface {
	UploadAttachment(ctx context.Context, docID string, filename string, mimeType string, data []byte, userID string) (*Attachment, error)
	GetAttachmentFile(ctx context.Context, id string) ([]byte, *Attachment, error)
	GetAttachmentPreview(ctx context.Context, id string) ([]byte, *Attachment, error)
	ListAttachments(ctx context.Context, docID string) ([]*Attachment, error)
	DeleteAttachment(ctx context.Context, id string) error
}
