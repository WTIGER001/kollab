package tag

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"

	"arkollab/api/internal/domain"
)

type TagServiceImpl struct {
	repo domain.TagRepository
}

func NewTagService(repo domain.TagRepository) *TagServiceImpl {
	return &TagServiceImpl{
		repo: repo,
	}
}

func (s *TagServiceImpl) CreateTag(ctx context.Context, name string, description string, color string) (*domain.Tag, error) {
	cleanName := strings.ToLower(strings.TrimSpace(name))
	if cleanName == "" {
		return nil, errors.New("tag name cannot be empty")
	}

	existing, err := s.repo.GetByName(ctx, cleanName)
	if err == nil && existing != nil {
		return nil, errors.New("tag with this name already exists")
	}

	if color == "" {
		color = "#8b5cf6"
	}

	tag := &domain.Tag{
		ID:          uuid.New().String(),
		Name:        cleanName,
		Description: strings.TrimSpace(description),
		Color:       color,
		CreatedAt:   time.Now(),
	}

	if err := s.repo.Create(ctx, tag); err != nil {
		return nil, err
	}
	return tag, nil
}

func (s *TagServiceImpl) GetTag(ctx context.Context, id string) (*domain.Tag, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *TagServiceImpl) ListTags(ctx context.Context) ([]*domain.Tag, error) {
	return s.repo.List(ctx)
}

func (s *TagServiceImpl) UpdateTag(ctx context.Context, id string, name string, description string, color string) (*domain.Tag, error) {
	tag, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	cleanName := strings.ToLower(strings.TrimSpace(name))
	if cleanName == "" {
		return nil, errors.New("tag name cannot be empty")
	}

	if cleanName != tag.Name {
		existing, err := s.repo.GetByName(ctx, cleanName)
		if err == nil && existing != nil {
			return nil, errors.New("tag with this name already exists")
		}
	}

	tag.Name = cleanName
	tag.Description = strings.TrimSpace(description)
	if color != "" {
		tag.Color = color
	}

	if err := s.repo.Update(ctx, tag); err != nil {
		return nil, err
	}
	return tag, nil
}

func (s *TagServiceImpl) DeleteTag(ctx context.Context, id string) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	return s.repo.Delete(ctx, id)
}

func (s *TagServiceImpl) AddTagToDocument(ctx context.Context, docID string, tagID string) error {
	return s.repo.AddTagToDocument(ctx, docID, tagID)
}

func (s *TagServiceImpl) RemoveTagFromDocument(ctx context.Context, docID string, tagID string) error {
	return s.repo.RemoveTagFromDocument(ctx, docID, tagID)
}

func (s *TagServiceImpl) GetDocumentTags(ctx context.Context, docID string) ([]*domain.Tag, error) {
	return s.repo.GetDocumentTags(ctx, docID)
}

func (s *TagServiceImpl) GetAllDocumentTags(ctx context.Context) (map[string][]*domain.Tag, error) {
	return s.repo.GetAllDocumentTags(ctx)
}
