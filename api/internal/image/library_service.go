package image

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"kollab/api/internal/domain"
)

type LibraryImageService struct {
	repo         domain.LibraryImageRepository
	imageService domain.ImageService
}

func NewLibraryImageService(repo domain.LibraryImageRepository, imageService domain.ImageService) *LibraryImageService {
	return &LibraryImageService{
		repo:         repo,
		imageService: imageService,
	}
}

func (s *LibraryImageService) Upload(ctx context.Context, fileData []byte, filename string, mimeType string, displayName string, scope string, teamID *string, projectID *string, userID string) (*domain.LibraryImage, error) {
	// First, use the existing ImageService to handle file resizing, storage, and image metadata creation
	imgMeta, err := s.imageService.UploadImage(ctx, filename, mimeType, fileData)
	if err != nil {
		return nil, fmt.Errorf("failed to process and save image file: %w", err)
	}

	// Now create the library entry
	libImg := &domain.LibraryImage{
		ID:          uuid.New().String(),
		ImageID:     imgMeta.ID,
		Filename:    filename,
		DisplayName: displayName,
		MimeType:    mimeType,
		SizeBytes:   int64(len(fileData)),
		Scope:       scope,
		TeamID:      teamID,
		ProjectID:   projectID,
		UploadedBy:  userID,
		CreatedAt:   time.Now(),
	}

	if err := s.repo.Save(ctx, libImg); err != nil {
		// If we fail here, ideally we should clean up the uploaded image from storage and DB
		_ = s.imageService.DeleteImage(context.Background(), imgMeta.ID)
		return nil, fmt.Errorf("failed to save library image record: %w", err)
	}

	// Generate URL
	libImg.URL = fmt.Sprintf("/api/images/%s/original", libImg.ImageID)

	return libImg, nil
}

func (s *LibraryImageService) List(ctx context.Context, scope string, teamID *string, projectID *string) ([]*domain.LibraryImage, error) {
	images, err := s.repo.List(ctx, scope, teamID, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to list library images: %w", err)
	}

	// Generate URLs
	for _, img := range images {
		img.URL = fmt.Sprintf("/api/images/%s/original", img.ImageID)
	}

	return images, nil
}

func (s *LibraryImageService) UpdateName(ctx context.Context, id string, name string) (*domain.LibraryImage, error) {
	if err := s.repo.UpdateName(ctx, id, name); err != nil {
		return nil, fmt.Errorf("failed to update library image name: %w", err)
	}
	return s.repo.Get(ctx, id)
}

func (s *LibraryImageService) Delete(ctx context.Context, id string) error {
	// First get the library image to find the underlying image ID
	libImg, err := s.repo.Get(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get library image: %w", err)
	}

	// Delete from library_images table
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete library image record: %w", err)
	}

	// Delete the actual files and image metadata
	if err := s.imageService.DeleteImage(ctx, libImg.ImageID); err != nil {
		// Log the error but don't fail the request since the library record is gone
		fmt.Printf("Warning: failed to delete underlying image files for %s: %v\n", libImg.ImageID, err)
	}

	return nil
}
