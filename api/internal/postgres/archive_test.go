package postgres

import (
	"encoding/json"
	"github.com/google/uuid"
	"testing"
)

func TestDatabaseArchiveRoundTripAndRollback(t *testing.T) {
	db, ctx := setupTestDB(t)
	repo := NewPostgresSystemRepository(db)
	if _, err := db.Exec(ctx, `INSERT INTO document_watches(user_id,document_id) SELECT 'mock-user-id',id FROM documents LIMIT 1`); err != nil {
		t.Fatal(err)
	}
	before, err := repo.ExportBackup(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := before["document_versions"]; !ok {
		t.Fatal("backup omits version history")
	}
	if _, ok := before["attachments"]; !ok {
		t.Fatal("backup omits attachment metadata")
	}
	// JSON round trip reproduces the public archive transport.
	raw, err := json.Marshal(before)
	if err != nil {
		t.Fatal(err)
	}
	var snapshot map[string]interface{}
	if err = json.Unmarshal(raw, &snapshot); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(ctx, "UPDATE teams SET name='changed'"); err != nil {
		t.Fatal(err)
	}
	if err = repo.RestoreBackup(ctx, snapshot); err != nil {
		t.Fatal(err)
	}
	after, err := repo.ExportBackup(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for _, table := range []string{"teams", "documents", "document_watches", "schema_migrations"} {
		a, _ := json.Marshal(before[table])
		b, _ := json.Marshal(after[table])
		var av, bv interface{}
		json.Unmarshal(a, &av)
		json.Unmarshal(b, &bv)
		a, _ = json.Marshal(av)
		b, _ = json.Marshal(bv)
		if string(a) != string(b) {
			t.Errorf("table %s differs after restore", table)
		}
	}
	delete(snapshot, "attachments")
	if err = repo.RestoreBackup(ctx, snapshot); err == nil {
		t.Fatal("partial backup accepted")
	}
	var count int
	if err = db.QueryRow(ctx, "SELECT count(*) FROM teams").Scan(&count); err != nil || count == 0 {
		t.Fatal("failed restore destroyed data")
	}
	// A failure after TRUNCATE must roll the entire transaction back.
	json.Unmarshal(raw, &snapshot)
	snapshot["documents"] = []map[string]interface{}{{"id": "invalid-document", "team_id": "missing-team", "title": "Invalid"}}
	if err = repo.RestoreBackup(ctx, snapshot); err == nil {
		t.Fatal("invalid foreign key accepted")
	}
	if err = db.QueryRow(ctx, "SELECT count(*) FROM teams").Scan(&count); err != nil || count == 0 {
		t.Fatal("SQL failure destroyed original data")
	}
}

func TestSyncReplayIsAtomicAndIdempotent(t *testing.T) {
	db, ctx := setupTestDB(t)
	repo := NewPostgresSystemRepository(db)
	row := map[string]interface{}{"id": "sync-team", "name": "Synced", "abbreviation": "synced", "description": "", "logo_url": ""}
	source := uuid.NewString()
	ops := []map[string]interface{}{{"table_name": "teams", "action": "INSERT", "row_data": row, "record_key": `{"id": "sync-team"}`, "event_id": uuid.NewString(), "source_id": source, "clock": map[string]int64{source: 1}}}
	for i := 0; i < 2; i++ {
		if err := repo.ApplySyncOperations(ctx, ops); err != nil {
			t.Fatal(err)
		}
	}
	var count int
	if err := db.QueryRow(ctx, "SELECT count(*) FROM teams WHERE id='sync-team'").Scan(&count); err != nil || count != 1 {
		t.Fatal("replay was not idempotent")
	}
	bad := append(ops, map[string]interface{}{"table_name": "schema_migrations", "action": "DELETE", "row_data": map[string]string{"version": "0001"}})
	row["name"] = "Must roll back"
	ops[0]["clock"] = map[string]int64{source: 2}
	if err := repo.ApplySyncOperations(ctx, bad); err == nil {
		t.Fatal("protected sync table accepted")
	}
	var name string
	if err := db.QueryRow(ctx, "SELECT name FROM teams WHERE id='sync-team'").Scan(&name); err != nil || name != "Synced" {
		t.Fatal("failed replay was not atomic")
	}
	ops[0]["action"] = "DELETE"
	ops[0]["clock"] = map[string]int64{source: 3}
	if err := repo.ApplySyncOperations(ctx, ops); err != nil {
		t.Fatal(err)
	}
}
