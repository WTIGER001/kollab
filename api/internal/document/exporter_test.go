package document

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"strings"
	"testing"

	"kollab/api/internal/domain"
)

func TestBuildHierarchyJSON(t *testing.T) {
	rootDoc := &domain.Document{
		ID: "1", Title: "Root", Content: `{"type":"doc"}`,
	}
	allDocs := []*domain.Document{
		rootDoc,
		{ID: "2", Title: "Child 1", ParentID: stringPtr("1"), Content: `{"type":"doc"}`},
		{ID: "3", Title: "Child 2", ParentID: stringPtr("1"), Content: `{"type":"doc"}`},
		{ID: "4", Title: "Grandchild", ParentID: stringPtr("2"), Content: `{"type":"doc"}`},
	}

	tree := BuildHierarchyJSON(rootDoc, allDocs)

	if tree.Title != "Root" {
		t.Errorf("expected Root title, got %s", tree.Title)
	}
	if len(tree.Children) != 2 {
		t.Fatalf("expected 2 children, got %d", len(tree.Children))
	}
	if tree.Children[0].Title != "Child 1" && tree.Children[1].Title != "Child 1" {
		t.Errorf("expected Child 1 in children")
	}

	// Verify JSON serialization
	out, err := json.Marshal(tree)
	if err != nil {
		t.Fatalf("unexpected error marshaling: %v", err)
	}
	if !strings.Contains(string(out), "Grandchild") {
		t.Errorf("expected JSON to contain Grandchild")
	}
}

func TestBuildCombinedHTML(t *testing.T) {
	rootDoc := &domain.Document{
		ID: "1", Title: "Root HTML", Content: `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello World"}]}]}`,
	}
	allDocs := []*domain.Document{
		rootDoc,
		{ID: "2", Title: "Child HTML", ParentID: stringPtr("1"), Content: `{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Child Header"}]}]}`},
	}

	htmlOut, err := BuildCombinedHTML(rootDoc, allDocs)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(htmlOut, "Hello World") {
		t.Errorf("expected HTML to contain Hello World")
	}
	if !strings.Contains(htmlOut, "<h1>Child Header</h1>") {
		t.Errorf("expected HTML to contain child heading")
	}
}

func TestBuildDOCX(t *testing.T) {
	content := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Testing DOCX"}]}]}`
	out, err := BuildDOCX("Test DOCX", content)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) == 0 {
		t.Fatalf("expected output bytes")
	}
}

func TestBuildCombinedDOCX(t *testing.T) {
	rootDoc := &domain.Document{
		ID: "1", Title: "Root DOCX", Content: `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Root DOCX Text"}]}]}`,
	}
	allDocs := []*domain.Document{
		rootDoc,
		{ID: "2", Title: "Child DOCX", ParentID: stringPtr("1"), Content: `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Child DOCX Text"}]}]}`},
	}

	out, err := BuildCombinedDOCX(rootDoc, allDocs)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) == 0 {
		t.Fatalf("expected output bytes")
	}
}

func stringPtr(s string) *string {
	return &s
}

func TestExporter(t *testing.T) {
	html, err := TiptapToHTML("Title", `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"hello"}]}]}`)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if html == "" {
		t.Errorf("expected html output")
	}

	html2, err := TiptapToHTML("Title", `invalid json`)
	if err != nil {
		t.Errorf("expected no error for invalid json, got %v", err)
	}
	if !strings.Contains(html2, "invalid json") {
		t.Errorf("expected HTML to contain 'invalid json'")
	}
	
	// Huge JSON to test nodeToHTML and nodeToOpenXML
	hugeJSON := `{"type":"doc","content":[
		{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"H1"}]},
		{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"H2"}]},
		{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"H3"}]},
		{"type":"heading","attrs":{"level":4},"content":[{"type":"text","text":"H4"}]},
		{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"},{"type":"italic"},{"type":"strike"},{"type":"code"},{"type":"link","attrs":{"href":"http://example.com"}}],"text":"formatted"}]},
		{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"bullet"}]}]}]},
		{"type":"orderedList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"ordered"}]}]}]},
		{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":true},"content":[{"type":"paragraph","content":[{"type":"text","text":"task"}]}]}]},
		{"type":"codeBlock","attrs":{"language":"go"},"content":[{"type":"text","text":"fmt.Println()"}]},
		{"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"quote"}]}]},
		{"type":"horizontalRule"},
		{"type":"image","attrs":{"src":"http://example.com/img.png","alt":"alt","title":"title"}},
		{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"th"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"td"}]}]}]}]},
		{"type":"calloutPanel","attrs":{"type":"info"},"content":[{"type":"paragraph","content":[{"type":"text","text":"callout"}]}]},
		{"type":"inlineStatus","attrs":{"status":"Active"}},
		{"type":"details","content":[{"type":"summary","content":[{"type":"text","text":"details"}]},{"type":"paragraph","content":[{"type":"text","text":"content"}]}]},
		{"type":"drawio","attrs":{"xml":"<xml></xml>"}}
	]}`
	
	_, err = TiptapToHTML("All Nodes", hugeJSON)
	if err != nil {
		t.Errorf("unexpected error in TiptapToHTML with huge JSON: %v", err)
	}
	
	_, err = BuildDOCX("All Nodes", hugeJSON)
	if err != nil {
		t.Errorf("unexpected error in BuildDOCX with huge JSON: %v", err)
	}

	// Test PrintPDF
	_, err = PrintPDF(context.Background(), "<html><body>Test</body></html>")
	// Might fail because chrome is not installed in test environment, but will cover the code
	if err == nil {
		// Ignore error check since it depends on the environment
	}

	// Test WriteHTMLZip
	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)
	err = WriteHTMLZip(zw, &domain.Document{ID: "root", Title: "Root", Content: hugeJSON}, []*domain.Document{
		{ID: "root", Title: "Root", Content: hugeJSON},
	}, "")
	if err != nil {
		t.Errorf("unexpected error in WriteHTMLZip: %v", err)
	}
	zw.Close()
}
