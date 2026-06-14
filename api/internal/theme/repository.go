package theme

import (
	"context"
	"sync"
	"time"

	"arkollab/api/internal/domain"
)

type InMemoryThemeRepository struct {
	mu          sync.RWMutex
	theme       *domain.WorkspaceTheme
	preferences map[string]*domain.UserPreference
}

func NewInMemoryThemeRepository() *InMemoryThemeRepository {
	defaultTheme := &domain.WorkspaceTheme{
		ID:      "theme_default",
		Name:    "Default Arkloud Theme",
		LogoURL: "",
		LightMode: domain.ColorScheme{
			Primary:       "#8b5cf6",
			Secondary:     "#6366f1",
			Background:    "#f8fafc",
			Paper:         "#ffffff",
			TextPrimary:   "#0f172a",
			TextSecondary: "#475569",
			Border:        "#e2e8f0",
			Accent:        "#3b82f6",
		},
		DarkMode: domain.ColorScheme{
			Primary:       "#8b5cf6",
			Secondary:     "#6366f1",
			Background:    "#0b0c10",
			Paper:         "#161824",
			TextPrimary:   "#ffffff",
			TextSecondary: "#94a3b8",
			Border:        "#1e293b",
			Accent:        "#3b82f6",
		},
		IsDefault: true,
	}

	return &InMemoryThemeRepository{
		theme:       defaultTheme,
		preferences: make(map[string]*domain.UserPreference),
	}
}

func (r *InMemoryThemeRepository) GetDefaultTheme(ctx context.Context) (*domain.WorkspaceTheme, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.theme, nil
}

func (r *InMemoryThemeRepository) SaveTheme(ctx context.Context, theme *domain.WorkspaceTheme) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.theme = theme
	return nil
}

func (r *InMemoryThemeRepository) GetUserPreference(ctx context.Context, userID string) (*domain.UserPreference, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	pref, exists := r.preferences[userID]
	if !exists {
		return &domain.UserPreference{
			UserID:    userID,
			ThemeMode: "dark",
			UpdatedAt: time.Now(),
		}, nil
	}
	return pref, nil
}

func (r *InMemoryThemeRepository) SaveUserPreference(ctx context.Context, pref *domain.UserPreference) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.preferences[pref.UserID] = pref
	return nil
}
