package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kollab/api/internal/domain"
)

type PostgresLibraryImageRepository struct {
	db *pgxpool.Pool
}

func NewPostgresLibraryImageRepository(db *pgxpool.Pool) *PostgresLibraryImageRepository {
	return &PostgresLibraryImageRepository{db: db}
}

func (r *PostgresLibraryImageRepository) Save(ctx context.Context, img *domain.LibraryImage) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO library_images (id, image_id, display_name, scope, team_id, project_id, user_id, size_bytes, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, img.ID, img.ImageID, img.DisplayName, img.Scope, img.TeamID, img.ProjectID, img.UploadedBy, img.SizeBytes, img.CreatedAt)
	return err
}

func (r *PostgresLibraryImageRepository) List(ctx context.Context, scope string, teamID *string, projectID *string) ([]*domain.LibraryImage, error) {
	// We join with the `images` table to get filename and mime_type
	query := `
		SELECT 
			li.id, li.image_id, li.display_name, li.scope, li.team_id, li.project_id, li.user_id, COALESCE(u.display_name, 'UnknownUser'), li.size_bytes, li.created_at,
			i.filename, i.mime_type
		FROM library_images li
		JOIN images i ON li.image_id = i.id
		LEFT JOIN users u ON li.user_id = u.id
		WHERE li.scope = $1
	`
	args := []interface{}{scope}

	if scope == "team" && teamID != nil {
		query += ` AND li.team_id = $2`
		args = append(args, *teamID)
	} else if scope == "project" && projectID != nil {
		query += ` AND li.project_id = $2`
		args = append(args, *projectID)
	}

	query += ` ORDER BY li.created_at DESC`

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var images []*domain.LibraryImage
	for rows.Next() {
		img := &domain.LibraryImage{}
		err := rows.Scan(
			&img.ID, &img.ImageID, &img.DisplayName, &img.Scope, &img.TeamID, &img.ProjectID, &img.UploadedBy, &img.UploaderName, &img.SizeBytes, &img.CreatedAt,
			&img.Filename, &img.MimeType,
		)
		if err != nil {
			return nil, err
		}
		images = append(images, img)
	}
	return images, nil
}

func (r *PostgresLibraryImageRepository) Get(ctx context.Context, id string) (*domain.LibraryImage, error) {
	row := r.db.QueryRow(ctx, `
		SELECT 
			li.id, li.image_id, li.display_name, li.scope, li.team_id, li.project_id, li.user_id, COALESCE(u.display_name, 'UnknownUser'), li.size_bytes, li.created_at,
			i.filename, i.mime_type
		FROM library_images li
		JOIN images i ON li.image_id = i.id
		LEFT JOIN users u ON li.user_id = u.id
		WHERE li.id = $1
	`, id)

	img := &domain.LibraryImage{}
	err := row.Scan(
		&img.ID, &img.ImageID, &img.DisplayName, &img.Scope, &img.TeamID, &img.ProjectID, &img.UploadedBy, &img.UploaderName, &img.SizeBytes, &img.CreatedAt,
		&img.Filename, &img.MimeType,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("library image not found")
		}
		return nil, err
	}
	return img, nil
}

func (r *PostgresLibraryImageRepository) UpdateName(ctx context.Context, id string, name string) error {
	cmdTag, err := r.db.Exec(ctx, `
		UPDATE library_images
		SET display_name = $1
		WHERE id = $2
	`, name, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("library image not found")
	}
	return nil
}

func (r *PostgresLibraryImageRepository) Delete(ctx context.Context, id string) error {
	cmdTag, err := r.db.Exec(ctx, `DELETE FROM library_images WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return errors.New("library image not found")
	}
	return nil
}
