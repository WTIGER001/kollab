package handler

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"path"
	"strings"
	"time"

	"kollab/api/internal/domain"
	"kollab/api/internal/http/middleware"
	"kollab/api/internal/migration"
)

type MigrationHandler struct {
	importer          *migration.ConfluenceImporter
	documentService   domain.DocumentService
	attachmentService domain.AttachmentService
}

func NewMigrationHandler(importer *migration.ConfluenceImporter, documentService domain.DocumentService, attachmentServices ...domain.AttachmentService) *MigrationHandler {
	var attachmentService domain.AttachmentService
	if len(attachmentServices) > 0 {
		attachmentService = attachmentServices[0]
	}
	return &MigrationHandler{
		importer:          importer,
		documentService:   documentService,
		attachmentService: attachmentService,
	}
}

func attachmentFiles(zipBytes []byte) (map[string][]*zip.File, error) {
	archive, err := zip.NewReader(bytes.NewReader(zipBytes), int64(len(zipBytes)))
	if err != nil {
		return nil, err
	}
	files := make(map[string][]*zip.File)
	for _, file := range archive.File {
		if file.FileInfo().IsDir() || !migration.ValidArchivePath(file.Name) || !strings.HasPrefix(strings.ToLower(file.Name), "attachments/") {
			continue
		}
		name := strings.ToLower(path.Base(file.Name))
		if name == "" || name == "." {
			continue
		}
		files[name] = append(files[name], file)
	}
	return files, nil
}

func readAttachmentFile(file *zip.File) ([]byte, error) {
	if file.UncompressedSize64 > 10<<20 {
		return nil, fmt.Errorf("attachment exceeds the 10 MiB import limit")
	}
	reader, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer reader.Close()
	data, err := io.ReadAll(io.LimitReader(reader, 10<<20+1))
	if err != nil {
		return nil, err
	}
	if len(data) > 10<<20 {
		return nil, fmt.Errorf("attachment exceeds the 10 MiB import limit")
	}
	return data, nil
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
	archiveDigest := sha256.Sum256(zipBytes)
	archiveSHA256 := hex.EncodeToString(archiveDigest[:])
	archiveAttachments, archiveErr := attachmentFiles(zipBytes)
	if archiveErr != nil {
		http.Error(w, "Confluence import failed: "+archiveErr.Error(), http.StatusUnprocessableEntity)
		return
	}

	// Document creation is intentionally sequential: if one page is rejected by
	// target-space authorization, the response identifies the exact source entry
	// and does not conceal partial progress behind a fabricated success count.
	created := 0
	warnings := make([]string, 0)
	createdPages := make(map[string]string, len(report.Pages))
	for _, page := range report.Pages {
		existing, lookupErr := h.documentService.FindConfluenceImport(r.Context(), archiveSHA256, page.SourcePath, teamID, projectID)
		if lookupErr != nil {
			warnings = append(warnings, fmt.Sprintf("%s could not be checked for an earlier import: %v", page.SourcePath, lookupErr))
			continue
		}
		var documentID string
		if existing != nil {
			createdPages[page.SourcePath] = existing.DocumentID
			documentID = existing.DocumentID
			warnings = append(warnings, fmt.Sprintf("%s was skipped because this archive page was already imported.", page.SourcePath))
		} else {
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
			documentID = createdDocument.ID
			createdPages[page.SourcePath] = documentID
			if recordErr := h.documentService.RecordConfluenceImport(r.Context(), &domain.ConfluenceImportRecord{ArchiveSHA256: archiveSHA256, SourcePath: page.SourcePath, TeamID: teamID, ProjectID: projectID, DocumentID: documentID, CreatedAt: time.Now()}); recordErr != nil {
				warnings = append(warnings, fmt.Sprintf("%s was created but could not be marked as imported: %v", page.SourcePath, recordErr))
			}
			created++
		}
		if h.attachmentService != nil {
			existingAttachments, listErr := h.attachmentService.ListAttachments(r.Context(), documentID)
			if listErr != nil {
				warnings = append(warnings, fmt.Sprintf("%s attachments could not be checked for an earlier import: %v", page.SourcePath, listErr))
			}
			for _, attachmentName := range page.AttachmentNames {
				matchingFiles := archiveAttachments[strings.ToLower(path.Base(attachmentName))]
				if len(matchingFiles) == 0 {
					warnings = append(warnings, fmt.Sprintf("%s references attachment %q, but no matching archive file was found.", page.SourcePath, attachmentName))
					continue
				}
				if len(matchingFiles) > 1 {
					warnings = append(warnings, fmt.Sprintf("%s references attachment %q, but it matches %d archive files and was not imported.", page.SourcePath, attachmentName, len(matchingFiles)))
					continue
				}
				archiveFile := matchingFiles[0]
				data, readErr := readAttachmentFile(archiveFile)
				if readErr != nil {
					warnings = append(warnings, fmt.Sprintf("%s attachment %q was not imported: %v", page.SourcePath, attachmentName, readErr))
					continue
				}
				mimeType := mime.TypeByExtension(path.Ext(attachmentName))
				if mimeType == "" {
					mimeType = "application/octet-stream"
				}
				alreadyImported := false
				for _, existingAttachment := range existingAttachments {
					if !strings.EqualFold(existingAttachment.Filename, attachmentName) {
						continue
					}
					existingData, _, existingErr := h.attachmentService.GetAttachmentFile(r.Context(), existingAttachment.ID)
					if existingErr == nil && bytes.Equal(existingData, data) {
						alreadyImported = true
						break
					}
				}
				if alreadyImported {
					continue
				}
				if _, uploadErr := h.attachmentService.UploadAttachment(r.Context(), documentID, attachmentName, mimeType, data, userID); uploadErr != nil {
					warnings = append(warnings, fmt.Sprintf("%s attachment %q was not imported: %v", page.SourcePath, attachmentName, uploadErr))
				}
			}
		}
	}
	for _, issue := range report.Issues {
		if issue.Level != "info" {
			warnings = append(warnings, issue.Message)
		}
	}
	if report.TotalAttachments > 0 && h.attachmentService == nil {
		warnings = append(warnings, fmt.Sprintf("%d attachment file(s) were detected but attachment import is not configured.", report.TotalAttachments))
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
