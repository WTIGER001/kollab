package theme

import (
	"context"
	"testing"

	"kollab/api/internal/domain"
)

func TestInMemoryThemeRepository(t *testing.T) {
	repo := NewInMemoryThemeRepository()
	ctx := context.Background()

	// 1. Get default theme (should return default seeded theme)
	theme, err := repo.GetDefaultTheme(ctx)
	if err != nil {
		t.Fatalf("expected no error getting default theme, got %v", err)
	}
	if theme == nil || theme.ID != "theme_default" {
		t.Fatalf("expected default theme, got %+v", theme)
	}

	// 2. Save theme
	newTheme := &domain.WorkspaceTheme{
		ID:           "theme_default",
		Name:         "neobrutal",
		LightMode:    domain.ColorScheme{Primary: "#000000"},
		IsDefault:    true,
	}
	err = repo.SaveTheme(ctx, newTheme)
	if err != nil {
		t.Fatalf("expected no error saving theme, got %v", err)
	}

	updatedTheme, _ := repo.GetDefaultTheme(ctx)
	if updatedTheme.Name != "neobrutal" {
		t.Errorf("expected name neobrutal, got %s", updatedTheme.Name)
	}

	// 3. Get user preference (not found should return empty/default, or error)
	pref, err := repo.GetUserPreference(ctx, "user1")
	if err != nil {
		t.Fatalf("expected no error for new user preference, got %v", err)
	}
	if pref == nil || pref.ThemeMode != "dark" {
		t.Errorf("expected default dark preference, got %+v", pref)
	}

	// 4. Save user preference
	newPref := &domain.UserPreference{
		UserID:    "user1",
		ThemeMode: "light",
	}
	err = repo.SaveUserPreference(ctx, newPref)
	if err != nil {
		t.Fatalf("expected no error saving preference, got %v", err)
	}

	updatedPref, _ := repo.GetUserPreference(ctx, "user1")
	if updatedPref.ThemeMode != "light" {
		t.Errorf("expected light mode, got %s", updatedPref.ThemeMode)
	}
}
