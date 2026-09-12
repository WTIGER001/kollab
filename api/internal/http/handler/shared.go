package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"github.com/go-chi/chi/v5"
	docExporter "kollab/api/internal/document"
	"kollab/api/internal/http/middleware"
	"net/http"
)

// OpenSharedDocument resolves a link without exposing its token in server URLs.
// Commenting and editing require an identified account; public links allow reading.
func (h *DocumentHandler) OpenSharedDocument(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req) != nil || len(req.Token) != 32 {
		http.Error(w, "Invalid sharing link", 400)
		return
	}
	hash := sha256.Sum256([]byte(req.Token))
	var id string
	if h.db == nil {
		http.Error(w, "Sharing is unavailable", 503)
		return
	}
	if err := h.db.QueryRow(r.Context(), "SELECT document_id FROM sharing_links WHERE token_hash=$1", hex.EncodeToString(hash[:])).Scan(&id); err != nil {
		http.Error(w, "Sharing link not found", 404)
		return
	}
	userID, _ := middleware.GetUserID(r.Context())
	allowed, reason, err := h.evaluator.EvaluateDocumentAccess(r.Context(), userID, id, "read", req.Token, req.Password)
	if err != nil || !allowed {
		if reason == "" {
			reason = "This sharing link could not be opened"
		}
		http.Error(w, reason, 403)
		return
	}
	doc, _, err := h.docService.GetDocument(r.Context(), id)
	if err != nil || doc.DeletedAt != nil {
		http.Error(w, "Shared page is unavailable", 404)
		return
	}
	html, err := docExporter.TiptapToHTML(doc.Title, doc.Content)
	if err != nil {
		http.Error(w, "Unable to render shared page", 500)
		return
	}
	canWrite, canComment := false, false
	if userID != "" {
		canWrite, _, _ = h.evaluator.EvaluateDocumentAccess(r.Context(), userID, id, "write", req.Token, req.Password)
		canComment, _, _ = h.evaluator.EvaluateDocumentAccess(r.Context(), userID, id, "comment", req.Token, req.Password)
	}
	mediaToken, err := h.evaluator.IssueSharedMediaGrant(req.Token, id, userID)
	if err != nil {
		http.Error(w, "Unable to authorize shared media", 500)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	json.NewEncoder(w).Encode(map[string]any{"document": doc, "html": html, "canWrite": canWrite, "canComment": canComment, "mediaToken": mediaToken})
}

func (h *DocumentHandler) Capabilities(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	result := map[string]bool{}
	for _, action := range []string{"write", "comment", "delete", "grant"} {
		allowed, _, err := h.evaluator.EvaluateDocumentAccess(r.Context(), userID, chi.URLParam(r, "id"), action, r.Header.Get("X-Share-Token"), r.Header.Get("X-Share-Password"))
		if err != nil {
			http.Error(w, "Unable to verify page capabilities", 500)
			return
		}
		result[action] = allowed
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
