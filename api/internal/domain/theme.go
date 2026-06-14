package domain

import (
	"context"
	"time"
)

type ColorScheme struct {
	Primary       string `json:"primary"`
	Secondary     string `json:"secondary"`
	Background    string `json:"background"`
	Paper         string `json:"paper"`
	TextPrimary   string `json:"textPrimary"`
	TextSecondary string `json:"textSecondary"`
	Border        string `json:"border"`
	Accent        string `json:"accent"`
}

type WorkspaceTheme struct {
	ID        string      `json:"id"`
	Name      string      `json:"name"`
	LogoURL   string      `json:"logoUrl"`
	LightMode ColorScheme `json:"lightMode"`
	DarkMode  ColorScheme `json:"darkMode"`
	IsDefault bool        `json:"isDefault"`
}

type UserPreference struct {
	UserID    string    `json:"userId"`
	ThemeMode string    `json:"themeMode"` // "light" | "dark"
	UpdatedAt time.Time `json:"updatedAt"`
}

type ThemeRepository interface {
	GetDefaultTheme(ctx context.Context) (*WorkspaceTheme, error)
	SaveTheme(ctx context.Context, theme *WorkspaceTheme) error
	GetUserPreference(ctx context.Context, userID string) (*UserPreference, error)
	SaveUserPreference(ctx context.Context, pref *UserPreference) error
}

type ThemeService interface {
	GetDefaultTheme(ctx context.Context) (*WorkspaceTheme, error)
	UpdateTheme(ctx context.Context, theme *WorkspaceTheme) error
	GetUserPreference(ctx context.Context, userID string) (*UserPreference, error)
	UpdateUserPreference(ctx context.Context, userID string, themeMode string) (*UserPreference, error)
}
