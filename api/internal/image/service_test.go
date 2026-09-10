package image

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/color"
	"image/png"
	"strings"
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
func (m *mockStorage) Get(ctx context.Context, key string) ([]byte, error) {
	return []byte("data"), nil
}
func (m *mockStorage) Delete(ctx context.Context, key string) error             { return nil }
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

type recordingImageRepo struct {
	metadata  *domain.ImageMetadata
	saveErr   error
	getErr    error
	deleteErr error
	saved     *domain.ImageMetadata
	deletedID string
}

func (r *recordingImageRepo) SaveMetadata(_ context.Context, metadata *domain.ImageMetadata) error {
	r.saved = metadata
	return r.saveErr
}

func (r *recordingImageRepo) GetMetadata(_ context.Context, _ string) (*domain.ImageMetadata, error) {
	return r.metadata, r.getErr
}

func (r *recordingImageRepo) DeleteMetadata(_ context.Context, id string) error {
	r.deletedID = id
	return r.deleteErr
}

type recordingStorage struct {
	data        map[string][]byte
	saveErr     error
	getErr      error
	savedKeys   []string
	deletedKeys []string
}

func (s *recordingStorage) Save(_ context.Context, key string, data []byte) error {
	if s.saveErr != nil {
		return s.saveErr
	}
	if s.data == nil {
		s.data = map[string][]byte{}
	}
	s.data[key] = data
	s.savedKeys = append(s.savedKeys, key)
	return nil
}

func (s *recordingStorage) Get(_ context.Context, key string) ([]byte, error) {
	if data, ok := s.data[key]; ok {
		return data, nil
	}
	if s.getErr != nil {
		return nil, s.getErr
	}
	return nil, errors.New("not found")
}

func (s *recordingStorage) Delete(_ context.Context, key string) error {
	s.deletedKeys = append(s.deletedKeys, key)
	return nil
}

func (s *recordingStorage) DeleteFolder(context.Context, string) error { return nil }

func TestImageServiceUploadResizesLargePNG(t *testing.T) {
	var input bytes.Buffer
	imageData := image.NewRGBA(image.Rect(0, 0, 600, 300))
	imageData.Set(0, 0, color.RGBA{R: 255, A: 255})
	if err := png.Encode(&input, imageData); err != nil {
		t.Fatalf("encode PNG: %v", err)
	}

	repo := &recordingImageRepo{}
	storage := &recordingStorage{}
	metadata, err := NewImageService(repo, storage).UploadImage(context.Background(), "diagram.png", "image/png", input.Bytes())
	if err != nil {
		t.Fatalf("upload image: %v", err)
	}
	if metadata.OriginalWidth != 600 || metadata.OriginalHeight != 300 {
		t.Fatalf("expected 600x300 dimensions, got %dx%d", metadata.OriginalWidth, metadata.OriginalHeight)
	}
	if repo.saved != metadata {
		t.Fatal("expected image metadata to be persisted")
	}
	if len(storage.savedKeys) != 2 || !strings.Contains(storage.savedKeys[0], "_original.png") || !strings.Contains(storage.savedKeys[1], "_300.png") {
		t.Fatalf("expected original and 300px rendition, got %v", storage.savedKeys)
	}
}

func TestImageServiceUploadReportsStorageAndMetadataFailures(t *testing.T) {
	validPNG := []byte{137, 80, 78, 71, 13, 10, 26, 10}
	if _, err := NewImageService(&recordingImageRepo{}, &recordingStorage{saveErr: errors.New("storage offline")}).UploadImage(context.Background(), "image.png", "image/png", validPNG); err == nil {
		t.Fatal("expected storage failure to be returned")
	}
	if _, err := NewImageService(&recordingImageRepo{saveErr: errors.New("database offline")}, &recordingStorage{}).UploadImage(context.Background(), "image.png", "image/png", validPNG); err == nil {
		t.Fatal("expected metadata failure to be returned")
	}
}

func TestImageServiceFallsBackToOriginalAndDeletesAllRenditions(t *testing.T) {
	repo := &recordingImageRepo{metadata: &domain.ImageMetadata{ID: "image-1", MimeType: "image/png"}}
	storage := &recordingStorage{data: map[string][]byte{"image-1_original.png": []byte("original")}}
	service := NewImageService(repo, storage)

	data, mimeType, err := service.GetImageFile(context.Background(), "image-1", "3")
	if err != nil {
		t.Fatalf("fallback to original: %v", err)
	}
	if string(data) != "original" || mimeType != "image/png" {
		t.Fatalf("unexpected fallback response: %q, %q", data, mimeType)
	}

	if err := service.DeleteImage(context.Background(), "image-1"); err != nil {
		t.Fatalf("delete image: %v", err)
	}
	if repo.deletedID != "image-1" || len(storage.deletedKeys) != 5 {
		t.Fatalf("expected metadata and five renditions deleted, got id=%q keys=%v", repo.deletedID, storage.deletedKeys)
	}
}
