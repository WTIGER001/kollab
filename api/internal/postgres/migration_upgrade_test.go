package postgres

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"strings"
	"testing"
)

func TestUpgradeOriginalSyncMigrationPreservesWorkspace(t *testing.T) {
	db, ctx := setupTestDB(t)
	original, err := os.ReadFile("testdata/0015_original.sql")
	if err != nil {
		t.Fatal(err)
	}
	digest := sha256.Sum256(original)
	legacyChecksum := hex.EncodeToString(digest[:])
	if legacyChecksum != "743ba887ea3b6a7cbf1ce8f55d8f324e2cd0a1f68b7e3b2e614fa770c0ce3b4d" {
		t.Fatal("legacy fixture does not match the deployed bytes")
	}
	var originalTeams, originalPages int
	if err = db.QueryRow(ctx, "SELECT (SELECT count(*) FROM teams),(SELECT count(*) FROM documents)").Scan(&originalTeams, &originalPages); err != nil {
		t.Fatal(err)
	}
	// Simulate the original deployed functions and ledger, retaining real data.
	funcs := string(original[strings.Index(string(original), "CREATE FUNCTION replication_key"):])
	funcs = strings.ReplaceAll(funcs, "CREATE FUNCTION ", "CREATE OR REPLACE FUNCTION ")
	if _, err = db.Exec(ctx, funcs); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(ctx, "DELETE FROM schema_migrations WHERE version='0016'; UPDATE schema_migrations SET checksum='"+legacyChecksum+"' WHERE version='0015'"); err != nil {
		t.Fatal(err)
	}
	if err = Migrate(ctx, db); err != nil {
		t.Fatal(err)
	}
	if err = Migrate(ctx, db); err != nil {
		t.Fatalf("upgrade is not idempotent: %v", err)
	}
	var teams, pages int
	if err = db.QueryRow(ctx, "SELECT (SELECT count(*) FROM teams),(SELECT count(*) FROM documents)").Scan(&teams, &pages); err != nil || teams != originalTeams || pages != originalPages {
		t.Fatal("upgrade changed workspace records")
	}
	var key string
	if err = db.QueryRow(ctx, `SELECT replication_key('principal_roles','{"id":1,"sync_id":"portable-id"}'::jsonb)`).Scan(&key); err != nil || !strings.Contains(key, "portable-id") {
		t.Fatalf("functions not upgraded: %s %v", key, err)
	}
	var checksum string
	if err = db.QueryRow(ctx, "SELECT checksum FROM schema_migrations WHERE version='0015'").Scan(&checksum); err != nil || checksum != "72ff756738e65937330506c950369d09c1c41a7830df63cffa628d5d1233de5e" {
		t.Fatal("ledger not canonicalized")
	}
	// A random mismatch must continue to block startup.
	if _, err = db.Exec(ctx, "UPDATE schema_migrations SET checksum='unknown' WHERE version='0015'"); err != nil {
		t.Fatal(err)
	}
	if err = Migrate(ctx, db); err == nil || !strings.Contains(err.Error(), "checksum mismatch") {
		t.Fatal("unknown checksum accepted")
	}
}
