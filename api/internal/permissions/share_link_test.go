package permissions

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	"golang.org/x/crypto/bcrypt"
)

func TestEvaluateShareLinkAuthorizationRules(t *testing.T) {
	ctx := context.Background()
	if err := InitPermissions(ctx, nil); err != nil {
		t.Fatalf("initialize permissions: %v", err)
	}
	container, err := postgres.RunContainer(ctx,
		testcontainers.WithImage("pgvector/pgvector:pg16"),
		postgres.WithDatabase("kollab_permissions_test"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("postgres"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").WithOccurrence(2),
		),
	)
	if err != nil {
		t.Fatalf("start PostgreSQL container: %v", err)
	}
	t.Cleanup(func() { _ = container.Terminate(context.Background()) })
	connectionString, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("get PostgreSQL connection string: %v", err)
	}
	db, err := pgxpool.New(ctx, connectionString)
	if err != nil {
		t.Fatalf("connect to PostgreSQL: %v", err)
	}
	t.Cleanup(db.Close)
	if _, err := db.Exec(ctx, `CREATE TABLE sharing_links (
		token_hash TEXT PRIMARY KEY,
		document_id TEXT NOT NULL,
		role_id TEXT NOT NULL,
		scope TEXT NOT NULL,
		password_hash TEXT,
		expires_at TIMESTAMPTZ
	)`); err != nil {
		t.Fatalf("create sharing_links table: %v", err)
	}

	insertLink := func(token, documentID, roleID, scope string, passwordHash *string, expiresAt *time.Time) {
		hash := sha256.Sum256([]byte(token))
		if _, err := db.Exec(ctx,
			`INSERT INTO sharing_links (token_hash, document_id, role_id, scope, password_hash, expires_at) VALUES ($1, $2, $3, $4, $5, $6)`,
			hex.EncodeToString(hash[:]), documentID, roleID, scope, passwordHash, expiresAt,
		); err != nil {
			t.Fatalf("insert sharing link: %v", err)
		}
	}

	insertLink("viewer-token", "document-1", "builtin.wiki.document.viewer", "anonymous", nil, nil)
	expired := time.Now().Add(-time.Hour)
	insertLink("expired-token", "document-1", "builtin.wiki.document.editor", "anonymous", nil, &expired)
	insertLink("organization-token", "document-1", "builtin.wiki.document.viewer", "organization", nil, nil)
	passwordHash, err := bcrypt.GenerateFromPassword([]byte("correct password"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash share password: %v", err)
	}
	password := string(passwordHash)
	insertLink("password-token", "document-1", "builtin.wiki.document.editor", "anonymous", &password, nil)

	evaluator := NewAccessEvaluator(db)
	allowed, reason, err := evaluator.evaluateShareLink(ctx, "", "document-1", DocumentPermissions.Read.ID(), "viewer-token", "")
	if err != nil || !allowed || reason != "Sharing link authorization allowed" {
		t.Fatalf("expected viewer read access, got allowed=%t reason=%q err=%v", allowed, reason, err)
	}
	if allowed, _, err := evaluator.evaluateShareLink(ctx, "", "document-1", DocumentPermissions.Write.ID(), "viewer-token", ""); err != nil || allowed {
		t.Fatalf("viewer was granted write access: allowed=%t err=%v", allowed, err)
	}
	if allowed, _, err := evaluator.evaluateShareLink(ctx, "", "different-document", DocumentPermissions.Read.ID(), "viewer-token", ""); err != nil || allowed {
		t.Fatalf("token was accepted for another document: allowed=%t err=%v", allowed, err)
	}
	if allowed, _, err := evaluator.evaluateShareLink(ctx, "", "document-1", DocumentPermissions.Read.ID(), "expired-token", ""); err != nil || allowed {
		t.Fatalf("expired token was accepted: allowed=%t err=%v", allowed, err)
	}
	if allowed, _, err := evaluator.evaluateShareLink(ctx, "", "document-1", DocumentPermissions.Read.ID(), "organization-token", ""); err != nil || allowed {
		t.Fatalf("anonymous organization token was accepted: allowed=%t err=%v", allowed, err)
	}
	if allowed, _, err := evaluator.evaluateShareLink(ctx, "user-1", "document-1", DocumentPermissions.Write.ID(), "password-token", "wrong password"); err == nil || allowed {
		t.Fatalf("incorrect share password was accepted: allowed=%t err=%v", allowed, err)
	}
	if allowed, _, err := evaluator.evaluateShareLink(ctx, "user-1", "document-1", DocumentPermissions.Write.ID(), "password-token", "correct password"); err != nil || !allowed {
		t.Fatalf("correct password and editor role were rejected: allowed=%t err=%v", allowed, err)
	}
	if allowed, _, err := evaluator.evaluateShareLink(ctx, "", "document-1", DocumentPermissions.Read.ID(), "missing-token", ""); err != nil || allowed {
		t.Fatalf("missing token was accepted: allowed=%t err=%v", allowed, err)
	}
}
