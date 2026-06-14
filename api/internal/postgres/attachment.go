package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"arkollab/api/internal/domain"
)

type PostgresAttachmentRepository struct {
	db *pgxpool.Pool
}

func NewPostgresAttachmentRepository(db *pgxpool.Pool) *PostgresAttachmentRepository {
	return &PostgresAttachmentRepository{db: db}
}

func (r *PostgresAttachmentRepository) Save(ctx context.Context, att *domain.Attachment) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO attachments (id, document_id, filename, mime_type, file_size, storage_key, uploaded_by, uploaded_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (id) DO UPDATE SET
			document_id = EXCLUDED.document_id,
			filename = EXCLUDED.filename,
			mime_type = EXCLUDED.mime_type,
			file_size = EXCLUDED.file_size,
			storage_key = EXCLUDED.storage_key,
			uploaded_by = EXCLUDED.uploaded_by,
			uploaded_at = EXCLUDED.uploaded_at
	`, att.ID, att.DocumentID, att.Filename, att.MimeType, att.FileSize, att.StorageKey, att.UploadedBy, att.UploadedAt)
	return err
}

func (r *PostgresAttachmentRepository) GetByID(ctx context.Context, id string) (*domain.Attachment, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, document_id, filename, mime_type, file_size, storage_key, uploaded_by, uploaded_at
		FROM attachments
		WHERE id = $1
	`, id)

	var att domain.Attachment
	err := row.Scan(&att.ID, &att.DocumentID, &att.Filename, &att.MimeType, &att.FileSize, &att.StorageKey, &att.UploadedBy, &att.UploadedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("attachment not found")
		}
		return nil, err
	}
	return &att, nil
}

func (r *PostgresAttachmentRepository) ListByDocumentID(ctx context.Context, docID string) ([]*domain.Attachment, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, document_id, filename, mime_type, file_size, storage_key, uploaded_by, uploaded_at
		FROM attachments
		WHERE document_id = $1
		ORDER BY uploaded_at DESC
	`, docID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.Attachment
	for rows.Next() {
		var att domain.Attachment
		err := rows.Scan(&att.ID, &att.DocumentID, &att.Filename, &att.MimeType, &att.FileSize, &att.StorageKey, &att.UploadedBy, &att.UploadedAt)
		if err != nil {
			return nil, err
		}
		list = append(list, &att)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return list, nil
}

func (r *PostgresAttachmentRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM attachments WHERE id = $1", id)
	return err
}
