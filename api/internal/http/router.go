package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"arkollab/api/internal/domain"
	"arkollab/api/internal/http/handler"
	mid "arkollab/api/internal/http/middleware"
)

// NewRouter initializes and configures the main chi router with CORS, logger, recovery,
// and maps public/protected routes using JWT middleware.
func NewRouter(jwtSecret []byte, jwksCache *mid.JWKSCache, userRepo domain.UserRepository, userH *handler.UserHandler, teamH *handler.TeamHandler, docH *handler.DocumentHandler, imgH *handler.ImageHandler, themeH *handler.ThemeHandler, wsH *handler.WSHandler, systemH *handler.SystemHandler, commentH *handler.CommentHandler, attH *handler.AttachmentHandler, aiH *handler.AIHandler, tagH *handler.TagHandler) http.Handler {
	r := chi.NewRouter()

	// Standard middleware
	r.Use(mid.RequestLogger)
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

	// Health check endpoints
	r.Get("/health", systemH.Health)
	r.Get("/api/health", systemH.Health)

	// Public image retrieval route (no auth header needed for <img> elements in canvas)
	r.Get("/api/images/{id}/{size}", imgH.GetImage)

	// Public attachment download/preview route
	r.Get("/api/attachments/{id}", attH.Download)

	// WebSocket presence connection route (handles auth internally via token query param)
	r.Get("/api/ws", wsH.ServeWS)

	// Protected routes
	r.Route("/api", func(r chi.Router) {
		r.Use(mid.AuthMiddleware(jwtSecret, jwksCache, userRepo))

		r.Get("/search", docH.Search)
		r.Get("/favorites", docH.ListFavorites)
		r.Get("/tasks", docH.GetTasks)
		r.Get("/mentions", docH.GetMentions)
		r.Post("/favorites/{documentId}", docH.AddFavorite)
		r.Delete("/favorites/{documentId}", docH.RemoveFavorite)
		r.Get("/favorites/{documentId}/status", docH.IsFavorite)
		r.Get("/teams", teamH.ListTeams)
		r.Post("/teams", teamH.CreateTeam)
		r.Put("/teams/{id}", teamH.UpdateTeam)
		r.Get("/teams/by-abbreviation/{abbr}", teamH.GetTeamByAbbreviation)
		r.Get("/teams/{teamId}/users", teamH.ListTeamUsers)
		r.Get("/projects", teamH.ListProjects)
		r.Post("/projects", teamH.CreateProject)
		r.Put("/projects/{id}", teamH.UpdateProject)

		r.Post("/images", imgH.Upload)
		r.Delete("/images/{id}", imgH.Delete)

		r.Delete("/attachments/{id}", attH.Delete)

		r.Put("/theme", themeH.UpdateTheme)
		r.Get("/users/preferences", themeH.GetUserPreference)
		r.Put("/users/preferences", themeH.UpdateUserPreference)

		r.Get("/system/settings", systemH.GetSettings)
		r.Put("/system/settings", systemH.UpdateSettings)

		r.Post("/ai/generate", aiH.Generate)

		r.Get("/tags", tagH.List)
		r.Post("/tags", tagH.Create)
		r.Get("/tags/document-associations", tagH.ListDocumentAssociations)
		r.Route("/tags/{id}", func(r chi.Router) {
			r.Put("/", tagH.Update)
			r.Delete("/", tagH.Delete)
		})

		r.Route("/documents", func(r chi.Router) {
			r.Get("/", docH.List)
			r.Get("/recent", docH.ListRecent)
			r.Get("/trash", docH.ListTrash)
			r.Post("/", docH.Create)
			r.Post("/import", docH.Import)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", docH.GetByID)
				r.Get("/export", docH.Export)
				r.Put("/", docH.Update)
				r.Put("/move", docH.Move)
				r.Post("/restore", docH.Restore)
				r.Delete("/", docH.Delete)
				r.Get("/analytics", docH.GetAnalytics)
				r.Get("/audit", systemH.GetAuditLogs)
				r.Post("/autogen-summary", docH.AutogenSummary)
				
				r.Get("/versions", docH.GetVersions)
				r.Post("/versions", docH.CreateMilestone)
				r.Get("/versions/{versionId}", docH.GetVersion)
				r.Post("/versions/{versionId}/restore", docH.RestoreVersion)

				r.Get("/comments", commentH.List)
				r.Post("/comments", commentH.Create)

				r.Get("/attachments", attH.List)
				r.Post("/attachments", attH.Upload)

				r.Get("/tags", tagH.GetDocumentTags)
				r.Post("/tags/{tagId}", tagH.AddTagToDocument)
				r.Delete("/tags/{tagId}", tagH.RemoveTagFromDocument)
			})
		})

		r.Route("/comments", func(r chi.Router) {
			r.Route("/{commentId}", func(r chi.Router) {
				r.Put("/", commentH.Update)
				r.Delete("/", commentH.Delete)
			})
		})
	})

	return r
}
