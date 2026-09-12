package middleware

import (
	"github.com/go-chi/chi/v5"
	"kollab/api/internal/permissions"
	"net/http"
)

func RequirePermission(scope, parameter, action string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, _ := GetUserID(r.Context())
			if !permissions.CanAccessScope(r.Context(), userID, scope, chi.URLParam(r, parameter), action) {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
