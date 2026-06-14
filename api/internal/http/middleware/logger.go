package middleware

import (
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

// RequestLogger is a custom HTTP middleware that logs request details.
// It automatically detects and redacts any "token" query parameter from the URL.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		t1 := time.Now()

		defer func() {
			scheme := "http"
			if r.TLS != nil {
				scheme = "https"
			}

			// Parse URL and redact the "token" query parameter if present
			u := *r.URL
			q := u.Query()
			if q.Has("token") {
				q.Set("token", "[REDACTED]")
				u.RawQuery = q.Encode()
			}

			log.Printf("\"%s %s://%s%s %s\" from %s - %d %dB in %s",
				r.Method, scheme, r.Host, u.RequestURI(), r.Proto, r.RemoteAddr,
				ww.Status(), ww.BytesWritten(), time.Since(t1))
		}()

		next.ServeHTTP(ww, r)
	})
}
