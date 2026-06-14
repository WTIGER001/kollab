package attachment

import (
	"context"
	"errors"
	"sync"

	"arkollab/api/internal/domain"
)

type InMemoryAttachmentRepository struct {
	mu          sync.RWMutex
	attachments map[string]*domain.Attachment
}

func NewInMemoryAttachmentRepository() *InMemoryAttachmentRepository {
	return &InMemoryAttachmentRepository{
		attachments: make(map[string]*domain.Attachment),
	}
}

func (r *InMemoryAttachmentRepository) Save(ctx context.Context, att *domain.Attachment) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.attachments[att.ID] = att
	return nil
}

func (r *InMemoryAttachmentRepository) GetByID(ctx context.Context, id string) (*domain.Attachment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	att, ok := r.attachments[id]
	if !ok {
		return nil, errors.New("attachment not found")
	}
	return att, nil
}

func (r *InMemoryAttachmentRepository) ListByDocumentID(ctx context.Context, docID string) ([]*domain.Attachment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var list []*domain.Attachment
	for _, att := range r.attachments {
		if att.DocumentID == docID {
			list = append(list, att)
		}
	}
	return list, nil
}

func (r *InMemoryAttachmentRepository) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.attachments, id)
	return nil
}
