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

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	"github.com/jackc/pgx/v5/pgxpool"

	apihttp "arkollab/api/internal/http"
	"arkollab/api/internal/http/handler"
	"arkollab/api/internal/http/middleware"
	pgrepo "arkollab/api/internal/postgres"
	teamrepo "arkollab/api/internal/team"
	themerepo "arkollab/api/internal/theme"
	userrepo "arkollab/api/internal/user"
	docrepo "arkollab/api/internal/document"
	imgrepo "arkollab/api/internal/image"
	systemrepo "arkollab/api/internal/system"
	commentrepo "arkollab/api/internal/comment"
	attrepo "arkollab/api/internal/attachment"
	"arkollab/api/internal/storage"
	"arkollab/api/internal/ws"
)

func loadLocalEnv() {
	for _, filename := range []string{".local.env", ".env"} {
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

	// Retrieve secret key from environment, fallback to development default
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "arkollab-dev-secret-key-change-in-production"
		log.Println("WARNING: JWT_SECRET environment variable not set. Using development default.")
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
			postgres.WithDatabase("arkollab"),
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

	// Initialize database schema and seeds
	if err := pgrepo.InitSchema(ctx, db); err != nil {
		log.Fatalf("Failed to initialize database schema: %v", err)
	}
	log.Println("Database schema initialized and seeded successfully.")

	// Instantiate repositories with Postgres backend
	userRepo := pgrepo.NewPostgresUserRepository(db)
	teamRepo := pgrepo.NewPostgresTeamRepository(db)
	docRepo := pgrepo.NewPostgresDocumentRepository(db)
	imageRepo := pgrepo.NewPostgresImageRepository(db)
	themeRepo := pgrepo.NewPostgresThemeRepository(db)
	systemRepo := pgrepo.NewPostgresSystemRepository(db)
	commentRepo := pgrepo.NewPostgresCommentRepository(db)
	attachmentRepo := pgrepo.NewPostgresAttachmentRepository(db)
	taskRepo := pgrepo.NewPostgresTaskRepository(db)

	storageProvider, err := storage.NewLocalStorage("./uploads")
	if err != nil {
		log.Fatalf("Failed to initialize storage provider: %v", err)
	}

	// Instantiate services
	authService := userrepo.NewAuthService(userRepo, jwtSecret)
	teamService := teamrepo.NewTeamService(teamRepo)
	systemService := systemrepo.NewSystemService(systemRepo)
	docService := docrepo.NewDocumentService(docRepo, systemService, taskRepo)
	imageService := imgrepo.NewImageService(imageRepo, storageProvider)
	themeService := themerepo.NewThemeService(themeRepo)
	commentService := commentrepo.NewCommentService(commentRepo)
	attachmentService := attrepo.NewAttachmentService(attachmentRepo, storageProvider)

	// Run initial partition setup
	if err := systemService.EnsurePartitions(ctx); err != nil {
		log.Printf("Failed to run initial partition setup: %v", err)
	}

	// Start daily system cleanup worker
	systemService.StartCleanupWorker(ctx, 24*time.Hour)

	// Load OIDC config from environment, fallback to defaults
	oidcConfig := map[string]string{
		"authority":   os.Getenv("OIDC_AUTHORITY"),
		"clientId":    os.Getenv("OIDC_CLIENT_ID"),
		"redirectUri": os.Getenv("OIDC_REDIRECT_URI"),
	}
	if oidcConfig["authority"] == "" {
		oidcConfig["authority"] = "https://h20g6c.logto.app/oidc"
	}
	if oidcConfig["clientId"] == "" {
		oidcConfig["clientId"] = "ckjs7u46o27bhrf0jepzg"
	}
	if oidcConfig["redirectUri"] == "" {
		oidcConfig["redirectUri"] = "http://localhost:5173"
	}

	// Instantiate WebSocket Hub
	wsHub := ws.NewHub(docService)
	go wsHub.Run()

	// Instantiate handlers
	userHandler := handler.NewUserHandler(authService, themeService, oidcConfig)
	teamHandler := handler.NewTeamHandler(teamService)
	docHandler := handler.NewDocumentHandler(docService)
	imageHandler := handler.NewImageHandler(imageService)
	themeHandler := handler.NewThemeHandler(themeService)
	systemHandler := handler.NewSystemHandler(systemService)
	commentHandler := handler.NewCommentHandler(commentService, userRepo)
	attachmentHandler := handler.NewAttachmentHandler(attachmentService)
	// Configure router with JWKS cache
	jwksURL := oidcConfig["authority"] + "/jwks"
	jwksCache := middleware.NewJWKSCache(jwksURL)
	wsHandler := handler.NewWSHandler([]byte(jwtSecret), jwksCache, wsHub)
	r := apihttp.NewRouter([]byte(jwtSecret), jwksCache, userRepo, userHandler, teamHandler, docHandler, imageHandler, themeHandler, wsHandler, systemHandler, commentHandler, attachmentHandler)

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
