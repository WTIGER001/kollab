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
		ID:        "tag_1",
		Name:      "test-tag",
		Color:     "#ffffff",
		CreatedAt: time.Now(),
	}

	if err := repo.Create(ctx, tag); err != nil {
		t.Fatalf("failed to create tag: %v", err)
	}

	fetched, err := repo.GetByName(ctx, "test-tag")
	if err != nil || fetched.ID != "tag_1" {
		t.Fatalf("failed to fetch tag by name: %v", err)
	}
	fetched, err = repo.GetByID(ctx, "tag_1")
	if err != nil || fetched.Name != "test-tag" {
		t.Fatalf("failed to fetch tag by ID: %#v (%v)", fetched, err)
	}
	tag.Name = "updated-tag"
	tag.Description = "A tag updated through PostgreSQL"
	tag.Color = "#123456"
	if err := repo.Update(ctx, tag); err != nil {
		t.Fatalf("failed to update tag: %v", err)
	}
	fetched, err = repo.GetByName(ctx, "updated-tag")
	if err != nil || fetched.Description != tag.Description || fetched.Color != tag.Color {
		t.Fatalf("updated tag was not persisted: %#v (%v)", fetched, err)
	}

	tags, err := repo.List(ctx)
	if err != nil || len(tags) == 0 {
		t.Fatalf("failed to list tags")
	}

	// For apply, we need a document
	docRepo := NewPostgresDocumentRepository(db)
	doc := &domain.Document{
		ID:          "doc_for_tag",
		Title:       "Tag Doc",
		Slug:        "tag-doc",
		ProjectID:   "proj_wiki",
		TeamID:      "team_eng",
		CreatedByID: "sh4ag0cxowti",
		UpdatedByID: "sh4ag0cxowti",
		Content:     "{}",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	_ = docRepo.Create(ctx, doc)

	if err := repo.AddTagToDocument(ctx, "doc_for_tag", "tag_1"); err != nil {
		t.Fatalf("failed to apply tag to document: %v", err)
	}
	documentTags, err := repo.GetDocumentTags(ctx, "doc_for_tag")
	if err != nil || len(documentTags) != 1 || documentTags[0].ID != tag.ID {
		t.Fatalf("failed to get document tags: %#v (%v)", documentTags, err)
	}
	allDocumentTags, err := repo.GetAllDocumentTags(ctx)
	if err != nil || len(allDocumentTags["doc_for_tag"]) != 1 {
		t.Fatalf("failed to get all document tags: %#v (%v)", allDocumentTags, err)
	}
	if err := repo.RemoveTagFromDocument(ctx, "doc_for_tag", "tag_1"); err != nil {
		t.Fatalf("failed to remove tag from document: %v", err)
	}
	documentTags, err = repo.GetDocumentTags(ctx, "doc_for_tag")
	if err != nil || len(documentTags) != 0 {
		t.Fatalf("expected no document tags after removal: %#v (%v)", documentTags, err)
	}
	if err := repo.Delete(ctx, "tag_1"); err != nil {
		t.Fatalf("failed to delete tag: %v", err)
	}
	if _, err := repo.GetByID(ctx, "tag_1"); err == nil {
		t.Fatal("expected deleted tag lookup to fail")
	}
}
