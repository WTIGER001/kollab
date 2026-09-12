package postgres

import (
	"context"
	"fmt"
	"kollab/api/internal/domain"
)

// MoveHierarchy commits the root and every descendant together. The table lock
// also prevents concurrent moves from introducing a parent cycle after checking.
func (r *PostgresDocumentRepository) MoveHierarchy(ctx context.Context, doc *domain.Document) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, "LOCK TABLE documents IN SHARE ROW EXCLUSIVE MODE"); err != nil {
		return err
	}
	if doc.ParentID != nil {
		var cycle bool
		err = tx.QueryRow(ctx, `WITH RECURSIVE subtree AS (SELECT id FROM documents WHERE id=$1 UNION SELECT d.id FROM documents d JOIN subtree p ON d.parent_id=p.id) SELECT EXISTS(SELECT 1 FROM subtree WHERE id=$2)`, doc.ID, *doc.ParentID).Scan(&cycle)
		if err != nil {
			return err
		}
		if cycle {
			return fmt.Errorf("cannot move a page inside its descendants")
		}
		var team, project string
		if err = tx.QueryRow(ctx, "SELECT team_id,COALESCE(project_id,'') FROM documents WHERE id=$1 AND deleted_at IS NULL", *doc.ParentID).Scan(&team, &project); err != nil {
			return err
		}
		if team != doc.TeamID || project != doc.ProjectID {
			return fmt.Errorf("destination changed; retry the move")
		}
	}
	_, err = tx.Exec(ctx, `WITH RECURSIVE subtree AS (SELECT id FROM documents WHERE id=$1 UNION SELECT d.id FROM documents d JOIN subtree p ON d.parent_id=p.id)
 UPDATE documents SET team_id=$2,project_id=NULLIF($3,''),parent_id=CASE WHEN id=$1 THEN $4 ELSE parent_id END,updated_at=$5 WHERE id IN(SELECT id FROM subtree)`, doc.ID, doc.TeamID, doc.ProjectID, doc.ParentID, doc.UpdatedAt)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
