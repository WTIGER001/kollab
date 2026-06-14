package domain

import (
	"context"
)

// FileStorage abstracts the file persistence system (local, S3, Azure, etc.)
type FileStorage interface {
	Save(ctx context.Context, key string, data []byte) error
	Get(ctx context.Context, key string) ([]byte, error)
	Delete(ctx context.Context, key string) error
}
