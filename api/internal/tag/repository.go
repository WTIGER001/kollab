package tag

import (
	"context"
	"errors"
	"sync"

	"arkollab/api/internal/domain"
)

type InMemoryTagRepository struct {
	mu           sync.RWMutex
	tags         map[string]*domain.Tag
	documentTags map[string][]string
}

func NewInMemoryTagRepository() *InMemoryTagRepository {
	return &InMemoryTagRepository{
		tags:         make(map[string]*domain.Tag),
		documentTags: make(map[string][]string),
	}
}

func (r *InMemoryTagRepository) Create(ctx context.Context, tag *domain.Tag) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.tags[tag.ID]; exists {
		return errors.New("tag already exists")
	}
	r.tags[tag.ID] = tag
	return nil
}

func (r *InMemoryTagRepository) GetByID(ctx context.Context, id string) (*domain.Tag, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	tag, exists := r.tags[id]
	if !exists {
		return nil, errors.New("tag not found")
	}
	return tag, nil
}

func (r *InMemoryTagRepository) GetByName(ctx context.Context, name string) (*domain.Tag, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, tag := range r.tags {
		if tag.Name == name {
			return tag, nil
		}
	}
	return nil, errors.New("tag not found")
}

func (r *InMemoryTagRepository) List(ctx context.Context) ([]*domain.Tag, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*domain.Tag
	for _, tag := range r.tags {
		count := 0
		for _, tagIDs := range r.documentTags {
			for _, tid := range tagIDs {
				if tid == tag.ID {
					count++
				}
			}
		}
		tCopy := *tag
		tCopy.PageCount = count
		result = append(result, &tCopy)
	}
	return result, nil
}

func (r *InMemoryTagRepository) Update(ctx context.Context, tag *domain.Tag) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, exists := r.tags[tag.ID]
	if !exists {
		return errors.New("tag not found")
	}
	existing.Name = tag.Name
	existing.Description = tag.Description
	existing.Color = tag.Color
	return nil
}

func (r *InMemoryTagRepository) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.tags, id)

	for docID, tagIDs := range r.documentTags {
		var newTagIDs []string
		for _, tid := range tagIDs {
			if tid != id {
				newTagIDs = append(newTagIDs, tid)
			}
		}
		r.documentTags[docID] = newTagIDs
	}
	return nil
}

func (r *InMemoryTagRepository) AddTagToDocument(ctx context.Context, docID string, tagID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	tagIDs := r.documentTags[docID]
	for _, tid := range tagIDs {
		if tid == tagID {
			return nil
		}
	}
	r.documentTags[docID] = append(tagIDs, tagID)
	return nil
}

func (r *InMemoryTagRepository) RemoveTagFromDocument(ctx context.Context, docID string, tagID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	tagIDs := r.documentTags[docID]
	var newTagIDs []string
	for _, tid := range tagIDs {
		if tid != tagID {
			newTagIDs = append(newTagIDs, tid)
		}
	}
	r.documentTags[docID] = newTagIDs
	return nil
}

func (r *InMemoryTagRepository) GetDocumentTags(ctx context.Context, docID string) ([]*domain.Tag, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	tagIDs := r.documentTags[docID]
	var result []*domain.Tag
	for _, tid := range tagIDs {
		if tag, exists := r.tags[tid]; exists {
			result = append(result, tag)
		}
	}
	return result, nil
}
