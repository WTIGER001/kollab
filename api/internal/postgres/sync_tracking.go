package postgres

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
)

// EnableSyncTracking runs after permission tables are initialized so all feature
// records, memberships, and grants participate in offline synchronization.
func EnableSyncTracking(ctx context.Context, db *pgxpool.Pool) error {
	_, err := db.Exec(ctx, `DO $$ DECLARE tbl RECORD; BEGIN
 FOR tbl IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT EXISTS(SELECT 1 FROM pg_inherits i WHERE i.inhrelid=c.oid)
 AND c.relname NOT LIKE 'cluster_%' AND c.relname NOT LIKE 'replication_%'
 AND c.relname NOT IN ('schema_migrations','db_operations_log')
 AND EXISTS(SELECT 1 FROM pg_index i WHERE i.indrelid=c.oid AND i.indisprimary)

 LOOP
 IF NOT EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE t.tgrelid=tbl.oid AND p.proname='log_db_operation') THEN
 EXECUTE format('CREATE TRIGGER sync_changes AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION log_db_operation()',tbl.relname); END IF;
 EXECUTE format('SELECT record_replication_change(%L,to_jsonb(t),false) FROM %I t WHERE NOT EXISTS(SELECT 1 FROM replication_records r WHERE r.table_name=%L AND r.record_key=replication_key(%L,to_jsonb(t)))',tbl.relname,tbl.relname,tbl.relname,tbl.relname);
 END LOOP;
 END $$;`)
	return err
}
