package postgres

import (
	"context"
	"kollab/api/internal/domain"
)

// RestoreSnapshot commits the recovery version, restored content, and CRDT
// invalidation together. Clients must reload their document after this operation.
func (r *PostgresDocumentRepository) RestoreSnapshot(ctx context.Context, doc *domain.Document, snapshot *domain.DocumentVersion) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	_, err = tx.Exec(ctx, `INSERT INTO document_versions (id,document_id,content,version_number,created_by,change_summary,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)`, snapshot.ID, snapshot.DocumentID, snapshot.Content, snapshot.VersionNumber, snapshot.CreatedBy, snapshot.ChangeSummary, snapshot.CreatedAt)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `UPDATE documents SET content=$2,updated_at=$3,updated_by=NULLIF($4,'') WHERE id=$1`, doc.ID, doc.Content, doc.UpdatedAt, doc.UpdatedByID)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `DELETE FROM collaborative_states WHERE document_id=$1`, doc.ID)
	if err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, "UPDATE cluster_control SET epoch=gen_random_uuid()::text,tree_version=tree_version+1 WHERE id"); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
