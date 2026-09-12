package postgres

import (
	"context"
	"crypto/sha256"
	"embed"
	_ "embed"
	"encoding/hex"
	"errors"
	"fmt"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed init.sql
var schemaSQL string

//go:embed seed.sql
var seedSQL string

//go:embed migrations/*.sql
var migrationFiles embed.FS

const baselineMigrationVersion = "0001"

type migration struct {
	version string
	sql     string
}

func registeredMigrations() ([]migration, error) {
	entries, err := migrationFiles.ReadDir("migrations")
	if err != nil {
		return nil, fmt.Errorf("read embedded migrations: %w", err)
	}
	migrations := []migration{{version: baselineMigrationVersion, sql: schemaSQL}}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		version, _, ok := strings.Cut(entry.Name(), "_")
		if !ok || version == "" {
			return nil, fmt.Errorf("migration %q must begin with a numeric version followed by an underscore", entry.Name())
		}
		sql, err := migrationFiles.ReadFile(filepath.Join("migrations", entry.Name()))
		if err != nil {
			return nil, fmt.Errorf("read migration %q: %w", entry.Name(), err)
		}
		migrations = append(migrations, migration{version: version, sql: string(sql)})
	}
	sort.Slice(migrations, func(i, j int) bool { return migrations[i].version < migrations[j].version })
	for i := 1; i < len(migrations); i++ {
		if migrations[i-1].version == migrations[i].version {
			return nil, fmt.Errorf("duplicate migration version %q", migrations[i].version)
		}
	}
	return migrations, nil
}

// Migrate applies each registered schema migration exactly once. The migration
// ledger makes schema evolution explicit and detects a changed migration before
// it can silently alter an already-deployed database.
func Migrate(ctx context.Context, db *pgxpool.Pool) error {
	conn, err := db.Acquire(ctx)
	if err != nil {
		return err
	}
	defer conn.Release()
	if _, err := conn.Exec(ctx, "SELECT pg_advisory_lock(73462001)"); err != nil {
		return err
	}
	defer func() { _, _ = conn.Exec(context.Background(), "SELECT pg_advisory_unlock(73462001)") }()

	if _, err := conn.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(64) PRIMARY KEY,
			checksum VARCHAR(64) NOT NULL,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`); err != nil {
		return fmt.Errorf("create migration ledger: %w", err)
	}

	migrations, err := registeredMigrations()
	if err != nil {
		return err
	}
	for _, migration := range migrations {
		checksumBytes := sha256.Sum256([]byte(migration.sql))
		checksum := hex.EncodeToString(checksumBytes[:])
		var appliedChecksum string
		err := conn.QueryRow(ctx, "SELECT checksum FROM schema_migrations WHERE version = $1", migration.version).Scan(&appliedChecksum)
		if err == nil {
			if appliedChecksum != checksum {
				return fmt.Errorf("migration %s checksum mismatch: deployed migrations are immutable", migration.version)
			}
			continue
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("read migration ledger: %w", err)
		}

		tx, err := conn.Begin(ctx)
		if err != nil {
			return fmt.Errorf("start migration %s: %w", migration.version, err)
		}
		if _, err := tx.Exec(ctx, migration.sql); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("apply migration %s: %w", migration.version, err)
		}
		if _, err := tx.Exec(ctx, "INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)", migration.version, checksum); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("record migration %s: %w", migration.version, err)
		}
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit migration %s: %w", migration.version, err)
		}
	}
	return nil
}

// InitSchema is retained for compatibility with existing callers. New code
// should call Migrate so startup never replays already-applied schema changes.
func InitSchema(ctx context.Context, db *pgxpool.Pool) error {
	return Migrate(ctx, db)
}

// InitSeeds executes the embedded database mock seeds SQL on the database connection pool.
func InitSeeds(ctx context.Context, db *pgxpool.Pool) error {
	_, err := db.Exec(ctx, seedSQL)
	return err
}
