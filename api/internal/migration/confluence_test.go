package migration

import (
	"archive/zip"
	"bytes"
	"context"
	"strings"
	"testing"
)

func TestConfluenceImporter(t *testing.T) {
	importer := NewConfluenceImporter()

	xhtml := `<p>Hello world</p><ac:structured-macro ac:name="info"><ac:rich-text-body><p>Note message</p></ac:rich-text-body></ac:structured-macro>`
	ast := importer.ConvertXHTMLToTiptapAST(xhtml, "Test Document")

	if !strings.Contains(ast, "Test Document") {
		t.Errorf("Converted AST missing document title")
	}
	if !strings.Contains(ast, "kollab-callout-info") {
		t.Errorf("Converted AST missing transformed callout class")
	}

	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)

	f, _ := zw.Create("index.html")
	_, _ = f.Write([]byte("<h1>Overview</h1><p>Test confluence page</p>"))
	f2, _ := zw.Create("attachments/image.png")
	_, _ = f2.Write([]byte("fake png binary"))
	_ = zw.Close()

	summary, err := importer.ProcessSpaceExport(context.Background(), buf.Bytes(), "team-1", "proj-1")
	if err != nil {
		t.Fatalf("ProcessSpaceExport failed: %v", err)
	}

	if summary.TotalPages < 1 {
		t.Errorf("Expected at least 1 total page, got %d", summary.TotalPages)
	}
	if summary.TotalAttachments < 1 {
		t.Errorf("Expected at least 1 attachment, got %d", summary.TotalAttachments)
	}
}

func TestPreflightReportsUnsupportedMacrosAndBrokenLinks(t *testing.T) {
	importer := NewConfluenceImporter()
	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)
	page, err := zw.Create("guides/overview.xhtml")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = page.Write([]byte(`<title>Overview</title><a href="missing.html">Missing</a><ac:structured-macro ac:name="gliffy"/>`))
	attachment, err := zw.Create("attachments/diagram.png")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = attachment.Write([]byte("png"))
	_ = zw.Close()

	report, err := importer.Preflight(context.Background(), buf.Bytes())
	if err != nil {
		t.Fatalf("Preflight failed: %v", err)
	}
	if report.TotalPages != 1 || report.Pages[0].Title != "Overview" {
		t.Fatalf("unexpected pages: %#v", report.Pages)
	}
	if report.TotalAttachments != 1 {
		t.Fatalf("expected one attachment, got %d", report.TotalAttachments)
	}

	codes := map[string]bool{}
	for _, issue := range report.Issues {
		codes[issue.Code] = true
	}
	if !codes["unsupported-macro"] || !codes["missing-internal-link"] {
		t.Fatalf("expected unsupported-macro and missing-internal-link issues, got %#v", report.Issues)
	}
}

func TestPreflightDoesNotInventPagesForAnEmptyArchive(t *testing.T) {
	importer := NewConfluenceImporter()
	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)
	_ = zw.Close()

	report, err := importer.Preflight(context.Background(), buf.Bytes())
	if err != nil {
		t.Fatalf("Preflight failed: %v", err)
	}
	if report.TotalPages != 0 {
		t.Fatalf("expected no pages, got %d", report.TotalPages)
	}
	if len(report.Issues) != 1 || report.Issues[0].Code != "no-pages-found" {
		t.Fatalf("expected no-pages-found issue, got %#v", report.Issues)
	}
}

func TestPreflightDerivesHTMLDirectoryHierarchy(t *testing.T) {
	importer := NewConfluenceImporter()
	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)
	for name := range map[string]struct{}{
		"architecture/index.xhtml":            {},
		"architecture/components.xhtml":       {},
		"architecture/decisions/index.html":   {},
		"architecture/decisions/adr-001.html": {},
	} {
		entry, err := zw.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		_, _ = entry.Write([]byte("<h1>" + name + "</h1>"))
	}
	_ = zw.Close()

	report, err := importer.Preflight(context.Background(), buf.Bytes())
	if err != nil {
		t.Fatal(err)
	}
	parents := map[string]string{}
	for _, page := range report.Pages {
		parents[page.SourcePath] = page.ParentSourcePath
	}
	if parents["architecture/components.xhtml"] != "architecture/index.xhtml" || parents["architecture/decisions/index.html"] != "architecture/index.xhtml" || parents["architecture/decisions/adr-001.html"] != "architecture/decisions/index.html" {
		t.Fatalf("unexpected derived hierarchy: %#v", parents)
	}
}
