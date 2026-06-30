package attachment

import (
	"context"
	"crypto/rand"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"arkollab/api/internal/domain"
)

type AttachmentService struct {
	repo         domain.AttachmentRepository
	storage      domain.FileStorage
	asposeClient *OfficeConverterClient
	queue        chan string
}

func NewAttachmentService(repo domain.AttachmentRepository, storage domain.FileStorage) *AttachmentService {
	s := &AttachmentService{
		repo:         repo,
		storage:      storage,
		asposeClient: NewOfficeConverterClient(),
		queue:        make(chan string, 200),
	}

	// Start asynchronous conversion workers
	for i := 0; i < 3; i++ {
		go s.workerLoop()
	}

	return s
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

	// Initialize preview generation status if supported
	isPDF := mimeType == "application/pdf" || strings.HasSuffix(strings.ToLower(filename), ".pdf")
	isOffice := isOfficeFile(filename)
	is3D := is3DFile(filename)

	if isPDF || isOffice || is3D {
		statusVal := "pending"
		progress := 0
		format := ""

		if isPDF {
			statusVal = "completed"
			progress = 100
			format = "pdf"
		}

		prev := &domain.PreviewStatus{
			AttachmentID: att.ID,
			Status:       statusVal,
			Progress:     progress,
			Format:       format,
			UpdatedAt:    time.Now(),
		}
		_ = s.repo.SavePreviewStatus(ctx, prev)

		if isOffice || is3D {
			select {
			case s.queue <- att.ID:
			default:
				fmt.Printf("[WARNING] Preview generation queue full, skipping auto-queue for %s\n", att.ID)
			}
		}
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

	// If it's already a PDF, return the raw file from storage
	if att.MimeType == "application/pdf" || strings.HasSuffix(strings.ToLower(att.Filename), ".pdf") {
		data, err := s.storage.Get(ctx, att.StorageKey)
		if err != nil {
			return nil, nil, err
		}
		return data, att, nil
	}

	// Check preview status
	status, err := s.repo.GetPreviewStatus(ctx, id)
	if err != nil {
		// Auto-create status for legacy attachments
		// Auto-create status for legacy attachments
		isOffice := isOfficeFile(att.Filename)
		is3D := is3DFile(att.Filename)
		if isOffice || is3D {
			prev := &domain.PreviewStatus{
				AttachmentID: id,
				Status:       "pending",
				Progress:     0,
				UpdatedAt:    time.Now(),
			}
			_ = s.repo.SavePreviewStatus(ctx, prev)
			s.queue <- id
			return nil, nil, fmt.Errorf("preview generation pending")
		}
		return nil, nil, fmt.Errorf("previews not supported for this file type")
	}

	if status.Status == "failed" {
		return nil, nil, fmt.Errorf("preview generation failed: %s", status.ErrorMessage)
	}
	if status.Status != "completed" {
		return nil, nil, fmt.Errorf("preview generation in progress (%d%%)", status.Progress)
	}

	// Fetch primary conversion file
	primaryKey := fmt.Sprintf("previews/%s/document.pdf", id)
	if status.Format == "html" {
		primaryKey = fmt.Sprintf("previews/%s/index.html", id)
	}

	pdfData, err := s.storage.Get(ctx, primaryKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch converted preview: %w", err)
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

	// Delete main file
	_ = s.storage.Delete(ctx, att.StorageKey)

	// Delete previews folder recursively
	previewFolder := fmt.Sprintf("previews/%s", id)
	_ = s.storage.DeleteFolder(ctx, previewFolder)

	// Cascades to previews table automatically in Postgres via ON DELETE CASCADE
	return s.repo.Delete(ctx, id)
}

// GetPreviewStatus retrieves the current conversion status for a given attachment
func (s *AttachmentService) GetPreviewStatus(ctx context.Context, id string) (*domain.PreviewStatus, error) {
	status, err := s.repo.GetPreviewStatus(ctx, id)
	if err != nil {
		// Auto-initialize if it is a supported previewable file
		att, err := s.repo.GetByID(ctx, id)
		if err != nil {
			return nil, err
		}

		isPDF := att.MimeType == "application/pdf" || strings.HasSuffix(strings.ToLower(att.Filename), ".pdf")
		isOffice := isOfficeFile(att.Filename)
		is3D := is3DFile(att.Filename)

		if isPDF || isOffice || is3D {
			statusVal := "pending"
			progress := 0
			format := ""

			if isPDF {
				statusVal = "completed"
				progress = 100
				format = "pdf"
			}

			prev := &domain.PreviewStatus{
				AttachmentID: id,
				Status:       statusVal,
				Progress:     progress,
				Format:       format,
				UpdatedAt:    time.Now(),
			}
			_ = s.repo.SavePreviewStatus(ctx, prev)

			if isOffice || is3D {
				select {
				case s.queue <- id:
				default:
				}
			}
			return prev, nil
		}
		return nil, fmt.Errorf("previews not supported for this file type")
	}
	return status, nil
}

// RetryPreviewGeneration resets status to pending and queues it again
func (s *AttachmentService) RetryPreviewGeneration(ctx context.Context, id string) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	prev := &domain.PreviewStatus{
		AttachmentID: id,
		Status:       "pending",
		Progress:     0,
		UpdatedAt:    time.Now(),
	}
	if err := s.repo.SavePreviewStatus(ctx, prev); err != nil {
		return err
	}

	select {
	case s.queue <- id:
	default:
		return fmt.Errorf("preview queue is currently full")
	}
	return nil
}

// GetPreviewFile fetches a sub-resource within the previews directory (like images, stylesheets, scripts)
func (s *AttachmentService) GetPreviewFile(ctx context.Context, id string, filepath string) ([]byte, string, error) {
	key := fmt.Sprintf("previews/%s/%s", id, filepath)
	data, err := s.storage.Get(ctx, key)
	if err != nil {
		return nil, "", fmt.Errorf("preview asset not found: %w", err)
	}

	mimeType := getMimeTypeFromExtension(filepath)
	return data, mimeType, nil
}

func (s *AttachmentService) workerLoop() {
	ctx := context.Background()
	for id := range s.queue {
		s.processPreview(ctx, id)
	}
}

func (s *AttachmentService) processPreview(ctx context.Context, id string) {
	updateStatus := func(status string, progress int, format string, errMsg string) {
		prev := &domain.PreviewStatus{
			AttachmentID: id,
			Status:       status,
			Progress:     progress,
			Format:       format,
			ErrorMessage: errMsg,
			UpdatedAt:    time.Now(),
		}
		_ = s.repo.SavePreviewStatus(ctx, prev)
	}

	att, err := s.repo.GetByID(ctx, id)
	if err != nil {
		fmt.Printf("[ERROR] Preview worker failed to fetch attachment %s: %v\n", id, err)
		return
	}

	// Step 1: Processing started
	updateStatus("converting", 20, "", "")

	// Resolve source and destination storage configurations
	sourceConfig := s.getStorageConfig(att.StorageKey, false)
	destConfig := s.getStorageConfig(fmt.Sprintf("previews/%s", id), true)

	updateStatus("converting", 40, "", "")

	// Step 2: Convert via external Java microservice (which directly reads/writes storage)
	err = s.asposeClient.Convert(ctx, id, sourceConfig, destConfig)
	if err != nil {
		updateStatus("failed", 100, "", fmt.Sprintf("Conversion service failed: %v", err))
		return
	}

	updateStatus("converting", 80, "", "")

	// Step 3: Determine generated format dynamically by checking storage
	format := "pdf"
	htmlKey := fmt.Sprintf("previews/%s/index.html", id)
	pngKey := fmt.Sprintf("previews/%s/thumbnail.png", id)
	if _, err := s.storage.Get(ctx, htmlKey); err == nil {
		format = "html"
	} else if _, err := s.storage.Get(ctx, pngKey); err == nil {
		format = "png"
	}

	// Completed successfully
	updateStatus("completed", 100, format, "")
}

func (s *AttachmentService) getStorageConfig(key string, isDest bool) StorageConfig {
	storageType := os.Getenv("STORAGE_TYPE")
	if storageType == "" {
		storageType = "local"
	}

	switch strings.ToLower(storageType) {
	case "s3":
		bucket := os.Getenv("AWS_S3_BUCKET")
		return StorageConfig{
			Type:   "s3",
			Bucket: bucket,
			Key:    key,
		}
	case "azure":
		container := os.Getenv("AZURE_STORAGE_CONTAINER")
		return StorageConfig{
			Type:   "azure",
			Bucket: container,
			Key:    key,
		}
	default: // local
		basePath := os.Getenv("STORAGE_BASE_PATH")
		if basePath == "" {
			basePath = "./uploads"
		}
		
		// If running in docker, resolve base path inside the container
		if _, err := os.Stat("/app/uploads"); err == nil {
			basePath = "/app/uploads"
		}
		
		fullPath := filepath.Join(basePath, key)
		return StorageConfig{
			Type: "local",
			Path: fullPath,
		}
	}
}

func isOfficeFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	return ext == ".docx" || ext == ".doc" || ext == ".pptx" || ext == ".ppt"
}

func is3DFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	return ext == ".stl" || ext == ".3mf"
}

func getMimeTypeFromExtension(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".html", ".htm":
		return "text/html"
	case ".css":
		return "text/css"
	case ".js":
		return "application/javascript"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".svg":
		return "image/svg+xml"
	case ".pdf":
		return "application/pdf"
	default:
		return "application/octet-stream"
	}
}

func newUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
