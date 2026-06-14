package domain

import (
	"context"
	"time"
)

type ImageMetadata struct {
	ID             string    `json:"id"`
	Filename       string    `json:"filename"`
	MimeType       string    `json:"mimeType"`
	OriginalWidth  int       `json:"originalWidth"`
	OriginalHeight int       `json:"originalHeight"`
	CreatedAt      time.Time `json:"createdAt"`
}

type ImageRepository interface {
	SaveMetadata(ctx context.Context, img *ImageMetadata) error
	GetMetadata(ctx context.Context, id string) (*ImageMetadata, error)
	DeleteMetadata(ctx context.Context, id string) error
}

type ImageService interface {
	UploadImage(ctx context.Context, filename string, mimeType string, data []byte) (*ImageMetadata, error)
	GetImageFile(ctx context.Context, id string, size string) ([]byte, string, error) // Returns data, mimeType, error
	DeleteImage(ctx context.Context, id string) error
}
