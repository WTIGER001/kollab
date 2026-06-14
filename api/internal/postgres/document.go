package postgres

import (
	"bytes"
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"arkollab/api/internal/domain"
)

type PostgresDocumentRepository struct {
	db *pgxpool.Pool
}

func NewPostgresDocumentRepository(db *pgxpool.Pool) *PostgresDocumentRepository {
	return &PostgresDocumentRepository{db: db}
}

func (r *PostgresDocumentRepository) GetByID(ctx context.Context, id string) (*domain.Document, error) {
	row := r.db.QueryRow(ctx, "SELECT id, title, content, project_id, parent_id, created_at, updated_at FROM documents WHERE id = $1", id)
	var doc domain.Document
	err := row.Scan(&doc.ID, &doc.Title, &doc.Content, &doc.ProjectID, &doc.ParentID, &doc.CreatedAt, &doc.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("document not found")
		}
		return nil, err
	}
	return &doc, nil
}

func (r *PostgresDocumentRepository) GetByProjectID(ctx context.Context, projectId string) ([]*domain.Document, error) {
	rows, err := r.db.Query(ctx, "SELECT id, title, content, project_id, parent_id, created_at, updated_at FROM documents WHERE project_id = $1", projectId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.Document
	for rows.Next() {
		var doc domain.Document
		err := rows.Scan(&doc.ID, &doc.Title, &doc.Content, &doc.ProjectID, &doc.ParentID, &doc.CreatedAt, &doc.UpdatedAt)
		if err != nil {
			return nil, err
		}
		list = append(list, &doc)
	}
	return list, nil
}

func (r *PostgresDocumentRepository) Create(ctx context.Context, doc *domain.Document) error {
	_, err := r.db.Exec(ctx,
		"INSERT INTO documents (id, title, content, project_id, parent_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		doc.ID, doc.Title, doc.Content, doc.ProjectID, doc.ParentID, doc.CreatedAt, doc.UpdatedAt,
	)
	return err
}

func (r *PostgresDocumentRepository) Update(ctx context.Context, doc *domain.Document) error {
	_, err := r.db.Exec(ctx,
		"UPDATE documents SET title = $1, content = $2, parent_id = $3, updated_at = $4 WHERE id = $5",
		doc.Title, doc.Content, doc.ParentID, doc.UpdatedAt, doc.ID,
	)
	return err
}

func (r *PostgresDocumentRepository) Delete(ctx context.Context, id string) error {
	ct, err := r.db.Exec(ctx, "DELETE FROM documents WHERE id = $1", id)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("document not found")
	}
	return nil
}

func (r *PostgresDocumentRepository) SaveVersion(ctx context.Context, version *domain.DocumentVersion) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO document_versions (id, document_id, content, version_number, created_by, change_summary, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		version.ID, version.DocumentID, version.Content, version.VersionNumber, version.CreatedBy, version.ChangeSummary, version.CreatedAt,
	)
	return err
}

func (r *PostgresDocumentRepository) GetVersions(ctx context.Context, docID string) ([]*domain.DocumentVersion, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, document_id, content, version_number, created_by, change_summary, created_at
		 FROM document_versions
		 WHERE document_id = $1
		 ORDER BY version_number DESC`,
		docID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.DocumentVersion
	for rows.Next() {
		var v domain.DocumentVersion
		err := rows.Scan(&v.ID, &v.DocumentID, &v.Content, &v.VersionNumber, &v.CreatedBy, &v.ChangeSummary, &v.CreatedAt)
		if err != nil {
			return nil, err
		}
		list = append(list, &v)
	}
	return list, nil
}

func (r *PostgresDocumentRepository) GetVersionByID(ctx context.Context, versionID string) (*domain.DocumentVersion, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, document_id, content, version_number, created_by, change_summary, created_at
		 FROM document_versions
		 WHERE id = $1`,
		versionID,
	)
	var v domain.DocumentVersion
	err := row.Scan(&v.ID, &v.DocumentID, &v.Content, &v.VersionNumber, &v.CreatedBy, &v.ChangeSummary, &v.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("version not found")
		}
		return nil, err
	}
	return &v, nil
}

func (r *PostgresDocumentRepository) GetLatestVersion(ctx context.Context, docID string) (*domain.DocumentVersion, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, document_id, content, version_number, created_by, change_summary, created_at
		 FROM document_versions
		 WHERE document_id = $1
		 ORDER BY version_number DESC
		 LIMIT 1`,
		docID,
	)
	var v domain.DocumentVersion
	err := row.Scan(&v.ID, &v.DocumentID, &v.Content, &v.VersionNumber, &v.CreatedBy, &v.ChangeSummary, &v.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // Return nil, nil when no versions exist yet
		}
		return nil, err
	}
	return &v, nil
}

func (r *PostgresDocumentRepository) UpdateEmbedding(ctx context.Context, docID string, embedding []float32) error {
	vStr := formatVector(embedding)
	_, err := r.db.Exec(ctx, "UPDATE documents SET embedding = $1 WHERE id = $2", vStr, docID)
	return err
}

func (r *PostgresDocumentRepository) Search(ctx context.Context, query string, projectId string, embedding []float32) ([]*domain.Document, error) {
	var rows pgx.Rows
	var err error

	if len(embedding) > 0 {
		vStr := formatVector(embedding)
		rows, err = r.db.Query(ctx,
			`SELECT id, title, content, project_id, parent_id, created_at, updated_at
			 FROM documents
			 WHERE project_id = $1
			 ORDER BY embedding <=> $2
			 LIMIT 10`,
			projectId, vStr,
		)
	} else {
		searchPattern := "%" + query + "%"
		rows, err = r.db.Query(ctx,
			`SELECT id, title, content, project_id, parent_id, created_at, updated_at
			 FROM documents
			 WHERE project_id = $1 AND (title ILIKE $2 OR content ILIKE $2)
			 LIMIT 20`,
			projectId, searchPattern,
		)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.Document
	for rows.Next() {
		var doc domain.Document
		err := rows.Scan(&doc.ID, &doc.Title, &doc.Content, &doc.ProjectID, &doc.ParentID, &doc.CreatedAt, &doc.UpdatedAt)
		if err != nil {
			return nil, err
		}
		list = append(list, &doc)
	}
	return list, nil
}

func formatVector(v []float32) string {
	if len(v) == 0 {
		return ""
	}
	var buf bytes.Buffer
	buf.WriteByte('[')
	for i, f := range v {
		if i > 0 {
			buf.WriteByte(',')
		}
		fmt.Fprintf(&buf, "%f", f)
	}
	buf.WriteByte(']')
	return buf.String()
}
