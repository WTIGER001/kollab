package attachment

import (
	"context"
	"testing"
	"kollab/api/internal/domain"
)

type mockRepo struct{}
func (m *mockRepo) Save(ctx context.Context, att *domain.Attachment) error { return nil }
func (m *mockRepo) GetByID(ctx context.Context, id string) (*domain.Attachment, error) { 
	if id == "notfound" {
		return nil, nil // Simulate not found? No, usually it returns an error or nil. Let's return a valid one.
	}
	return &domain.Attachment{ID: id, Filename: "test.png", MimeType: "image/png", StorageKey: "mock_path"}, nil 
}
func (m *mockRepo) ListByDocumentID(ctx context.Context, docID string) ([]*domain.Attachment, error) { return nil, nil }
func (m *mockRepo) Delete(ctx context.Context, id string) error { return nil }
func (m *mockRepo) SavePreviewStatus(ctx context.Context, preview *domain.PreviewStatus) error { return nil }
func (m *mockRepo) GetPreviewStatus(ctx context.Context, attachmentID string) (*domain.PreviewStatus, error) { 
	return &domain.PreviewStatus{AttachmentID: attachmentID, Status: "completed"}, nil 
}

type mockStorage struct{}
func (m *mockStorage) Save(ctx context.Context, key string, data []byte) error { return nil }
func (m *mockStorage) Get(ctx context.Context, key string) ([]byte, error) { return []byte("mock"), nil }
func (m *mockStorage) Delete(ctx context.Context, key string) error { return nil }
func (m *mockStorage) DeleteFolder(ctx context.Context, folderKey string) error { return nil }

type mockSystemRepo struct{}
func (m *mockSystemRepo) GetSystemSettings(ctx context.Context) (*domain.SystemSettings, error) {
	return &domain.SystemSettings{}, nil
}
func (m *mockSystemRepo) UpdateSystemSettings(ctx context.Context, settings *domain.SystemSettings) error {
	return nil
}

func TestUploadAttachment(t *testing.T) {
	svc := NewAttachmentService(&mockRepo{}, &mockStorage{})
	att, err := svc.UploadAttachment(context.Background(), "doc1", "test.png", "image/png", []byte("data"), "user1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if att.Filename != "test.png" {
		t.Errorf("expected test.png, got %v", att.Filename)
	}
}

func TestGetAttachmentFile(t *testing.T) {
	svc := NewAttachmentService(&mockRepo{}, &mockStorage{})
	data, att, err := svc.GetAttachmentFile(context.Background(), "att1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if string(data) != "mock" {
		t.Errorf("expected mock data, got %s", string(data))
	}
	if att.Filename != "test.png" {
		t.Errorf("expected test.png, got %v", att.Filename)
	}
}

func TestDeleteAttachment(t *testing.T) {
	svc := NewAttachmentService(&mockRepo{}, &mockStorage{})
	err := svc.DeleteAttachment(context.Background(), "att1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
}

func TestListAttachments(t *testing.T) {
	svc := NewAttachmentService(&mockRepo{}, &mockStorage{})
	atts, err := svc.ListAttachments(context.Background(), "doc1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(atts) != 0 {
		t.Errorf("expected 0, got %d", len(atts))
	}
}

func TestPreviewMethods(t *testing.T) {
	svc := NewAttachmentService(&mockRepo{}, &mockStorage{})
	ctx := context.Background()
	
	// GetPreviewStatus
	status, err := svc.GetPreviewStatus(ctx, "att1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if status.Status != "completed" {
		t.Errorf("expected completed, got %v", status.Status)
	}

	// RetryPreviewGeneration
	err = svc.RetryPreviewGeneration(ctx, "att1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	
	// GetPreviewFile
	_, _, err = svc.GetPreviewFile(ctx, "att1", "")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	
	// GetAttachmentPreview (depends on GetAttachmentFile and checking mimetype)
	_, _, err = svc.GetAttachmentPreview(ctx, "att1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
}
