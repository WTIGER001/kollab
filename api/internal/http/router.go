package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"arkollab/api/internal/http/handler"
	mid "arkollab/api/internal/http/middleware"
)

// NewRouter initializes and configures the main chi router with CORS, logger, recovery,
// and maps public/protected routes using JWT middleware.
func NewRouter(jwtSecret []byte, jwksCache *mid.JWKSCache, userH *handler.UserHandler, teamH *handler.TeamHandler, docH *handler.DocumentHandler, imgH *handler.ImageHandler, themeH *handler.ThemeHandler, wsH *handler.WSHandler) http.Handler {
	r := chi.NewRouter()

	// Standard middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// CORS Setup
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	}))

	// Public routes
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", userH.Register)
		r.Post("/login", userH.Login)
		r.Get("/config", userH.GetOIDCConfig)
	})

	// Public image retrieval route (no auth header needed for <img> elements in canvas)
	r.Get("/api/images/{id}/{size}", imgH.GetImage)

	// WebSocket presence connection route (handles auth internally via token query param)
	r.Get("/api/ws", wsH.ServeWS)

	// Protected routes
	r.Route("/api", func(r chi.Router) {
		r.Use(mid.AuthMiddleware(jwtSecret, jwksCache))

		r.Get("/search", docH.Search)
		r.Get("/teams", teamH.ListTeams)
		r.Get("/teams/{teamId}/users", teamH.ListTeamUsers)
		r.Get("/projects", teamH.ListProjects)

		r.Post("/images", imgH.Upload)
		r.Delete("/images/{id}", imgH.Delete)

		r.Put("/theme", themeH.UpdateTheme)
		r.Get("/users/preferences", themeH.GetUserPreference)
		r.Put("/users/preferences", themeH.UpdateUserPreference)

		r.Route("/documents", func(r chi.Router) {
			r.Get("/", docH.List)
			r.Post("/", docH.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", docH.GetByID)
				r.Put("/", docH.Update)
				r.Delete("/", docH.Delete)
				
				r.Get("/versions", docH.GetVersions)
				r.Post("/versions", docH.CreateMilestone)
				r.Get("/versions/{versionId}", docH.GetVersion)
				r.Post("/versions/{versionId}/restore", docH.RestoreVersion)
			})
		})
	})

	return r
}
