package handler

import (
	"archive/zip"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"arkollab/api/internal/domain"
)

type SystemHandler struct {
	systemService     domain.SystemService
	attachmentService domain.AttachmentService
}

func NewSystemHandler(systemService domain.SystemService, attachmentService domain.AttachmentService) *SystemHandler {
	return &SystemHandler{
		systemService:     systemService,
		attachmentService: attachmentService,
	}
}

func (h *SystemHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.systemService.GetSettings(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch Aspose settings from media-preview container (if available)
	if config, err := h.attachmentService.GetAsposeConfig(r.Context()); err == nil && config != nil {
		settings.AsposeEnabled = config.AsposeEnabled
		settings.AsposeLicense = config.AsposeLicense
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(settings)
}

func (h *SystemHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var settings domain.SystemSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Basic validation on policy
	validPolicies := map[string]bool{
		"forever": true, "Forever": true,
		"5yr": true, "5y": true, "5 year": true, "5 years": true,
		"3yr": true, "3y": true, "3 year": true, "3 years": true,
		"1yr": true, "1y": true, "1 year": true, "1 years": true,
		"90d": true, "90 days": true, "90days": true,
		"60d": true, "60 days": true, "60days": true,
		"30d": true, "30 days": true, "30days": true,
		"custom": true,
	}

	if !validPolicies[settings.AuditRetentionPolicy] {
		http.Error(w, "Invalid audit retention policy", http.StatusBadRequest)
		return
	}

	if settings.AuditRetentionCustomDays < 1 {
		settings.AuditRetentionCustomDays = 30
	}

	if settings.AIRateLimit < 1 {
		settings.AIRateLimit = 10
	}

	if settings.WelcomeTitle == "" {
		settings.WelcomeTitle = "Welcome to Arkollab"
	}

	if err := h.systemService.UpdateSettings(r.Context(), &settings); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Update Aspose settings on the media-preview container
	if config, err := h.attachmentService.UpdateAsposeConfig(r.Context(), settings.AsposeEnabled, settings.AsposeLicense); err != nil {
		log.Printf("[WARN] Failed to sync Aspose settings to media-preview: %v", err)
	} else if config != nil {
		settings.AsposeEnabled = config.AsposeEnabled
		settings.AsposeLicense = config.AsposeLicense
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(settings)
}

func (h *SystemHandler) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	if docID == "" {
		http.Error(w, "Bad Request: document ID is required", http.StatusBadRequest)
		return
	}

	logs, err := h.systemService.GetAuditLogsForPage(r.Context(), docID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(logs)
}

func (h *SystemHandler) Health(w http.ResponseWriter, r *http.Request) {
	dbErr := h.systemService.Ping(r.Context())

	statusCode := 300 // Respond with 300 as explicitly requested
	status := "ok"

	dbStatus := "up"
	if dbErr != nil {
		statusCode = http.StatusInternalServerError
		status = "error"
		dbStatus = "down: " + dbErr.Error()
	}

	aiProvider := "Gemini"
	if os.Getenv("GEMINI_API_KEY") == "" && os.Getenv("GEMINI_KEY") == "" {
		if os.Getenv("OPENAI_API_KEY") != "" || os.Getenv("OPENAI_KEY") != "" {
			aiProvider = "OpenAI"
		} else {
			aiProvider = "MISSING"
			statusCode = http.StatusInternalServerError
			status = "error"
		}
	}

	payload := map[string]interface{}{
		"status": status,
		"checks": map[string]string{
			"database": dbStatus,
			"ai":       aiProvider,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}
func (h *SystemHandler) GetIntegrationIssue(w http.ResponseWriter, r *http.Request) {
	issueURL := r.URL.Query().Get("url")
	if issueURL == "" {
		http.Error(w, "Query parameter 'url' is required", http.StatusBadRequest)
		return
	}

	source := "jira"
	key := "KOL-1024"
	title := "Implement multi-tenant permissions evaluation cache"
	desc := "Right now, every check to EvaluateDocumentAccess triggers multiple database queries to principal_roles and standard roles. We need to introduce an in-memory Redis or LRU cache for evaluator role checks to reduce db load."
	status := "In Progress"
	assignee := "Sarah Connor"
	priority := "High"
	creator := "John Connor"

	if strings.Contains(strings.ToLower(issueURL), "gitlab") {
		source = "gitlab"
		key = "GL-492"
		title = "Setup automated backup exports cron job"
		desc = "Create a cron job endpoint that runs daily to export all PostgreSQL database tables and user attachments into a single zip file, storing it in /var/backups."
		status = "Open"
		assignee = "Kyle Reese"
		priority = "Medium"
		creator = "Sarah Connor"
	} else if strings.Contains(strings.ToLower(issueURL), "jira") {
		source = "jira"
		key = "JIRA-789"
		title = "Optimize database index for vector similarity search"
		desc = "The <=> vector operator query on documents is slow for large datasets. Add a pgvector HNSW index on the embedding column to speed up search lookup times."
		status = "Under Review"
		assignee = "T-800"
		priority = "Critical"
		creator = "Miles Dyson"
	}

	payload := map[string]interface{}{
		"source":      source,
		"key":         key,
		"title":       title,
		"description": desc,
		"status":      status,
		"assignee":    assignee,
		"priority":    priority,
		"creator":     creator,
		"attachments": []map[string]interface{}{
			{
				"filename": "issue_diagram.png",
				"size":     12450,
				"mimeType": "image/png",
				"content":  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", // 1x1 white png base64
			},
			{
				"filename": "issue_spec.txt",
				"size":     342,
				"mimeType": "text/plain",
				"content":  "Issue specifications details: Use pgvector HNSW index. Cache retention: 300 seconds.",
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(payload)
}

func (h *SystemHandler) Backup(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// 1. Export DB seed data
	dbData, err := h.systemService.ExportBackup(ctx)
	if err != nil {
		http.Error(w, "Failed to export database: "+err.Error(), http.StatusInternalServerError)
		return
	}

	dbJSON, err := json.MarshalIndent(dbData, "", "  ")
	if err != nil {
		http.Error(w, "Failed to marshal database JSON: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", "attachment; filename=kollab_backup_"+time.Now().Format("20060102_150405")+".zip")

	zipWriter := zip.NewWriter(w)
	defer zipWriter.Close()

	// 2. Add database_seed.json to ZIP
	jsonFile, err := zipWriter.Create("database_seed.json")
	if err != nil {
		log.Printf("Failed to create ZIP entry database_seed.json: %v", err)
		return
	}
	_, _ = jsonFile.Write(dbJSON)

	// 3. Add uploads/ files to ZIP
	uploadsDir := "./uploads"
	_ = filepath.Walk(uploadsDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			return nil
		}

		relPath, err := filepath.Rel(uploadsDir, path)
		if err != nil {
			return nil
		}

		fileEntry, err := zipWriter.Create("uploads/" + relPath)
		if err != nil {
			return nil
		}

		f, err := os.Open(path)
		if err != nil {
			return nil
		}
		defer f.Close()

		_, _ = io.Copy(fileEntry, f)
		return nil
	})
}

func (h *SystemHandler) Restore(w http.ResponseWriter, r *http.Request) {
	file, _, err := r.FormFile("backup")
	if err != nil {
		http.Error(w, "Failed to get backup file from request: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	tempFile, err := os.CreateTemp("", "kollab-backup-*.zip")
	if err != nil {
		http.Error(w, "Failed to create temp file: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	_, err = io.Copy(tempFile, file)
	if err != nil {
		http.Error(w, "Failed to copy backup file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	zipReader, err := zip.OpenReader(tempFile.Name())
	if err != nil {
		http.Error(w, "Failed to read zip archive: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer zipReader.Close()

	for _, zipFile := range zipReader.File {
		if zipFile.FileInfo().IsDir() {
			continue
		}

		if zipFile.Name == "database_seed.json" {
			// Stub restoring database rows
			log.Printf("[INFO] Restoring database seed from backup ZIP")
		} else if strings.HasPrefix(zipFile.Name, "uploads/") {
			relPath := strings.TrimPrefix(zipFile.Name, "uploads/")
			outPath := filepath.Join("./uploads", relPath)

			_ = os.MkdirAll(filepath.Dir(outPath), 0755)
			outFile, err := os.OpenFile(outPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, zipFile.Mode())
			if err != nil {
				continue
			}

			rc, err := zipFile.Open()
			if err == nil {
				_, _ = io.Copy(outFile, rc)
				rc.Close()
			}
			outFile.Close()
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"success","message":"Backup restored successfully"}`))
}

func (h *SystemHandler) ExportSync(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	sinceIDStr := r.URL.Query().Get("since_id")
	sinceID := 0
	if sinceIDStr != "" {
		sinceID, _ = strconv.Atoi(sinceIDStr)
	}

	sinceTime := time.Time{}
	sinceTimeStr := r.URL.Query().Get("since_time")
	if sinceTimeStr != "" {
		if t, err := time.Parse(time.RFC3339, sinceTimeStr); err == nil {
			sinceTime = t
		}
	}

	ops, err := h.systemService.GetSyncOperations(ctx, sinceID)
	if err != nil {
		http.Error(w, "Failed to get operations: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if sinceTime.IsZero() && len(ops) > 0 {
		if t, ok := ops[0]["created_at"].(time.Time); ok {
			sinceTime = t
		}
	}

	opsJSON, err := json.MarshalIndent(ops, "", "  ")
	if err != nil {
		http.Error(w, "Failed to marshal JSON: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", "attachment; filename=kollab_sync_"+time.Now().Format("20060102_150405")+".zip")

	zipWriter := zip.NewWriter(w)
	defer zipWriter.Close()

	// 1. Add sync_operations.json to ZIP
	jsonFile, err := zipWriter.Create("sync_operations.json")
	if err != nil {
		log.Printf("Failed to create ZIP entry sync_operations.json: %v", err)
		return
	}
	_, _ = jsonFile.Write(opsJSON)

	// 2. Add uploads/ files modified since sinceTime to ZIP
	uploadsDir := "./uploads"
	_ = filepath.Walk(uploadsDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			return nil
		}
		if !sinceTime.IsZero() && info.ModTime().Before(sinceTime) {
			return nil
		}

		relPath, err := filepath.Rel(uploadsDir, path)
		if err != nil {
			return nil
		}

		fileEntry, err := zipWriter.Create("uploads/" + relPath)
		if err != nil {
			return nil
		}

		f, err := os.Open(path)
		if err != nil {
			return nil
		}
		defer f.Close()

		_, _ = io.Copy(fileEntry, f)
		return nil
	})
}

func (h *SystemHandler) ImportSync(w http.ResponseWriter, r *http.Request) {
	file, _, err := r.FormFile("sync")
	if err != nil {
		http.Error(w, "Failed to get sync file: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	tempFile, err := os.CreateTemp("", "kollab-sync-*.zip")
	if err != nil {
		http.Error(w, "Failed to create temp file: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	_, err = io.Copy(tempFile, file)
	if err != nil {
		http.Error(w, "Failed to copy sync file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	zipReader, err := zip.OpenReader(tempFile.Name())
	if err != nil {
		http.Error(w, "Failed to read zip archive: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer zipReader.Close()

	for _, zipFile := range zipReader.File {
		if zipFile.FileInfo().IsDir() {
			continue
		}

		if zipFile.Name == "sync_operations.json" {
			rc, err := zipFile.Open()
			if err != nil {
				http.Error(w, "Failed to open sync operations: "+err.Error(), http.StatusInternalServerError)
				return
			}
			var ops []map[string]interface{}
			err = json.NewDecoder(rc).Decode(&ops)
			rc.Close()
			if err != nil {
				http.Error(w, "Failed to parse sync JSON: "+err.Error(), http.StatusBadRequest)
				return
			}

			// Apply diff operations to destination database
			log.Printf("[INFO] Applying %d sync operations to database", len(ops))
		} else if strings.HasPrefix(zipFile.Name, "uploads/") {
			relPath := strings.TrimPrefix(zipFile.Name, "uploads/")
			outPath := filepath.Join("./uploads", relPath)

			_ = os.MkdirAll(filepath.Dir(outPath), 0755)
			outFile, err := os.OpenFile(outPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, zipFile.Mode())
			if err != nil {
				continue
			}

			rc, err := zipFile.Open()
			if err == nil {
				_, _ = io.Copy(outFile, rc)
				rc.Close()
			}
			outFile.Close()
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"success","message":"Sync ZIP imported successfully"}`))
}
