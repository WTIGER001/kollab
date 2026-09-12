package postgres

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"kollab/api/internal/domain"
)

type CollaborationRepository struct{ db *pgxpool.Pool }

func NewCollaborationRepository(db *pgxpool.Pool) *CollaborationRepository {
	return &CollaborationRepository{db}
}
func (r *CollaborationRepository) LoadState(ctx context.Context, id string) (domain.CollaborativeState, error) {
	var s domain.CollaborativeState
	err := r.db.QueryRow(ctx, "SELECT version,update_data FROM collaborative_states WHERE document_id=$1", id).Scan(&s.Version, &s.Update)
	if errors.Is(err, pgx.ErrNoRows) {
		err = nil
	}
	return s, err
}
func (r *CollaborationRepository) SaveState(ctx context.Context, id string, version int64, update string, content ...string) (domain.CollaborativeState, bool, error) {
	var s domain.CollaborativeState
	var projection *string
	if len(content) > 0 {
		projection = &content[0]
	}
	var err error
	if version == 0 {
		err = r.db.QueryRow(ctx, `INSERT INTO collaborative_states(document_id,version,update_data,content) VALUES($1,1,$2,$3) ON CONFLICT DO NOTHING RETURNING version,update_data`, id, update, projection).Scan(&s.Version, &s.Update)
	} else {
		err = r.db.QueryRow(ctx, `UPDATE collaborative_states SET version=version+1,update_data=$3,content=$4,updated_at=now() WHERE document_id=$1 AND version=$2 RETURNING version,update_data`, id, version, update, projection).Scan(&s.Version, &s.Update)
	}

	if errors.Is(err, pgx.ErrNoRows) {
		current, e := r.LoadState(ctx, id)
		return current, false, e
	}
	return s, err == nil, err
}
