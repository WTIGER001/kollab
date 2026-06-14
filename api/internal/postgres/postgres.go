package postgres

import (
	"context"
	_ "embed"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed init.sql
var schemaSQL string

// InitSchema executes the embedded database schema SQL on the database connection pool.
func InitSchema(ctx context.Context, db *pgxpool.Pool) error {
	_, err := db.Exec(ctx, schemaSQL)
	return err
}
