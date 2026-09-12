package image

import (
	"bytes"
	"context"
	"encoding/xml"
	"fmt"
	_ "golang.org/x/image/webp"
	"image"
	_ "image/gif" // register GIF decoder
	"image/jpeg"
	"image/png"
	"io"
	"strings"
	"time"

	"golang.org/x/image/draw"

	"github.com/google/uuid"

	"kollab/api/internal/domain"
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
	if len(data) == 0 || len(data) > 10<<20 {
		return nil, fmt.Errorf("image must be between 1 byte and 10 MB")
	}
	var img image.Image
	var origWidth, origHeight int
	config, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		if err := validateSVG(data); err != nil {
			return nil, fmt.Errorf("upload a valid PNG, JPEG, GIF, WebP, or SVG image: %w", err)
		}
		mimeType = "image/svg+xml"
	} else {
		if config.Width <= 0 || config.Height <= 0 || int64(config.Width)*int64(config.Height) > 40_000_000 {
			return nil, fmt.Errorf("image exceeds 40 megapixels")
		}
		mimeType = map[string]string{"png": "image/png", "jpeg": "image/jpeg", "gif": "image/gif", "webp": "image/webp"}[format]
		if mimeType == "" {
			return nil, fmt.Errorf("unsupported image format")
		}
		origWidth, origHeight = config.Width, config.Height
		img, _, err = image.Decode(bytes.NewReader(data))
		if err != nil {
			return nil, fmt.Errorf("corrupt image: %w", err)
		}
	}

	id := uuid.New().String()
	ext := getExtension(mimeType)
	originalKey := fmt.Sprintf("%s_original.%s", id, ext)

	// Save original image to file storage
	if err := s.storage.Save(ctx, originalKey, data); err != nil {
		return nil, fmt.Errorf("failed to save original image: %w", err)
	}

	// 2. Perform scaling for target widths (300, 600, 900, 1200)
	targetSizes := []int{300, 600, 900, 1200}
	for _, targetWidth := range targetSizes {
		if img == nil || (format != "png" && format != "jpeg") || origWidth <= targetWidth {
			// Skip scaling if the original image is smaller or if we couldn't decode it
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
		for _, size := range []string{"original", "300", "600", "900", "1200"} {
			_ = s.storage.Delete(ctx, fmt.Sprintf("%s_%s.%s", id, size, ext))
		}
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
	case "image/avif":
		return "avif"
	case "image/svg+xml":
		return "svg"
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

// SVG is retained only if it contains passive drawing elements and local references.
func validateSVG(data []byte) error {
	decoder := xml.NewDecoder(bytes.NewReader(data))
	allowed := strings.Fields("svg g defs path rect circle ellipse line polyline polygon text tspan title desc linearGradient radialGradient stop clipPath mask pattern use symbol marker")
	tags := map[string]bool{}
	for _, tag := range allowed {
		tags[tag] = true
	}
	depth, roots := 0, 0
	for {
		token, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		switch t := token.(type) {
		case xml.StartElement:
			if !tags[t.Name.Local] {
				return fmt.Errorf("SVG element %s is not permitted", t.Name.Local)
			}
			if depth == 0 {
				roots++
				if t.Name.Local != "svg" || roots != 1 {
					return fmt.Errorf("invalid SVG root")
				}
			}
			depth++
			for _, a := range t.Attr {
				n, v := strings.ToLower(a.Name.Local), strings.ToLower(strings.TrimSpace(a.Value))
				if strings.HasPrefix(n, "on") || n == "style" || (n == "href" && !strings.HasPrefix(v, "#")) || strings.Contains(v, "url(") && !strings.HasPrefix(v, "url(#") {
					return fmt.Errorf("active or external SVG content is not permitted")
				}
			}
		case xml.EndElement:
			depth--
		case xml.Directive:
			return fmt.Errorf("SVG directives are not permitted")
		case xml.ProcInst:
			if t.Target != "xml" {
				return fmt.Errorf("SVG processing instructions are not permitted")
			}
		}
	}
	if roots != 1 || depth != 0 {
		return fmt.Errorf("invalid SVG")
	}
	return nil
}
