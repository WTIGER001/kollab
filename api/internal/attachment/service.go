package attachment

import (
	"context"
	"crypto/rand"
	"fmt"
	"time"

	"arkollab/api/internal/domain"
)

type AttachmentService struct {
	repo    domain.AttachmentRepository
	storage domain.FileStorage
}

func NewAttachmentService(repo domain.AttachmentRepository, storage domain.FileStorage) *AttachmentService {
	return &AttachmentService{
		repo:    repo,
		storage: storage,
	}
}

func (s *AttachmentService) UploadAttachment(ctx context.Context, docID string, filename string, mimeType string, data []byte, userID string) (*domain.Attachment, error) {
	id := newUUID()
	storageKey := fmt.Sprintf("attachments/%s_%s", id, filename)

	if err := s.storage.Save(ctx, storageKey, data); err != nil {
		return nil, fmt.Errorf("failed to save attachment in file storage: %w", err)
	}

	att := &domain.Attachment{
		ID:         id,
		DocumentID: docID,
		Filename:   filename,
		MimeType:   mimeType,
		FileSize:   int64(len(data)),
		StorageKey: storageKey,
		UploadedBy: userID,
		UploadedAt: time.Now(),
	}

	if err := s.repo.Save(ctx, att); err != nil {
		_ = s.storage.Delete(ctx, storageKey)
		return nil, fmt.Errorf("failed to save attachment metadata: %w", err)
	}

	return att, nil
}

func (s *AttachmentService) GetAttachmentFile(ctx context.Context, id string) ([]byte, *domain.Attachment, error) {
	att, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, nil, err
	}

	data, err := s.storage.Get(ctx, att.StorageKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get attachment raw data: %w", err)
	}

	return data, att, nil
}

func (s *AttachmentService) ListAttachments(ctx context.Context, docID string) ([]*domain.Attachment, error) {
	return s.repo.ListByDocumentID(ctx, docID)
}

func (s *AttachmentService) DeleteAttachment(ctx context.Context, id string) error {
	att, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	_ = s.storage.Delete(ctx, att.StorageKey)
	return s.repo.Delete(ctx, id)
}

func newUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
