package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"arkollab/api/internal/domain"
)

type PostgresImageRepository struct {
	db *pgxpool.Pool
}

func NewPostgresImageRepository(db *pgxpool.Pool) *PostgresImageRepository {
	return &PostgresImageRepository{db: db}
}

func (r *PostgresImageRepository) SaveMetadata(ctx context.Context, img *domain.ImageMetadata) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO images (id, filename, mime_type, original_width, original_height, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET
			filename = EXCLUDED.filename,
			mime_type = EXCLUDED.mime_type,
			original_width = EXCLUDED.original_width,
			original_height = EXCLUDED.original_height,
			created_at = EXCLUDED.created_at
	`, img.ID, img.Filename, img.MimeType, img.OriginalWidth, img.OriginalHeight, img.CreatedAt)
	return err
}

func (r *PostgresImageRepository) GetMetadata(ctx context.Context, id string) (*domain.ImageMetadata, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, filename, mime_type, original_width, original_height, created_at
		FROM images
		WHERE id = $1
	`, id)

	var img domain.ImageMetadata
	err := row.Scan(&img.ID, &img.Filename, &img.MimeType, &img.OriginalWidth, &img.OriginalHeight, &img.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("image metadata not found")
		}
		return nil, err
	}
	return &img, nil
}

func (r *PostgresImageRepository) DeleteMetadata(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM images WHERE id = $1", id)
	return err
}
