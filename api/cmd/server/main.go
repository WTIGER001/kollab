package main

import (
	"bufio"
	"context"
	_ "embed"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	"kollab/api/internal/ai"
	attrepo "kollab/api/internal/attachment"
	commentrepo "kollab/api/internal/comment"
	docrepo "kollab/api/internal/document"
	apihttp "kollab/api/internal/http"
	"kollab/api/internal/http/handler"
	"kollab/api/internal/http/middleware"
	imgrepo "kollab/api/internal/image"
	integrationrepo "kollab/api/internal/integration"
	"kollab/api/internal/permissions"
	pgrepo "kollab/api/internal/postgres"
	"kollab/api/internal/storage"
	systemrepo "kollab/api/internal/system"
	tagrepo "kollab/api/internal/tag"
	teamrepo "kollab/api/internal/team"
	themerepo "kollab/api/internal/theme"
	userrepo "kollab/api/internal/user"
	"kollab/api/internal/ws"
)

func loadLocalEnv() {
	for _, filename := range []string{".env.local", ".local.env", ".env", "../.env.local", "../.local.env", "../.env"} {
		file, err := os.Open(filename)
		if err != nil {
			continue // Skip if file does not exist
		}
		defer file.Close()

		log.Printf("Loading environment variables from %s...", filename)
		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}

			parts := strings.SplitN(line, "=", 2)
			if len(parts) != 2 {
				continue
			}

			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])

			// Strip quotes if they exist around the value
			if len(val) >= 2 && ((val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'')) {
				val = val[1 : len(val)-1]
			}

			if key != "" && os.Getenv(key) == "" {
				if err := os.Setenv(key, val); err != nil {
					log.Printf("Failed to set env var %s: %v", key, err)
				}
			}
		}
		break // Only load the first one found (prefer .local.env over .env)
	}
}

func main() {
	loadLocalEnv()

	// Local identity is the first-run default. OIDC remains explicit so an
	// incomplete provider configuration never silently redirects sign-in.
	authMode := os.Getenv("AUTH_MODE")
	if authMode == "" {
		authMode = "local"
	}
	if authMode != "oidc" && authMode != "local" {
		log.Fatalf("AUTH_MODE must be either oidc or local")
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if authMode == "local" && len(jwtSecret) < 32 {
		log.Fatal("local authentication requires a JWT_SECRET of at least 32 bytes")
	}

	var db *pgxpool.Pool
	var pgContainer *postgres.PostgresContainer
	var err error

	dbURL := os.Getenv("DATABASE_URL")
	ctx := context.Background()

	if dbURL != "" {
		log.Println("Connecting to PostgreSQL database using DATABASE_URL...")
		db, err = pgxpool.New(ctx, dbURL)
		if err != nil {
			log.Fatalf("Failed to open database connection: %v", err)
		}
	} else {
		log.Println("DATABASE_URL not set. Initializing PostgreSQL container via testcontainers-go...")
		pgContainer, err = postgres.RunContainer(ctx,
			testcontainers.WithImage("pgvector/pgvector:pg16"),
			postgres.WithDatabase("kollab"),
			postgres.WithUsername("postgres"),
			postgres.WithPassword("postgres"),
			testcontainers.WithWaitStrategy(
				wait.ForLog("database system is ready to accept connections").
					WithOccurrence(2),
			),
		)
		if err != nil {
			log.Fatalf("Failed to start PostgreSQL testcontainer. Please make sure Docker daemon is running: %v", err)
		}

		connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
		if err != nil {
			log.Fatalf("Failed to get connection string: %v", err)
		}

		db, err = pgxpool.New(ctx, connStr)
		if err != nil {
			log.Fatalf("Failed to open connection to testcontainer database: %v", err)
		}
	}

	// Ping database to ensure connection is alive
	if err := db.Ping(ctx); err != nil {
		log.Fatalf("Failed to ping PostgreSQL database: %v", err)
	}
	log.Println("PostgreSQL connection established successfully.")

	// Initialize database schema
	if err := pgrepo.Migrate(ctx, db); err != nil {
		log.Fatalf("Failed to initialize database schema: %v", err)
	}
	log.Println("Database schema initialized successfully.")

	// Initialize permissions schema and standard roles
	if err := permissions.InitPermissions(ctx, db); err != nil {
		log.Fatalf("Failed to initialize permissions system: %v", err)
	}
	if bootstrapAdminID := os.Getenv("BOOTSTRAP_ADMIN_USER_ID"); bootstrapAdminID != "" {
		if err := permissions.Service.AssignRoleToUser(ctx, bootstrapAdminID, "builtin.admin", nil); err != nil {
			log.Fatalf("Failed to grant the configured bootstrap administrator: %v", err)
		}
		log.Printf("Granted system administrator role to configured bootstrap user %q", bootstrapAdminID)
	}
	log.Println("Permissions system initialized successfully.")

	evaluator := permissions.NewAccessEvaluator(db)

	// Determine if we should seed mock data
	shouldSeed := false
	if dbURL == "" {
		// Always seed testcontainer database
		shouldSeed = true
	} else if os.Getenv("SEED_MOCK_DATA") == "true" {
		// Seed real database if explicitly requested
		shouldSeed = true
	}

	if shouldSeed {
		log.Println("Seeding database with mock teams, projects, users, and documents...")
		if err := pgrepo.InitSeeds(ctx, db); err != nil {
			log.Fatalf("Failed to seed database: %v", err)
		}
		log.Println("Database seeded successfully.")

		log.Println("Seeding default permissions assignments...")
		permissions.SeedDefaultPermissions(ctx)
	}

	// Instantiate repositories with Postgres backend
	userRepo := pgrepo.NewPostgresUserRepository(db)
	teamRepo := pgrepo.NewPostgresTeamRepository(db)
	docRepo := pgrepo.NewPostgresDocumentRepository(db)
	imageRepo := pgrepo.NewPostgresImageRepository(db)
	libImageRepo := pgrepo.NewPostgresLibraryImageRepository(db)
	themeRepo := pgrepo.NewPostgresThemeRepository(db)
	systemRepo := pgrepo.NewPostgresSystemRepository(db)
	commentRepo := pgrepo.NewPostgresCommentRepository(db)
	attachmentRepo := pgrepo.NewPostgresAttachmentRepository(db)
	taskRepo := pgrepo.NewPostgresTaskRepository(db)
	tagRepo := pgrepo.NewPostgresTagRepository(db)
	templateRepo := pgrepo.NewPostgresTemplateRepository(db)

	storageProvider, err := storage.NewLocalStorage("./uploads")
	if err != nil {
		log.Fatalf("Failed to initialize storage provider: %v", err)
	}

	// Instantiate services
	authService := userrepo.NewAuthService(userRepo, jwtSecret)
	localSetupRequired := "false"
	if authMode == "local" {
		users, err := authService.ListLocalUsers(ctx)
		if err != nil {
			log.Fatalf("Failed to inspect local users: %v", err)
		}
		if len(users) == 0 {
			localSetupRequired = "true"
			log.Println("No users found; first browser to connect will be prompted to create the administrator")
		}
	}
	teamService := teamrepo.NewTeamService(teamRepo)
	systemService := systemrepo.NewSystemService(systemRepo)
	docService := docrepo.NewDocumentService(docRepo, systemService, taskRepo, teamRepo)
	imageService := imgrepo.NewImageService(imageRepo, storageProvider)
	libImageService := imgrepo.NewLibraryImageService(libImageRepo, imageService)
	themeService := themerepo.NewThemeService(themeRepo)
	commentService := commentrepo.NewCommentService(commentRepo)
	attachmentService := attrepo.NewAttachmentService(attachmentRepo, storageProvider)
	tagService := tagrepo.NewTagService(tagRepo)

	// Run initial partition setup
	if err := systemService.EnsurePartitions(ctx); err != nil {
		log.Printf("Failed to run initial partition setup: %v", err)
	}

	// Start daily system cleanup worker
	systemService.StartCleanupWorker(ctx, 24*time.Hour)

	// Load OIDC config. No hosted-provider defaults are used so a deployment
	// cannot accidentally authenticate against the wrong tenant.
	oidcConfig := map[string]string{
		"authority":          os.Getenv("OIDC_AUTHORITY"),
		"clientId":           os.Getenv("OIDC_CLIENT_ID"),
		"redirectUri":        os.Getenv("OIDC_REDIRECT_URI"),
		"authMode":           authMode,
		"localSetupRequired": localSetupRequired,
	}
	if authMode == "oidc" && (oidcConfig["authority"] == "" || oidcConfig["clientId"] == "" || oidcConfig["redirectUri"] == "") {
		log.Fatal("OIDC_AUTHORITY, OIDC_CLIENT_ID, and OIDC_REDIRECT_URI are required in OIDC mode")
	}
	if authMode == "local" {
		oidcConfig["authority"] = "mock"
		oidcConfig["clientId"] = "mock-client-id"
		oidcConfig["redirectUri"] = "http://localhost:5173"
	}

	// Instantiate WebSocket Hub
	wsHub := ws.NewHub(docService)
	go wsHub.Run()

	// Instantiate handlers
	userHandler := handler.NewUserHandler(authService, themeService, systemService, oidcConfig)
	teamHandler := handler.NewTeamHandler(teamService)
	docHandler := handler.NewDocumentHandler(docService, wsHub, db, evaluator)
	imageHandler := handler.NewImageHandler(imageService)
	libImageHandler := handler.NewLibraryImageHandler(libImageService)
	themeHandler := handler.NewThemeHandler(themeService)
	systemHandler := handler.NewSystemHandler(systemService, attachmentService)
	commentHandler := handler.NewCommentHandler(commentService, userRepo)
	attachmentHandler := handler.NewAttachmentHandler(attachmentService, evaluator)
	tagHandler := handler.NewTagHandler(tagService)
	templateHandler := handler.NewTemplateHandler(templateRepo)

	integrationRepo := pgrepo.NewIntegrationRepository(db)
	integrationService := integrationrepo.NewService(integrationRepo)
	integrationHandler := handler.NewIntegrationHandler(integrationService)

	aiClient := ai.NewLLMClient()
	aiHandler := handler.NewAIHandler(systemService, aiClient)

	// Discover the provider metadata once at startup. This binds token
	// validation to the provider's declared issuer and rotating JWKS endpoint.
	var jwksCache *middleware.JWKSCache
	if authMode == "oidc" {
		jwksCache, err = middleware.NewOIDCJWKSCache(ctx, oidcConfig["authority"], oidcConfig["clientId"])
		if err != nil {
			log.Fatalf("OIDC configuration is invalid: %v", err)
		}
	}
	wsHandler := handler.NewWSHandler([]byte(jwtSecret), jwksCache, wsHub, evaluator)
	r := apihttp.NewRouter([]byte(jwtSecret), jwksCache, userRepo, userHandler, teamHandler, docHandler, imageHandler, libImageHandler, themeHandler, wsHandler, systemHandler, commentHandler, attachmentHandler, aiHandler, tagHandler, templateHandler, integrationHandler, evaluator)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Channel to capture termination signals for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	go func() {
		log.Printf("Starting Server on port %s...", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Block until signal is received
	<-sigChan
	log.Println("Shutting down server gracefully...")

	// Graceful HTTP shutdown (5s timeout)
	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelShutdown()
	_ = srv.Shutdown(shutdownCtx)
	db.Close()

	// Terminate container if running
	if pgContainer != nil {
		log.Println("Terminating Postgres testcontainer...")
		termCtx, cancelTerm := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancelTerm()
		if err := pgContainer.Terminate(termCtx); err != nil {
			log.Printf("Failed to terminate container: %v", err)
		} else {
			log.Println("Postgres testcontainer terminated successfully.")
		}
	}
	log.Println("Server shutdown complete.")
}
