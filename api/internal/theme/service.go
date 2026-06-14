package theme

import (
	"context"
	"errors"
	"time"

	"arkollab/api/internal/domain"
)

type ThemeService struct {
	repo domain.ThemeRepository
}

func NewThemeService(repo domain.ThemeRepository) *ThemeService {
	return &ThemeService{
		repo: repo,
	}
}

func (s *ThemeService) GetDefaultTheme(ctx context.Context) (*domain.WorkspaceTheme, error) {
	return s.repo.GetDefaultTheme(ctx)
}

func (s *ThemeService) UpdateTheme(ctx context.Context, theme *domain.WorkspaceTheme) error {
	if theme.ID == "" {
		theme.ID = "theme_default"
	}
	theme.IsDefault = true
	return s.repo.SaveTheme(ctx, theme)
}

func (s *ThemeService) GetUserPreference(ctx context.Context, userID string) (*domain.UserPreference, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}
	return s.repo.GetUserPreference(ctx, userID)
}

func (s *ThemeService) UpdateUserPreference(ctx context.Context, userID string, themeMode string) (*domain.UserPreference, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}
	if themeMode != "light" && themeMode != "dark" {
		return nil, errors.New("invalid themeMode, must be 'light' or 'dark'")
	}

	pref := &domain.UserPreference{
		UserID:    userID,
		ThemeMode: themeMode,
		UpdatedAt: time.Now(),
	}

	if err := s.repo.SaveUserPreference(ctx, pref); err != nil {
		return nil, err
	}
	return pref, nil
}
