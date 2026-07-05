package image

import (
	"context"
	"testing"
	"kollab/api/internal/domain"
)

type mockImageRepo struct{}

func (m *mockImageRepo) SaveMetadata(ctx context.Context, meta *domain.ImageMetadata) error {
	return nil
}

func (m *mockImageRepo) GetMetadata(ctx context.Context, id string) (*domain.ImageMetadata, error) {
	return &domain.ImageMetadata{ID: "img1", MimeType: "image/png"}, nil
}

func (m *mockImageRepo) DeleteMetadata(ctx context.Context, id string) error {
	return nil
}

type mockStorage struct{}

func (m *mockStorage) Save(ctx context.Context, key string, data []byte) error { return nil }
func (m *mockStorage) Get(ctx context.Context, key string) ([]byte, error) { return []byte("data"), nil }
func (m *mockStorage) Delete(ctx context.Context, key string) error { return nil }
func (m *mockStorage) DeleteFolder(ctx context.Context, folderKey string) error { return nil }

func TestImageServiceUpload(t *testing.T) {
	svc := NewImageService(&mockImageRepo{}, &mockStorage{})

	// This data isn't a valid image, so it should fallback to 0x0
	meta, err := svc.UploadImage(context.Background(), "test.png", "image/png", []byte("bad data"))
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if meta.OriginalWidth != 0 {
		t.Errorf("expected 0 width for invalid image data")
	}
}

func TestImageServiceGet(t *testing.T) {
	svc := NewImageService(&mockImageRepo{}, &mockStorage{})

	data, mime, err := svc.GetImageFile(context.Background(), "img1", "1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if mime != "image/png" {
		t.Errorf("expected png")
	}
	if string(data) != "data" {
		t.Errorf("expected mock data")
	}
}

func TestImageServiceDelete(t *testing.T) {
	svc := NewImageService(&mockImageRepo{}, &mockStorage{})

	err := svc.DeleteImage(context.Background(), "img1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
}
