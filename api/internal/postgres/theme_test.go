package postgres

import (
	"testing"
)

func TestPostgresThemeRepository(t *testing.T) {
	db, ctx := setupTestDB(t)
	repo := NewPostgresThemeRepository(db)

	theme, err := repo.GetDefaultTheme(ctx)
	if err != nil {
		t.Fatalf("failed to get initial default theme: %v", err)
	}

	theme.LightMode.Primary = "#ff0000"
	if err := repo.SaveTheme(ctx, theme); err != nil {
		t.Fatalf("failed to save theme: %v", err)
	}

	fetched, err := repo.GetDefaultTheme(ctx)
	if err != nil {
		t.Fatalf("failed to get theme: %v", err)
	}

	if fetched.LightMode.Primary != "#ff0000" {
		t.Errorf("expected #ff0000, got %s", fetched.LightMode.Primary)
	}

	// Update existing again
	theme.LightMode.Primary = "#000000"
	if err := repo.SaveTheme(ctx, theme); err != nil {
		t.Fatalf("failed to update theme: %v", err)
	}

	fetched2, _ := repo.GetDefaultTheme(ctx)
	if fetched2.LightMode.Primary != "#000000" {
		t.Errorf("expected #000000, got %s", fetched2.LightMode.Primary)
	}
}
