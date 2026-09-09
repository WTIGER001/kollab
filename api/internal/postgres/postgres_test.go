package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	"kollab/api/internal/domain"
)

func setupTestDB(t *testing.T) (*pgxpool.Pool, context.Context) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	ctx := context.Background()

	// Start PostgreSQL container via testcontainers-go
	pgContainer, err := postgres.RunContainer(ctx,
		testcontainers.WithImage("pgvector/pgvector:pg16"),
		postgres.WithDatabase("kollab_test"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("postgres"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2),
		),
	)
	if err != nil {
		t.Fatalf("failed to start postgres testcontainer: %v", err)
	}

	t.Cleanup(func() {
		if err := pgContainer.Terminate(ctx); err != nil {
			t.Errorf("failed to terminate container: %v", err)
		}
	})

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("failed to get connection string: %v", err)
	}

	db, err := pgxpool.New(ctx, connStr)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}

	t.Cleanup(func() {
		db.Close()
	})

	// Initialize schema & seed database
	if err := InitSchema(ctx, db); err != nil {
		t.Fatalf("failed to initialize schema: %v", err)
	}
	if err := InitSeeds(ctx, db); err != nil {
		t.Fatalf("failed to seed database: %v", err)
	}

	return db, ctx
}

func TestMigrateRecordsBaselineAndIsIdempotent(t *testing.T) {
	db, ctx := setupTestDB(t)

	if err := Migrate(ctx, db); err != nil {
		t.Fatalf("second migration run failed: %v", err)
	}

	var applied int
	if err := db.QueryRow(ctx, "SELECT COUNT(*) FROM schema_migrations").Scan(&applied); err != nil {
		t.Fatalf("read migration ledger: %v", err)
	}
	migrations, err := registeredMigrations()
	if err != nil {
		t.Fatalf("load registered migrations: %v", err)
	}
	if applied != len(migrations) {
		t.Fatalf("expected %d migration records, got %d", len(migrations), applied)
	}
}

func TestPostgresUserRepository(t *testing.T) {
	db, ctx := setupTestDB(t)
	repo := NewPostgresUserRepository(db)

	// Test GetByUsername (seed user)
	dev, err := repo.GetByUsername(ctx, "sh4ag0cxowti")
	if err != nil {
		t.Fatalf("expected to get seed user, got %v", err)
	}
	if dev.Username != "sh4ag0cxowti" {
		t.Errorf("expected username sh4ag0cxowti, got %s", dev.Username)
	}

	// Test Create
	newUser := &domain.User{
		ID:           "new_user",
		Username:     "newuser",
		PasswordHash: "hash",
	}
	if err := repo.Create(ctx, newUser); err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	// Verify Create
	fetched, err := repo.GetByUsername(ctx, "newuser")
	if err != nil {
		t.Fatalf("failed to get new user: %v", err)
	}
	if fetched.ID != "new_user" {
		t.Errorf("expected new_user, got %s", fetched.ID)
	}
}

func TestPostgresTeamRepository(t *testing.T) {
	db, ctx := setupTestDB(t)
	repo := NewPostgresTeamRepository(db)

	// Get seed team
	teams, err := repo.GetTeamsByUserID(ctx, "sh4ag0cxowti")
	if err != nil {
		t.Fatalf("failed to get teams by user id: %v", err)
	}
	if len(teams) == 0 {
		t.Error("expected at least 1 team for seed user")
	}

	// Get Projects
	projects, err := repo.GetProjectsByTeamID(ctx, "team_arkloud")
	if err != nil {
		t.Fatalf("failed to get projects for arkloud team: %v", err)
	}
	if len(projects) == 0 {
		t.Error("expected at least 1 project for arkloud team")
	}
}

func TestPostgresDocumentRepository(t *testing.T) {
	db, ctx := setupTestDB(t)
	repo := NewPostgresDocumentRepository(db)

	if err := repo.AddWatch(ctx, "sh4ag0cxowti", "doc_welcome_eng"); err != nil {
		t.Fatalf("add document watch: %v", err)
	}
	isWatching, err := repo.IsWatching(ctx, "sh4ag0cxowti", "doc_welcome_eng")
	if err != nil || !isWatching {
		t.Fatalf("expected persisted watch, got %t (%v)", isWatching, err)
	}
	if err := repo.RemoveWatch(ctx, "sh4ag0cxowti", "doc_welcome_eng"); err != nil {
		t.Fatalf("remove document watch: %v", err)
	}
	isWatching, err = repo.IsWatching(ctx, "sh4ag0cxowti", "doc_welcome_eng")
	if err != nil || isWatching {
		t.Fatalf("expected removed watch, got %t (%v)", isWatching, err)
	}
	nextReview := time.Now().Add(24 * time.Hour)
	if err := repo.SaveReview(ctx, &domain.DocumentReview{DocumentID: "doc_welcome_eng", Status: "in_review", NextReviewAt: &nextReview, UpdatedByID: "sh4ag0cxowti", UpdatedAt: time.Now()}); err != nil {
		t.Fatalf("save document review: %v", err)
	}
	review, err := repo.GetReview(ctx, "doc_welcome_eng")
	if err != nil || review.Status != "in_review" || review.NextReviewAt == nil {
		t.Fatalf("expected persisted review, got %#v (%v)", review, err)
	}
	importRecord := &domain.ConfluenceImportRecord{
		ArchiveSHA256: "0123456789012345678901234567890123456789012345678901234567890123",
		SourcePath:    "docs/overview.xhtml",
		TeamID:        "team_eng",
		DocumentID:    "doc_welcome_eng",
		CreatedAt:     time.Now(),
	}
	if err := repo.RecordConfluenceImport(ctx, importRecord); err != nil {
		t.Fatalf("record confluence import: %v", err)
	}
	foundImport, err := repo.FindConfluenceImport(ctx, importRecord.ArchiveSHA256, importRecord.SourcePath, importRecord.TeamID, importRecord.ProjectID)
	if err != nil || foundImport == nil || foundImport.DocumentID != importRecord.DocumentID {
		t.Fatalf("expected persisted import record, got %#v (%v)", foundImport, err)
	}
	notification := &domain.DocumentNotification{ID: "notification-1", UserID: "sh4ag0cxowti", ActorID: "sh4ag0cxowti", DocumentID: "doc_welcome_eng", DocumentTitle: "Welcome", EventType: "document_updated", CreatedAt: time.Now()}
	if err := repo.CreateNotification(ctx, notification); err != nil {
		t.Fatalf("create notification: %v", err)
	}
	notifications, err := repo.ListNotifications(ctx, "sh4ag0cxowti")
	if err != nil || len(notifications) != 1 || notifications[0].ID != notification.ID {
		t.Fatalf("expected persisted notification, got %#v (%v)", notifications, err)
	}
	if err := repo.MarkNotificationRead(ctx, "sh4ag0cxowti", notification.ID); err != nil {
		t.Fatalf("mark notification read: %v", err)
	}
	notifications, _ = repo.ListNotifications(ctx, "sh4ag0cxowti")
	if !notifications[0].IsRead {
		t.Fatal("expected notification to be marked read")
	}

	// Get seed documents by project
	docs, err := repo.GetByProjectID(ctx, "proj_wiki")
	if err != nil {
		t.Fatalf("failed to get docs by project: %v", err)
	}
	if len(docs) == 0 {
		t.Error("expected docs for proj_wiki")
	}

	// Create document
	doc := &domain.Document{
		ID:          "new_doc",
		Title:       "New Doc",
		Slug:        "new-doc",
		ProjectID:   "proj_wiki",
		TeamID:      "team_eng",
		CreatedByID: "sh4ag0cxowti",
		UpdatedByID: "sh4ag0cxowti",
		Content:     "{}",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := repo.Create(ctx, doc); err != nil {
		t.Fatalf("failed to create doc: %v", err)
	}

	// Get by slug
	fetched, _, err := repo.GetByIDOrSlug(ctx, "new-doc")
	if err != nil {
		t.Fatalf("failed to get doc by slug: %v", err)
	}
	if fetched.ID != "new_doc" {
		t.Errorf("expected new_doc, got %s", fetched.ID)
	}
}
