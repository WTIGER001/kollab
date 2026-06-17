package document

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"arkollab/api/internal/domain"

	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
)

// TiptapNode represents a parsed node from Tiptap's ProseMirror JSON AST.
type TiptapNode struct {
	Type    string            `json:"type"`
	Attrs   map[string]any    `json:"attrs,omitempty"`
	Content []TiptapNode      `json:"content,omitempty"`
	Text    string            `json:"text,omitempty"`
	Marks   []TiptapMark      `json:"marks,omitempty"`
}

// TiptapMark represents styling marks applied to text nodes.
type TiptapMark struct {
	Type  string         `json:"type"`
	Attrs map[string]any `json:"attrs,omitempty"`
}

// JSONTree represents the recursive page structure exported/imported by users.
type JSONTree struct {
	Title    string     `json:"title"`
	Content  string     `json:"content"`
	Children []JSONTree `json:"children,omitempty"`
}

// OpenXMLRelation represents a relationship resource mapping inside DOCX.
type OpenXMLRelation struct {
	ID         string
	Type       string
	Target     string
	TargetMode string
}

// OpenXMLContext passes document conversion state (like dynamically built relationships).
type OpenXMLContext struct {
	Relationships []OpenXMLRelation
	InParagraph   bool
}

const (
	contentTypesXML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
	<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
	<Default Extension="xml" ContentType="application/xml"/>
	<Default Extension="png" ContentType="image/png"/>
	<Default Extension="jpeg" ContentType="image/jpeg"/>
	<Default Extension="jpg" ContentType="image/jpeg"/>
	<Default Extension="gif" ContentType="image/gif"/>
	<Default Extension="webp" ContentType="image/webp"/>
	<Default Extension="svg" ContentType="image/svg+xml"/>
	<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
	<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`

	relsXML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

	stylesXML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
	<w:style w:type="paragraph" w:styleId="Normal" w:default="1">
		<w:name w:val="Normal"/>
		<w:rPr>
			<w:rFonts w:ascii="Inter" w:hAnsi="Inter"/>
			<w:sz w:val="22"/>
		</w:rPr>
	</w:style>
	<w:style w:type="paragraph" w:styleId="Title">
		<w:name w:val="Title"/>
		<w:basedOn w:val="Normal"/>
		<w:rPr>
			<w:rFonts w:ascii="Outfit" w:hAnsi="Outfit"/>
			<w:b/>
			<w:sz w:val="56"/>
		</w:rPr>
	</w:style>
	<w:style w:type="paragraph" w:styleId="Heading1">
		<w:name w:val="heading 1"/>
		<w:basedOn w:val="Normal"/>
		<w:rPr>
			<w:rFonts w:ascii="Outfit" w:hAnsi="Outfit"/>
			<w:b/>
			<w:sz w:val="48"/>
		</w:rPr>
	</w:style>
	<w:style w:type="paragraph" w:styleId="Heading2">
		<w:name w:val="heading 2"/>
		<w:basedOn w:val="Normal"/>
		<w:rPr>
			<w:rFonts w:ascii="Outfit" w:hAnsi="Outfit"/>
			<w:b/>
			<w:sz w:val="36"/>
		</w:rPr>
	</w:style>
	<w:style w:type="paragraph" w:styleId="Heading3">
		<w:name w:val="heading 3"/>
		<w:basedOn w:val="Normal"/>
		<w:rPr>
			<w:rFonts w:ascii="Outfit" w:hAnsi="Outfit"/>
			<w:b/>
			<w:sz w:val="28"/>
		</w:rPr>
	</w:style>
</w:styles>`
)

// TiptapToHTML converts a Tiptap content JSON string into styled, self-contained HTML.
func TiptapToHTML(title string, contentJSON string) (string, error) {
	var root TiptapNode
	if contentJSON != "" && contentJSON != `""` {
		if err := json.Unmarshal([]byte(contentJSON), &root); err != nil {
			root = TiptapNode{
				Type: "doc",
				Content: []TiptapNode{
					{
						Type: "paragraph",
						Content: []TiptapNode{
							{Type: "text", Text: contentJSON},
						},
					},
				},
			}
		}
	} else {
		root = TiptapNode{Type: "doc"}
	}

	embedImagesAsBase64(&root)

	bodyHTML := nodeToHTML(root)

	// Embed styles matching our workspace design guidelines
	htmlDoc := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>%s</title>
	<style>
		@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap');
		body {
			font-family: 'Inter', sans-serif;
			color: #1f2937;
			line-height: 1.6;
			max-width: 800px;
			margin: 40px auto;
			padding: 0 20px;
			background-color: #ffffff;
		}
		h1, h2, h3, h4, h5, h6 {
			font-family: 'Outfit', sans-serif;
			color: #111827;
			font-weight: 600;
			margin-top: 24px;
			margin-bottom: 12px;
		}
		h1 { font-size: 2.2em; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 0; }
		h2 { font-size: 1.7em; }
		h3 { font-size: 1.3em; }
		p { margin: 0 0 16px 0; }
		a { color: #2563eb; text-decoration: none; }
		a:hover { text-decoration: underline; }
		ul, ol { margin: 0 0 16px 0; padding-left: 24px; }
		li { margin-bottom: 6px; }
		pre {
			background-color: #f3f4f6;
			border-radius: 6px;
			padding: 16px;
			overflow-x: auto;
			font-family: monospace;
			font-size: 0.9em;
			margin: 0 0 16px 0;
			border: 1px solid #e5e7eb;
		}
		code {
			font-family: monospace;
			background-color: #f3f4f6;
			padding: 2px 4px;
			border-radius: 4px;
			font-size: 0.9em;
		}
		pre code {
			background-color: transparent;
			padding: 0;
			border-radius: 0;
			font-size: 100%%;
		}
		blockquote {
			border-left: 4px solid #d1d5db;
			margin: 0 0 16px 0;
			padding-left: 16px;
			color: #4b5563;
			font-style: italic;
		}
		table {
			width: 100%%;
			border-collapse: collapse;
			margin: 0 0 20px 0;
		}
		th, td {
			border: 1px solid #e5e7eb;
			padding: 10px 12px;
			text-align: left;
		}
		th {
			background-color: #f9fafb;
			font-weight: 600;
		}
		hr {
			border: 0;
			border-top: 1px solid #e5e7eb;
			margin: 24px 0;
		}
		img {
			max-width: 100%%;
			height: auto;
			border-radius: 6px;
			margin: 16px 0;
			display: block;
		}
		/* Custom macros styling */
		.callout-panel {
			padding: 16px;
			border-radius: 8px;
			margin-bottom: 20px;
			border-left: 4px solid #3b82f6;
			background-color: #eff6ff;
		}
		.callout-title {
			font-weight: 600;
			margin-bottom: 8px;
			font-family: 'Outfit', sans-serif;
		}
		.callout-info { border-left-color: #3b82f6; background-color: #eff6ff; }
		.callout-warning { border-left-color: #f59e0b; background-color: #fffbeb; }
		.callout-error { border-left-color: #ef4444; background-color: #fef2f2; }
		.callout-check { border-left-color: #22c55e; background-color: #f0fdf4; }
		.callout-note { border-left-color: #6b7280; background-color: #f9fafb; }
		.callout-tip { border-left-color: #8b5cf6; background-color: #f5f3ff; }

		.inline-status {
			display: inline-block;
			padding: 2px 8px;
			border-radius: 4px;
			font-size: 0.75em;
			font-weight: 600;
			text-transform: uppercase;
			margin: 0 4px;
			vertical-align: middle;
		}
		.status-blue { background-color: #dbeafe; color: #1e40af; }
		.status-yellow { background-color: #fef3c7; color: #92400e; }
		.status-green { background-color: #d1fae5; color: #065f46; }
		.status-red { background-color: #fee2e2; color: #991b1b; }
		.status-gray { background-color: #f3f4f6; color: #374151; }

		.task-list {
			list-style-type: none;
			padding-left: 0;
		}
		.task-item {
			display: flex;
			align-items: flex-start;
			margin-bottom: 8px;
		}
		.task-checkbox {
			margin-right: 8px;
			font-size: 1.1em;
			font-family: monospace;
			user-select: none;
		}
		.task-content {
			flex: 1;
		}

		details {
			border: 1px solid #e5e7eb;
			border-radius: 8px;
			padding: 12px;
			margin-bottom: 16px;
		}
		summary {
			font-weight: 600;
			cursor: pointer;
			font-family: 'Outfit', sans-serif;
		}
		.details-content {
			margin-top: 10px;
		}
	</style>
</head>
<body>
	<h1>%s</h1>
	%s
</body>
</html>`, title, title, bodyHTML)

	return htmlDoc, nil
}

func nodeToHTML(n TiptapNode) string {
	var sb strings.Builder

	switch n.Type {
	case "doc":
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
	case "paragraph":
		sb.WriteString("<p>")
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</p>\n")
	case "heading":
		level := 1
		if lvlVal, ok := n.Attrs["level"].(float64); ok {
			level = int(lvlVal)
		} else if lvlInt, ok := n.Attrs["level"].(int); ok {
			level = lvlInt
		}
		if level < 1 || level > 6 {
			level = 1
		}
		fmt.Fprintf(&sb, "<h%d>", level)
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		fmt.Fprintf(&sb, "</h%d>\n", level)
	case "text":
		escaped := html.EscapeString(n.Text)
		// Apply marks
		var openTags, closeTags strings.Builder
		for _, mark := range n.Marks {
			switch mark.Type {
			case "bold":
				openTags.WriteString("<strong>")
				closeTags.WriteString("</strong>")
			case "italic":
				openTags.WriteString("<em>")
				closeTags.WriteString("</em>")
			case "strike":
				openTags.WriteString("<s>")
				closeTags.WriteString("</s>")
			case "underline":
				openTags.WriteString("<u>")
				closeTags.WriteString("</u>")
			case "code":
				openTags.WriteString("<code>")
				closeTags.WriteString("</code>")
			case "link":
				href := ""
				if hrefVal, ok := mark.Attrs["href"].(string); ok {
					href = hrefVal
				}
				fmt.Fprintf(&openTags, "<a href=\"%s\" target=\"_blank\">", html.EscapeString(href))
				closeTags.WriteString("</a>")
			}
		}
		sb.WriteString(openTags.String())
		sb.WriteString(escaped)
		sb.WriteString(closeTags.String())
	case "bulletList":
		sb.WriteString("<ul>\n")
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</ul>\n")
	case "orderedList":
		sb.WriteString("<ol>\n")
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</ol>\n")
	case "listItem":
		sb.WriteString("<li>")
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</li>\n")
	case "taskList":
		sb.WriteString("<ul class=\"task-list\">\n")
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</ul>\n")
	case "taskItem":
		checked := false
		if chkVal, ok := n.Attrs["checked"].(bool); ok {
			checked = chkVal
		}
		box := "☐"
		if checked {
			box = "☑"
		}
		sb.WriteString("<li class=\"task-item\">")
		fmt.Fprintf(&sb, "<span class=\"task-checkbox\">%s</span>", box)
		sb.WriteString("<div class=\"task-content\">")
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</div></li>\n")
	case "codeBlock":
		sb.WriteString("<pre><code>")
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</code></pre>\n")
	case "table":
		sb.WriteString("<table>\n")
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</table>\n")
	case "tableRow":
		sb.WriteString("<tr>\n")
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</tr>\n")
	case "tableHeader":
		sb.WriteString("<th>")
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</th>\n")
	case "tableCell":
		sb.WriteString("<td>")
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</td>\n")
	case "image", "customImage":
		src := ""
		if srcVal, ok := n.Attrs["src"].(string); ok {
			src = srcVal
		}
		alt := ""
		if altVal, ok := n.Attrs["alt"].(string); ok {
			alt = altVal
		}
		title := ""
		if titleVal, ok := n.Attrs["title"].(string); ok {
			title = titleVal
		}
		fmt.Fprintf(&sb, "<img src=\"%s\" alt=\"%s\" title=\"%s\" />\n",
			html.EscapeString(src), html.EscapeString(alt), html.EscapeString(title))
	case "calloutPanel":
		cType := "info"
		if tVal, ok := n.Attrs["type"].(string); ok {
			cType = tVal
		}
		title := ""
		if tTitle, ok := n.Attrs["title"].(string); ok {
			title = tTitle
		}
		fmt.Fprintf(&sb, "<div class=\"callout-panel callout-%s\">\n", cType)
		if title != "" {
			fmt.Fprintf(&sb, "<div class=\"callout-title\">%s</div>\n", html.EscapeString(title))
		}
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</div>\n")
	case "inlineStatus":
		text := "TODO"
		if tVal, ok := n.Attrs["text"].(string); ok {
			text = tVal
		}
		color := "blue"
		if cVal, ok := n.Attrs["color"].(string); ok {
			color = cVal
		}
		fmt.Fprintf(&sb, "<span class=\"inline-status status-%s\">%s</span>", color, html.EscapeString(text))
	case "details":
		isOpen := true
		if openVal, ok := n.Attrs["open"].(bool); ok {
			isOpen = openVal
		}
		openAttr := ""
		if isOpen {
			openAttr = "open"
		}
		fmt.Fprintf(&sb, "<details %s>\n", openAttr)
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</details>\n")
	case "detailsSummary":
		sb.WriteString("<summary>")
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</summary>\n")
	case "detailsContent":
		sb.WriteString("<div class=\"details-content\">\n")
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</div>\n")
	case "horizontalRule":
		sb.WriteString("<hr />\n")
	case "blockquote":
		sb.WriteString("<blockquote>")
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
		sb.WriteString("</blockquote>\n")
	case "hardBreak":
		sb.WriteString("<br />")
	default:
		// Fallback for unknown node types: render their content
		for _, child := range n.Content {
			sb.WriteString(nodeToHTML(child))
		}
	}

	return sb.String()
}

// PrintPDF uses chromedp to render the HTML string to a PDF using headless Chrome.
func PrintPDF(ctx context.Context, htmlContent string) ([]byte, error) {
	// Spawns headless chrome
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.NoSandbox,
		chromedp.DisableGPU,
	)
	allocCtx, cancel := chromedp.NewExecAllocator(ctx, opts...)
	defer cancel()

	chromeCtx, cancel := chromedp.NewContext(allocCtx)
	defer cancel()

	var pdfBuffer []byte
	err := chromedp.Run(chromeCtx,
		chromedp.Navigate("about:blank"),
		chromedp.ActionFunc(func(ctx context.Context) error {
			// Injects raw HTML into the blank tab
			frameTree, err := page.GetFrameTree().Do(ctx)
			if err != nil {
				return err
			}
			return page.SetDocumentContent(frameTree.Frame.ID, htmlContent).Do(ctx)
		}),
		chromedp.Sleep(2*time.Second), // Allow time for images to load over the network before printing
		chromedp.ActionFunc(func(ctx context.Context) error {
			// Print to PDF with backgrounds and custom margins
			buf, _, err := page.PrintToPDF().
				WithPrintBackground(true).
				WithPreferCSSPageSize(true).
				Do(ctx)
			if err != nil {
				return err
			}
			pdfBuffer = buf
			return nil
		}),
	)

	if err != nil {
		return nil, fmt.Errorf("chromedp execution failed: %w", err)
	}

	return pdfBuffer, nil
}

// BuildDOCX generates a basic Microsoft Word .docx OpenXML zip archive.
func BuildDOCX(title string, contentJSON string) ([]byte, error) {
	log.Printf("[DEBUG BuildDOCX] Starting Word DOCX generation for title: %q. contentJSON length: %d", title, len(contentJSON))
	var root TiptapNode
	if contentJSON != "" && contentJSON != `""` {
		if err := json.Unmarshal([]byte(contentJSON), &root); err != nil {
			log.Printf("[DEBUG BuildDOCX] Failed to unmarshal contentJSON: %v", err)
			_ = json.Unmarshal([]byte(contentJSON), &root)
		}
	}

	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	// Helper to write file content to ZIP archive
	writeFile := func(name string, content string) error {
		f, err := zw.Create(name)
		if err != nil {
			return err
		}
		_, err = io.WriteString(f, content)
		return err
	}

	// 1. Write [Content_Types].xml
	if err := writeFile("[Content_Types].xml", contentTypesXML); err != nil {
		return nil, err
	}

	// 2. Write _rels/.rels
	if err := writeFile("_rels/.rels", relsXML); err != nil {
		return nil, err
	}

	// 3. Write word/styles.xml
	if err := writeFile("word/styles.xml", stylesXML); err != nil {
		return nil, err
	}

	// Translate nodes to OpenXML body content and gather relationships
	ctx := &OpenXMLContext{
		Relationships: []OpenXMLRelation{
			{
				ID:     "rId1",
				Type:   "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
				Target: "styles.xml",
			},
		},
	}
	bodyXML := nodeToOpenXML(zw, root, title, ctx)

	// 4. Write word/document.xml
	documentXML := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
	<w:body>
		<w:p>
			<w:pPr>
				<w:pStyle w:val="Title"/>
				<w:spacing w:after="240"/>
			</w:pPr>
			<w:r>
				<w:rPr>
					<w:rFonts w:ascii="Outfit" w:hAnsi="Outfit"/>
					<w:b/>
					<w:sz w:val="56"/>
				</w:rPr>
				<w:t>%s</w:t>
			</w:r>
		</w:p>
		%s
	</w:body>
</w:document>`, html.EscapeString(title), bodyXML)

	// Debug logging
	log.Printf("[DEBUG BuildDOCX] Title: %s", title)
	log.Printf("[DEBUG BuildDOCX] Total Relationships: %d", len(ctx.Relationships))
	for i, rel := range ctx.Relationships {
		log.Printf("[DEBUG BuildDOCX] Rel %d: ID=%s Type=%s Target=%s TargetMode=%s", i, rel.ID, rel.Type, rel.Target, rel.TargetMode)
	}
	log.Printf("[DEBUG BuildDOCX] document.xml size: %d", len(documentXML))

	if err := writeFile("word/document.xml", documentXML); err != nil {
		return nil, err
	}

	// 5. Write word/_rels/document.xml.rels
	var relsBuilder strings.Builder
	relsBuilder.WriteString(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`)
	for _, rel := range ctx.Relationships {
		targetModeAttr := ""
		if rel.TargetMode == "External" {
			targetModeAttr = ` TargetMode="External"`
		}
		fmt.Fprintf(&relsBuilder, `
	<Relationship Id="%s" Type="%s" Target="%s"%s/>`, rel.ID, rel.Type, html.EscapeString(rel.Target), targetModeAttr)
	}
	relsBuilder.WriteString(`
</Relationships>`)

	// Dump debug XML files to local workspace directory
	_ = os.WriteFile("debug_last_document.xml", []byte(documentXML), 0644)
	_ = os.WriteFile("debug_last_document.xml.rels", []byte(relsBuilder.String()), 0644)
	log.Printf("[DEBUG BuildDOCX] Saved debug_last_document.xml and debug_last_document.xml.rels to disk.")

	if err := writeFile("word/_rels/document.xml.rels", relsBuilder.String()); err != nil {
		return nil, err
	}

	// 6. Close ZIP writer
	if err := zw.Close(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// BuildCombinedDOCX generates a Microsoft Word .docx OpenXML zip archive for page hierarchy.
func BuildCombinedDOCX(doc *domain.Document, allDocs []*domain.Document) ([]byte, error) {
	log.Printf("[DEBUG BuildCombinedDOCX] Starting Word DOCX hierarchy generation for root document: %q", doc.Title)
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	// Helper to write file content to ZIP archive
	writeFile := func(name string, content string) error {
		f, err := zw.Create(name)
		if err != nil {
			return err
		}
		_, err = io.WriteString(f, content)
		return err
	}

	// 1. Write [Content_Types].xml
	if err := writeFile("[Content_Types].xml", contentTypesXML); err != nil {
		return nil, err
	}

	// 2. Write _rels/.rels
	if err := writeFile("_rels/.rels", relsXML); err != nil {
		return nil, err
	}

	// 3. Write word/styles.xml
	if err := writeFile("word/styles.xml", stylesXML); err != nil {
		return nil, err
	}

	// Translate nodes to OpenXML body content recursively
	ctx := &OpenXMLContext{
		Relationships: []OpenXMLRelation{
			{
				ID:     "rId1",
				Type:   "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
				Target: "styles.xml",
			},
		},
	}
	bodyXML, err := WriteCombinedDOCX(zw, doc, allDocs, true, ctx)
	if err != nil {
		return nil, err
	}

	// 4. Write word/document.xml
	documentXML := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
	<w:body>
		%s
	</w:body>
</w:document>`, bodyXML)

	// Debug logging
	log.Printf("[DEBUG BuildCombinedDOCX] Document: %s", doc.Title)
	log.Printf("[DEBUG BuildCombinedDOCX] Total Relationships: %d", len(ctx.Relationships))
	for i, rel := range ctx.Relationships {
		log.Printf("[DEBUG BuildCombinedDOCX] Rel %d: ID=%s Type=%s Target=%s TargetMode=%s", i, rel.ID, rel.Type, rel.Target, rel.TargetMode)
	}
	log.Printf("[DEBUG BuildCombinedDOCX] document.xml size: %d", len(documentXML))

	if err := writeFile("word/document.xml", documentXML); err != nil {
		return nil, err
	}

	// 5. Write word/_rels/document.xml.rels
	var relsBuilder strings.Builder
	relsBuilder.WriteString(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`)
	for _, rel := range ctx.Relationships {
		targetModeAttr := ""
		if rel.TargetMode == "External" {
			targetModeAttr = ` TargetMode="External"`
		}
		fmt.Fprintf(&relsBuilder, `
	<Relationship Id="%s" Type="%s" Target="%s"%s/>`, rel.ID, rel.Type, html.EscapeString(rel.Target), targetModeAttr)
	}
	relsBuilder.WriteString(`
</Relationships>`)

	// Dump debug XML files to local workspace directory
	_ = os.WriteFile("debug_last_document.xml", []byte(documentXML), 0644)
	_ = os.WriteFile("debug_last_document.xml.rels", []byte(relsBuilder.String()), 0644)
	log.Printf("[DEBUG BuildCombinedDOCX] Saved debug_last_document.xml and debug_last_document.xml.rels to disk.")

	if err := writeFile("word/_rels/document.xml.rels", relsBuilder.String()); err != nil {
		return nil, err
	}

	// 6. Close ZIP writer
	if err := zw.Close(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func nodeToOpenXML(zw *zip.Writer, n TiptapNode, title string, ctx *OpenXMLContext) string {
	var sb strings.Builder

	switch n.Type {
	case "doc":
		for _, child := range n.Content {
			sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
		}
	case "paragraph":
		sb.WriteString("<w:p>")
		sb.WriteString("<w:pPr><w:spacing w:after=\"120\" w:line=\"240\" w:lineRule=\"auto\"/></w:pPr>")
		oldInParagraph := ctx.InParagraph
		ctx.InParagraph = true
		for _, child := range n.Content {
			sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
		}
		ctx.InParagraph = oldInParagraph
		sb.WriteString("</w:p>\n")
	case "heading":
		level := 1
		if lvlVal, ok := n.Attrs["level"].(float64); ok {
			level = int(lvlVal)
		} else if lvlInt, ok := n.Attrs["level"].(int); ok {
			level = lvlInt
		}
		szVal := "36" // Heading 2 size
		if level == 1 {
			szVal = "48"
		} else if level >= 3 {
			szVal = "28"
		}

		sb.WriteString("<w:p>")
		fmt.Fprintf(&sb, "<w:pPr><w:spacing w:before=\"240\" w:after=\"120\"/><w:outlineLvl w:val=\"%d\"/></w:pPr>", level-1)
		for _, child := range n.Content {
			// Render runs with heading size and bold
			if child.Type == "text" {
				fmt.Fprintf(&sb, "<w:r><w:rPr><w:rFonts w:ascii=\"Outfit\" w:hAnsi=\"Outfit\"/><w:b/><w:sz w:val=\"%s\"/></w:rPr><w:t xml:space=\"preserve\">%s</w:t></w:r>", szVal, html.EscapeString(child.Text))
			} else {
				sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
			}
		}
		// If it's a heading container but child rendering is completed
		if len(n.Content) == 0 {
			sb.WriteString("<w:r><w:t></w:t></w:r>")
		}
		sb.WriteString("</w:p>\n")
	case "text":
		// Check marks
		isBold := false
		isItalic := false
		isUnderline := false
		isStrike := false
		isCode := false
		for _, mark := range n.Marks {
			switch mark.Type {
			case "bold":
				isBold = true
			case "italic":
				isItalic = true
			case "underline":
				isUnderline = true
			case "strike":
				isStrike = true
			case "code":
				isCode = true
			}
		}

		sb.WriteString("<w:r>")
		sb.WriteString("<w:rPr>")
		sb.WriteString("<w:rFonts w:ascii=\"Inter\" w:hAnsi=\"Inter\"/>")
		if isBold {
			sb.WriteString("<w:b/>")
		}
		if isItalic {
			sb.WriteString("<w:i/>")
		}
		if isUnderline {
			sb.WriteString("<w:u w:val=\"single\"/>")
		}
		if isStrike {
			sb.WriteString("<w:strike/>")
		}
		if isCode {
			sb.WriteString("<w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\"/><w:sz w:val=\"18\"/>")
		}
		sb.WriteString("</w:rPr>")
		fmt.Fprintf(&sb, "<w:t xml:space=\"preserve\">%s</w:t>", html.EscapeString(n.Text))
		sb.WriteString("</w:r>")
	case "bulletList":
		for _, child := range n.Content {
			sb.WriteString(renderListItem(zw, child, "• ", title, ctx))
		}
	case "orderedList":
		for idx, child := range n.Content {
			prefix := fmt.Sprintf("%d. ", idx+1)
			sb.WriteString(renderListItem(zw, child, prefix, title, ctx))
		}
	case "listItem":
		sb.WriteString(renderListItem(zw, n, "• ", title, ctx))
	case "taskList":
		for _, child := range n.Content {
			sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
		}
	case "taskItem":
		checked := false
		if chkVal, ok := n.Attrs["checked"].(bool); ok {
			checked = chkVal
		}
		box := "☐ "
		if checked {
			box = "☑ "
		}
		sb.WriteString("<w:p>")
		sb.WriteString("<w:pPr><w:spacing w:after=\"60\"/></w:pPr>")
		fmt.Fprintf(&sb, "<w:r><w:rPr><w:b/></w:rPr><w:t>%s</w:t></w:r>", box)
		for _, child := range n.Content {
			sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
		}
		sb.WriteString("</w:p>\n")
	case "codeBlock":
		sb.WriteString("<w:p>")
		sb.WriteString("<w:pPr><w:shd w:fill=\"F3F4F6\"/><w:spacing w:before=\"120\" w:after=\"120\"/></w:pPr>")
		for _, child := range n.Content {
			sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
		}
		sb.WriteString("</w:p>\n")
	case "table":
		sb.WriteString("<w:tbl>")
		sb.WriteString("<w:tblPr><w:tblW w:w=\"5000\" w:type=\"pct\"/><w:tblBorders><w:top w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D3D3D3\"/><w:left w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D3D3D3\"/><w:bottom w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D3D3D3\"/><w:right w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D3D3D3\"/><w:insideH w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"E5E7EB\"/><w:insideV w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"E5E7EB\"/></w:tblBorders></w:tblPr>")
		for _, child := range n.Content {
			sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
		}
		sb.WriteString("</w:tbl>\n")
	case "tableRow":
		sb.WriteString("<w:tr>")
		for _, child := range n.Content {
			sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
		}
		sb.WriteString("</w:tr>\n")
	case "tableHeader", "tableCell":
		bg := "FFFFFF"
		if n.Type == "tableHeader" {
			bg = "F9FAFB"
		}
		sb.WriteString("<w:tc>")
		fmt.Fprintf(&sb, "<w:tcPr><w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\"%s\"/></w:tcPr>", bg)
		if len(n.Content) == 0 {
			sb.WriteString("<w:p><w:pPr><w:spacing w:after=\"0\"/></w:pPr></w:p>")
		} else {
			for _, child := range n.Content {
				sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
			}
		}
		sb.WriteString("</w:tc>\n")
	case "image", "customImage":
		src := ""
		if srcVal, ok := n.Attrs["src"].(string); ok {
			src = srcVal
		}
		log.Printf("[DEBUG DOCX] nodeToOpenXML image entry: src=%q", src)
		if src == "" {
			break
		}

		// Download the image bytes and determine extension
		imageBytes, ext, err := downloadImage(src)
		if err != nil {
			log.Printf("[DEBUG DOCX] downloadImage failed for src %s: %v", src, err)
		} else if len(imageBytes) == 0 {
			log.Printf("[DEBUG DOCX] downloadImage returned 0 bytes for src %s", src)
		} else {
			// Validate image signature
			if mime, ok := isValidImage(imageBytes); !ok {
				log.Printf("[DEBUG DOCX] Downloaded bytes for src %s are not a valid image format. Length: %d. Header: %q", src, len(imageBytes), string(imageBytes[:minVal(len(imageBytes), 50)]))
				imageBytes = nil
			} else {
				log.Printf("[DEBUG DOCX] Successfully loaded image bytes for src %s. Mime/Ext: %s, Length: %d", src, mime, len(imageBytes))
				ext = mime
			}
		}

		var embedded bool
		if err == nil && len(imageBytes) > 0 {
			relID := fmt.Sprintf("rId%d", len(ctx.Relationships)+1)
			imgIndex := len(ctx.Relationships)
			mediaPath := fmt.Sprintf("word/media/image%d.%s", imgIndex, ext)

			// Write the binary data to the ZIP file
			if f, err := zw.Create(mediaPath); err == nil {
				_, _ = f.Write(imageBytes)
				log.Printf("[DEBUG DOCX] Created media asset in ZIP: %s", mediaPath)

				// Register internal relationship
				ctx.Relationships = append(ctx.Relationships, OpenXMLRelation{
					ID:         relID,
					Type:       "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
					Target:     fmt.Sprintf("media/image%d.%s", imgIndex, ext),
					TargetMode: "Internal",
				})

				// Render <w:drawing> pointing to this embedded relationship via r:embed
				if ctx.InParagraph {
					sb.WriteString("<w:r><w:drawing>")
				} else {
					sb.WriteString("<w:p><w:r><w:drawing>")
				}
				sb.WriteString(`<wp:inline distT="0" distB="0" distL="0" distR="0">`)
				sb.WriteString(`<wp:extent cx="4500000" cy="3000000"/>`)
				sb.WriteString(`<wp:effectExtent l="0" t="0" r="0" b="0"/>`)
				sb.WriteString(`<wp:docPr id="` + fmt.Sprint(len(ctx.Relationships)) + `" name="Picture"/>`)
				sb.WriteString(`<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>`)
				sb.WriteString(`<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">`)
				sb.WriteString(`<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">`)
				sb.WriteString(`<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">`)
				sb.WriteString(`<pic:nvPicPr><pic:cNvPr id="` + fmt.Sprint(len(ctx.Relationships)) + `" name="Picture"/><pic:cNvPicPr/></pic:nvPicPr>`)
				sb.WriteString(`<pic:blipFill>`)
				fmt.Fprintf(&sb, `<a:blip r:embed="%s"/>`, relID)
				sb.WriteString(`<a:stretch><a:fillRect/></a:stretch>`)
				sb.WriteString(`</pic:blipFill>`)
				sb.WriteString(`<pic:spPr>`)
				sb.WriteString(`<a:xfrm><a:off x="0" y="0"/><a:ext cx="4500000" cy="3000000"/></a:xfrm>`)
				sb.WriteString(`<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`)
				sb.WriteString(`</pic:spPr>`)
				sb.WriteString(`</pic:pic>`)
				sb.WriteString(`</a:graphicData>`)
				sb.WriteString(`</a:graphic>`)
				sb.WriteString(`</wp:inline>`)
				if ctx.InParagraph {
					sb.WriteString("</w:drawing></w:r>")
				} else {
					sb.WriteString("</w:drawing></w:r></w:p>\n")
				}
				embedded = true
			} else {
				log.Printf("[DEBUG DOCX] Failed to create ZIP entry %s: %v", mediaPath, err)
			}
		}

		if embedded {
			break
		}

		// Fallback handling
		isAbsolute := strings.HasPrefix(src, "http://") || strings.HasPrefix(src, "https://")
		if isAbsolute {
			log.Printf("[DEBUG DOCX] Fallback to external relationship for absolute URL: %s", src)
			relID := fmt.Sprintf("rId%d", len(ctx.Relationships)+1)
			ctx.Relationships = append(ctx.Relationships, OpenXMLRelation{
				ID:         relID,
				Type:       "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
				Target:     src,
				TargetMode: "External",
			})
			if ctx.InParagraph {
				sb.WriteString("<w:r><w:drawing>")
			} else {
				sb.WriteString("<w:p><w:r><w:drawing>")
			}
			sb.WriteString(`<wp:inline distT="0" distB="0" distL="0" distR="0">`)
			sb.WriteString(`<wp:extent cx="4500000" cy="3000000"/>`)
			sb.WriteString(`<wp:effectExtent l="0" t="0" r="0" b="0"/>`)
			sb.WriteString(`<wp:docPr id="` + fmt.Sprint(len(ctx.Relationships)) + `" name="Picture"/>`)
			sb.WriteString(`<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>`)
			sb.WriteString(`<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">`)
			sb.WriteString(`<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">`)
			sb.WriteString(`<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">`)
			sb.WriteString(`<pic:nvPicPr><pic:cNvPr id="` + fmt.Sprint(len(ctx.Relationships)) + `" name="Picture"/><pic:cNvPicPr/></pic:nvPicPr>`)
			sb.WriteString(`<pic:blipFill>`)
			fmt.Fprintf(&sb, `<a:blip r:link="%s"/>`, relID)
			sb.WriteString(`<a:stretch><a:fillRect/></a:stretch>`)
			sb.WriteString(`</pic:blipFill>`)
			sb.WriteString(`<pic:spPr>`)
			sb.WriteString(`<a:xfrm><a:off x="0" y="0"/><a:ext cx="4500000" cy="3000000"/></a:xfrm>`)
			sb.WriteString(`<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`)
			sb.WriteString(`</pic:spPr>`)
			sb.WriteString(`</pic:pic>`)
			sb.WriteString(`</a:graphicData>`)
			sb.WriteString(`</a:graphic>`)
			sb.WriteString(`</wp:inline>`)
			if ctx.InParagraph {
				sb.WriteString("</w:drawing></w:r>")
			} else {
				sb.WriteString("</w:drawing></w:r></w:p>\n")
			}
		} else {
			// Relative URLs cannot be external targets in relationships.
			// Rendering a text placeholder avoids corrupting the document.
			altText := "Image"
			if altVal, ok := n.Attrs["alt"].(string); ok && altVal != "" {
				altText = altVal
			}
			log.Printf("[DEBUG DOCX] Non-absolute URL %q failed download. Rendering text placeholder instead of external relationship to prevent corruption.", src)
			if ctx.InParagraph {
				fmt.Fprintf(&sb, "<w:r><w:rPr><w:color w:val=\"888888\"/><w:i/></w:rPr><w:t xml:space=\"preserve\"> [Image: %s (%s)] </w:t></w:r>", html.EscapeString(altText), html.EscapeString(src))
			} else {
				fmt.Fprintf(&sb, "<w:p><w:r><w:rPr><w:color w:val=\"888888\"/><w:i/></w:rPr><w:t xml:space=\"preserve\">[Image: %s (%s)]</w:t></w:r></w:p>\n", html.EscapeString(altText), html.EscapeString(src))
			}
		}
	case "calloutPanel":
		cType := "info"
		if tVal, ok := n.Attrs["type"].(string); ok {
			cType = tVal
		}
		fillColor := "EFF6FF" // blue
		switch cType {
		case "warning":
			fillColor = "FFFBEB"
		case "error":
			fillColor = "FEF2F2"
		case "check":
			fillColor = "F0FDF4"
		case "note":
			fillColor = "F9FAFB"
		case "tip":
			fillColor = "F5F3FF"
		}
		title := ""
		if tTitle, ok := n.Attrs["title"].(string); ok {
			title = tTitle
		}

		// Renders callout as a shaded single-cell table with a left border
		sb.WriteString("<w:tbl>")
		fmt.Fprintf(&sb, `<w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:left w:val="single" w:sz="24" w:space="0" w:color="3B82F6"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tblBorders></w:tblPr>`)
		sb.WriteString("<w:tr><w:tc>")
		fmt.Fprintf(&sb, `<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="%s"/><w:tcMar><w:top w:w="160" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:bottom w:w="160" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tcMar></w:tcPr>`, fillColor)

		if title != "" {
			fmt.Fprintf(&sb, `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:rFonts w:ascii="Outfit" w:hAnsi="Outfit"/></w:rPr><w:t>%s</w:t></w:r></w:p>`, html.EscapeString(title))
		}

		for _, child := range n.Content {
			sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
		}
		sb.WriteString("</w:tc></w:tr></w:tbl>\n")
	case "inlineStatus":
		text := "TODO"
		if tVal, ok := n.Attrs["text"].(string); ok {
			text = tVal
		}
		color := "blue"
		if cVal, ok := n.Attrs["color"].(string); ok {
			color = cVal
		}
		colorCode := "1E40AF" // blue text
		switch color {
		case "yellow":
			colorCode = "92400E"
		case "green":
			colorCode = "065F46"
		case "red":
			colorCode = "991B1B"
		case "gray":
			colorCode = "374151"
		}
		fmt.Fprintf(&sb, "<w:r><w:rPr><w:b/><w:color w:val=\"%s\"/></w:rPr><w:t xml:space=\"preserve\"> [%s] </w:t></w:r>", colorCode, html.EscapeString(text))
	case "details":
		for _, child := range n.Content {
			sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
		}
	case "detailsSummary":
		sb.WriteString("<w:p><w:pPr><w:spacing w:before=\"120\" w:after=\"60\"/></w:pPr>")
		sb.WriteString("<w:r><w:rPr><w:b/><w:rFonts w:ascii=\"Outfit\" w:hAnsi=\"Outfit\"/></w:rPr><w:t>▸ </w:t></w:r>")
		for _, child := range n.Content {
			sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
		}
		sb.WriteString("</w:p>\n")
	case "detailsContent":
		for _, child := range n.Content {
			sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
		}
	case "horizontalRule":
		sb.WriteString("<w:p><w:pPr><w:pBdr><w:bottom w:val=\"single\" w:sz=\"6\" w:space=\"1\" w:color=\"E5E7EB\"/></w:pBdr></w:pPr></w:p>\n")
	case "blockquote":
		for _, child := range n.Content {
			if child.Type == "paragraph" {
				sb.WriteString("<w:p>")
				sb.WriteString("<w:pPr><w:ind w:left=\"360\"/><w:spacing w:after=\"120\"/></w:pPr>")
				oldInParagraph := ctx.InParagraph
				ctx.InParagraph = true
				for _, run := range child.Content {
					sb.WriteString(nodeToOpenXML(zw, run, title, ctx))
				}
				ctx.InParagraph = oldInParagraph
				sb.WriteString("</w:p>\n")
			} else {
				sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
			}
		}
	case "hardBreak":
		sb.WriteString("<w:r><w:br/></w:r>")
	default:
		for _, child := range n.Content {
			sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
		}
	}

	return sb.String()
}

func renderListItem(zw *zip.Writer, n TiptapNode, prefix string, title string, ctx *OpenXMLContext) string {
	var sb strings.Builder
	sb.WriteString("<w:p>")
	sb.WriteString("<w:pPr><w:ind w:left=\"360\"/><w:spacing w:after=\"60\"/></w:pPr>")
	sb.WriteString(fmt.Sprintf("<w:r><w:rPr><w:rFonts w:ascii=\"Inter\" w:hAnsi=\"Inter\"/></w:rPr><w:t xml:space=\"preserve\">%s</w:t></w:r>", html.EscapeString(prefix)))
	
	oldInParagraph := ctx.InParagraph
	ctx.InParagraph = true

	var blockChildren []TiptapNode
	for _, child := range n.Content {
		if child.Type == "paragraph" {
			for _, run := range child.Content {
				sb.WriteString(nodeToOpenXML(zw, run, title, ctx))
			}
		} else if child.Type == "bulletList" || child.Type == "orderedList" || child.Type == "image" || child.Type == "customImage" {
			blockChildren = append(blockChildren, child)
		} else {
			sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
		}
	}
	sb.WriteString("</w:p>\n")
	ctx.InParagraph = oldInParagraph

	for _, child := range blockChildren {
		sb.WriteString(nodeToOpenXML(zw, child, title, ctx))
	}

	return sb.String()
}

var imageURLRegex = regexp.MustCompile(`/api/images/([^/]+)/([^/]+)`)

func getLocalImageFile(url string) ([]byte, string, error) {
	log.Printf("[DEBUG DOCX] getLocalImageFile starting for URL: %q", url)
	matches := imageURLRegex.FindStringSubmatch(url)
	if len(matches) < 3 {
		log.Printf("[DEBUG DOCX] getLocalImageFile: URL does not match imageURLRegex")
		return nil, "", fmt.Errorf("not a local image URL pattern")
	}

	id := matches[1]
	size := matches[2]
	log.Printf("[DEBUG DOCX] getLocalImageFile extracted ID: %q, Size: %q", id, size)

	// Map sizes 1, 2, 3, 4, O
	suffix := "original"
	switch size {
	case "1":
		suffix = "300"
	case "2":
		suffix = "600"
	case "3":
		suffix = "900"
	case "4":
		suffix = "1200"
	}

	// Look in known uploads directories
	dirs := []string{"./uploads", "./api/uploads", "../api/uploads"}

	for _, dir := range dirs {
		absDir, _ := filepath.Abs(dir)
		log.Printf("[DEBUG DOCX] getLocalImageFile checking directory: %q (absolute: %q)", dir, absDir)
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			log.Printf("[DEBUG DOCX] getLocalImageFile: directory %q does not exist", dir)
			continue
		}

		files, err := os.ReadDir(dir)
		if err != nil {
			log.Printf("[DEBUG DOCX] getLocalImageFile: failed to read directory %q: %v", dir, err)
			continue
		}
		log.Printf("[DEBUG DOCX] getLocalImageFile: directory %q contains %d files", dir, len(files))

		prefix := fmt.Sprintf("%s_%s.", id, suffix)
		originalPrefix := fmt.Sprintf("%s_original.", id)
		log.Printf("[DEBUG DOCX] getLocalImageFile searching for prefix: %q or fallback: %q", prefix, originalPrefix)

		var foundFile string
		var foundPath string

		// First try to match the requested size prefix
		for _, f := range files {
			if !f.IsDir() && strings.HasPrefix(f.Name(), prefix) {
				foundFile = f.Name()
				foundPath = filepath.Join(dir, foundFile)
				log.Printf("[DEBUG DOCX] getLocalImageFile: matched size prefix file: %q", foundFile)
				break
			}
		}

		// Fallback to original prefix if not found
		if foundPath == "" {
			for _, f := range files {
				if !f.IsDir() && strings.HasPrefix(f.Name(), originalPrefix) {
					foundFile = f.Name()
					foundPath = filepath.Join(dir, foundFile)
					log.Printf("[DEBUG DOCX] getLocalImageFile: matched fallback original prefix file: %q", foundFile)
					break
				}
			}
		}

		if foundPath != "" {
			data, err := os.ReadFile(foundPath)
			if err != nil {
				log.Printf("[DEBUG DOCX] getLocalImageFile: failed to read file %q: %v", foundPath, err)
				return nil, "", err
			}

			ext := strings.ToLower(filepath.Ext(foundFile))
			if len(ext) > 1 {
				ext = ext[1:]
			} else {
				ext = "png"
			}

			log.Printf("[DEBUG DOCX] getLocalImageFile: successfully read local file %q, size: %d bytes, ext: %q", foundPath, len(data), ext)
			return data, ext, nil
		}
	}

	log.Printf("[DEBUG DOCX] getLocalImageFile: local image file not found for ID %s in any checked directories", id)
	return nil, "", fmt.Errorf("local image file not found")
}

func embedImagesAsBase64(node *TiptapNode) {
	if node == nil {
		return
	}
	if node.Type == "image" || node.Type == "customImage" {
		if src, ok := node.Attrs["src"].(string); ok && src != "" {
			if !strings.HasPrefix(src, "data:") {
				if data, ext, err := downloadImage(src); err == nil {
					mime := "image/png"
					switch ext {
					case "jpg", "jpeg":
						mime = "image/jpeg"
					case "gif":
						mime = "image/gif"
					case "webp":
						mime = "image/webp"
					}
					base64Str := base64.StdEncoding.EncodeToString(data)
					node.Attrs["src"] = fmt.Sprintf("data:%s;base64,%s", mime, base64Str)
				}
			}
		}
	}
	for i := range node.Content {
		embedImagesAsBase64(&node.Content[i])
	}
}

func downloadImage(url string) ([]byte, string, error) {
	log.Printf("[DEBUG DOCX] downloadImage starting for URL: %q", url)
	// 1. Try local file resolution first
	if data, ext, err := getLocalImageFile(url); err == nil {
		log.Printf("[DEBUG DOCX] downloadImage: successfully resolved locally for URL: %q", url)
		return data, ext, nil
	} else {
		log.Printf("[DEBUG DOCX] downloadImage: local file resolution failed: %v. Falling back to network download...", err)
	}

	// 2. Fall back to network download
	fetchURL := url
	if strings.HasPrefix(url, "/") {
		port := os.Getenv("PORT")
		if port == "" {
			port = "8080"
		}
		fetchURL = fmt.Sprintf("http://127.0.0.1:%s%s", port, url)
	}
	log.Printf("[DEBUG DOCX] downloadImage: network GET request to URL: %q", fetchURL)

	client := &http.Client{
		Timeout: 5 * time.Second,
	}
	resp, err := client.Get(fetchURL)
	if err != nil {
		log.Printf("[DEBUG DOCX] downloadImage: network GET failed for %q: %v", fetchURL, err)
		return nil, "", err
	}
	defer resp.Body.Close()

	log.Printf("[DEBUG DOCX] downloadImage: network GET response status: %s, headers: %+v", resp.Status, resp.Header)

	if resp.StatusCode != http.StatusOK {
		log.Printf("[DEBUG DOCX] downloadImage: network GET bad status code: %d", resp.StatusCode)
		return nil, "", fmt.Errorf("bad status code: %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[DEBUG DOCX] downloadImage: network GET body read failed: %v", err)
		return nil, "", err
	}

	ext := "png"
	contentType := resp.Header.Get("Content-Type")
	if strings.Contains(contentType, "jpeg") || strings.Contains(contentType, "jpg") {
		ext = "jpg"
	} else if strings.Contains(contentType, "gif") {
		ext = "gif"
	}

	log.Printf("[DEBUG DOCX] downloadImage: network GET success. data size: %d bytes, Content-Type: %q -> ext: %q", len(data), contentType, ext)
	return data, ext, nil
}

func sanitizeFileName(name string) string {
	invalid := []string{"/", "\\", "?", "%", "*", ":", "|", "\"", "<", ">", "."}
	res := name
	for _, char := range invalid {
		res = strings.ReplaceAll(res, char, "_")
	}
	res = strings.TrimSpace(res)
	if res == "" {
		res = "Untitled_Page"
	}
	return res
}

func BuildHierarchyJSON(rootDoc *domain.Document, allDocs []*domain.Document) JSONTree {
	tree := JSONTree{
		Title:   rootDoc.Title,
		Content: rootDoc.Content,
	}

	for _, doc := range allDocs {
		if doc.ParentID != nil && *doc.ParentID == rootDoc.ID {
			childTree := BuildHierarchyJSON(doc, allDocs)
			tree.Children = append(tree.Children, childTree)
		}
	}

	return tree
}

func WriteHTMLZip(zw *zip.Writer, rootDoc *domain.Document, allDocs []*domain.Document, parentPath string) error {
	var root TiptapNode
	if rootDoc.Content != "" && rootDoc.Content != `""` {
		if err := json.Unmarshal([]byte(rootDoc.Content), &root); err == nil {
			embedImagesAsBase64(&root)
		}
	}

	var contentJSON string
	if root.Type != "" {
		if bytes, err := json.Marshal(root); err == nil {
			contentJSON = string(bytes)
		}
	}
	if contentJSON == "" {
		contentJSON = rootDoc.Content
	}

	htmlContent, err := TiptapToHTML(rootDoc.Title, contentJSON)
	if err != nil {
		return err
	}

	fileName := sanitizeFileName(rootDoc.Title) + ".html"
	filePath := fileName
	if parentPath != "" {
		filePath = parentPath + "/" + fileName
	}

	f, err := zw.Create(filePath)
	if err != nil {
		return err
	}
	_, err = io.WriteString(f, htmlContent)
	if err != nil {
		return err
	}

	childFolder := sanitizeFileName(rootDoc.Title)
	newParentPath := childFolder
	if parentPath != "" {
		newParentPath = parentPath + "/" + childFolder
	}

	for _, doc := range allDocs {
		if doc.ParentID != nil && *doc.ParentID == rootDoc.ID {
			if err := WriteHTMLZip(zw, doc, allDocs, newParentPath); err != nil {
				return err
			}
		}
	}

	return nil
}

func BuildCombinedHTML(rootDoc *domain.Document, allDocs []*domain.Document) (string, error) {
	var sb strings.Builder
	if err := writeDocumentCombinedHTML(rootDoc, allDocs, 1, &sb); err != nil {
		return "", err
	}

	htmlDoc := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>%s Hierarchy</title>
	<style>
		@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap');
		body {
			font-family: 'Inter', sans-serif;
			color: #1f2937;
			line-height: 1.6;
			max-width: 800px;
			margin: 40px auto;
			padding: 0 20px;
			background-color: #ffffff;
		}
		h1, h2, h3, h4, h5, h6 {
			font-family: 'Outfit', sans-serif;
			color: #111827;
			font-weight: 600;
			margin-top: 24px;
			margin-bottom: 12px;
		}
		.document-node {
			margin-bottom: 40px;
		}
		.page-break {
			page-break-before: always;
		}
		p { margin: 0 0 16px 0; }
		a { color: #2563eb; text-decoration: none; }
		a:hover { text-decoration: underline; }
		ul, ol { margin: 0 0 16px 0; padding-left: 24px; }
		li { margin-bottom: 6px; }
		pre {
			background-color: #f3f4f6;
			border-radius: 6px;
			padding: 16px;
			overflow-x: auto;
			font-family: monospace;
			font-size: 0.9em;
			margin: 0 0 16px 0;
			border: 1px solid #e5e7eb;
		}
		code {
			font-family: monospace;
			background-color: #f3f4f6;
			padding: 2px 4px;
			border-radius: 4px;
			font-size: 0.9em;
		}
		pre code {
			background-color: transparent;
			padding: 0;
			border-radius: 0;
			font-size: 100%%;
		}
		blockquote {
			border-left: 4px solid #d1d5db;
			margin: 0 0 16px 0;
			padding-left: 16px;
			color: #4b5563;
			font-style: italic;
		}
		table {
			width: 100%%;
			border-collapse: collapse;
			margin: 0 0 20px 0;
		}
		th, td {
			border: 1px solid #e5e7eb;
			padding: 10px 12px;
			text-align: left;
		}
		th {
			background-color: #f9fafb;
			font-weight: 600;
		}
		hr {
			border: 0;
			border-top: 1px solid #e5e7eb;
			margin: 24px 0;
		}
		img {
			max-width: 100%%;
			height: auto;
			border-radius: 6px;
			margin: 16px 0;
			display: block;
		}
		.callout-panel {
			padding: 16px;
			border-radius: 8px;
			margin-bottom: 20px;
			border-left: 4px solid #3b82f6;
			background-color: #eff6ff;
		}
		.callout-title {
			font-weight: 600;
			margin-bottom: 8px;
			font-family: 'Outfit', sans-serif;
		}
		.callout-info { border-left-color: #3b82f6; background-color: #eff6ff; }
		.callout-warning { border-left-color: #f59e0b; background-color: #fffbeb; }
		.callout-error { border-left-color: #ef4444; background-color: #fef2f2; }
		.callout-check { border-left-color: #22c55e; background-color: #f0fdf4; }
		.callout-note { border-left-color: #6b7280; background-color: #f9fafb; }
		.callout-tip { border-left-color: #8b5cf6; background-color: #f5f3ff; }
		.inline-status {
			display: inline-block;
			padding: 2px 8px;
			border-radius: 4px;
			font-size: 0.75em;
			font-weight: 600;
			text-transform: uppercase;
			margin: 0 4px;
			vertical-align: middle;
		}
		.status-blue { background-color: #dbeafe; color: #1e40af; }
		.status-yellow { background-color: #fef3c7; color: #92400e; }
		.status-green { background-color: #d1fae5; color: #065f46; }
		.status-red { background-color: #fee2e2; color: #991b1b; }
		.status-gray { background-color: #f3f4f6; color: #374151; }
		.task-list { list-style-type: none; padding-left: 0; }
		.task-item { display: flex; align-items: flex-start; margin-bottom: 8px; }
		.task-checkbox { margin-right: 8px; font-size: 1.1em; font-family: monospace; user-select: none; }
		.task-content { flex: 1; }
		details { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
		summary { font-weight: 600; cursor: pointer; font-family: 'Outfit', sans-serif; }
		.details-content { margin-top: 10px; }
	</style>
</head>
<body>
	%s
</body>
</html>`, rootDoc.Title, sb.String())

	return htmlDoc, nil
}

func writeDocumentCombinedHTML(doc *domain.Document, allDocs []*domain.Document, level int, sb *strings.Builder) error {
	var root TiptapNode
	if doc.Content != "" && doc.Content != `""` {
		if err := json.Unmarshal([]byte(doc.Content), &root); err == nil {
			embedImagesAsBase64(&root)
		}
	}

	bodyHTML := nodeToHTML(root)

	pageBreakClass := ""
	if level > 1 {
		pageBreakClass = " page-break"
	}

	hTag := "h1"
	if level == 2 {
		hTag = "h2"
	} else if level >= 3 {
		hTag = "h3"
	}

	fmt.Fprintf(sb, "<div class=\"document-node%s\">\n", pageBreakClass)
	fmt.Fprintf(sb, "<%s>%s</%s>\n", hTag, html.EscapeString(doc.Title), hTag)
	sb.WriteString(bodyHTML)
	sb.WriteString("</div>\n")

	for _, childDoc := range allDocs {
		if childDoc.ParentID != nil && *childDoc.ParentID == doc.ID {
			if err := writeDocumentCombinedHTML(childDoc, allDocs, level+1, sb); err != nil {
				return err
			}
		}
	}

	return nil
}

func WriteCombinedDOCX(zw *zip.Writer, doc *domain.Document, allDocs []*domain.Document, isFirst bool, ctx *OpenXMLContext) (string, error) {
	var sb strings.Builder

	var root TiptapNode
	if doc.Content != "" && doc.Content != `""` {
		_ = json.Unmarshal([]byte(doc.Content), &root)
	}

	if !isFirst {
		sb.WriteString("<w:p><w:pPr><w:break w:type=\"page\"/></w:pPr></w:p>")
	}

	sb.WriteString("<w:p>")
	sb.WriteString("<w:pPr><w:pStyle w:val=\"Title\"/><w:spacing w:after=\"240\"/></w:pPr>")
	sb.WriteString("<w:r><w:rPr><w:rFonts w:ascii=\"Outfit\" w:hAnsi=\"Outfit\"/><w:b/><w:sz w:val=\"56\"/></w:rPr>")
	fmt.Fprintf(&sb, "<w:t>%s</w:t>", html.EscapeString(doc.Title))
	sb.WriteString("</w:r></w:p>\n")

	contentXML := nodeToOpenXML(zw, root, doc.Title, ctx)
	sb.WriteString(contentXML)

	for _, childDoc := range allDocs {
		if childDoc.ParentID != nil && *childDoc.ParentID == doc.ID {
			childXML, err := WriteCombinedDOCX(zw, childDoc, allDocs, false, ctx)
			if err != nil {
				return "", err
			}
			sb.WriteString(childXML)
		}
	}

	return sb.String(), nil
}

func minVal(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func isValidImage(data []byte) (string, bool) {
	if len(data) < 4 {
		return "", false
	}
	// PNG: 89 50 4E 47
	if data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 {
		return "png", true
	}
	// JPEG: FF D8 FF
	if data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return "jpg", true
	}
	// GIF: GIF8
	if data[0] == 'G' && data[1] == 'I' && data[2] == 'F' && data[3] == '8' {
		return "gif", true
	}
	// WEBP: RIFFxxxxWEBP
	if len(data) >= 12 && data[0] == 'R' && data[1] == 'I' && data[2] == 'F' && data[3] == 'F' &&
		data[8] == 'W' && data[9] == 'E' && data[10] == 'B' && data[11] == 'P' {
		return "webp", true
	}
	// SVG: Check if it starts with XML or SVG tag
	trimmed := strings.TrimSpace(string(data[:minVal(len(data), 100)]))
	if strings.HasPrefix(trimmed, "<svg") || strings.HasPrefix(trimmed, "<?xml") {
		return "svg", true
	}
	return "", false
}
