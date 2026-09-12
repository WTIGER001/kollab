package postgres

import (
	"testing"
	"time"

	"kollab/api/internal/domain"
)

func TestPostgresCommentRepository(t *testing.T) {
	db, ctx := setupTestDB(t)
	repo := NewPostgresCommentRepository(db)

	docRepo := NewPostgresDocumentRepository(db)
	doc := &domain.Document{
		ID:          "doc_for_cmt",
		Title:       "Cmt Doc",
		Slug:        "cmt-doc",
		ProjectID:   "proj_wiki",
		TeamID:      "team_eng",
		CreatedByID: "sh4ag0cxowti",
		UpdatedByID: "sh4ag0cxowti",
		Content:     "{}",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	_ = docRepo.Create(ctx, doc)

	comment := &domain.Comment{
		ID:            "cmt_1",
		DocumentID:    "doc_for_cmt",
		CreatedBy:     "sh4ag0cxowti",
		CreatedByName: "sh4ag0cxowti",
		Content:       "This is a comment",
		CreatedAt:     time.Now(),
	}

	if err := repo.Create(ctx, comment); err != nil {
		t.Fatalf("failed to create comment: %v", err)
	}

	fetched, err := repo.GetByID(ctx, "cmt_1")
	if err != nil {
		t.Fatalf("failed to get comment: %v", err)
	}

	if fetched.Content != "This is a comment" {
		t.Errorf("expected comment content, got %s", fetched.Content)
	}

	list, err := repo.GetByDocumentID(ctx, "doc_for_cmt")
	if err != nil {
		t.Fatalf("failed to list comments: %v", err)
	}
	if len(list) == 0 {
		t.Error("expected at least 1 comment")
	}

	if err := repo.Delete(ctx, "cmt_1"); err != nil {
		t.Fatalf("failed to delete comment: %v", err)
	}
}
