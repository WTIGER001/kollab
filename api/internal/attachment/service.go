package attachment

import (
	"context"
	"crypto/rand"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"arkollab/api/internal/domain"
)

// findSofficePath checks standard paths and environment variables for LibreOffice (soffice)
func findSofficePath() (string, error) {
	// 1. Check common macOS Applications path
	macPath := "/Applications/LibreOffice.app/Contents/MacOS/soffice"
	if _, err := os.Stat(macPath); err == nil {
		return macPath, nil
	}

	// 2. Check system PATH for soffice
	if path, err := exec.LookPath("soffice"); err == nil {
		return path, nil
	}

	// 3. Check system PATH for libreoffice
	if path, err := exec.LookPath("libreoffice"); err == nil {
		return path, nil
	}

	return "", fmt.Errorf("libreoffice/soffice executable not found")
}

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

func (s *AttachmentService) GetAttachmentPreview(ctx context.Context, id string) ([]byte, *domain.Attachment, error) {
	att, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, nil, err
	}

	// 1. If it's already a PDF, return the raw file from storage
	if att.MimeType == "application/pdf" || strings.HasSuffix(strings.ToLower(att.Filename), ".pdf") {
		data, err := s.storage.Get(ctx, att.StorageKey)
		if err != nil {
			return nil, nil, err
		}
		return data, att, nil
	}

	// 2. Check if a converted PDF preview already exists in cache
	previewKey := fmt.Sprintf("previews/%s.pdf", id)
	if pdfData, err := s.storage.Get(ctx, previewKey); err == nil {
		return pdfData, att, nil
	}

	// 3. Not cached, convert via LibreOffice soffice
	sofficePath, err := findSofficePath()
	if err != nil {
		return nil, nil, fmt.Errorf("previews not supported: %w", err)
	}

	// Fetch raw attachment bytes
	rawData, err := s.storage.Get(ctx, att.StorageKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch raw attachment data: %w", err)
	}

	// Create temp directory for conversion
	tempDir, err := os.MkdirTemp("", "kollab-preview-*")
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// Write raw attachment to unique temp file preserving extension
	tempInputFile := filepath.Join(tempDir, att.Filename)
	if err := os.WriteFile(tempInputFile, rawData, 0600); err != nil {
		return nil, nil, fmt.Errorf("failed to write raw data to temp file: %w", err)
	}

	// Execute headless soffice PDF conversion
	cmd := exec.CommandContext(ctx, sofficePath, "--headless", "--convert-to", "pdf", "--outdir", tempDir, tempInputFile)
	if err := cmd.Run(); err != nil {
		return nil, nil, fmt.Errorf("failed to run libreoffice conversion: %w", err)
	}

	// The output file is named after the input file but with a .pdf extension
	filenameWithoutExt := att.Filename
	if idx := strings.LastIndex(att.Filename, "."); idx != -1 {
		filenameWithoutExt = att.Filename[:idx]
	}
	tempOutputFile := filepath.Join(tempDir, filenameWithoutExt+".pdf")

	// Read converted PDF data
	pdfData, err := os.ReadFile(tempOutputFile)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read converted preview file: %w", err)
	}

	// Save to storage cache previews/ folder
	if err := s.storage.Save(ctx, previewKey, pdfData); err != nil {
		fmt.Printf("[WARNING] Failed to cache preview to file storage: %v\n", err)
	}

	return pdfData, att, nil
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
