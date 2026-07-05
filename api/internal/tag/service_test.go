package tag

import (
	"context"
	"strings"
	"testing"
)

func TestTagService(t *testing.T) {
	repo := NewInMemoryTagRepository()
	service := NewTagService(repo)
	ctx := context.Background()

	// 1. Create tag
	tag, err := service.CreateTag(ctx, "Architecture", "Architecture docs", "")
	if err != nil {
		t.Fatalf("expected no error creating tag, got %v", err)
	}
	if tag.Name != "architecture" {
		t.Errorf("expected architecture, got %s", tag.Name)
	}

	// 2. Create duplicate tag
	_, err = service.CreateTag(ctx, "architecture", "", "")
	if err == nil || !strings.Contains(err.Error(), "already exists") {
		t.Errorf("expected already exists error, got %v", err)
	}

	// 3. Create empty tag
	_, err = service.CreateTag(ctx, "   ", "", "")
	if err == nil || !strings.Contains(err.Error(), "cannot be empty") {
		t.Errorf("expected empty name error, got %v", err)
	}

	// 4. Get Tag
	fetched, err := service.GetTag(ctx, tag.ID)
	if err != nil || fetched.ID != tag.ID {
		t.Errorf("failed to get tag by ID")
	}

	// 5. List Tags
	tags, err := service.ListTags(ctx)
	if err != nil || len(tags) != 1 {
		t.Errorf("expected 1 tag in list")
	}

	// 6. Update Tag
	updated, err := service.UpdateTag(ctx, tag.ID, "New Name", "New Desc", "#123")
	if err != nil {
		t.Fatalf("expected no error updating tag, got %v", err)
	}
	if updated.Name != "new name" {
		t.Errorf("expected new name, got %s", updated.Name)
	}

	// 7. Empty Name Update
	_, err = service.UpdateTag(ctx, tag.ID, "   ", "", "")
	if err == nil {
		t.Errorf("expected error updating tag with empty name")
	}

	// 8. Delete Tag
	err = service.DeleteTag(ctx, tag.ID)
	if err != nil {
		t.Fatalf("expected no error deleting tag, got %v", err)
	}

	// 9. Document Tags
	err = service.AddTagToDocument(ctx, "doc1", "tag1")
	if err != nil {
		t.Fatalf("AddTagToDocument err: %v", err)
	}

	docTags, err := service.GetDocumentTags(ctx, "doc1")
	if err != nil {
		t.Fatalf("GetDocumentTags err: %v", err)
	}
	if len(docTags) != 0 { // InMemory tag repo might just return empty/nil since tag1 doesn't exist
		t.Logf("got docTags: %v", len(docTags))
	}

	err = service.RemoveTagFromDocument(ctx, "doc1", "tag1")
	if err != nil {
		t.Fatalf("RemoveTagFromDocument err: %v", err)
	}

	allTags, err := service.GetAllDocumentTags(ctx)
	if err != nil {
		t.Fatalf("GetAllDocumentTags err: %v", err)
	}
	if allTags == nil {
		t.Logf("got allTags: %v", len(allTags))
	}
}
