package comment

import (
	"context"
	"errors"
	"sync"

	"arkollab/api/internal/domain"
)

type InMemoryCommentRepository struct {
	mu       sync.RWMutex
	comments map[string]*domain.Comment
}

func NewInMemoryCommentRepository() *InMemoryCommentRepository {
	return &InMemoryCommentRepository{
		comments: make(map[string]*domain.Comment),
	}
}

func (r *InMemoryCommentRepository) GetByDocumentID(ctx context.Context, docID string) ([]*domain.Comment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*domain.Comment
	for _, c := range r.comments {
		if c.DocumentID == docID {
			cp := *c
			result = append(result, &cp)
		}
	}
	return result, nil
}

func (r *InMemoryCommentRepository) GetByID(ctx context.Context, id string) (*domain.Comment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	c, ok := r.comments[id]
	if !ok {
		return nil, errors.New("comment not found")
	}
	cp := *c
	return &cp, nil
}

func (r *InMemoryCommentRepository) Create(ctx context.Context, comment *domain.Comment) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.comments[comment.ID] = comment
	return nil
}

func (r *InMemoryCommentRepository) Update(ctx context.Context, comment *domain.Comment) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.comments[comment.ID]; !ok {
		return errors.New("comment not found")
	}
	r.comments[comment.ID] = comment
	return nil
}

func (r *InMemoryCommentRepository) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.comments[id]; !ok {
		return errors.New("comment not found")
	}
	delete(r.comments, id)
	return nil
}
