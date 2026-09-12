package postgres

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"kollab/api/internal/domain"
	"time"
)

// ClusterCoordinator owns a separate pool: waiting for an advisory lock must
// never consume the application's query connections and deadlock its writer.
type ClusterCoordinator struct {
	db       *pgxpool.Pool
	locks    *pgxpool.Pool
	instance string
}

func NewClusterCoordinator(ctx context.Context, db *pgxpool.Pool) (*ClusterCoordinator, error) {
	config := db.Config().Copy()
	config.MaxConns = 16
	config.MinConns = 0
	locks, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, err
	}
	return &ClusterCoordinator{db: db, locks: locks, instance: uuid.NewString()}, nil
}
func (c *ClusterCoordinator) Close() { c.locks.Close() }
func (c *ClusterCoordinator) Acquire(ctx context.Context, exclusive bool) (func(), error) {
	conn, err := c.locks.Acquire(ctx)
	if err != nil {
		return nil, err
	}
	lock, unlock := "pg_advisory_lock_shared", "pg_advisory_unlock_shared"
	if exclusive {
		lock, unlock = "pg_advisory_lock", "pg_advisory_unlock"
	}
	if _, err = conn.Exec(ctx, "SELECT "+lock+"(hashtextextended('kollab:maintenance',0))"); err != nil {
		_ = conn.Conn().Close(context.Background())
		conn.Release()
		return nil, err
	}
	return func() {
		releaseCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if _, err := conn.Exec(releaseCtx, "SELECT "+unlock+"(hashtextextended('kollab:maintenance',0))"); err != nil {
			_ = conn.Conn().Close(releaseCtx)
		}
		conn.Release()
	}, nil
}
func (c *ClusterCoordinator) State(ctx context.Context) (domain.ClusterState, error) {
	var state domain.ClusterState
	err := c.db.QueryRow(ctx, "SELECT epoch,tree_version FROM cluster_control WHERE id").Scan(&state.Epoch, &state.TreeVersion)
	return state, err
}
func (c *ClusterCoordinator) MediaKey(ctx context.Context) ([]byte, error) {
	var key string
	err := c.db.QueryRow(ctx, "SELECT media_key FROM cluster_control WHERE id").Scan(&key)
	if err == nil && len(key) < 32 {
		err = fmt.Errorf("cluster media signing key is invalid")
	}
	return []byte(key), err
}
func (c *ClusterCoordinator) Changed(ctx context.Context, reset bool) (string, error) {
	var epoch string
	query := "UPDATE cluster_control SET tree_version=tree_version+1 WHERE id RETURNING epoch"
	if reset {
		query = "UPDATE cluster_control SET epoch=gen_random_uuid()::text,tree_version=tree_version+1 WHERE id RETURNING epoch"
	}
	err := c.db.QueryRow(ctx, query).Scan(&epoch)
	return epoch, err
}
func (c *ClusterCoordinator) Members(ctx context.Context, doc string, local []domain.ClusterMember) ([]domain.ClusterMember, error) {
	tx, err := c.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	ids := make([]string, 0, len(local))
	for _, member := range local {
		ids = append(ids, member.ConnectionID)
	}
	if _, err = tx.Exec(ctx, "DELETE FROM cluster_presence WHERE (instance_id=$1 AND document_id=$2 AND NOT(connection_id=ANY($3))) OR seen_at<now()-interval '15 seconds'", c.instance, doc, ids); err != nil {
		return nil, err
	}
	for _, member := range local {
		_, err = tx.Exec(ctx, `INSERT INTO cluster_presence(connection_id,instance_id,document_id,user_id,username,color,position,anchor,cursor_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
 ON CONFLICT(connection_id) DO UPDATE SET position=EXCLUDED.position,anchor=EXCLUDED.anchor,cursor_version=EXCLUDED.cursor_version,seen_at=now()`, member.ConnectionID, c.instance, doc, member.UserID, member.Username, member.Color, member.Position, member.Anchor, member.CursorVersion)
		if err != nil {
			return nil, err
		}
	}
	rows, err := tx.Query(ctx, `SELECT connection_id,user_id,username,color,position,anchor,cursor_version FROM cluster_presence WHERE document_id=$1 AND seen_at>now()-interval '15 seconds' ORDER BY connection_id`, doc)
	if err != nil {
		return nil, err
	}
	members := []domain.ClusterMember{}
	for rows.Next() {
		var member domain.ClusterMember
		if err = rows.Scan(&member.ConnectionID, &member.UserID, &member.Username, &member.Color, &member.Position, &member.Anchor, &member.CursorVersion); err != nil {
			rows.Close()
			return nil, err
		}
		members = append(members, member)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return nil, err
	}
	return members, tx.Commit(ctx)
}
