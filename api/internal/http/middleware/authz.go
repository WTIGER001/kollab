package middleware

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"arkollab/api/internal/permissions"
)

// DocumentAccessMiddleware checks if the user has permissions to perform the action on the document
func DocumentAccessMiddleware(evaluator *permissions.AccessEvaluator, action string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			if id == "" {
				id = chi.URLParam(r, "documentId")
			}
			if id == "" {
				id = r.URL.Query().Get("documentId")
			}
			if id == "" {
				next.ServeHTTP(w, r)
				return
			}

			userID, _ := GetUserID(r.Context())
			shareToken := r.URL.Query().Get("token")
			sharePassword := r.Header.Get("X-Share-Password")

			allowed, reason, err := evaluator.EvaluateDocumentAccess(r.Context(), userID, id, action, shareToken, sharePassword)
			if !allowed {
				if reason == "Password required" {
					w.Header().Set("WWW-Authenticate", "SharePassword")
					http.Error(w, reason, http.StatusUnauthorized)
					return
				}
				http.Error(w, fmt.Sprintf("Forbidden: %s", reason), http.StatusForbidden)
				return
			}

			if err != nil {
				http.Error(w, fmt.Sprintf("Internal Error: %v", err), http.StatusInternalServerError)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
