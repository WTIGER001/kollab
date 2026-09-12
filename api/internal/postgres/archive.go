package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

// archiveTables orders real application tables by foreign-key dependencies.
// Partition children are read/written through their parents only.
func archiveTables(ctx context.Context, tx pgx.Tx) ([]string, error) {
	rows, err := tx.Query(ctx, `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relispartition AND c.relname NOT LIKE 'cluster_%' AND c.relname<>'replication_identity' ORDER BY c.relname`)
	if err != nil {
		return nil, err
	}
	names := []string{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			rows.Close()
			return nil, err
		}
		names = append(names, name)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	deps := map[string]map[string]bool{}
	for _, name := range names {
		deps[name] = map[string]bool{}
	}
	rows, err = tx.Query(ctx, `SELECT child.relname,parent.relname FROM pg_constraint f
 JOIN pg_class child ON child.oid=f.conrelid JOIN pg_class parent ON parent.oid=f.confrelid
 JOIN pg_namespace n ON n.oid=child.relnamespace WHERE f.contype='f' AND n.nspname='public' AND f.conrelid<>f.confrelid`)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var child, parent string
		if err := rows.Scan(&child, &parent); err != nil {
			rows.Close()
			return nil, err
		}
		if deps[child] != nil && deps[parent] != nil {
			deps[child][parent] = true
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	ordered := []string{}
	seen := map[string]bool{}
	for len(ordered) < len(names) {
		progress := false
		for _, name := range names {
			if seen[name] {
				continue
			}
			ready := true
			for dependency := range deps[name] {
				if !seen[dependency] {
					ready = false
				}
			}
			if ready {
				ordered = append(ordered, name)
				seen[name] = true
				progress = true
			}
		}
		if !progress {
			return nil, fmt.Errorf("cyclic table dependencies prevent restore")
		}
	}
	return ordered, nil
}

func (r *PostgresSystemRepository) exportDatabase(ctx context.Context) (map[string]interface{}, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	tables, err := archiveTables(ctx, tx)
	if err != nil {
		return nil, err
	}
	result := map[string]interface{}{"_format": "kollab.database.v2"}
	for _, table := range tables {
		var data []byte
		err = tx.QueryRow(ctx, "SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM "+pgx.Identifier{"public", table}.Sanitize()+" t").Scan(&data)
		if err != nil {
			return nil, fmt.Errorf("export %s: %w", table, err)
		}
		result[table] = json.RawMessage(data)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return result, nil
}

// RestoreBackup replaces a complete database snapshot in a single transaction.
// It rejects partial/legacy archives rather than silently losing unlisted tables.
func (r *PostgresSystemRepository) RestoreBackup(ctx context.Context, data map[string]interface{}) error {
	if data["_format"] != "kollab.database.v2" {
		return fmt.Errorf("a complete v2 database backup is required")
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext('kollab:restore'))"); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, "SELECT set_config('kollab.suppress_sync','on',true)"); err != nil {
		return err
	}
	tables, err := archiveTables(ctx, tx)
	if err != nil {
		return err
	}
	if len(data) != len(tables)+1 {
		return fmt.Errorf("backup schema does not match this server")
	}
	encoded := map[string][]byte{}
	for _, table := range tables {
		value, ok := data[table]
		if !ok {
			return fmt.Errorf("backup is missing table %s", table)
		}
		raw, err := json.Marshal(value)
		if err != nil {
			return err
		}
		var records []map[string]json.RawMessage
		if err = json.Unmarshal(raw, &records); err != nil || records == nil {
			return fmt.Errorf("invalid table data for %s", table)
		}
		encoded[table] = raw
	}
	// Migrations must match exactly before any destructive SQL is issued.
	var currentMigrations []byte
	if err = tx.QueryRow(ctx, "SELECT COALESCE(jsonb_object_agg(version,checksum),'{}'::jsonb) FROM schema_migrations").Scan(&currentMigrations); err != nil {
		return err
	}
	var current map[string]string
	json.Unmarshal(currentMigrations, &current)
	var archived []struct {
		Version  string `json:"version"`
		Checksum string `json:"checksum"`
	}
	if err = json.Unmarshal(encoded["schema_migrations"], &archived); err != nil {
		return err
	}
	if len(current) != len(archived) {
		return fmt.Errorf("backup migration version differs from server")
	}
	for _, m := range archived {
		if current[m.Version] != m.Checksum {
			return fmt.Errorf("backup migration checksum differs from server")
		}
	}
	quoted := []string{}
	for _, table := range tables {
		quoted = append(quoted, pgx.Identifier{"public", table}.Sanitize())
	}
	if _, err = tx.Exec(ctx, "TRUNCATE "+strings.Join(quoted, ",")+" RESTART IDENTITY"); err != nil {
		return err
	}
	for _, table := range tables {
		q := pgx.Identifier{"public", table}.Sanitize()
		// Trigger side effects are overwritten when their destination table is restored.
		if _, err = tx.Exec(ctx, "INSERT INTO "+q+" SELECT * FROM jsonb_populate_recordset(NULL::"+q+", $1::jsonb)", string(encoded[table])); err != nil {
			return fmt.Errorf("restore %s: %w", table, err)
		}
	}
	// Serial sequences are not part of row JSON. Reset every owned sequence.
	rows, err := tx.Query(ctx, `SELECT table_name,column_name,pg_get_serial_sequence(format('%I.%I',table_schema,table_name),column_name)
 FROM information_schema.columns WHERE table_schema='public' AND column_default LIKE 'nextval(%'`)
	if err != nil {
		return err
	}
	type seq struct{ table, column, name string }
	sequences := []seq{}
	for rows.Next() {
		var s seq
		if err = rows.Scan(&s.table, &s.column, &s.name); err != nil {
			rows.Close()
			return err
		}
		sequences = append(sequences, s)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return err
	}
	for _, s := range sequences {
		_, err = tx.Exec(ctx, "SELECT setval($1,COALESCE(MAX("+pgx.Identifier{s.column}.Sanitize()+"),1),MAX("+pgx.Identifier{s.column}.Sanitize()+") IS NOT NULL) FROM "+pgx.Identifier{"public", s.table}.Sanitize(), s.name)
		if err != nil {
			return err
		}
	}
	if _, err = tx.Exec(ctx, "UPDATE replication_identity SET node_id=gen_random_uuid()::text WHERE id"); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, "UPDATE cluster_control SET epoch=gen_random_uuid()::text,tree_version=tree_version+1 WHERE id"); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
