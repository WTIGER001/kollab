package image

import (
	"context"
	"testing"

	"kollab/api/internal/domain"
)

type mockLibraryRepo struct{}

func (m *mockLibraryRepo) Save(ctx context.Context, img *domain.LibraryImage) error {
	return nil
}

func (m *mockLibraryRepo) List(ctx context.Context, scope string, teamID *string, projectID *string) ([]*domain.LibraryImage, error) {
	return []*domain.LibraryImage{{ID: "libimg1", ImageID: "img1"}}, nil
}

func (m *mockLibraryRepo) Get(ctx context.Context, id string) (*domain.LibraryImage, error) {
	return &domain.LibraryImage{ID: "libimg1", ImageID: "img1", DisplayName: "test"}, nil
}

func (m *mockLibraryRepo) UpdateName(ctx context.Context, id string, name string) error {
	return nil
}

func (m *mockLibraryRepo) Delete(ctx context.Context, id string) error {
	return nil
}

type mockImageService struct{}

func (m *mockImageService) UploadImage(ctx context.Context, filename string, mimeType string, data []byte) (*domain.ImageMetadata, error) {
	return &domain.ImageMetadata{ID: "img1", Filename: filename}, nil
}

func (m *mockImageService) GetImageFile(ctx context.Context, id string, size string) ([]byte, string, error) {
	return []byte("data"), "image/png", nil
}

func (m *mockImageService) DeleteImage(ctx context.Context, id string) error {
	return nil
}

func TestLibraryServiceUpload(t *testing.T) {
	svc := NewLibraryImageService(&mockLibraryRepo{}, &mockImageService{})

	libImg, err := svc.Upload(context.Background(), []byte("data"), "test.png", "image/png", "Test Image", "global", nil, nil, "user1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if libImg.ImageID != "img1" {
		t.Errorf("expected img1, got %v", libImg.ImageID)
	}
	if libImg.URL == "" {
		t.Errorf("expected URL to be generated")
	}
}

func TestLibraryServiceList(t *testing.T) {
	svc := NewLibraryImageService(&mockLibraryRepo{}, &mockImageService{})

	images, err := svc.List(context.Background(), "global", nil, nil)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(images) != 1 {
		t.Fatalf("expected 1 image")
	}
	if images[0].URL == "" {
		t.Errorf("expected URL to be generated")
	}
}

func TestLibraryServiceUpdateName(t *testing.T) {
	svc := NewLibraryImageService(&mockLibraryRepo{}, &mockImageService{})

	img, err := svc.UpdateName(context.Background(), "libimg1", "new name")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if img.ID != "libimg1" {
		t.Errorf("expected libimg1")
	}
}

func TestLibraryServiceDelete(t *testing.T) {
	svc := NewLibraryImageService(&mockLibraryRepo{}, &mockImageService{})

	err := svc.Delete(context.Background(), "libimg1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
}
