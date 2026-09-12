package postgres

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"kollab/api/internal/domain"
)

type vectorClock map[string]int64

func clockOrder(a, b vectorClock) (ahead, behind bool) {
	for node, value := range a {
		if value > b[node] {
			ahead = true
		}
	}
	for node, value := range b {
		if value > a[node] {
			behind = true
		}
	}
	return
}
func decodeClock(value any) (vectorClock, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	var clock vectorClock
	if err = json.Unmarshal(raw, &clock); err != nil || len(clock) == 0 || len(clock) > 128 {
		return nil, fmt.Errorf("invalid synchronization clock")
	}
	for node, value := range clock {
		if _, err = uuid.Parse(node); err != nil || value < 1 || value > 9007199254740991 {
			return nil, fmt.Errorf("invalid synchronization clock")
		}
	}
	return clock, nil
}
func mergeClock(a, b vectorClock, node string) vectorClock {
	result := vectorClock{}
	for key, value := range a {
		result[key] = value
	}
	for key, value := range b {
		if value > result[key] {
			result[key] = value
		}
	}
	result[node]++
	return result
}
func syncTableAllowed(table string) bool {
	return table != "schema_migrations" && table != "db_operations_log" && !strings.HasPrefix(table, "replication_") && !strings.HasPrefix(table, "cluster_")
}
func syncJSON(value any) []byte { raw, _ := json.Marshal(value); return raw }
func sameSyncJSON(a, b []byte) bool {
	var av, bv any
	if json.Unmarshal(a, &av) != nil || json.Unmarshal(b, &bv) != nil {
		return false
	}
	return string(syncJSON(av)) == string(syncJSON(bv))
}
func redactedSyncValue(raw []byte) any {
	var value any
	_ = json.Unmarshal(raw, &value)
	var redact func(any) any
	redact = func(v any) any {
		switch x := v.(type) {
		case map[string]any:
			for k, item := range x {
				lower := strings.ToLower(k)
				if strings.Contains(lower, "password") || strings.Contains(lower, "secret") || strings.Contains(lower, "credential") || strings.Contains(lower, "token") {
					x[k] = "[redacted]"
				} else {
					x[k] = redact(item)
				}
			}
		case []any:
			for i, item := range x {
				x[i] = redact(item)
			}
		}
		return v
	}
	return redact(value)
}

// Full row states and vector clocks permit duplicate, overlapping and reordered
// packages. Concurrent changes require an explicit decision bound to both clocks.
func (r *PostgresSystemRepository) ApplySyncOperations(ctx context.Context, ops []map[string]interface{}) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext('kollab:replication-import'))"); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, "SELECT set_config('kollab.suppress_sync','on',true)"); err != nil {
		return err
	}
	tables, err := archiveTables(ctx, tx)
	if err != nil {
		return err
	}
	rank := map[string]int{}
	for i, table := range tables {
		if syncTableAllowed(table) {
			rank[table] = i + 1
		}
	}
	// Parents first for upserts, children first for deletion. Within the document
	// table, parent chains in the package determine the order.
	pending := append([]map[string]interface{}(nil), ops...)
	parents := map[string]string{}
	for _, op := range pending {
		if op["table_name"] == "documents" {
			var row map[string]any
			_ = json.Unmarshal(syncJSON(op["row_data"]), &row)
			id, _ := row["id"].(string)
			parent, _ := row["parent_id"].(string)
			parents[id] = parent
		}
	}
	depth := func(op map[string]interface{}) int {
		if op["table_name"] != "documents" {
			return 0
		}
		var row map[string]any
		_ = json.Unmarshal(syncJSON(op["row_data"]), &row)
		id, _ := row["id"].(string)
		visited := map[string]bool{}
		d := 0
		for parents[id] != "" && !visited[id] {
			visited[id] = true
			id = parents[id]
			d++
		}
		return d
	}
	sort.SliceStable(pending, func(i, j int) bool {
		a, b := pending[i], pending[j]
		ad, bd := a["action"] == "DELETE", b["action"] == "DELETE"
		if ad != bd {
			return !ad
		}
		at, _ := a["table_name"].(string)
		bt, _ := b["table_name"].(string)
		if at != bt {
			if ad {
				return rank[at] > rank[bt]
			}
			return rank[at] < rank[bt]
		}
		if ad {
			return depth(a) > depth(b)
		}
		return depth(a) < depth(b)
	})
	var node string
	if err = tx.QueryRow(ctx, "SELECT node_id FROM replication_identity WHERE id").Scan(&node); err != nil {
		return err
	}
	for _, op := range pending {
		table, _ := op["table_name"].(string)
		action, _ := op["action"].(string)
		eventID, _ := op["event_id"].(string)
		source, _ := op["source_id"].(string)
		key, _ := op["record_key"].(string)
		if rank[table] == 0 || (action != "INSERT" && action != "UPDATE" && action != "DELETE") {
			return fmt.Errorf("unsupported synchronization table or action")
		}
		if _, err = uuid.Parse(eventID); err != nil {
			return fmt.Errorf("invalid synchronization event ID")
		}
		clock, err := decodeClock(op["clock"])
		if err != nil {
			return err
		}
		if clock[source] == 0 {
			return fmt.Errorf("event source is missing from clock")
		}
		raw := syncJSON(op["row_data"])
		var row map[string]json.RawMessage
		if json.Unmarshal(raw, &row) != nil || row == nil {
			return fmt.Errorf("invalid synchronization row")
		}
		var actualKey string
		if err = tx.QueryRow(ctx, "SELECT replication_key($1,$2::jsonb)", table, string(raw)).Scan(&actualKey); err != nil {
			return err
		}
		if key != actualKey {
			return fmt.Errorf("synchronization row identity mismatch")
		}
		if table == "principal_roles" || table == "permission_grants" {
			if _, present := row["id"]; present {
				return fmt.Errorf("local permission IDs are not transferable")
			}
		}
		if _, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))", table, key); err != nil {
			return err
		}
		current := vectorClock{}
		var localRaw []byte
		var localDeleted bool
		err = tx.QueryRow(ctx, "SELECT clock,row_data,deleted FROM replication_records WHERE table_name=$1 AND record_key=$2", table, key).Scan(&current, &localRaw, &localDeleted)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		exists := err == nil
		incomingDeleted := action == "DELETE"
		ahead, behind := clockOrder(clock, current)
		if exists && !ahead {
			continue
		}
		concurrent := exists && ahead && behind
		if concurrent {
			hash := sha256.Sum256(append(append([]byte(eventID), syncJSON(current)...), syncJSON(clock)...))
			conflictID := hex.EncodeToString(hash[:])
			equal := localDeleted == incomingDeleted && sameSyncJSON(localRaw, raw)
			decisions, _ := op["resolutions"].(map[string]string)
			decision := decisions[conflictID]
			if !equal && (decision != "keep-local" && decision != "use-incoming") {
				return &domain.SyncConflictError{Conflict: domain.SyncConflict{ID: conflictID, Table: table, Key: key, Local: redactedSyncValue(localRaw), Incoming: redactedSyncValue(raw), LocalDeleted: localDeleted, IncomingDeleted: incomingDeleted}}
			}
			if !equal {
				if _, err = tx.Exec(ctx, "INSERT INTO replication_conflicts(table_name,record_key,local_data,incoming_data,local_deleted,incoming_deleted,resolution) VALUES($1,$2,$3,$4,$5,$6,$7)", table, key, string(localRaw), string(raw), localDeleted, incomingDeleted, decision); err != nil {
					return err
				}
			}
			clock = mergeClock(current, clock, node)
			eventID = uuid.NewString()
			source = node
			if decision == "keep-local" {
				raw = localRaw
				incomingDeleted = localDeleted
				if incomingDeleted {
					action = "DELETE"
				} else {
					action = "UPDATE"
				}
			}
		}
		if err = applySyncRow(ctx, tx, table, action, raw); err != nil {
			return fmt.Errorf("cannot apply %s: %w; reconcile dependent records or import a full package", table, err)
		}
		clockJSON := string(syncJSON(clock))
		if _, err = tx.Exec(ctx, `INSERT INTO replication_records VALUES($1,$2,$3,$4,$5) ON CONFLICT(table_name,record_key) DO UPDATE SET clock=EXCLUDED.clock,row_data=EXCLUDED.row_data,deleted=EXCLUDED.deleted`, table, key, clockJSON, string(raw), incomingDeleted); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `INSERT INTO replication_events(event_id,source_id,table_name,record_key,action,row_data,clock) VALUES($1,$2,$3,$4,$5,$6,$7)
 ON CONFLICT(table_name,record_key) DO UPDATE SET id=EXCLUDED.id,event_id=EXCLUDED.event_id,source_id=EXCLUDED.source_id,action=EXCLUDED.action,row_data=EXCLUDED.row_data,clock=EXCLUDED.clock`, eventID, source, table, key, action, string(raw), clockJSON); err != nil {
			return err
		}
	}
	if err = validateSyncHierarchy(ctx, tx); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, "UPDATE cluster_control SET epoch=gen_random_uuid()::text,tree_version=tree_version+1 WHERE id"); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func validateSyncHierarchy(ctx context.Context, tx pgx.Tx) error {
	var invalid bool
	err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM documents d JOIN documents p ON p.id=d.parent_id WHERE d.team_id IS DISTINCT FROM p.team_id OR d.project_id IS DISTINCT FROM p.project_id)
 OR EXISTS(SELECT 1 FROM documents d JOIN projects p ON p.id=d.project_id WHERE d.team_id IS DISTINCT FROM p.team_id)`).Scan(&invalid)
	if err != nil {
		return err
	}
	if invalid {
		return fmt.Errorf("combined changes place a page outside its parent space; reconcile page moves before importing")
	}
	err = tx.QueryRow(ctx, `WITH RECURSIVE ancestry AS (
 SELECT id,parent_id,ARRAY[id::text] AS path,false AS cycle FROM documents WHERE parent_id IS NOT NULL
 UNION ALL SELECT d.id,d.parent_id,a.path||d.id,d.id=ANY(a.path) FROM ancestry a JOIN documents d ON d.id=a.parent_id WHERE NOT a.cycle
 ) SELECT EXISTS(SELECT 1 FROM ancestry WHERE cycle)`).Scan(&invalid)
	if err != nil {
		return err
	}
	if invalid {
		return fmt.Errorf("combined page moves create a parent cycle; reconcile page moves before importing")
	}
	return nil
}

func applySyncRow(ctx context.Context, tx pgx.Tx, table, action string, raw []byte) error {
	rows, err := tx.Query(ctx, `SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey) WHERE i.indrelid=$1::regclass AND i.indisprimary ORDER BY a.attnum`, "public."+table)
	if err != nil {
		return err
	}
	keys := []string{}
	for rows.Next() {
		var key string
		if err = rows.Scan(&key); err != nil {
			rows.Close()
			return err
		}
		keys = append(keys, key)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return err
	}
	if len(keys) == 0 {
		return fmt.Errorf("table lacks primary key")
	}
	if table == "principal_roles" || table == "permission_grants" {
		keys = []string{"sync_id"}
	}
	var row map[string]json.RawMessage
	_ = json.Unmarshal(raw, &row)
	pk, where := []string{}, []string{}
	for _, key := range keys {
		if value, ok := row[key]; !ok || string(value) == "null" {
			return fmt.Errorf("missing primary key")
		}
		q := pgx.Identifier{key}.Sanitize()
		pk = append(pk, q)
		where = append(where, "t."+q+"=source."+q)
	}
	q := pgx.Identifier{"public", table}.Sanitize()
	if action == "DELETE" {
		if err = ensureNoSyncDependents(ctx, tx, table, raw); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, "DELETE FROM "+q+" t USING jsonb_populate_record(NULL::"+q+",$1::jsonb) source WHERE "+strings.Join(where, " AND "), string(raw))
		return err
	}
	columns := []string{}
	for column := range row {
		columns = append(columns, column)
	}
	sort.Strings(columns)
	assignments := []string{}
	quotedColumns := []string{}
	for _, column := range columns {
		q := pgx.Identifier{column}.Sanitize()
		quotedColumns = append(quotedColumns, q)
		assignments = append(assignments, q+"=EXCLUDED."+q)
	}
	_, err = tx.Exec(ctx, "INSERT INTO "+q+" ("+strings.Join(quotedColumns, ",")+") SELECT "+strings.Join(quotedColumns, ",")+" FROM jsonb_populate_record(NULL::"+q+",$1::jsonb) ON CONFLICT("+strings.Join(pk, ",")+") DO UPDATE SET "+strings.Join(assignments, ","), string(raw))
	return err
}

// Never let a replicated parent deletion silently cascade into local-only work.
func ensureNoSyncDependents(ctx context.Context, tx pgx.Tx, table string, raw []byte) error {
	rows, err := tx.Query(ctx, `SELECT child.relname,string_agg(format('c.%I IS NOT DISTINCT FROM p.%I',ca.attname,pa.attname),' AND ' ORDER BY k.n)
 FROM pg_constraint f JOIN pg_class child ON child.oid=f.conrelid
 JOIN LATERAL unnest(f.conkey,f.confkey) WITH ORDINALITY k(childkey,parentkey,n) ON true
 JOIN pg_attribute ca ON ca.attrelid=f.conrelid AND ca.attnum=k.childkey
 JOIN pg_attribute pa ON pa.attrelid=f.confrelid AND pa.attnum=k.parentkey
 WHERE f.contype='f' AND f.confrelid=$1::regclass GROUP BY f.oid,child.relname`, "public."+table)
	if err != nil {
		return err
	}
	type dep struct{ table, where string }
	deps := []dep{}
	for rows.Next() {
		var d dep
		if err = rows.Scan(&d.table, &d.where); err != nil {
			rows.Close()
			return err
		}
		deps = append(deps, d)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return err
	}
	for _, d := range deps {
		var exists bool
		err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM "+pgx.Identifier{"public", d.table}.Sanitize()+" c,jsonb_populate_record(NULL::"+pgx.Identifier{"public", table}.Sanitize()+",$1::jsonb) p WHERE "+d.where+")", string(raw)).Scan(&exists)
		if err != nil {
			return err
		}
		if exists {
			return fmt.Errorf("dependent %s records must be moved or deleted first", d.table)
		}
	}
	return nil
}
