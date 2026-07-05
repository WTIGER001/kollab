package theme

import (
	"context"
	"testing"
)

func TestThemeService(t *testing.T) {
	repo := NewInMemoryThemeRepository()
	service := NewThemeService(repo)
	ctx := context.Background()

	// 1. Get default theme
	theme, err := service.GetDefaultTheme(ctx)
	if err != nil {
		t.Fatalf("expected no error getting default theme, got %v", err)
	}
	if theme == nil {
		t.Fatal("expected default theme, got nil")
	}

	// 2. Update theme
	theme.Name = "editorial"
	theme.ID = "" // test auto-assign ID
	err = service.UpdateTheme(ctx, theme)
	if err != nil {
		t.Fatalf("expected no error updating theme, got %v", err)
	}
	
	updatedTheme, _ := service.GetDefaultTheme(ctx)
	if updatedTheme.ID != "theme_default" || updatedTheme.Name != "editorial" {
		t.Errorf("expected theme_default and editorial, got %+v", updatedTheme)
	}

	// 3. User Preferences
	_, err = service.GetUserPreference(ctx, "")
	if err == nil {
		t.Error("expected error for empty userID in GetUserPreference")
	}

	pref, err := service.GetUserPreference(ctx, "user2")
	if err != nil {
		t.Fatalf("expected no error for new user preference, got %v", err)
	}
	if pref.ThemeMode != "dark" {
		t.Errorf("expected dark, got %s", pref.ThemeMode)
	}

	_, err = service.UpdateUserPreference(ctx, "", "dark")
	if err == nil {
		t.Error("expected error for empty userID in UpdateUserPreference")
	}

	_, err = service.UpdateUserPreference(ctx, "user2", "invalid_mode")
	if err == nil {
		t.Error("expected error for invalid theme mode")
	}

	updatedPref, err := service.UpdateUserPreference(ctx, "user2", "light")
	if err != nil {
		t.Fatalf("expected no error updating preference, got %v", err)
	}
	if updatedPref.ThemeMode != "light" {
		t.Errorf("expected light, got %s", updatedPref.ThemeMode)
	}
}
