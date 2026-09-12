package middleware

import (
	"errors"
	"kollab/api/internal/lifecycle"
	"net/http"
	"strings"
)

// Maintenance serializes destructive restore with ordinary HTTP operations.
func Maintenance() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/api/ws" {
				next.ServeHTTP(w, r)
				return
			}
			versionRestore := r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/api/documents/") && strings.Contains(r.URL.Path, "/versions/") && strings.HasSuffix(r.URL.Path, "/restore")
			exclusive := versionRestore || r.URL.Path == "/api/system/restore" || r.URL.Path == "/api/system/sync/import" || r.URL.Path == "/api/system/backup" || r.URL.Path == "/api/system/sync/export"
			release, err := lifecycle.Enter(r.Context(), exclusive)
			if err != nil {
				if errors.Is(err, lifecycle.ErrRecoveryRequired) {
					http.Error(w, err.Error(), 503)
					return
				}
				http.Error(w, "Maintenance coordination unavailable", 503)
				return
			}
			defer release()

			next.ServeHTTP(w, r)
		})
	}
}
