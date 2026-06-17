package document

import (
	"archive/zip"
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestTiptapToHTML(t *testing.T) {
	// 1. Simple document test
	contentJSON := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello world"}]}]}`
	htmlOut, err := TiptapToHTML("Test Page", contentJSON)
	if err != nil {
		t.Fatalf("TiptapToHTML failed: %v", err)
	}

	if !strings.Contains(htmlOut, "<h1>Test Page</h1>") {
		t.Errorf("Expected output to contain page title, got: %s", htmlOut)
	}
	if !strings.Contains(htmlOut, "<p>Hello world</p>") {
		t.Errorf("Expected output to contain translated paragraph, got: %s", htmlOut)
	}

	// 2. Callout panel macro test
	calloutJSON := `{"type":"doc","content":[{"type":"calloutPanel","attrs":{"type":"warning","title":"Caution"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Check yourself"}]}]}]}`
	htmlOut, err = TiptapToHTML("Callout Page", calloutJSON)
	if err != nil {
		t.Fatalf("TiptapToHTML failed: %v", err)
	}

	if !strings.Contains(htmlOut, "class=\"callout-panel callout-warning\"") {
		t.Errorf("Expected warning callout panel markup, got: %s", htmlOut)
	}
	if !strings.Contains(htmlOut, "<div class=\"callout-title\">Caution</div>") {
		t.Errorf("Expected caution title block inside callout, got: %s", htmlOut)
	}

	// 3. Inline status badge test
	statusJSON := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Status is "},{"type":"inlineStatus","attrs":{"color":"green","text":"DONE"}}]}]}`
	htmlOut, err = TiptapToHTML("Status Page", statusJSON)
	if err != nil {
		t.Fatalf("TiptapToHTML failed: %v", err)
	}

	if !strings.Contains(htmlOut, "<span class=\"inline-status status-green\">DONE</span>") {
		t.Errorf("Expected green status badge markup, got: %s", htmlOut)
	}

	// 4. Image translation test
	imageJSON := `{"type":"doc","content":[{"type":"customImage","attrs":{"src":"http://localhost:8080/api/images/img123/O","alt":"cool graph","title":"analytics"}}]}`
	htmlOut, err = TiptapToHTML("Image Page", imageJSON)
	if err != nil {
		t.Fatalf("TiptapToHTML failed: %v", err)
	}

	if !strings.Contains(htmlOut, `<img src="http://localhost:8080/api/images/img123/O" alt="cool graph" title="analytics" />`) {
		t.Errorf("Expected image tag with src, alt, and title, got: %s", htmlOut)
	}
}

func TestBuildDOCX(t *testing.T) {
	contentJSON := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Word doc text"}]},{"type":"customImage","attrs":{"src":"http://localhost:8080/api/images/img123/O"}}]}`
	bytesOut, err := BuildDOCX("Word Page", contentJSON)
	if err != nil {
		t.Fatalf("BuildDOCX failed: %v", err)
	}

	if len(bytesOut) == 0 {
		t.Error("Expected docx ZIP bytes, got empty slice")
	}
}

func TestTiptapToHTML_LocalImageEmbedding(t *testing.T) {
	// Create a dummy uploads directory and file
	uploadsDir := "./uploads"
	err := os.MkdirAll(uploadsDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create dummy uploads dir: %v", err)
	}
	defer os.RemoveAll(uploadsDir)

	dummyBytes := append([]byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}, []byte("fake png content")...)
	dummyFile := filepath.Join(uploadsDir, "testimg123_original.png")
	err = os.WriteFile(dummyFile, dummyBytes, 0644)
	if err != nil {
		t.Fatalf("Failed to write dummy image file: %v", err)
	}

	imageJSON := `{"type":"doc","content":[{"type":"customImage","attrs":{"src":"/api/images/testimg123/O","alt":"my test image"}}]}`
	htmlOut, err := TiptapToHTML("Image Base64 Page", imageJSON)
	if err != nil {
		t.Fatalf("TiptapToHTML failed: %v", err)
	}

	expectedBase64Start := "iVBORw0KGg"
	expectedDataURI := "data:image/png;base64," + expectedBase64Start

	if !strings.Contains(htmlOut, expectedDataURI) {
		t.Errorf("Expected html to embed image as base64 data URI, got: %s", htmlOut)
	}
}

func TestBuildDOCX_LocalImageEmbedding(t *testing.T) {
	// Create a dummy uploads directory and file
	uploadsDir := "./uploads"
	err := os.MkdirAll(uploadsDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create dummy uploads dir: %v", err)
	}
	defer os.RemoveAll(uploadsDir)

	dummyBytes := append([]byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}, []byte("fake png content for docx")...)
	dummyFile := filepath.Join(uploadsDir, "docximg123_original.png")
	err = os.WriteFile(dummyFile, dummyBytes, 0644)
	if err != nil {
		t.Fatalf("Failed to write dummy image file: %v", err)
	}

	contentJSON := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Welcome"}]},{"type":"customImage","attrs":{"src":"/api/images/docximg123/O"}}]}`
	bytesOut, err := BuildDOCX("Word Image Page", contentJSON)
	if err != nil {
		t.Fatalf("BuildDOCX failed: %v", err)
	}

	if len(bytesOut) == 0 {
		t.Fatal("Expected docx ZIP bytes, got empty slice")
	}

	// Read the generated ZIP file (docx is just a zip archive)
	zr, err := zip.NewReader(bytes.NewReader(bytesOut), int64(len(bytesOut)))
	if err != nil {
		t.Fatalf("Failed to parse bytesOut as zip: %v", err)
	}

	var foundMediaFile bool
	var documentXMLContent string
	var documentRelsContent string

	for _, f := range zr.File {
		if f.Name == "word/media/image1.png" {
			foundMediaFile = true
			// Check file content size
			rc, err := f.Open()
			if err != nil {
				t.Fatalf("Failed to open media file in zip: %v", err)
			}
			buf := new(bytes.Buffer)
			_, _ = buf.ReadFrom(rc)
			rc.Close()
			expectedBytes := append([]byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}, []byte("fake png content for docx")...)
			if !bytes.Equal(buf.Bytes(), expectedBytes) {
				t.Errorf("Expected embedded media content to match original bytes")
			}
		} else if f.Name == "word/document.xml" {
			rc, err := f.Open()
			if err == nil {
				buf := new(bytes.Buffer)
				_, _ = buf.ReadFrom(rc)
				documentXMLContent = buf.String()
				rc.Close()
			}
		} else if f.Name == "word/_rels/document.xml.rels" {
			rc, err := f.Open()
			if err == nil {
				buf := new(bytes.Buffer)
				_, _ = buf.ReadFrom(rc)
				documentRelsContent = buf.String()
				rc.Close()
			}
		}
	}

	if !foundMediaFile {
		t.Error("Expected to find embedded media image file 'word/media/image1.png' inside zip archive")
	}

	if !strings.Contains(documentXMLContent, `<a:blip r:embed="rId2"/>`) {
		t.Errorf("Expected document.xml to reference embedded relationship 'rId2', got: %s", documentXMLContent)
	}

	if !strings.Contains(documentRelsContent, `Target="media/image1.png"`) {
		t.Errorf("Expected document.xml.rels to target local media file, got: %s", documentRelsContent)
	}

	if strings.Contains(documentRelsContent, `TargetMode=`) {
		t.Errorf("Expected document.xml.rels internal media relationship NOT to define TargetMode, got: %s", documentRelsContent)
	}
}

