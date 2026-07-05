package postgres

import (
	"testing"
	"time"

	"kollab/api/internal/domain"
)

func TestPostgresAttachmentRepository(t *testing.T) {
	db, ctx := setupTestDB(t)
	repo := NewPostgresAttachmentRepository(db)

	docRepo := NewPostgresDocumentRepository(db)
	doc := &domain.Document{
		ID: "doc_for_att",
		Title: "Att Doc",
		Slug: "att-doc",
		ProjectID: "proj_wiki",
		TeamID: "team_eng",
		CreatedByID: "sh4ag0cxowti",
		UpdatedByID: "sh4ag0cxowti",
		Content: "{}",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	_ = docRepo.Create(ctx, doc)

	att := &domain.Attachment{
		ID: "att_1",
		DocumentID: "doc_for_att",
		UploadedBy: "sh4ag0cxowti",
		Filename: "doc.pdf",
		MimeType: "application/pdf",
		FileSize: 1024,
		StorageKey: "local/doc.pdf",
		UploadedAt: time.Now(),
	}

	if err := repo.Save(ctx, att); err != nil {
		t.Fatalf("failed to create attachment: %v", err)
	}

	fetched, err := repo.GetByID(ctx, "att_1")
	if err != nil {
		t.Fatalf("failed to get attachment: %v", err)
	}

	if fetched.Filename != "doc.pdf" {
		t.Errorf("expected doc.pdf, got %s", fetched.Filename)
	}

	list, err := repo.ListByDocumentID(ctx, "doc_for_att")
	if err != nil {
		t.Fatalf("failed to list attachments: %v", err)
	}
	if len(list) == 0 {
		t.Error("expected at least 1 attachment")
	}

	if err := repo.Delete(ctx, "att_1"); err != nil {
		t.Fatalf("failed to delete attachment: %v", err)
	}
}
