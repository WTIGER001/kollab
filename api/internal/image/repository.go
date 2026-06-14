package image

import (
	"context"
	"errors"
	"sync"

	"arkollab/api/internal/domain"
)

type InMemoryImageRepository struct {
	mu     sync.RWMutex
	images map[string]*domain.ImageMetadata
}

func NewInMemoryImageRepository() *InMemoryImageRepository {
	return &InMemoryImageRepository{
		images: make(map[string]*domain.ImageMetadata),
	}
}

func (r *InMemoryImageRepository) SaveMetadata(ctx context.Context, img *domain.ImageMetadata) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.images[img.ID] = img
	return nil
}

func (r *InMemoryImageRepository) GetMetadata(ctx context.Context, id string) (*domain.ImageMetadata, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	img, exists := r.images[id]
	if !exists {
		return nil, errors.New("image metadata not found")
	}
	return img, nil
}

func (r *InMemoryImageRepository) DeleteMetadata(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.images, id)
	return nil
}
