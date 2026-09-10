package attachment

import (
	"context"
	"errors"
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
func (m *mockRepo) ListByDocumentID(ctx context.Context, docID string) ([]*domain.Attachment, error) {
	return nil, nil
}
func (m *mockRepo) Delete(ctx context.Context, id string) error { return nil }
func (m *mockRepo) SavePreviewStatus(ctx context.Context, preview *domain.PreviewStatus) error {
	return nil
}
func (m *mockRepo) GetPreviewStatus(ctx context.Context, attachmentID string) (*domain.PreviewStatus, error) {
	return &domain.PreviewStatus{AttachmentID: attachmentID, Status: "completed"}, nil
}

type mockStorage struct{}

func (m *mockStorage) Save(ctx context.Context, key string, data []byte) error { return nil }
func (m *mockStorage) Get(ctx context.Context, key string) ([]byte, error) {
	return []byte("mock"), nil
}
func (m *mockStorage) Delete(ctx context.Context, key string) error             { return nil }
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

type recordingAttachmentRepo struct {
	attachment           *domain.Attachment
	preview              *domain.PreviewStatus
	saveErr              error
	previewErr           error
	savedPreviewStatuses []*domain.PreviewStatus
	deletedID            string
}

func (r *recordingAttachmentRepo) Save(context.Context, *domain.Attachment) error { return r.saveErr }

func (r *recordingAttachmentRepo) GetByID(context.Context, string) (*domain.Attachment, error) {
	if r.attachment == nil {
		return nil, errors.New("attachment not found")
	}
	return r.attachment, nil
}

func (r *recordingAttachmentRepo) ListByDocumentID(context.Context, string) ([]*domain.Attachment, error) {
	return nil, nil
}

func (r *recordingAttachmentRepo) Delete(_ context.Context, id string) error {
	r.deletedID = id
	return nil
}

func (r *recordingAttachmentRepo) SavePreviewStatus(_ context.Context, status *domain.PreviewStatus) error {
	r.savedPreviewStatuses = append(r.savedPreviewStatuses, status)
	return nil
}

func (r *recordingAttachmentRepo) GetPreviewStatus(context.Context, string) (*domain.PreviewStatus, error) {
	return r.preview, r.previewErr
}

type recordingAttachmentStorage struct {
	data           map[string][]byte
	saveErr        error
	deletedKeys    []string
	deletedFolders []string
}

func (s *recordingAttachmentStorage) Save(_ context.Context, key string, data []byte) error {
	if s.saveErr != nil {
		return s.saveErr
	}
	if s.data == nil {
		s.data = map[string][]byte{}
	}
	s.data[key] = data
	return nil
}

func (s *recordingAttachmentStorage) Get(_ context.Context, key string) ([]byte, error) {
	if data, ok := s.data[key]; ok {
		return data, nil
	}
	return nil, errors.New("file not found")
}

func (s *recordingAttachmentStorage) Delete(_ context.Context, key string) error {
	s.deletedKeys = append(s.deletedKeys, key)
	return nil
}

func (s *recordingAttachmentStorage) DeleteFolder(_ context.Context, key string) error {
	s.deletedFolders = append(s.deletedFolders, key)
	return nil
}

func TestUploadAttachmentInitializesPDFPreviewAndRollsBackMetadataFailure(t *testing.T) {
	ctx := context.Background()
	repo := &recordingAttachmentRepo{}
	storage := &recordingAttachmentStorage{}
	service := NewAttachmentService(repo, storage)

	attachment, err := service.UploadAttachment(ctx, "document-1", "report.pdf", "application/pdf", []byte("pdf"), "user-1")
	if err != nil {
		t.Fatalf("upload PDF: %v", err)
	}
	if len(repo.savedPreviewStatuses) != 1 {
		t.Fatalf("expected PDF preview status, got %d", len(repo.savedPreviewStatuses))
	}
	status := repo.savedPreviewStatuses[0]
	if status.AttachmentID != attachment.ID || status.Status != "completed" || status.Progress != 100 || status.Format != "pdf" {
		t.Fatalf("unexpected PDF preview status: %#v", status)
	}

	failingStorage := &recordingAttachmentStorage{}
	if _, err := NewAttachmentService(&recordingAttachmentRepo{saveErr: errors.New("metadata write failed")}, failingStorage).UploadAttachment(ctx, "document-1", "report.txt", "text/plain", []byte("text"), "user-1"); err == nil {
		t.Fatal("expected metadata failure")
	}
	if len(failingStorage.deletedKeys) != 1 {
		t.Fatalf("expected uploaded file rollback, got %v", failingStorage.deletedKeys)
	}
}

func TestAttachmentPreviewStatesAndAssets(t *testing.T) {
	ctx := context.Background()
	repo := &recordingAttachmentRepo{
		attachment: &domain.Attachment{ID: "attachment-1", Filename: "presentation.pptx", MimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", StorageKey: "attachments/source"},
		preview:    &domain.PreviewStatus{AttachmentID: "attachment-1", Status: "completed", Format: "html"},
	}
	storage := &recordingAttachmentStorage{data: map[string][]byte{
		"previews/attachment-1/index.html": []byte("<html>preview</html>"),
		"previews/attachment-1/styles.css": []byte("body{}"),
	}}
	service := NewAttachmentService(repo, storage)

	preview, attachment, err := service.GetAttachmentPreview(ctx, "attachment-1")
	if err != nil {
		t.Fatalf("get HTML preview: %v", err)
	}
	if string(preview) != "<html>preview</html>" || attachment.ID != "attachment-1" {
		t.Fatalf("unexpected preview response: %q, %#v", preview, attachment)
	}

	asset, mimeType, err := service.GetPreviewFile(ctx, "attachment-1", "styles.css")
	if err != nil || string(asset) != "body{}" || mimeType != "text/css" {
		t.Fatalf("unexpected preview asset: %q, %q, %v", asset, mimeType, err)
	}

	repo.preview = &domain.PreviewStatus{AttachmentID: "attachment-1", Status: "failed", ErrorMessage: "converter offline"}
	if _, _, err := service.GetAttachmentPreview(ctx, "attachment-1"); err == nil {
		t.Fatal("expected failed preview state to be returned")
	}
	repo.preview = &domain.PreviewStatus{AttachmentID: "attachment-1", Status: "converting", Progress: 40}
	if _, _, err := service.GetAttachmentPreview(ctx, "attachment-1"); err == nil {
		t.Fatal("expected in-progress preview state to be returned")
	}
}

func TestPreviewStatusInitializesAndRetryQueuesOfficeFiles(t *testing.T) {
	ctx := context.Background()
	repo := &recordingAttachmentRepo{
		attachment: &domain.Attachment{ID: "attachment-1", Filename: "report.docx", MimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
		previewErr: errors.New("missing status"),
	}
	service := NewAttachmentService(repo, &recordingAttachmentStorage{})
	// Use an inert queue so this test never invokes an external conversion worker.
	service.queue = make(chan string, 1)

	status, err := service.GetPreviewStatus(ctx, "attachment-1")
	if err != nil {
		t.Fatalf("initialize preview status: %v", err)
	}
	if status.Status != "pending" || status.Progress != 0 {
		t.Fatalf("unexpected initialized status: %#v", status)
	}
	if queuedID := <-service.queue; queuedID != "attachment-1" {
		t.Fatalf("expected attachment to be queued, got %q", queuedID)
	}

	if err := service.RetryPreviewGeneration(ctx, "attachment-1"); err != nil {
		t.Fatalf("retry preview: %v", err)
	}
	if queuedID := <-service.queue; queuedID != "attachment-1" {
		t.Fatalf("expected retry to be queued, got %q", queuedID)
	}
}
