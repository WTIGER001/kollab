package comment

import (
	"context"
	"errors"
	"testing"
	"kollab/api/internal/domain"
)

type mockCommentRepo struct{}

func (m *mockCommentRepo) GetByDocumentID(ctx context.Context, docID string) ([]*domain.Comment, error) {
	if docID == "doc1" {
		return []*domain.Comment{{ID: "c1", Content: "Hello"}}, nil
	}
	return nil, nil
}

func (m *mockCommentRepo) GetByID(ctx context.Context, id string) (*domain.Comment, error) {
	if id == "c1" {
		return &domain.Comment{ID: "c1", Content: "Hello", CreatedBy: "user1", DocumentID: "doc1"}, nil
	}
	return nil, errors.New("not found")
}

func (m *mockCommentRepo) Create(ctx context.Context, comment *domain.Comment) error {
	return nil
}

func (m *mockCommentRepo) Update(ctx context.Context, comment *domain.Comment) error {
	return nil
}

func (m *mockCommentRepo) Delete(ctx context.Context, id string) error {
	return nil
}

func TestListByDocument(t *testing.T) {
	svc := NewCommentService(&mockCommentRepo{})
	comments, err := svc.ListByDocument(context.Background(), "doc1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(comments) != 1 {
		t.Errorf("expected 1 comment, got %d", len(comments))
	}
}

func TestCreateComment(t *testing.T) {
	svc := NewCommentService(&mockCommentRepo{})

	// Success case
	comment, err := svc.CreateComment(context.Background(), "doc1", nil, nil, "New comment", "user1", "User One")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if comment.Content != "New comment" {
		t.Errorf("expected 'New comment', got %s", comment.Content)
	}

	// Empty content case
	_, err = svc.CreateComment(context.Background(), "doc1", nil, nil, "  ", "user1", "User One")
	if err == nil {
		t.Error("expected error for empty content")
	}

	// Valid parent case
	parent := "c1"
	_, err = svc.CreateComment(context.Background(), "doc1", &parent, nil, "Reply", "user1", "User One")
	if err != nil {
		t.Fatalf("unexpected error for valid parent: %v", err)
	}
}

func TestUpdateComment(t *testing.T) {
	svc := NewCommentService(&mockCommentRepo{})

	// Success case
	comment, err := svc.UpdateComment(context.Background(), "c1", "Updated comment", "user1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if comment.Content != "Updated comment" {
		t.Errorf("expected 'Updated comment', got %s", comment.Content)
	}

	// Unauthorized case
	_, err = svc.UpdateComment(context.Background(), "c1", "Updated comment", "user2")
	if err == nil {
		t.Error("expected unauthorized error")
	}

	// Empty content case
	_, err = svc.UpdateComment(context.Background(), "c1", "", "user1")
	if err == nil {
		t.Error("expected empty content error")
	}
}

func TestDeleteComment(t *testing.T) {
	svc := NewCommentService(&mockCommentRepo{})

	// Success case
	err := svc.DeleteComment(context.Background(), "c1", "user1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Unauthorized case
	err = svc.DeleteComment(context.Background(), "c1", "user2")
	if err == nil {
		t.Error("expected unauthorized error")
	}
}
