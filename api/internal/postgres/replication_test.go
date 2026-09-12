package postgres

import (
	"encoding/json"
	"errors"
	"kollab/api/internal/domain"
	"kollab/api/internal/permissions"
	"testing"
)

func TestBidirectionalSyncPreservesConcurrentWork(t *testing.T) {
	a, ctx := setupTestDB(t)
	b, _ := setupTestDB(t)
	if err := permissions.InitPermissions(ctx, a); err != nil {
		t.Fatal(err)
	}
	if err := permissions.InitPermissions(ctx, b); err != nil {
		t.Fatal(err)
	}
	if err := EnableSyncTracking(ctx, a); err != nil {
		t.Fatal(err)
	}
	if err := EnableSyncTracking(ctx, b); err != nil {
		t.Fatal(err)
	}
	ar, br := NewPostgresSystemRepository(a), NewPostgresSystemRepository(b)
	// A cloned initial workspace keeps causal history but gets a fresh identity.
	backup, err := ar.ExportBackup(ctx)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(backup)
	var copy map[string]interface{}
	json.Unmarshal(raw, &copy)
	if err = br.RestoreBackup(ctx, copy); err != nil {
		t.Fatal(err)
	}
	var an, bn string
	a.QueryRow(ctx, "SELECT node_id FROM replication_identity").Scan(&an)
	b.QueryRow(ctx, "SELECT node_id FROM replication_identity").Scan(&bn)
	if an == bn || an == "" || bn == "" {
		t.Fatal("cloned nodes share identity")
	}
	if _, found := backup["cluster_control"]; found {
		t.Fatal("cluster credentials exported")
	}
	export := func(r *PostgresSystemRepository) []map[string]interface{} {
		t.Helper()
		ops, e := r.GetSyncOperations(ctx, 0)
		if e != nil {
			t.Fatal(e)
		}
		return ops
	}
	apply := func(r *PostgresSystemRepository, ops []map[string]interface{}) {
		t.Helper()
		if e := r.ApplySyncOperations(ctx, ops); e != nil {
			t.Fatal(e)
		}
	}
	if _, err = a.Exec(ctx, "INSERT INTO teams(id,name,abbreviation) VALUES('from-a','A','from-a')"); err != nil {
		t.Fatal(err)
	}
	if _, err = b.Exec(ctx, "INSERT INTO teams(id,name,abbreviation) VALUES('from-b','B','from-b')"); err != nil {
		t.Fatal(err)
	}
	apply(br, export(ar))
	apply(ar, export(br))
	// Numeric permission IDs are installation-local. Both nodes can allocate the
	// same number independently without overwriting an unrelated authorization.
	if _, err = a.Exec(ctx, "INSERT INTO principal_roles(principal_kind,principal_id,role_id) VALUES('user','from-a-user','builtin.admin')"); err != nil {
		t.Fatal(err)
	}
	if _, err = b.Exec(ctx, "INSERT INTO principal_roles(principal_kind,principal_id,role_id) VALUES('user','from-b-user','builtin.admin')"); err != nil {
		t.Fatal(err)
	}
	apply(br, export(ar))
	apply(ar, export(br))
	var assignments int
	if err = a.QueryRow(ctx, "SELECT count(*) FROM principal_roles WHERE principal_id IN ('from-a-user','from-b-user')").Scan(&assignments); err != nil || assignments != 2 {
		t.Fatal("permission ID collision lost assignments", err)
	}
	old := export(ar)
	if _, err = a.Exec(ctx, "UPDATE teams SET name='A edit' WHERE id='from-a'"); err != nil {
		t.Fatal(err)
	}
	if _, err = b.Exec(ctx, "UPDATE teams SET name='B edit' WHERE id='from-a'"); err != nil {
		t.Fatal(err)
	}
	incoming := export(ar)
	var conflict *domain.SyncConflictError
	if err = br.ApplySyncOperations(ctx, incoming); !errors.As(err, &conflict) {
		t.Fatalf("expected reviewed conflict: %v", err)
	}
	var name string
	b.QueryRow(ctx, "SELECT name FROM teams WHERE id='from-a'").Scan(&name)
	if name != "B edit" {
		t.Fatal("unresolved import changed data")
	}
	for _, op := range incoming {
		op["resolutions"] = map[string]string{conflict.Conflict.ID: "use-incoming"}
	}
	apply(br, incoming)
	apply(ar, export(br))
	apply(br, export(ar))
	apply(br, old)
	b.QueryRow(ctx, "SELECT name FROM teams WHERE id='from-a'").Scan(&name)
	if name != "A edit" {
		t.Fatal("old package undid resolution")
	}
	var count int
	b.QueryRow(ctx, "SELECT count(*) FROM replication_conflicts WHERE table_name='teams'").Scan(&count)
	if count != 1 {
		t.Fatalf("conflict journal count=%d", count)
	}
	// Deletion tombstones prevent a late package from resurrecting removed data.
	if _, err = a.Exec(ctx, "DELETE FROM teams WHERE id='from-a'"); err != nil {
		t.Fatal(err)
	}
	apply(br, export(ar))
	apply(br, old)
	b.QueryRow(ctx, "SELECT count(*) FROM teams WHERE id='from-a'").Scan(&count)
	if count != 0 {
		t.Fatal("late package resurrected deletion")
	}
	// Repeated updates occupy one replication state; cursor still advances.
	var before, after int64
	a.QueryRow(ctx, "SELECT max(id) FROM replication_events").Scan(&before)
	if _, err = a.Exec(ctx, "UPDATE teams SET name='one' WHERE id='from-b'; UPDATE teams SET name='two' WHERE id='from-b'"); err != nil {
		t.Fatal(err)
	}
	a.QueryRow(ctx, "SELECT max(id) FROM replication_events").Scan(&after)
	a.QueryRow(ctx, "SELECT count(*) FROM replication_events WHERE table_name='teams' AND row_data->>'id'='from-b'").Scan(&count)
	if count != 1 || after <= before {
		t.Fatal("replication log is not compact and incremental")
	}
	// A replicated parent deletion cannot cascade into a destination-only child.
	if _, err = b.Exec(ctx, "INSERT INTO projects(id,name,team_id) VALUES('local-only','Local only','from-b')"); err != nil {
		t.Fatal(err)
	}
	if _, err = a.Exec(ctx, "DELETE FROM teams WHERE id='from-b'"); err != nil {
		t.Fatal(err)
	}
	if err = br.ApplySyncOperations(ctx, export(ar)); err == nil {
		t.Fatal("local-only dependent was silently deleted")
	}
	b.QueryRow(ctx, "SELECT count(*) FROM projects WHERE id='local-only'").Scan(&count)
	if count != 1 {
		t.Fatal("failed package was not atomic")
	}
}

func TestSyncClockValidationAndRedaction(t *testing.T) {
	for _, v := range []any{nil, map[string]int{"bad": 1}, map[string]int{"d955bc81-b02a-42db-a5f8-57bec27adfa3": 0}, map[string]float64{"d955bc81-b02a-42db-a5f8-57bec27adfa3": 1.5}} {
		if _, err := decodeClock(v); err == nil {
			t.Fatalf("invalid clock accepted: %v", v)
		}
	}
	value := redactedSyncValue([]byte(`{"password_hash":"secret","nested":{"api_token":"secret"},"title":"visible"}`)).(map[string]any)
	if value["password_hash"] != "[redacted]" || value["title"] != "visible" || value["nested"].(map[string]any)["api_token"] != "[redacted]" {
		t.Fatal("conflict preview leaked credentials")
	}
}
