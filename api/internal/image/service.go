package image

import (
	"bytes"
	"context"
	"crypto/rand"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	_ "image/gif" // register GIF decoder
	"time"

	"golang.org/x/image/draw"

	"arkollab/api/internal/domain"
)

type ImageService struct {
	repo    domain.ImageRepository
	storage domain.FileStorage
}

func NewImageService(repo domain.ImageRepository, storage domain.FileStorage) *ImageService {
	return &ImageService{
		repo:    repo,
		storage: storage,
	}
}

func (s *ImageService) UploadImage(ctx context.Context, filename string, mimeType string, data []byte) (*domain.ImageMetadata, error) {
	// 1. Decode original image to verify format and extract dimensions
	img, format, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	id := newUUID()
	ext := getExtension(mimeType)
	originalKey := fmt.Sprintf("%s_original.%s", id, ext)

	// Save original image to file storage
	if err := s.storage.Save(ctx, originalKey, data); err != nil {
		return nil, fmt.Errorf("failed to save original image: %w", err)
	}

	// 2. Perform scaling for target widths (300, 600, 900, 1200)
	targetSizes := []int{300, 600, 900, 1200}
	for _, targetWidth := range targetSizes {
		if origWidth <= targetWidth {
			// Skip scaling if the original image is smaller
			continue
		}

		resizedData, err := resizeImage(img, format, targetWidth)
		if err != nil {
			// Log error but don't fail the whole upload (best effort for resizes)
			continue
		}

		resizedKey := fmt.Sprintf("%s_%d.%s", id, targetWidth, ext)
		_ = s.storage.Save(ctx, resizedKey, resizedData)
	}

	// 3. Save metadata
	meta := &domain.ImageMetadata{
		ID:             id,
		Filename:       filename,
		MimeType:       mimeType,
		OriginalWidth:  origWidth,
		OriginalHeight: origHeight,
		CreatedAt:      time.Now(),
	}

	if err := s.repo.SaveMetadata(ctx, meta); err != nil {
		return nil, fmt.Errorf("failed to save image metadata: %w", err)
	}

	return meta, nil
}

func (s *ImageService) GetImageFile(ctx context.Context, id string, size string) ([]byte, string, error) {
	meta, err := s.repo.GetMetadata(ctx, id)
	if err != nil {
		return nil, "", err
	}

	ext := getExtension(meta.MimeType)
	var fileKey string

	// Map sizes 1, 2, 3, 4, O
	switch size {
	case "1":
		fileKey = fmt.Sprintf("%s_300.%s", id, ext)
	case "2":
		fileKey = fmt.Sprintf("%s_600.%s", id, ext)
	case "3":
		fileKey = fmt.Sprintf("%s_900.%s", id, ext)
	case "4":
		fileKey = fmt.Sprintf("%s_1200.%s", id, ext)
	default:
		fileKey = fmt.Sprintf("%s_original.%s", id, ext)
	}

	// Try reading file from storage
	data, err := s.storage.Get(ctx, fileKey)
	if err != nil {
		// Fallback: If sized file is not found (e.g. original was smaller, or resize failed), serve original file
		originalKey := fmt.Sprintf("%s_original.%s", id, ext)
		data, err = s.storage.Get(ctx, originalKey)
		if err != nil {
			return nil, "", fmt.Errorf("failed to retrieve image data: %w", err)
		}
	}

	return data, meta.MimeType, nil
}

func (s *ImageService) DeleteImage(ctx context.Context, id string) error {
	meta, err := s.repo.GetMetadata(ctx, id)
	if err != nil {
		return err
	}

	ext := getExtension(meta.MimeType)

	// Clean up all sizes from storage
	_ = s.storage.Delete(ctx, fmt.Sprintf("%s_original.%s", id, ext))
	_ = s.storage.Delete(ctx, fmt.Sprintf("%s_300.%s", id, ext))
	_ = s.storage.Delete(ctx, fmt.Sprintf("%s_600.%s", id, ext))
	_ = s.storage.Delete(ctx, fmt.Sprintf("%s_900.%s", id, ext))
	_ = s.storage.Delete(ctx, fmt.Sprintf("%s_1200.%s", id, ext))

	return s.repo.DeleteMetadata(ctx, id)
}

// Helper utilities
func getExtension(mimeType string) string {
	switch mimeType {
	case "image/png":
		return "png"
	case "image/gif":
		return "gif"
	case "image/webp":
		return "webp"
	default:
		return "jpg"
	}
}

func resizeImage(img image.Image, format string, targetWidth int) ([]byte, error) {
	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()
	targetHeight := (origHeight * targetWidth) / origWidth

	dst := image.NewRGBA(image.Rect(0, 0, targetWidth, targetHeight))
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)

	var buf bytes.Buffer
	var err error
	if format == "png" {
		err = png.Encode(&buf, dst)
	} else {
		err = jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 85})
	}
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func newUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
