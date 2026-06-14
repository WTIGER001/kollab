package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"arkollab/api/internal/domain"
)

type PostgresTaskRepository struct {
	db *pgxpool.Pool
}

func NewPostgresTaskRepository(db *pgxpool.Pool) *PostgresTaskRepository {
	return &PostgresTaskRepository{db: db}
}

func (r *PostgresTaskRepository) SyncDocumentTasks(ctx context.Context, docID string, tasks []*domain.Task) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Delete old tasks for this document
	_, err = tx.Exec(ctx, "DELETE FROM tasks WHERE document_id = $1", docID)
	if err != nil {
		return err
	}

	// Insert new tasks
	for _, task := range tasks {
		_, err = tx.Exec(ctx, `
			INSERT INTO tasks (id, document_id, content, assignee, due_date, completed, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, task.ID, task.DocumentID, task.Content, task.Assignee, task.DueDate, task.Completed, task.CreatedAt, task.UpdatedAt)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *PostgresTaskRepository) GetTasksByAssignee(ctx context.Context, username string) ([]*domain.Task, error) {
	rows, err := r.db.Query(ctx, `
		SELECT t.id, t.document_id, d.title AS doc_title, d.project_id, d.team_id, t.content, t.assignee, t.due_date, t.completed, t.created_at, t.updated_at
		FROM tasks t
		JOIN documents d ON t.document_id = d.id
		WHERE t.assignee = $1 AND d.deleted_at IS NULL
		ORDER BY t.completed ASC, t.due_date ASC NULLS LAST, t.created_at DESC
	`, username)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.Task
	for rows.Next() {
		var task domain.Task
		var dueTime *time.Time
		var projectID *string
		var teamID string
		err := rows.Scan(&task.ID, &task.DocumentID, &task.DocTitle, &projectID, &teamID, &task.Content, &task.Assignee, &dueTime, &task.Completed, &task.CreatedAt, &task.UpdatedAt)
		if err != nil {
			return nil, err
		}
		task.ProjectID = projectID
		task.TeamID = teamID
		if dueTime != nil {
			str := dueTime.Format("2006-01-02")
			task.DueDate = &str
		}
		list = append(list, &task)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return list, nil
}
