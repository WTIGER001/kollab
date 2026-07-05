package postgres

import (
	"testing"
	"time"

	"kollab/api/internal/domain"
)

func TestPostgresSystemRepository(t *testing.T) {
	db, ctx := setupTestDB(t)
	repo := NewPostgresSystemRepository(db)

	settings := &domain.SystemSettings{
		AuditRetentionPolicy: "forever",
		AuditRetentionCustomDays: 0,
	}

	if err := repo.UpdateSettings(ctx, settings); err != nil {
		t.Fatalf("failed to update settings: %v", err)
	}

	fetched, err := repo.GetSettings(ctx)
	if err != nil {
		t.Fatalf("failed to get settings: %v", err)
	}

	if fetched.AuditRetentionPolicy != "forever" {
		t.Errorf("expected forever, got %s", fetched.AuditRetentionPolicy)
	}

	docRepo := NewPostgresDocumentRepository(db)
	doc := &domain.Document{
		ID: "doc_for_audit",
		Title: "Audit Doc",
		Slug: "audit-doc",
		ProjectID: "proj_wiki",
		TeamID: "team_eng",
		CreatedByID: "sh4ag0cxowti",
		UpdatedByID: "sh4ag0cxowti",
		Content: "{}",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	_ = docRepo.Create(ctx, doc)

	auditLog := &domain.AuditLog{
		ID: "log_1",
		UserID: "sh4ag0cxowti",
		Action: "update",
		DocumentID: "doc_for_audit",
		CreatedAt: time.Now(),
	}

	if err := repo.RecordAuditLog(ctx, auditLog); err != nil {
		t.Fatalf("failed to record audit log: %v", err)
	}

	logs, err := repo.GetAuditLogsForPage(ctx, "doc_for_audit")
	if err != nil {
		t.Fatalf("failed to get audit logs: %v", err)
	}
	if len(logs) == 0 {
		t.Error("expected at least 1 log")
	}
}
