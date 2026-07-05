package postgres

import (
	"testing"
	"time"

	"kollab/api/internal/domain"
)

func TestPostgresTagRepository(t *testing.T) {
	db, ctx := setupTestDB(t)
	repo := NewPostgresTagRepository(db)

	tag := &domain.Tag{
		ID: "tag_1",
		Name: "test-tag",
		Color: "#ffffff",
		CreatedAt: time.Now(),
	}

	if err := repo.Create(ctx, tag); err != nil {
		t.Fatalf("failed to create tag: %v", err)
	}

	fetched, err := repo.GetByName(ctx, "test-tag")
	if err != nil || fetched.ID != "tag_1" {
		t.Fatalf("failed to fetch tag by name: %v", err)
	}

	tags, err := repo.List(ctx)
	if err != nil || len(tags) == 0 {
		t.Fatalf("failed to list tags")
	}

	// For apply, we need a document
	docRepo := NewPostgresDocumentRepository(db)
	doc := &domain.Document{
		ID: "doc_for_tag",
		Title: "Tag Doc",
		Slug: "tag-doc",
		ProjectID: "proj_wiki",
		TeamID: "team_eng",
		CreatedByID: "sh4ag0cxowti",
		UpdatedByID: "sh4ag0cxowti",
		Content: "{}",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	_ = docRepo.Create(ctx, doc)

	if err := repo.AddTagToDocument(ctx, "doc_for_tag", "tag_1"); err != nil {
		t.Fatalf("failed to apply tag to document: %v", err)
	}
}
