package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"arkollab/api/internal/domain"
)

type PostgresTagRepository struct {
	db *pgxpool.Pool
}

func NewPostgresTagRepository(db *pgxpool.Pool) *PostgresTagRepository {
	return &PostgresTagRepository{
		db: db,
	}
}

func (r *PostgresTagRepository) Create(ctx context.Context, tag *domain.Tag) error {
	query := `
		INSERT INTO tags (id, name, description, color, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	if tag.CreatedAt.IsZero() {
		tag.CreatedAt = time.Now()
	}
	_, err := r.db.Exec(ctx, query, tag.ID, tag.Name, tag.Description, tag.Color, tag.CreatedAt)
	return err
}

func (r *PostgresTagRepository) GetByID(ctx context.Context, id string) (*domain.Tag, error) {
	query := `
		SELECT id, name, description, color, created_at
		FROM tags
		WHERE id = $1
	`
	var t domain.Tag
	err := r.db.QueryRow(ctx, query, id).Scan(
		&t.ID,
		&t.Name,
		&t.Description,
		&t.Color,
		&t.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("tag not found")
		}
		return nil, err
	}
	return &t, nil
}

func (r *PostgresTagRepository) GetByName(ctx context.Context, name string) (*domain.Tag, error) {
	query := `
		SELECT id, name, description, color, created_at
		FROM tags
		WHERE name = $1
	`
	var t domain.Tag
	err := r.db.QueryRow(ctx, query, name).Scan(
		&t.ID,
		&t.Name,
		&t.Description,
		&t.Color,
		&t.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("tag not found")
		}
		return nil, err
	}
	return &t, nil
}

func (r *PostgresTagRepository) List(ctx context.Context) ([]*domain.Tag, error) {
	query := `
		SELECT t.id, t.name, t.description, t.color, t.created_at, COUNT(dt.document_id) AS page_count
		FROM tags t
		LEFT JOIN document_tags dt ON t.id = dt.tag_id
		LEFT JOIN documents d ON dt.document_id = d.id AND d.deleted_at IS NULL
		GROUP BY t.id, t.name, t.description, t.color, t.created_at
		ORDER BY t.name ASC
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*domain.Tag
	for rows.Next() {
		var t domain.Tag
		err := rows.Scan(
			&t.ID,
			&t.Name,
			&t.Description,
			&t.Color,
			&t.CreatedAt,
			&t.PageCount,
		)
		if err != nil {
			return nil, err
		}
		result = append(result, &t)
	}
	return result, nil
}

func (r *PostgresTagRepository) Update(ctx context.Context, tag *domain.Tag) error {
	query := `
		UPDATE tags
		SET name = $1, description = $2, color = $3
		WHERE id = $4
	`
	_, err := r.db.Exec(ctx, query, tag.Name, tag.Description, tag.Color, tag.ID)
	return err
}

func (r *PostgresTagRepository) Delete(ctx context.Context, id string) error {
	query := `
		DELETE FROM tags
		WHERE id = $1
	`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *PostgresTagRepository) AddTagToDocument(ctx context.Context, docID string, tagID string) error {
	query := `
		INSERT INTO document_tags (document_id, tag_id)
		VALUES ($1, $2)
		ON CONFLICT (document_id, tag_id) DO NOTHING
	`
	_, err := r.db.Exec(ctx, query, docID, tagID)
	return err
}

func (r *PostgresTagRepository) RemoveTagFromDocument(ctx context.Context, docID string, tagID string) error {
	query := `
		DELETE FROM document_tags
		WHERE document_id = $1 AND tag_id = $2
	`
	_, err := r.db.Exec(ctx, query, docID, tagID)
	return err
}

func (r *PostgresTagRepository) GetDocumentTags(ctx context.Context, docID string) ([]*domain.Tag, error) {
	query := `
		SELECT t.id, t.name, t.description, t.color, t.created_at
		FROM tags t
		INNER JOIN document_tags dt ON t.id = dt.tag_id
		WHERE dt.document_id = $1
		ORDER BY t.name ASC
	`
	rows, err := r.db.Query(ctx, query, docID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*domain.Tag
	for rows.Next() {
		var t domain.Tag
		err := rows.Scan(
			&t.ID,
			&t.Name,
			&t.Description,
			&t.Color,
			&t.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		result = append(result, &t)
	}
	return result, nil
}
