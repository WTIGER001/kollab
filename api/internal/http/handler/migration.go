package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"kollab/api/internal/domain"
	"kollab/api/internal/http/middleware"
	"kollab/api/internal/migration"
)

type MigrationHandler struct {
	importer        *migration.ConfluenceImporter
	documentService domain.DocumentService
}

func NewMigrationHandler(importer *migration.ConfluenceImporter, documentService domain.DocumentService) *MigrationHandler {
	return &MigrationHandler{
		importer:        importer,
		documentService: documentService,
	}
}

func (h *MigrationHandler) ImportConfluenceSpace(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(50 << 20) // 50MB max file size
	if err != nil {
		http.Error(w, "Failed to parse multipart form: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("backup")
	if err != nil {
		http.Error(w, "Form file 'backup' is required: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	zipBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read uploaded backup file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	teamID := r.FormValue("teamId")
	projectID := r.FormValue("projectId")
	if teamID == "" && projectID == "" {
		http.Error(w, "A target teamId or projectId is required", http.StatusBadRequest)
		return
	}

	report, err := h.importer.Preflight(r.Context(), zipBytes)
	if err != nil {
		http.Error(w, "Confluence import failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	for _, issue := range report.Issues {
		if issue.Level == "error" {
			http.Error(w, "Confluence import preflight failed: "+issue.Message, http.StatusUnprocessableEntity)
			return
		}
	}
	if h.documentService == nil {
		http.Error(w, "Confluence import is not configured with a document service", http.StatusServiceUnavailable)
		return
	}

	userID, _ := middleware.GetUserID(r.Context())
	startedAt := time.Now()

	// Document creation is intentionally sequential: if one page is rejected by
	// target-space authorization, the response identifies the exact source entry
	// and does not conceal partial progress behind a fabricated success count.
	created := 0
	warnings := make([]string, 0)
	createdPages := make(map[string]string, len(report.Pages))
	for _, page := range report.Pages {
		var parentID *string
		if page.ParentSourcePath != "" {
			createdParentID, found := createdPages[page.ParentSourcePath]
			if !found {
				warnings = append(warnings, fmt.Sprintf("%s was imported at the root because its parent %s could not be created.", page.SourcePath, page.ParentSourcePath))
			} else {
				parentID = &createdParentID
			}
		}
		createdDocument, createErr := h.documentService.CreateDocument(r.Context(), page.Title, "", projectID, teamID, parentID, userID, &page.Content)
		if createErr != nil {
			warnings = append(warnings, fmt.Sprintf("%s was not created: %v", page.SourcePath, createErr))
			continue
		}
		createdPages[page.SourcePath] = createdDocument.ID
		created++
	}
	for _, issue := range report.Issues {
		if issue.Level != "info" {
			warnings = append(warnings, issue.Message)
		}
	}
	if report.TotalAttachments > 0 {
		warnings = append(warnings, fmt.Sprintf("%d attachment file(s) were detected but need to be uploaded separately; attachment import is not enabled yet.", report.TotalAttachments))
	}
	summary := &migration.MigrationSummary{
		SpaceKey: report.SpaceKey, SpaceName: report.SpaceName,
		TotalPages: report.TotalPages, TotalAttachments: report.TotalAttachments,
		SuccessCount: created, SkippedCount: report.TotalPages - created,
		Warnings: warnings, Issues: report.Issues, StartedAt: startedAt, DurationMs: time.Since(startedAt).Milliseconds(),
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(summary)
}

func (h *MigrationHandler) PreviewConfluenceSpace(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(50 << 20)
	if err != nil {
		http.Error(w, "Failed to parse multipart form: "+err.Error(), http.StatusBadRequest)
		return
	}
	file, _, err := r.FormFile("backup")
	if err != nil {
		http.Error(w, "Form file 'backup' is required: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()
	zipBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read uploaded backup file: "+err.Error(), http.StatusInternalServerError)
		return
	}
	payload, err := h.importer.Preflight(r.Context(), zipBytes)
	if err != nil {
		http.Error(w, "Confluence preflight failed: "+err.Error(), http.StatusUnprocessableEntity)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(payload)
}
