package http

import (
	"encoding/json"
	goperm "github.com/wtiger001/go-permissions"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"kollab/api/internal/domain"
	"kollab/api/internal/http/handler"
	mid "kollab/api/internal/http/middleware"
	"kollab/api/internal/migration"
	"kollab/api/internal/permissions"
)

// NewRouter initializes and configures the main chi router with CORS, logger, recovery,
// and maps public/protected routes using JWT middleware.
func NewRouter(jwtSecret []byte, jwksCache *mid.JWKSCache, userRepo domain.UserRepository, userH *handler.UserHandler, teamH *handler.TeamHandler, docH *handler.DocumentHandler, imgH *handler.ImageHandler, libImgH *handler.LibraryImageHandler, themeH *handler.ThemeHandler, wsH *handler.WSHandler, systemH *handler.SystemHandler, commentH *handler.CommentHandler, attH *handler.AttachmentHandler, aiH *handler.AIHandler, tagH *handler.TagHandler, templateH *handler.TemplateHandler, integrationH *handler.IntegrationHandler, evaluator *permissions.AccessEvaluator) http.Handler {
	r := chi.NewRouter()
	imgH.SetAccessEvaluator(evaluator)
	libImgH.SetAccessEvaluator(evaluator)
	tagH.SetAccessEvaluator(evaluator)
	optionalAuth := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Header.Get("Authorization") != "" || r.URL.Query().Get("authToken") != "" {
				mid.AuthMiddleware(jwtSecret, jwksCache, userRepo)(next).ServeHTTP(w, r)
			} else {
				next.ServeHTTP(w, r)
			}
		})
	}

	confluenceImporter := migration.NewConfluenceImporter()
	migrationH := handler.NewMigrationHandler(confluenceImporter, docH.Service(), attH.Service())

	// Standard middleware
	r.Use(mid.RequestLogger)
	r.Use(mid.Maintenance())
	r.Use(middleware.Recoverer)
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			limit := int64(64 << 20)
			if r.URL.Path == "/api/system/restore" || r.URL.Path == "/api/system/sync/import" {
				limit = 1 << 30
			}
			r.Body = http.MaxBytesReader(w, r.Body, limit)
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("Referrer-Policy", "same-origin")
			next.ServeHTTP(w, r)
		})
	})

	// CORS Setup
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:8090", "http://127.0.0.1:8090", "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Share-Token", "X-Share-Password"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	}))

	// Public routes
	r.Route("/api/auth", func(r chi.Router) {
		if jwksCache.AllowsLocalCredentials() {
			r.Post("/login", userH.Login)
			r.Post("/setup", userH.SetupInitialLocalAdmin)
		}
		r.Get("/config", userH.GetOIDCConfig)
	})

	r.With(optionalAuth).Post("/api/shared-links/open", docH.OpenSharedDocument)

	// Health check endpoints
	r.Get("/health", systemH.Health)
	r.Get("/api/health", systemH.Health)

	// Public image retrieval route (no auth header needed for <img> elements in canvas)
	r.With(optionalAuth).Get("/api/images/{id}/{size}", imgH.GetImage)
	r.With(optionalAuth).Get("/api/images/{id}", imgH.GetImage) // Fallback for URLs without size param

	r.With(optionalAuth).Get("/api/attachments/{id}", attH.Download)

	r.With(optionalAuth).Get("/api/attachments/{id}/preview", attH.Preview)

	r.With(optionalAuth).Get("/api/attachments/{id}/preview/status", attH.PreviewStatus)

	r.With(optionalAuth).Get("/api/attachments/{id}/preview/view/*", attH.PreviewView)

	// WebSocket presence connection route (handles auth internally via token query param)
	r.Get("/api/ws", wsH.ServeWS)

	// Protected routes
	r.Route("/api", func(r chi.Router) {
		r.Use(mid.AuthMiddleware(jwtSecret, jwksCache, userRepo))
		r.Get("/me", func(w http.ResponseWriter, r *http.Request) {
			id, _ := mid.GetUserID(r.Context())
			u, err := userRepo.GetByID(r.Context(), id)
			if err != nil {
				http.Error(w, "User not found", http.StatusNotFound)
				return
			}
			isAdmin := false
			if permissions.Service != nil {
				isAdmin, _ = permissions.Service.HasPermission(r.Context(), goperm.Request{UserID: id, Perm: "system.admin"})
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(struct {
				*domain.User
				IsAdmin bool `json:"isAdmin"`
			}{u, isAdmin})
		})

		readCheck := mid.DocumentAccessMiddleware(evaluator, "read")
		commentCheck := mid.DocumentAccessMiddleware(evaluator, "comment")
		writeCheck := mid.DocumentAccessMiddleware(evaluator, "write")
		deleteCheck := mid.DocumentAccessMiddleware(evaluator, "delete")
		grantCheck := mid.DocumentAccessMiddleware(evaluator, "grant")

		r.Get("/search", docH.Search)
		r.Get("/favorites", docH.ListFavorites)
		r.Get("/tasks", docH.GetTasks)
		r.Get("/mentions", docH.GetMentions)
		r.Get("/notifications", docH.ListNotifications)
		r.Put("/notifications/{notificationId}/read", docH.MarkNotificationRead)

		r.Route("/favorites/{documentId}", func(r chi.Router) {
			r.Use(readCheck)
			r.Post("/", docH.AddFavorite)
			r.Delete("/", docH.RemoveFavorite)
			r.Get("/status", docH.IsFavorite)
		})
		r.Route("/watches/{documentId}", func(r chi.Router) {
			r.Use(readCheck)
			r.Post("/", docH.AddWatch)
			r.Delete("/", docH.RemoveWatch)
			r.Get("/status", docH.IsWatching)
		})

		r.Get("/teams", teamH.ListTeams)
		r.Post("/teams", teamH.CreateTeam)
		r.With(mid.RequirePermission("team", "id", "write")).Put("/teams/{id}", teamH.UpdateTeam)
		r.Get("/teams/by-abbreviation/{abbr}", teamH.GetTeamByAbbreviation)
		r.With(mid.RequirePermission("team", "teamId", "read")).Get("/teams/{teamId}/users", teamH.ListTeamUsers)
		r.With(mid.RequirePermission("team", "teamId", "grant")).Post("/teams/{teamId}/users", teamH.AddTeamMember)
		r.With(mid.RequirePermission("team", "teamId", "grant")).Delete("/teams/{teamId}/users/{userId}", teamH.RemoveTeamMember)
		r.Get("/users", teamH.ListAllUsers)
		if jwksCache.AllowsLocalCredentials() {
			r.Get("/admin/users", userH.ListLocalUsers)
			r.Post("/admin/users", userH.CreateLocalUser)
			r.Put("/admin/users/{id}/active", userH.SetLocalUserActive)
			r.Put("/admin/users/{id}/password", userH.SetLocalUserPassword)
			r.Put("/admin/users/{id}", userH.UpdateLocalUser)
			r.Delete("/admin/users/{id}", userH.DeleteLocalUser)
		}
		r.Get("/projects", teamH.ListProjects)
		r.Post("/projects", teamH.CreateProject)
		r.With(mid.RequirePermission("project", "id", "write")).Put("/projects/{id}", teamH.UpdateProject)

		r.Post("/images", imgH.Upload)
		r.Delete("/images/{id}", imgH.Delete)

		r.Get("/library/images", libImgH.List)
		r.Post("/library/images", libImgH.Upload)
		r.Put("/library/images/{id}", libImgH.UpdateName)
		r.Delete("/library/images/{id}", libImgH.Delete)

		r.Delete("/attachments/{id}", attH.Delete)

		r.Post("/attachments/{id}/preview/retry", attH.Retry)

		r.With(mid.RequirePermission("system", "", "write")).Put("/theme", themeH.UpdateTheme)
		r.Get("/users/preferences", themeH.GetUserPreference)
		r.Put("/users/preferences", themeH.UpdateUserPreference)

		r.Get("/system/settings", systemH.GetSettings)
		r.Put("/system/settings", systemH.UpdateSettings)

		r.Get("/templates", templateH.ListTemplates)
		r.Post("/templates", templateH.CreateTemplate)
		r.Get("/templates/{id}", templateH.GetTemplate)
		r.Put("/templates/{id}", templateH.UpdateTemplate)
		r.Delete("/templates/{id}", templateH.DeleteTemplate)
		r.With(mid.RequirePermission("system", "", "write")).Get("/system/backup", systemH.Backup)
		r.With(mid.RequirePermission("system", "", "write")).Post("/system/restore", systemH.Restore)
		r.With(mid.RequirePermission("system", "", "write")).Get("/system/sync/export", systemH.ExportSync)
		r.With(mid.RequirePermission("system", "", "write")).Post("/system/sync/import", systemH.ImportSync)
		r.With(mid.RequirePermission("system", "", "write")).Get("/system/aspose", attH.GetAsposeConfig)
		r.With(mid.RequirePermission("system", "", "write")).Put("/system/aspose", attH.UpdateAsposeConfig)

		r.Post("/ai/generate", aiH.Generate)
		r.Get("/integrations/issues", systemH.GetIntegrationIssue)
		r.Get("/integrations/issues/list", systemH.GetIntegrationIssueList)

		r.Route("/migration/confluence", func(r chi.Router) {
			r.Post("/import", migrationH.ImportConfluenceSpace)
			r.Post("/preview", migrationH.PreviewConfluenceSpace)
		})

		r.Route("/integrations/connections", func(r chi.Router) {
			integrationH.Mount(r)
		})
		r.Get("/tags", tagH.List)
		r.Post("/tags", tagH.Create)
		r.Get("/tags/document-associations", tagH.ListDocumentAssociations)
		r.Route("/tags/{id}", func(r chi.Router) {
			r.Put("/", tagH.Update)
			r.Delete("/", tagH.Delete)
		})

		r.Route("/documents", func(r chi.Router) {
			r.Get("/", docH.List)
			r.Get("/properties", docH.ListProperties)
			r.Get("/recent", docH.ListRecent)
			r.Get("/trash", docH.ListTrash)
			r.Get("/check-slug", docH.CheckSlug)
			r.Post("/", docH.Create)
			r.Post("/import", docH.Import)
			r.Route("/{id}", func(r chi.Router) {
				// Read routes
				r.Group(func(r chi.Router) {
					r.Use(readCheck)
					r.Get("/", docH.GetByID)
					r.Get("/capabilities", docH.Capabilities)
					r.Get("/export", docH.Export)
					r.Get("/analytics", docH.GetAnalytics)
					r.Get("/comments", commentH.List)
					r.Get("/attachments", attH.List)
					r.Get("/tags", tagH.GetDocumentTags)
					r.Get("/review", docH.GetReview)
					r.Get("/published", docH.GetPublished)
				})

				// Comment routes
				r.Group(func(r chi.Router) {
					r.Use(commentCheck)
					r.Post("/comments", commentH.Create)
				})

				// Write routes
				r.Group(func(r chi.Router) {
					r.Use(writeCheck)
					r.Put("/", docH.Update)
					r.Put("/move", docH.Move)
					r.Put("/review", docH.UpdateReview)
					r.Post("/publish", docH.Publish)
					r.Post("/restore", docH.Restore)
					r.Post("/autogen-summary", docH.AutogenSummary)
					r.Get("/versions", docH.GetVersions)
					r.Post("/versions", docH.CreateMilestone)
					r.Get("/versions/{versionId}", docH.GetVersion)
					r.Post("/versions/{versionId}/restore", docH.RestoreVersion)
					r.Post("/attachments", attH.Upload)
					r.Post("/tags/{tagId}", tagH.AddTagToDocument)
					r.Delete("/tags/{tagId}", tagH.RemoveTagFromDocument)
				})

				// Delete routes
				r.Group(func(r chi.Router) {
					r.Use(deleteCheck)
					r.Delete("/", docH.Delete)
				})

				// Permissions / Grant routes
				r.Group(func(r chi.Router) {
					r.Use(grantCheck)
					r.Get("/audit", systemH.GetAuditLogs)
					r.Get("/permissions", docH.GetPermissions)
					r.Post("/permissions/grants", docH.AddPermissionGrant)
					r.Delete("/permissions/grants/{grantId}", docH.DeletePermissionGrant)
					r.Put("/permissions/settings", docH.UpdatePermissionSettings)
					r.Post("/permissions/share-links", docH.CreateShareLink)
					r.Get("/permissions/share-links", docH.ListShareLinks)
					r.Delete("/permissions/share-links/{linkId}", docH.DeleteShareLink)
				})
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
