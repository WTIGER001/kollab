package postgres

import (
	"testing"
	"time"

	"kollab/api/internal/domain"
)

func TestPostgresLibraryImageRepository(t *testing.T) {
	db, ctx := setupTestDB(t)
	repo := NewPostgresLibraryImageRepository(db)

	// Create base image first
	imgRepo := NewPostgresImageRepository(db)
	baseImg := &domain.ImageMetadata{
		ID: "img_123",
		Filename: "header.png",
		MimeType: "image/png",
		OriginalWidth: 800,
		OriginalHeight: 600,
		CreatedAt: time.Now(),
	}
	_ = imgRepo.SaveMetadata(ctx, baseImg)

	img := &domain.LibraryImage{
		ID: "libimg_1",
		ImageID: "img_123",
		DisplayName: "Header",
		Scope: "global",
		Filename: "header.png",
		MimeType: "image/png",
		SizeBytes: 2048,
		URL: "http://localhost/images/header.png",
		UploadedBy: "sh4ag0cxowti",
		UploaderName: "admin",
		CreatedAt: time.Now(),
	}

	if err := repo.Save(ctx, img); err != nil {
		t.Fatalf("failed to create library image: %v", err)
	}

	fetched, err := repo.Get(ctx, "libimg_1")
	if err != nil {
		t.Fatalf("failed to get library image: %v", err)
	}

	if fetched.DisplayName != "Header" {
		t.Errorf("expected Header, got %s", fetched.DisplayName)
	}

	list, err := repo.List(ctx, "global", nil, nil)
	if err != nil {
		t.Fatalf("failed to list library images: %v", err)
	}
	if len(list) == 0 {
		t.Error("expected at least 1 image")
	}

	if err := repo.Delete(ctx, "libimg_1"); err != nil {
		t.Fatalf("failed to delete image: %v", err)
	}
}
