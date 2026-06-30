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

func (r *PostgresAttachmentRepository) SavePreviewStatus(ctx context.Context, status *domain.PreviewStatus) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO attachment_previews (attachment_id, status, progress, format, error_message, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (attachment_id) DO UPDATE SET
			status = EXCLUDED.status,
			progress = EXCLUDED.progress,
			format = EXCLUDED.format,
			error_message = EXCLUDED.error_message,
			updated_at = EXCLUDED.updated_at
	`, status.AttachmentID, status.Status, status.Progress, status.Format, status.ErrorMessage, status.UpdatedAt)
	return err
}

func (r *PostgresAttachmentRepository) GetPreviewStatus(ctx context.Context, attachmentID string) (*domain.PreviewStatus, error) {
	row := r.db.QueryRow(ctx, `
		SELECT attachment_id, status, progress, format, error_message, updated_at
		FROM attachment_previews
		WHERE attachment_id = $1
	`, attachmentID)

	var status domain.PreviewStatus
	var format, errMsg *string
	err := row.Scan(&status.AttachmentID, &status.Status, &status.Progress, &format, &errMsg, &status.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("preview status not found")
		}
		return nil, err
	}
	if format != nil {
		status.Format = *format
	}
	if errMsg != nil {
		status.ErrorMessage = *errMsg
	}
	return &status, nil
}

