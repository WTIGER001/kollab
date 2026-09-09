package handler_test

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	documentService "kollab/api/internal/document"
	"kollab/api/internal/http/handler"
	"kollab/api/internal/migration"
)

func TestConfluencePreviewUsesUploadedArchive(t *testing.T) {
	archiveBuffer := new(bytes.Buffer)
	archiveWriter := zip.NewWriter(archiveBuffer)
	page, err := archiveWriter.Create("docs/overview.xhtml")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = page.Write([]byte(`<title>Archive-derived title</title><ac:structured-macro ac:name="info"/>`))
	_ = archiveWriter.Close()

	body := new(bytes.Buffer)
	form := multipart.NewWriter(body)
	file, err := form.CreateFormFile("backup", "space.zip")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = file.Write(archiveBuffer.Bytes())
	_ = form.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/migration/confluence/preview", body)
	req.Header.Set("Content-Type", form.FormDataContentType())
	response := httptest.NewRecorder()
	handler.NewMigrationHandler(migration.NewConfluenceImporter(), nil).PreviewConfluenceSpace(response, req)

	if response.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", response.Code, response.Body.String())
	}
	var report migration.PreflightReport
	if err := json.NewDecoder(response.Body).Decode(&report); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if report.TotalPages != 1 || len(report.Pages) != 1 || report.Pages[0].Title != "Archive-derived title" {
		t.Fatalf("preview did not reflect uploaded archive: %#v", report)
	}
}

func TestConfluenceImportCreatesArchiveDerivedPages(t *testing.T) {
	archiveBuffer := new(bytes.Buffer)
	archiveWriter := zip.NewWriter(archiveBuffer)
	page, err := archiveWriter.Create("docs/overview.xhtml")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = page.Write([]byte(`<title>Imported architecture</title><p>Content from the archive</p>`))
	_ = archiveWriter.Close()

	body := new(bytes.Buffer)
	form := multipart.NewWriter(body)
	file, err := form.CreateFormFile("backup", "space.zip")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = file.Write(archiveBuffer.Bytes())
	_ = form.WriteField("teamId", "team-1")
	_ = form.Close()

	repo := documentService.NewInMemoryDocumentRepository()
	docs := documentService.NewDocumentService(repo, nil, nil, nil)
	req := httptest.NewRequest(http.MethodPost, "/api/migration/confluence/import", body)
	req.Header.Set("Content-Type", form.FormDataContentType())
	response := httptest.NewRecorder()
	handler.NewMigrationHandler(migration.NewConfluenceImporter(), docs).ImportConfluenceSpace(response, req)

	if response.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", response.Code, response.Body.String())
	}
	var summary migration.MigrationSummary
	if err := json.NewDecoder(response.Body).Decode(&summary); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if summary.SuccessCount != 1 || summary.SkippedCount != 0 {
		t.Fatalf("unexpected summary: %#v", summary)
	}
	created, err := repo.GetByTeamID(req.Context(), "team-1")
	if err != nil || len(created) != 1 || created[0].Title != "Imported architecture" {
		t.Fatalf("import did not create the expected document: %#v, %v", created, err)
	}
}

func TestConfluenceImportPreservesHTMLIndexHierarchy(t *testing.T) {
	archiveBuffer := new(bytes.Buffer)
	archiveWriter := zip.NewWriter(archiveBuffer)
	for _, pageSpec := range []struct{ name, body string }{
		{"guides/index.xhtml", "<title>Guides</title>"},
		{"guides/setup.xhtml", "<title>Setup</title>"},
	} {
		page, err := archiveWriter.Create(pageSpec.name)
		if err != nil {
			t.Fatal(err)
		}
		_, _ = page.Write([]byte(pageSpec.body))
	}
	_ = archiveWriter.Close()

	body := new(bytes.Buffer)
	form := multipart.NewWriter(body)
	file, err := form.CreateFormFile("backup", "space.zip")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = file.Write(archiveBuffer.Bytes())
	_ = form.WriteField("teamId", "team-1")
	_ = form.Close()

	repo := documentService.NewInMemoryDocumentRepository()
	docs := documentService.NewDocumentService(repo, nil, nil, nil)
	req := httptest.NewRequest(http.MethodPost, "/api/migration/confluence/import", body)
	req.Header.Set("Content-Type", form.FormDataContentType())
	response := httptest.NewRecorder()
	handler.NewMigrationHandler(migration.NewConfluenceImporter(), docs).ImportConfluenceSpace(response, req)
	if response.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", response.Code, response.Body.String())
	}
	created, err := repo.GetByTeamID(req.Context(), "team-1")
	if err != nil || len(created) != 2 {
		t.Fatalf("expected two documents, got %#v, %v", created, err)
	}
	byTitle := map[string]string{}
	for _, document := range created {
		if document.ParentID != nil {
			byTitle[document.Title] = *document.ParentID
		} else {
			byTitle[document.Title] = ""
		}
	}
	parent, err := repo.GetByID(req.Context(), byTitle["Setup"])
	if err != nil || parent.Title != "Guides" {
		t.Fatalf("expected Setup to be a child of Guides, got parent %q (%v)", byTitle["Setup"], err)
	}
}
