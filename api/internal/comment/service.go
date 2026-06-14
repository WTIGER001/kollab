package comment

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"

	"arkollab/api/internal/domain"
)

type CommentServiceImpl struct {
	repo domain.CommentRepository
}

func NewCommentService(repo domain.CommentRepository) *CommentServiceImpl {
	return &CommentServiceImpl{
		repo: repo,
	}
}

func (s *CommentServiceImpl) ListByDocument(ctx context.Context, docID string) ([]*domain.Comment, error) {
	return s.repo.GetByDocumentID(ctx, docID)
}

func (s *CommentServiceImpl) CreateComment(ctx context.Context, docID string, parentID *string, content, userID, userDisplayName string) (*domain.Comment, error) {
	cleanContent := strings.TrimSpace(content)
	if cleanContent == "" {
		return nil, errors.New("comment content cannot be empty")
	}

	if parentID != nil && *parentID != "" {
		parent, err := s.repo.GetByID(ctx, *parentID)
		if err != nil {
			return nil, errors.New("parent comment not found")
		}
		if parent.DocumentID != docID {
			return nil, errors.New("parent comment does not belong to this document")
		}
	} else {
		parentID = nil
	}

	now := time.Now()
	comment := &domain.Comment{
		ID:            uuid.New().String(),
		DocumentID:    docID,
		ParentID:      parentID,
		Content:       cleanContent,
		CreatedBy:     userID,
		CreatedByName: userDisplayName,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := s.repo.Create(ctx, comment); err != nil {
		return nil, err
	}
	return comment, nil
}

func (s *CommentServiceImpl) UpdateComment(ctx context.Context, id, content, userID string) (*domain.Comment, error) {
	cleanContent := strings.TrimSpace(content)
	if cleanContent == "" {
		return nil, errors.New("comment content cannot be empty")
	}

	comment, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if comment.CreatedBy != userID {
		return nil, errors.New("unauthorized: only the comment author can edit it")
	}

	comment.Content = cleanContent
	comment.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, comment); err != nil {
		return nil, err
	}
	return comment, nil
}

func (s *CommentServiceImpl) DeleteComment(ctx context.Context, id, userID string) error {
	comment, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if comment.CreatedBy != userID {
		return errors.New("unauthorized: only the comment author can delete it")
	}

	return s.repo.Delete(ctx, id)
}
