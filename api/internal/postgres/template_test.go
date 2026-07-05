package postgres

import (
	"testing"
	"time"

	"kollab/api/internal/domain"
)

func TestPostgresTemplateRepository(t *testing.T) {
	db, ctx := setupTestDB(t)
	repo := NewPostgresTemplateRepository(db)

	tpl := &domain.Template{
		ID:           "tpl_1",
		Title:        "Test Template",
		Description:  "Desc",
		Content:      "{}",
		Scope:        domain.TemplateScopeSystem,
		TemplateType: domain.TemplateTypePage,
		CreatedAt:    time.Now(),
	}

	err := repo.Create(ctx, tpl)
	if err != nil {
		t.Fatalf("failed to create template: %v", err)
	}

	fetched, err := repo.GetByID(ctx, "tpl_1")
	if err != nil {
		t.Fatalf("failed to get template by ID: %v", err)
	}
	if fetched.Title != "Test Template" {
		t.Errorf("expected Test Template, got %s", fetched.Title)
	}

	list, err := repo.GetByContext(ctx, nil, nil, nil, nil)
	if err != nil {
		t.Fatalf("failed to get templates by context: %v", err)
	}
	if len(list) == 0 {
		t.Errorf("expected at least 1 template in list")
	}

	tpl.Title = "Updated Name"
	err = repo.Update(ctx, tpl)
	if err != nil {
		t.Fatalf("failed to update template: %v", err)
	}

	err = repo.Delete(ctx, "tpl_1")
	if err != nil {
		t.Fatalf("failed to delete template: %v", err)
	}
}
