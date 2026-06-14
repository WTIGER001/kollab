package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"arkollab/api/internal/domain"
)

type PostgresCommentRepository struct {
	db *pgxpool.Pool
}

func NewPostgresCommentRepository(db *pgxpool.Pool) *PostgresCommentRepository {
	return &PostgresCommentRepository{
		db: db,
	}
}

func (r *PostgresCommentRepository) GetByDocumentID(ctx context.Context, docID string) ([]*domain.Comment, error) {
	query := `
		SELECT id, document_id, parent_id, content, created_by, created_name, created_at, updated_at
		FROM comments
		WHERE document_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.Query(ctx, query, docID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*domain.Comment
	for rows.Next() {
		var c domain.Comment
		err := rows.Scan(
			&c.ID,
			&c.DocumentID,
			&c.ParentID,
			&c.Content,
			&c.CreatedBy,
			&c.CreatedByName,
			&c.CreatedAt,
			&c.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		result = append(result, &c)
	}
	return result, nil
}

func (r *PostgresCommentRepository) GetByID(ctx context.Context, id string) (*domain.Comment, error) {
	query := `
		SELECT id, document_id, parent_id, content, created_by, created_name, created_at, updated_at
		FROM comments
		WHERE id = $1
	`
	var c domain.Comment
	err := r.db.QueryRow(ctx, query, id).Scan(
		&c.ID,
		&c.DocumentID,
		&c.ParentID,
		&c.Content,
		&c.CreatedBy,
		&c.CreatedByName,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("comment not found")
		}
		return nil, err
	}
	return &c, nil
}

func (r *PostgresCommentRepository) Create(ctx context.Context, comment *domain.Comment) error {
	query := `
		INSERT INTO comments (id, document_id, parent_id, content, created_by, created_name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.Exec(
		ctx,
		query,
		comment.ID,
		comment.DocumentID,
		comment.ParentID,
		comment.Content,
		comment.CreatedBy,
		comment.CreatedByName,
		comment.CreatedAt,
		comment.UpdatedAt,
	)
	return err
}

func (r *PostgresCommentRepository) Update(ctx context.Context, comment *domain.Comment) error {
	query := `
		UPDATE comments
		SET content = $1, updated_at = $2
		WHERE id = $3
	`
	tag, err := r.db.Exec(ctx, query, comment.Content, comment.UpdatedAt, comment.ID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("comment not found")
	}
	return nil
}

func (r *PostgresCommentRepository) Delete(ctx context.Context, id string) error {
	query := `
		DELETE FROM comments
		WHERE id = $1
	`
	tag, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("comment not found")
	}
	return nil
}
