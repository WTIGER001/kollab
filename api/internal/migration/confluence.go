package migration

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"path"
	"regexp"
	"sort"
	"strings"
	"time"
)

const (
	maxArchiveEntries = 10_000
	maxEntrySize      = 10 << 20 // 10 MiB per source page; archives are bounded by the HTTP handler.
)

// MigrationIssue is an actionable finding produced before or during an import.
// It is deliberately structured so callers can distinguish a recoverable macro
// conversion from a missing internal link or an unsafe archive member.
type MigrationIssue struct {
	Level   string `json:"level"` // info, warning, error
	Code    string `json:"code"`
	Entry   string `json:"entry,omitempty"`
	Message string `json:"message"`
}

type MacroSummary struct {
	Macro     string `json:"macro"`
	Count     int    `json:"count"`
	Supported bool   `json:"supported"`
}

type PreflightPage struct {
	SourcePath       string   `json:"sourcePath"`
	ParentSourcePath string   `json:"parentSourcePath,omitempty"`
	Title            string   `json:"title"`
	Content          string   `json:"-"`
	AttachmentNames  []string `json:"-"`
}

// PreflightReport contains facts derived from the uploaded archive. It never
// reports invented counts: callers should only offer an import after this report
// has no errors and at least one page was found.
type PreflightReport struct {
	SpaceKey         string           `json:"spaceKey"`
	SpaceName        string           `json:"spaceName"`
	TotalPages       int              `json:"totalPages"`
	TotalAttachments int              `json:"totalAttachments"`
	Pages            []PreflightPage  `json:"pages"`
	DetectedMacros   []MacroSummary   `json:"detectedMacros"`
	Issues           []MigrationIssue `json:"issues"`
}

type ConfluenceImportPageNode struct {
	ID           string                      `json:"id"`
	ParentID     string                      `json:"parentId"`
	Title        string                      `json:"title"`
	ContentXHTML string                      `json:"contentXhtml"`
	TiptapAST    string                      `json:"tiptapAst"`
	Author       string                      `json:"author"`
	CreatedAt    time.Time                   `json:"createdAt"`
	Attachments  []string                    `json:"attachments"`
	Children     []*ConfluenceImportPageNode `json:"children"`
}

type MigrationSummary struct {
	SpaceKey         string           `json:"spaceKey"`
	SpaceName        string           `json:"spaceName"`
	TotalPages       int              `json:"totalPages"`
	TotalAttachments int              `json:"totalAttachments"`
	SuccessCount     int              `json:"successCount"`
	SkippedCount     int              `json:"skippedCount"`
	DurationMs       int64            `json:"durationMs"`
	Warnings         []string         `json:"warnings"`
	Issues           []MigrationIssue `json:"issues"`
	StartedAt        time.Time        `json:"startedAt"`
}

type ConfluenceImporter struct{}

type confluenceEntities struct {
	Objects []confluenceEntityObject `xml:"object"`
}

type confluenceEntityObject struct {
	Class      string                     `xml:"class,attr"`
	ID         confluenceEntityID         `xml:"id"`
	Properties []confluenceEntityProperty `xml:"property"`
}

type confluenceEntityID struct {
	Value string `xml:",chardata"`
}

type confluenceEntityProperty struct {
	Name string             `xml:"name,attr"`
	Text string             `xml:",chardata"`
	ID   confluenceEntityID `xml:"id"`
}

func NewConfluenceImporter() *ConfluenceImporter { return &ConfluenceImporter{} }

var (
	macroNamePattern = regexp.MustCompile(`(?i)<ac:structured-macro\b[^>]*\bac:name\s*=\s*["']([^"']+)["']`)
	titlePattern     = regexp.MustCompile(`(?is)<title[^>]*>\s*(.*?)\s*</title>`)
	h1Pattern        = regexp.MustCompile(`(?is)<h1[^>]*>\s*(.*?)\s*</h1>`)
	htmlTagPattern   = regexp.MustCompile(`(?is)<[^>]+>`)
	hrefPattern      = regexp.MustCompile(`(?i)\bhref\s*=\s*["']([^"'#?]+)[^"']*["']`)
	contentTitle     = regexp.MustCompile(`(?i)<ri:page\b[^>]*\bri:content-title\s*=\s*["']([^"']+)["']`)
	attachmentName   = regexp.MustCompile(`(?i)<ri:attachment\b[^>]*\bri:filename\s*=\s*["']([^"']+)["']`)
)

var supportedMacros = map[string]bool{
	"info": true, "note": true, "warning": true, "tip": true,
	"expand": true, "status": true, "code": true,
}

func isPageEntry(name string) bool {
	ext := strings.ToLower(path.Ext(name))
	return ext == ".html" || ext == ".htm" || ext == ".xhtml"
}

func ValidArchivePath(name string) bool {
	clean := path.Clean(strings.ReplaceAll(name, "\\", "/"))
	return name != "" && !strings.HasPrefix(clean, "../") && clean != ".." && !strings.HasPrefix(clean, "/")
}

func archiveEntryBytes(file *zip.File) ([]byte, error) {
	if file.UncompressedSize64 > maxEntrySize {
		return nil, fmt.Errorf("entry exceeds the %d MiB import limit", maxEntrySize>>20)
	}
	rc, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer rc.Close()
	return io.ReadAll(io.LimitReader(rc, maxEntrySize+1))
}

func titleForEntry(name string, content []byte) string {
	for _, pattern := range []*regexp.Regexp{titlePattern, h1Pattern} {
		if matches := pattern.FindStringSubmatch(string(content)); len(matches) == 2 {
			title := strings.TrimSpace(htmlTagPattern.ReplaceAllString(matches[1], ""))
			if title != "" {
				return title
			}
		}
	}
	return strings.TrimSuffix(path.Base(name), path.Ext(name))
}

// entitiesPageParents recovers title-based parent relationships from the
// entities.xml shape emitted by Confluence Server/Data Center exports. XHTML
// files remain the content source; entity data only improves hierarchy.
func entitiesPageParents(content []byte) (map[string]string, error) {
	var entities confluenceEntities
	if err := xml.Unmarshal(content, &entities); err != nil {
		return nil, err
	}
	titlesByID := make(map[string]string)
	parentIDs := make(map[string]string)
	for _, object := range entities.Objects {
		if !strings.EqualFold(object.Class, "Page") {
			continue
		}
		id := strings.TrimSpace(object.ID.Value)
		if id == "" {
			continue
		}
		for _, property := range object.Properties {
			switch strings.ToLower(strings.TrimSpace(property.Name)) {
			case "title":
				titlesByID[id] = strings.TrimSpace(property.Text)
			case "parent":
				if parentID := strings.TrimSpace(property.ID.Value); parentID != "" {
					parentIDs[id] = parentID
				}
			}
		}
	}
	parents := make(map[string]string)
	for childID, parentID := range parentIDs {
		childTitle := titlesByID[childID]
		parentTitle := titlesByID[parentID]
		if childTitle != "" && parentTitle != "" {
			parents[childTitle] = parentTitle
		}
	}
	return parents, nil
}

func parentSourcePath(sourcePath string, pageNames map[string]struct{}) string {
	directory := path.Dir(sourcePath)
	if directory == "." {
		return ""
	}
	baseName := strings.ToLower(path.Base(sourcePath))
	if baseName == "index.html" || baseName == "index.htm" || baseName == "index.xhtml" {
		directory = path.Dir(directory)
		if directory == "." {
			return ""
		}
	}
	for _, candidate := range []string{"index.xhtml", "index.html", "index.htm"} {
		parent := path.Join(directory, candidate)
		if parent != sourcePath {
			if _, exists := pageNames[parent]; exists {
				return parent
			}
		}
	}
	return ""
}

func issueWarnings(issues []MigrationIssue) []string {
	warnings := make([]string, 0, len(issues))
	for _, issue := range issues {
		if issue.Level != "info" {
			warnings = append(warnings, issue.Message)
		}
	}
	return warnings
}

// Preflight validates an archive without creating documents. This is the only
// source for the migration wizard's detected pages, attachments, macros, and
// repair list.
func (c *ConfluenceImporter) Preflight(ctx context.Context, zipBytes []byte) (*PreflightReport, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	zr, err := zip.NewReader(bytes.NewReader(zipBytes), int64(len(zipBytes)))
	if err != nil {
		return nil, fmt.Errorf("invalid confluence zip export: %w", err)
	}
	report := &PreflightReport{SpaceKey: "CONF", SpaceName: "Confluence Space Migration", Pages: []PreflightPage{}, DetectedMacros: []MacroSummary{}, Issues: []MigrationIssue{}}
	if len(zr.File) > maxArchiveEntries {
		report.Issues = append(report.Issues, MigrationIssue{Level: "error", Code: "archive-too-many-entries", Message: fmt.Sprintf("Archive contains %d entries; the maximum is %d.", len(zr.File), maxArchiveEntries)})
		return report, nil
	}

	pageNames := make(map[string]struct{})
	macroCounts := make(map[string]int)
	pageContents := make(map[string][]byte)
	var entitiesData []byte
	for _, file := range zr.File {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		if file.FileInfo().IsDir() {
			continue
		}
		if !ValidArchivePath(file.Name) {
			report.Issues = append(report.Issues, MigrationIssue{Level: "error", Code: "unsafe-archive-path", Entry: file.Name, Message: fmt.Sprintf("Archive entry %q has an unsafe path and will not be imported.", file.Name)})
			continue
		}
		if strings.HasPrefix(strings.ToLower(file.Name), "attachments/") {
			report.TotalAttachments++
		}
		if !isPageEntry(file.Name) {
			if strings.EqualFold(path.Base(file.Name), "entities.xml") {
				data, readErr := archiveEntryBytes(file)
				if readErr != nil {
					report.Issues = append(report.Issues, MigrationIssue{Level: "warning", Code: "entities-xml-read-failed", Entry: file.Name, Message: fmt.Sprintf("Could not read entities.xml: %v", readErr)})
				} else {
					entitiesData = data
				}
			}
			continue
		}

		content, readErr := archiveEntryBytes(file)
		if readErr != nil {
			report.Issues = append(report.Issues, MigrationIssue{Level: "error", Code: "page-read-failed", Entry: file.Name, Message: fmt.Sprintf("Could not read %q: %v", file.Name, readErr)})
			continue
		}
		pageNames[file.Name] = struct{}{}
		pageContents[file.Name] = content
		title := titleForEntry(file.Name, content)
		attachmentNames := make([]string, 0)
		seenAttachmentNames := make(map[string]struct{})
		for _, match := range attachmentName.FindAllStringSubmatch(string(content), -1) {
			name := strings.TrimSpace(match[1])
			if name == "" {
				continue
			}
			key := strings.ToLower(name)
			if _, seen := seenAttachmentNames[key]; seen {
				continue
			}
			seenAttachmentNames[key] = struct{}{}
			attachmentNames = append(attachmentNames, name)
		}
		report.Pages = append(report.Pages, PreflightPage{SourcePath: file.Name, Title: title, Content: c.ConvertXHTMLToTiptapAST(string(content), title), AttachmentNames: attachmentNames})
		for _, match := range macroNamePattern.FindAllStringSubmatch(string(content), -1) {
			macroCounts[strings.ToLower(strings.TrimSpace(match[1]))]++
		}
	}

	for index := range report.Pages {
		page := &report.Pages[index]
		page.ParentSourcePath = parentSourcePath(page.SourcePath, pageNames)
		content := string(pageContents[page.SourcePath])
		for _, match := range hrefPattern.FindAllStringSubmatch(content, -1) {
			target := path.Clean(path.Join(path.Dir(page.SourcePath), match[1]))
			if isPageEntry(target) {
				if _, found := pageNames[target]; !found {
					report.Issues = append(report.Issues, MigrationIssue{Level: "warning", Code: "missing-internal-link", Entry: page.SourcePath, Message: fmt.Sprintf("%s links to missing archive page %s.", page.SourcePath, target)})
				}
			}
		}
		for _, match := range contentTitle.FindAllStringSubmatch(content, -1) {
			report.Issues = append(report.Issues, MigrationIssue{Level: "warning", Code: "unresolved-confluence-page-link", Entry: page.SourcePath, Message: fmt.Sprintf("%s references Confluence page %q, which needs link repair after import.", page.SourcePath, match[1])})
		}
	}

	if len(entitiesData) > 0 {
		parents, parseErr := entitiesPageParents(entitiesData)
		if parseErr != nil {
			report.Issues = append(report.Issues, MigrationIssue{Level: "warning", Code: "entities-xml-parse-failed", Entry: "entities.xml", Message: fmt.Sprintf("Could not parse entities.xml hierarchy: %v", parseErr)})
		} else {
			pagesByTitle := make(map[string][]int)
			for index := range report.Pages {
				key := strings.ToLower(strings.TrimSpace(report.Pages[index].Title))
				pagesByTitle[key] = append(pagesByTitle[key], index)
			}
			for childTitle, parentTitle := range parents {
				children := pagesByTitle[strings.ToLower(strings.TrimSpace(childTitle))]
				parents := pagesByTitle[strings.ToLower(strings.TrimSpace(parentTitle))]
				if len(children) != 1 || len(parents) != 1 {
					report.Issues = append(report.Issues, MigrationIssue{Level: "warning", Code: "ambiguous-entities-hierarchy", Entry: "entities.xml", Message: fmt.Sprintf("Could not map entities.xml parent %q for page %q to unique XHTML pages.", parentTitle, childTitle)})
					continue
				}
				report.Pages[children[0]].ParentSourcePath = report.Pages[parents[0]].SourcePath
			}
		}
	}

	for macro, count := range macroCounts {
		report.DetectedMacros = append(report.DetectedMacros, MacroSummary{Macro: macro, Count: count, Supported: supportedMacros[macro]})
		if !supportedMacros[macro] {
			report.Issues = append(report.Issues, MigrationIssue{Level: "warning", Code: "unsupported-macro", Message: fmt.Sprintf("The %q macro appears %d time(s) and will be preserved as readable source text.", macro, count)})
		}
	}
	sort.Slice(report.Pages, func(i, j int) bool {
		leftDepth := strings.Count(report.Pages[i].SourcePath, "/")
		rightDepth := strings.Count(report.Pages[j].SourcePath, "/")
		if leftDepth != rightDepth {
			return leftDepth < rightDepth
		}
		leftBase := strings.ToLower(path.Base(report.Pages[i].SourcePath))
		rightBase := strings.ToLower(path.Base(report.Pages[j].SourcePath))
		leftIsIndex := leftBase == "index.html" || leftBase == "index.htm" || leftBase == "index.xhtml"
		rightIsIndex := rightBase == "index.html" || rightBase == "index.htm" || rightBase == "index.xhtml"
		if leftIsIndex != rightIsIndex {
			return leftIsIndex
		}
		return report.Pages[i].SourcePath < report.Pages[j].SourcePath
	})
	sort.Slice(report.DetectedMacros, func(i, j int) bool { return report.DetectedMacros[i].Macro < report.DetectedMacros[j].Macro })
	report.TotalPages = len(report.Pages)
	if report.TotalPages == 0 {
		report.Issues = append(report.Issues, MigrationIssue{Level: "error", Code: "no-pages-found", Message: "No XHTML or HTML pages were found in this archive."})
	}
	return report, nil
}

func (c *ConfluenceImporter) ConvertXHTMLToTiptapAST(xhtml string, title string) string {
	cleaned := xhtml
	infoRegex := regexp.MustCompile(`(?s)<ac:structured-macro ac:name="(info|note|warning|tip)".*?<ac:rich-text-body>(.*?)</ac:rich-text-body>.*?</ac:structured-macro>`)
	cleaned = infoRegex.ReplaceAllStringFunc(cleaned, func(match string) string {
		submatches := infoRegex.FindStringSubmatch(match)
		if len(submatches) >= 3 {
			return fmt.Sprintf(`<blockquote class="kollab-callout-%s">%s</blockquote>`, submatches[1], strings.TrimSpace(submatches[2]))
		}
		return match
	})
	expandRegex := regexp.MustCompile(`(?s)<ac:structured-macro ac:name="expand".*?<ac:rich-text-body>(.*?)</ac:rich-text-body>.*?</ac:structured-macro>`)
	cleaned = expandRegex.ReplaceAllStringFunc(cleaned, func(match string) string {
		submatches := expandRegex.FindStringSubmatch(match)
		if len(submatches) >= 2 {
			return fmt.Sprintf(`<details class="kollab-expand"><summary>Details</summary><div>%s</div></details>`, strings.TrimSpace(submatches[1]))
		}
		return match
	})
	statusRegex := regexp.MustCompile(`(?s)<ac:structured-macro ac:name="status".*?<ac:parameter ac:name="title">(.*?)</ac:parameter>.*?</ac:structured-macro>`)
	cleaned = statusRegex.ReplaceAllStringFunc(cleaned, func(match string) string {
		submatches := statusRegex.FindStringSubmatch(match)
		if len(submatches) >= 2 {
			return fmt.Sprintf(`<span class="kollab-status-badge">%s</span>`, submatches[1])
		}
		return match
	})
	codeRegex := regexp.MustCompile(`(?s)<ac:structured-macro ac:name="code".*?<ac:plain-text-body><!\[CDATA\[(.*?)\]\]></ac:plain-text-body>.*?</ac:structured-macro>`)
	cleaned = codeRegex.ReplaceAllStringFunc(cleaned, func(match string) string {
		submatches := codeRegex.FindStringSubmatch(match)
		if len(submatches) >= 2 {
			return fmt.Sprintf(`<pre><code>%s</code></pre>`, submatches[1])
		}
		return match
	})
	cleaned = regexp.MustCompile(`</?ac:[^>]+>`).ReplaceAllString(cleaned, "")
	cleaned = regexp.MustCompile(`</?ri:[^>]+>`).ReplaceAllString(cleaned, "")
	if strings.TrimSpace(cleaned) == "" {
		cleaned = fmt.Sprintf("<p>Imported Confluence document content for %s.</p>", title)
	}
	astBytes, _ := json.Marshal(map[string]interface{}{"type": "doc", "content": []map[string]interface{}{{"type": "heading", "attrs": map[string]interface{}{"level": 1}, "content": []map[string]interface{}{{"type": "text", "text": title}}}, {"type": "paragraph", "content": []map[string]interface{}{{"type": "text", "text": "Confluence Import HTML Body: " + cleaned}}}}})
	return string(astBytes)
}

// ProcessSpaceExport runs the same validation used by preflight. Persistence is
// intentionally handled by the HTTP/application layer, which owns authorization
// and target-space membership checks.
func (c *ConfluenceImporter) ProcessSpaceExport(ctx context.Context, zipBytes []byte, targetTeamID, targetProjectID string) (*MigrationSummary, error) {
	startedAt := time.Now()
	report, err := c.Preflight(ctx, zipBytes)
	if err != nil {
		return nil, err
	}
	summary := &MigrationSummary{SpaceKey: report.SpaceKey, SpaceName: report.SpaceName, TotalPages: report.TotalPages, TotalAttachments: report.TotalAttachments, Warnings: issueWarnings(report.Issues), Issues: report.Issues, StartedAt: startedAt}
	for _, issue := range report.Issues {
		if issue.Level == "error" {
			summary.SkippedCount++
		}
	}
	if summary.SkippedCount == 0 {
		summary.SuccessCount = summary.TotalPages
	}
	summary.DurationMs = time.Since(startedAt).Milliseconds()
	return summary, nil
}
