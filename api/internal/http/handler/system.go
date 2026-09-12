package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	goperm "github.com/wtiger001/go-permissions"

	"kollab/api/internal/domain"
	"kollab/api/internal/http/middleware"
	"kollab/api/internal/permissions"
	"kollab/api/internal/ws"
)

type SystemHandler struct {
	hub               *ws.Hub
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
	userID, ok := middleware.GetUserID(r.Context())
	if !ok || userID == "" {
		http.Error(w, "Unauthorized: user not authenticated", http.StatusUnauthorized)
		return
	}

	isAdmin, err := permissions.Service.HasPermission(r.Context(), goperm.Request{UserID: userID, Perm: "system.admin"})
	if err != nil || !isAdmin {
		http.Error(w, "Forbidden: Server Admin privileges required", http.StatusForbidden)
		return
	}

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
	userID, ok := middleware.GetUserID(r.Context())
	if !ok || userID == "" {
		http.Error(w, "Unauthorized: user not authenticated", http.StatusUnauthorized)
		return
	}

	isAdmin, err := permissions.Service.HasPermission(r.Context(), goperm.Request{UserID: userID, Perm: "system.admin"})
	if err != nil || !isAdmin {
		http.Error(w, "Forbidden: Server Admin privileges required", http.StatusForbidden)
		return
	}

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
		settings.WelcomeTitle = "Welcome to Kollab"
	}

	if settings.ClassificationBannerText == "" {
		settings.ClassificationBannerText = "UNCLASSIFIED"
	}
	if settings.ClassificationBannerBgColor == "" {
		settings.ClassificationBannerBgColor = "var(--primary-color)"
	}
	if settings.ClassificationBannerTextColor == "" {
		settings.ClassificationBannerTextColor = "var(--bg-color)"
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

	statusCode := http.StatusOK
	status := "ok"
	dbStatus := "up"
	if dbErr != nil {
		statusCode = http.StatusServiceUnavailable
		status = "error"
		dbStatus = "down"
	}
	aiProvider := "optional"

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
	if !strings.Contains(strings.ToLower(r.URL.Query().Get("url")), "jira") {
		http.Error(w, "Select a GitLab connection in the issue card to load real issue details", 400)
		return
	}
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

func (h *SystemHandler) GetIntegrationIssueList(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Select a configured integration connection to retrieve issues", 400)
}

func (h *SystemHandler) Backup(w http.ResponseWriter, r *http.Request) { h.exportArchive(w, r, false) }

func (h *SystemHandler) Restore(w http.ResponseWriter, r *http.Request) {
	h.restoreArchive(w, r, false)
}

func (h *SystemHandler) ExportSync(w http.ResponseWriter, r *http.Request) {
	h.exportArchive(w, r, true)
}

func (h *SystemHandler) ImportSync(w http.ResponseWriter, r *http.Request) {
	h.restoreArchive(w, r, true)
}

func (h *SystemHandler) SetHub(hub *ws.Hub) { h.hub = hub }
