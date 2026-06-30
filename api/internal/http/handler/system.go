package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

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

