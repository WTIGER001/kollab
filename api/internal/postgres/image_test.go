package postgres

import (
	"testing"
	"time"

	"kollab/api/internal/domain"
)

func TestPostgresImageRepository(t *testing.T) {
	db, ctx := setupTestDB(t)
	repo := NewPostgresImageRepository(db)

	img := &domain.ImageMetadata{
		ID: "img_1",
		Filename: "test.png",
		MimeType: "image/png",
		OriginalWidth: 800,
		OriginalHeight: 600,
		CreatedAt: time.Now(),
	}

	if err := repo.SaveMetadata(ctx, img); err != nil {
		t.Fatalf("failed to create image: %v", err)
	}

	fetched, err := repo.GetMetadata(ctx, "img_1")
	if err != nil {
		t.Fatalf("failed to get image: %v", err)
	}

	if fetched.Filename != "test.png" {
		t.Errorf("expected test.png, got %s", fetched.Filename)
	}
}
