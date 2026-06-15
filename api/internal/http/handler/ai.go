package handler

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"arkollab/api/internal/domain"
	"arkollab/api/internal/http/middleware"
)

type AIHandler struct {
	systemService domain.SystemService
	aiClient      domain.LLMClient
	mu            sync.Mutex
	requestLog    map[string][]time.Time
}

func NewAIHandler(systemService domain.SystemService, aiClient domain.LLMClient) *AIHandler {
	return &AIHandler{
		systemService: systemService,
		aiClient:      aiClient,
		requestLog:    make(map[string][]time.Time),
	}
}

type aiGenerateRequest struct {
	Prompt string `json:"prompt"`
}

type aiGenerateResponse struct {
	Text string `json:"text"`
}

func (h *AIHandler) Generate(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req aiGenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if req.Prompt == "" {
		http.Error(w, "Prompt is required", http.StatusBadRequest)
		return
	}

	settings, err := h.systemService.GetSettings(r.Context())
	if err != nil {
		http.Error(w, "Failed to load settings: "+err.Error(), http.StatusInternalServerError)
		return
	}

	h.mu.Lock()
	now := time.Now()
	cutoff := now.Add(-1 * time.Minute)

	// Prune requests older than 1 minute for this user
	var activeRequests []time.Time
	for _, t := range h.requestLog[userID] {
		if t.After(cutoff) {
			activeRequests = append(activeRequests, t)
		}
	}

	limit := settings.AIRateLimit
	if len(activeRequests) >= limit {
		h.mu.Unlock()
		http.Error(w, "AI rate limit exceeded. Please try again in a minute.", http.StatusTooManyRequests)
		return
	}

	activeRequests = append(activeRequests, now)
	h.requestLog[userID] = activeRequests
	h.mu.Unlock()

	text, err := h.aiClient.GenerateText(r.Context(), req.Prompt)
	if err != nil {
		http.Error(w, "AI generation failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(aiGenerateResponse{Text: text})
}
