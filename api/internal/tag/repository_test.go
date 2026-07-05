package tag

import (
	"context"
	"testing"
	"kollab/api/internal/domain"
)

func TestInMemoryTagRepository(t *testing.T) {
	repo := NewInMemoryTagRepository()
	ctx := context.Background()

	// Create
	tag := &domain.Tag{
		ID: "tag_1",
		Name: "test tag",
	}
	err := repo.Create(ctx, tag)
	if err != nil {
		t.Fatalf("expected no error creating tag, got %v", err)
	}

	// Get by ID
	fetched, err := repo.GetByID(ctx, "tag_1")
	if err != nil || fetched.Name != "test tag" {
		t.Errorf("failed to fetch tag by ID")
	}

	// Get by Name
	fetchedByName, err := repo.GetByName(ctx, "test tag")
	if err != nil || fetchedByName.ID != "tag_1" {
		t.Errorf("failed to fetch tag by Name")
	}

	// List
	tags, err := repo.List(ctx)
	if err != nil || len(tags) != 1 {
		t.Errorf("expected 1 tag in list")
	}

	// Update
	tag.Name = "updated tag"
	err = repo.Update(ctx, tag)
	if err != nil {
		t.Errorf("failed to update tag: %v", err)
	}

	// Delete
	err = repo.Delete(ctx, "tag_1")
	if err != nil {
		t.Errorf("failed to delete tag: %v", err)
	}
}
