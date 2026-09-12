package postgres

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kollab/api/internal/domain"
)

type PostgresDocumentRepository struct {
	db *pgxpool.Pool
}

func NewPostgresDocumentRepository(db *pgxpool.Pool) *PostgresDocumentRepository {
	return &PostgresDocumentRepository{db: db}
}

func (r *PostgresDocumentRepository) GetByID(ctx context.Context, id string) (*domain.Document, error) {
	row := r.db.QueryRow(ctx, `
		SELECT d.id, d.title, COALESCE(d.slug, ''), COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
		       COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
		       COALESCE(u1.display_name, u1.username, ''),
		       COALESCE(u2.display_name, u2.username, ''),
		       d.deleted_at
		FROM documents d
		LEFT JOIN users u1 ON d.created_by = u1.id
		LEFT JOIN users u2 ON d.updated_by = u2.id
		WHERE d.id = $1
	`, id)
	var doc domain.Document
	err := row.Scan(&doc.ID, &doc.Title, &doc.Slug, &doc.Content, &doc.ProjectID, &doc.TeamID, &doc.ParentID, &doc.CreatedAt, &doc.UpdatedAt, &doc.CreatedByID, &doc.UpdatedByID, &doc.CreatedBy, &doc.UpdatedBy, &doc.DeletedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Check if ID is a Team ID
			var teamName string
			errTeam := r.db.QueryRow(ctx, "SELECT name FROM teams WHERE id = $1", id).Scan(&teamName)
			if errTeam == nil {
				doc = domain.Document{
					ID:        id,
					Title:     teamName,
					Content:   portalDocumentContent(teamName),
					ProjectID: "",
					TeamID:    id,
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				}
				_, _ = r.db.Exec(ctx,
					"INSERT INTO documents (id, title, content, project_id, team_id, parent_id, created_at, updated_at, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
					doc.ID, doc.Title, doc.Content, nil, doc.TeamID, doc.ParentID, doc.CreatedAt, doc.UpdatedAt, nil, nil,
				)
				return &doc, nil
			}

			// Check if ID is a Project ID
			var projName string
			var teamID string
			errProj := r.db.QueryRow(ctx, "SELECT name, team_id FROM projects WHERE id = $1", id).Scan(&projName, &teamID)
			if errProj == nil {
				doc = domain.Document{
					ID:        id,
					Title:     projName,
					Content:   portalDocumentContent(projName),
					ProjectID: id,
					TeamID:    teamID,
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				}
				_, _ = r.db.Exec(ctx,
					"INSERT INTO documents (id, title, content, project_id, team_id, parent_id, created_at, updated_at, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
					doc.ID, doc.Title, doc.Content, doc.ProjectID, doc.TeamID, doc.ParentID, doc.CreatedAt, doc.UpdatedAt, nil, nil,
				)
				return &doc, nil
			}

			return nil, errors.New("document not found")
		}
		return nil, err
	}
	return &doc, nil
}

func (r *PostgresDocumentRepository) GetByIDOrSlug(ctx context.Context, idOrSlug string) (*domain.Document, string, error) {
	// First try to find by ID or Slug directly in documents
	row := r.db.QueryRow(ctx, `
		SELECT d.id, d.title, COALESCE(d.slug, ''), COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
		       COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
		       COALESCE(u1.display_name, u1.username, ''),
		       COALESCE(u2.display_name, u2.username, ''),
		       d.deleted_at
		FROM documents d
		LEFT JOIN users u1 ON d.created_by = u1.id
		LEFT JOIN users u2 ON d.updated_by = u2.id
		WHERE d.id = $1 OR d.slug = $1
	`, idOrSlug)

	var doc domain.Document
	err := row.Scan(&doc.ID, &doc.Title, &doc.Slug, &doc.Content, &doc.ProjectID, &doc.TeamID, &doc.ParentID, &doc.CreatedAt, &doc.UpdatedAt, &doc.CreatedByID, &doc.UpdatedByID, &doc.CreatedBy, &doc.UpdatedBy, &doc.DeletedAt)
	if err == nil {
		return &doc, "", nil
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, "", err
	}

	// If not found, check document_slug_aliases
	aliasRow := r.db.QueryRow(ctx, `
		SELECT d.id, d.title, COALESCE(d.slug, ''), COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
		       COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
		       COALESCE(u1.display_name, u1.username, ''),
		       COALESCE(u2.display_name, u2.username, ''),
		       d.deleted_at
		FROM document_slug_aliases a
		JOIN documents d ON a.document_id = d.id
		LEFT JOIN users u1 ON d.created_by = u1.id
		LEFT JOIN users u2 ON d.updated_by = u2.id
		WHERE a.old_slug = $1
	`, idOrSlug)

	err = aliasRow.Scan(&doc.ID, &doc.Title, &doc.Slug, &doc.Content, &doc.ProjectID, &doc.TeamID, &doc.ParentID, &doc.CreatedAt, &doc.UpdatedAt, &doc.CreatedByID, &doc.UpdatedByID, &doc.CreatedBy, &doc.UpdatedBy, &doc.DeletedAt)
	if err == nil {
		return &doc, idOrSlug, nil // Found via alias
	}

	// Fallback to the original GetByID logic (checking team ID or project ID creation)
	fallbackDoc, err := r.GetByID(ctx, idOrSlug)
	return fallbackDoc, "", err
}

func (r *PostgresDocumentRepository) GetByProjectID(ctx context.Context, projectId string) ([]*domain.Document, error) {
	rows, err := r.db.Query(ctx, `
		SELECT d.id, d.title, COALESCE(d.slug, ''), COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
		       COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
		       COALESCE(u1.display_name, u1.username, ''),
		       COALESCE(u2.display_name, u2.username, ''),
		       d.deleted_at
		FROM documents d
		LEFT JOIN users u1 ON d.created_by = u1.id
		LEFT JOIN users u2 ON d.updated_by = u2.id
		WHERE d.project_id = $1 AND d.deleted_at IS NULL
	`, projectId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	docs := make([]*domain.Document, 0)
	for rows.Next() {
		var doc domain.Document
		err := rows.Scan(&doc.ID, &doc.Title, &doc.Slug, &doc.Content, &doc.ProjectID, &doc.TeamID, &doc.ParentID, &doc.CreatedAt, &doc.UpdatedAt, &doc.CreatedByID, &doc.UpdatedByID, &doc.CreatedBy, &doc.UpdatedBy, &doc.DeletedAt)
		if err != nil {
			return nil, err
		}
		docs = append(docs, &doc)
	}
	return docs, nil
}

func (r *PostgresDocumentRepository) GetByTeamID(ctx context.Context, teamId string) ([]*domain.Document, error) {
	rows, err := r.db.Query(ctx, `
		SELECT d.id, d.title, COALESCE(d.slug, ''), COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
		       COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
		       COALESCE(u1.display_name, u1.username, ''),
		       COALESCE(u2.display_name, u2.username, ''),
		       d.deleted_at
		FROM documents d
		LEFT JOIN users u1 ON d.created_by = u1.id
		LEFT JOIN users u2 ON d.updated_by = u2.id
		WHERE d.team_id = $1 AND d.project_id IS NULL AND d.deleted_at IS NULL
	`, teamId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	docs := make([]*domain.Document, 0)
	for rows.Next() {
		var doc domain.Document
		err := rows.Scan(&doc.ID, &doc.Title, &doc.Slug, &doc.Content, &doc.ProjectID, &doc.TeamID, &doc.ParentID, &doc.CreatedAt, &doc.UpdatedAt, &doc.CreatedByID, &doc.UpdatedByID, &doc.CreatedBy, &doc.UpdatedBy, &doc.DeletedAt)
		if err != nil {
			return nil, err
		}
		docs = append(docs, &doc)
	}
	return docs, nil
}

func (r *PostgresDocumentRepository) GetDescendants(ctx context.Context, documentID string) ([]*domain.Document, error) {
	rows, err := r.db.Query(ctx, `
		WITH RECURSIVE descendants AS (
			SELECT id, 1 AS depth FROM documents WHERE parent_id = $1 AND deleted_at IS NULL
			UNION ALL
			SELECT d.id, descendants.depth + 1
			FROM documents d
			JOIN descendants ON d.parent_id = descendants.id
			WHERE d.deleted_at IS NULL
		)
		SELECT d.id, d.title, COALESCE(d.slug, ''), COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
		       COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
		       COALESCE(u1.display_name, u1.username, ''),
		       COALESCE(u2.display_name, u2.username, ''), d.deleted_at
		FROM descendants
		JOIN documents d ON d.id = descendants.id
		LEFT JOIN users u1 ON d.created_by = u1.id
		LEFT JOIN users u2 ON d.updated_by = u2.id
		ORDER BY descendants.depth, d.created_at, d.id
	`, documentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	documents := make([]*domain.Document, 0)
	for rows.Next() {
		var document domain.Document
		if err := rows.Scan(&document.ID, &document.Title, &document.Slug, &document.Content, &document.ProjectID, &document.TeamID, &document.ParentID, &document.CreatedAt, &document.UpdatedAt, &document.CreatedByID, &document.UpdatedByID, &document.CreatedBy, &document.UpdatedBy, &document.DeletedAt); err != nil {
			return nil, err
		}
		documents = append(documents, &document)
	}
	return documents, rows.Err()
}

func (r *PostgresDocumentRepository) Create(ctx context.Context, doc *domain.Document) error {
	var projID *string
	if doc.ProjectID != "" {
		projID = &doc.ProjectID
	}

	var slugPtr *string
	if doc.Slug != "" {
		slugPtr = &doc.Slug
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO documents (id, title, slug, content, project_id, team_id, parent_id, created_at, updated_at, created_by, updated_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, doc.ID, doc.Title, slugPtr, doc.Content, projID, doc.TeamID, doc.ParentID, doc.CreatedAt, doc.UpdatedAt, doc.CreatedByID, doc.UpdatedByID)
	return err
}

func (r *PostgresDocumentRepository) Update(ctx context.Context, doc *domain.Document) error {
	var projID *string
	if doc.ProjectID != "" {
		projID = &doc.ProjectID
	}

	var slugPtr *string
	if doc.Slug != "" {
		slugPtr = &doc.Slug
	}

	// Fetch old slug to see if it changed
	var oldSlug *string
	err := r.db.QueryRow(ctx, "SELECT slug FROM documents WHERE id = $1", doc.ID).Scan(&oldSlug)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}

	// Update document
	_, err = r.db.Exec(ctx, `
		UPDATE documents
		SET title = $2, slug = $3, content = $4, project_id = $5, team_id = $6, parent_id = $7, updated_at = $8, updated_by = $9
		WHERE id = $1
	`, doc.ID, doc.Title, slugPtr, doc.Content, projID, doc.TeamID, doc.ParentID, doc.UpdatedAt, doc.UpdatedByID)

	if err != nil {
		return err
	}

	// Insert into aliases if slug changed
	if oldSlug != nil && *oldSlug != "" && (slugPtr == nil || *oldSlug != *slugPtr) {
		_, _ = r.db.Exec(ctx, `
			INSERT INTO document_slug_aliases (document_id, old_slug)
			VALUES ($1, $2)
			ON CONFLICT (old_slug) DO NOTHING
		`, doc.ID, *oldSlug)
	}

	return nil
}

func (r *PostgresDocumentRepository) Delete(ctx context.Context, id string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Delete matching user favorites
	_, err = tx.Exec(ctx, `
		WITH RECURSIVE descendants AS (
			SELECT id FROM documents WHERE id = $1
			UNION ALL
			SELECT d.id FROM documents d JOIN descendants desc_ ON d.parent_id = desc_.id
		)
		DELETE FROM user_favorites WHERE document_id IN (SELECT id FROM descendants)
	`, id)
	if err != nil {
		return err
	}

	// Soft-delete documents
	ct, err := tx.Exec(ctx, `
		WITH RECURSIVE descendants AS (
			SELECT id FROM documents WHERE id = $1
			UNION ALL
			SELECT d.id FROM documents d JOIN descendants desc_ ON d.parent_id = desc_.id
		)
		UPDATE documents SET deleted_at = NOW() WHERE id IN (SELECT id FROM descendants)
	`, id)
	if err != nil {
		return err
	}

	if ct.RowsAffected() == 0 {
		return errors.New("document not found")
	}

	return tx.Commit(ctx)
}

func (r *PostgresDocumentRepository) GetTrashByProjectID(ctx context.Context, projectId string) ([]*domain.Document, error) {
	rows, err := r.db.Query(ctx, `
		SELECT d.id, d.title, COALESCE(d.slug, ''), COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
		       COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
		       COALESCE(u1.display_name, u1.username, ''),
		       COALESCE(u2.display_name, u2.username, ''),
		       d.deleted_at
		FROM documents d
		LEFT JOIN users u1 ON d.created_by = u1.id
		LEFT JOIN users u2 ON d.updated_by = u2.id
		WHERE d.project_id = $1 AND d.deleted_at IS NOT NULL
	`, projectId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	docs := make([]*domain.Document, 0)
	for rows.Next() {
		var doc domain.Document
		err := rows.Scan(&doc.ID, &doc.Title, &doc.Slug, &doc.Content, &doc.ProjectID, &doc.TeamID, &doc.ParentID, &doc.CreatedAt, &doc.UpdatedAt, &doc.CreatedByID, &doc.UpdatedByID, &doc.CreatedBy, &doc.UpdatedBy, &doc.DeletedAt)
		if err != nil {
			return nil, err
		}
		docs = append(docs, &doc)
	}
	return docs, nil
}

func (r *PostgresDocumentRepository) GetTrashByTeamID(ctx context.Context, teamId string) ([]*domain.Document, error) {
	rows, err := r.db.Query(ctx, `
		SELECT d.id, d.title, COALESCE(d.slug, ''), COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
		       COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
		       COALESCE(u1.display_name, u1.username, ''),
		       COALESCE(u2.display_name, u2.username, ''),
		       d.deleted_at
		FROM documents d
		LEFT JOIN users u1 ON d.created_by = u1.id
		LEFT JOIN users u2 ON d.updated_by = u2.id
		WHERE d.team_id = $1 AND d.project_id IS NULL AND d.deleted_at IS NOT NULL
	`, teamId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	docs := make([]*domain.Document, 0)
	for rows.Next() {
		var doc domain.Document
		err := rows.Scan(&doc.ID, &doc.Title, &doc.Slug, &doc.Content, &doc.ProjectID, &doc.TeamID, &doc.ParentID, &doc.CreatedAt, &doc.UpdatedAt, &doc.CreatedByID, &doc.UpdatedByID, &doc.CreatedBy, &doc.UpdatedBy, &doc.DeletedAt)
		if err != nil {
			return nil, err
		}
		docs = append(docs, &doc)
	}
	return docs, nil
}

func (r *PostgresDocumentRepository) Restore(ctx context.Context, id string) error {
	ct, err := r.db.Exec(ctx, "UPDATE documents SET deleted_at = NULL, updated_at = NOW() WHERE id = $1", id)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("document not found")
	}
	return nil
}

func (r *PostgresDocumentRepository) DeletePermanently(ctx context.Context, id string) error {
	ct, err := r.db.Exec(ctx, `
		WITH RECURSIVE descendants AS (
			SELECT id FROM documents WHERE id = $1
			UNION ALL
			SELECT d.id FROM documents d JOIN descendants desc_ ON d.parent_id = desc_.id
		)
		DELETE FROM documents WHERE id IN (SELECT id FROM descendants)
	`, id)
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

func (r *PostgresDocumentRepository) UpdateVersion(ctx context.Context, version *domain.DocumentVersion) error {
	_, err := r.db.Exec(ctx,
		`UPDATE document_versions
		 SET content = $1, created_by = $2, change_summary = $3, created_at = $4
		 WHERE id = $5`,
		version.Content, version.CreatedBy, version.ChangeSummary, version.CreatedAt, version.ID,
	)
	return err
}

func (r *PostgresDocumentRepository) GetVersions(ctx context.Context, docID string) ([]*domain.DocumentVersion, error) {
	rows, err := r.db.Query(ctx,
		`SELECT v.id, v.document_id, v.content, v.version_number, COALESCE(u.username, v.created_by) AS created_by, v.change_summary, v.created_at
		 FROM document_versions v
		 LEFT JOIN users u ON v.created_by = u.id
		 WHERE v.document_id = $1
		 ORDER BY v.version_number DESC`,
		docID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*domain.DocumentVersion, 0)
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
		`SELECT v.id, v.document_id, v.content, v.version_number, COALESCE(u.username, v.created_by) AS created_by, v.change_summary, v.created_at
		 FROM document_versions v
		 LEFT JOIN users u ON v.created_by = u.id
		 WHERE v.id = $1`,
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

func (r *PostgresDocumentRepository) GetPublication(ctx context.Context, documentID string) (*domain.DocumentPublication, error) {
	publication := &domain.DocumentPublication{DocumentID: documentID}
	err := r.db.QueryRow(ctx, `SELECT document_id, version_id, COALESCE(published_by, ''), published_at FROM document_publications WHERE document_id = $1`, documentID).Scan(&publication.DocumentID, &publication.VersionID, &publication.PublishedBy, &publication.PublishedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return publication, nil
}

func (r *PostgresDocumentRepository) SavePublication(ctx context.Context, publication *domain.DocumentPublication) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO document_publications (document_id, version_id, published_by, published_at)
		VALUES ($1, $2, NULLIF($3, ''), $4)
		ON CONFLICT (document_id) DO UPDATE SET version_id = EXCLUDED.version_id, published_by = EXCLUDED.published_by, published_at = EXCLUDED.published_at
	`, publication.DocumentID, publication.VersionID, publication.PublishedBy, publication.PublishedAt)
	return err
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
	isAll := projectId == "" || projectId == "all" || projectId == "*"
	isTeam := !isAll && (strings.HasPrefix(projectId, "team_") || strings.HasPrefix(projectId, "team-"))

	if len(embedding) > 0 {
		vStr := formatVector(embedding)
		if isAll {
			rows, err = r.db.Query(ctx,
				`SELECT d.id, d.title, COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
				        COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
				        COALESCE(u1.display_name, u1.username, ''),
				        COALESCE(u2.display_name, u2.username, ''),
				        d.deleted_at
				 FROM documents d
				 LEFT JOIN users u1 ON d.created_by = u1.id
				 LEFT JOIN users u2 ON d.updated_by = u2.id
				 WHERE d.deleted_at IS NULL
				 ORDER BY d.embedding <=> $1
				 LIMIT 10`,
				vStr,
			)
		} else if isTeam {
			rows, err = r.db.Query(ctx,
				`SELECT d.id, d.title, COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
				        COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
				        COALESCE(u1.display_name, u1.username, ''),
				        COALESCE(u2.display_name, u2.username, ''),
				        d.deleted_at
				 FROM documents d
				 LEFT JOIN users u1 ON d.created_by = u1.id
				 LEFT JOIN users u2 ON d.updated_by = u2.id
				 WHERE d.team_id = $1 AND d.deleted_at IS NULL
				 ORDER BY d.embedding <=> $2
				 LIMIT 10`,
				projectId, vStr,
			)
		} else {
			rows, err = r.db.Query(ctx,
				`SELECT d.id, d.title, COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
				        COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
				        COALESCE(u1.display_name, u1.username, ''),
				        COALESCE(u2.display_name, u2.username, ''),
				        d.deleted_at
				 FROM documents d
				 LEFT JOIN users u1 ON d.created_by = u1.id
				 LEFT JOIN users u2 ON d.updated_by = u2.id
				 WHERE d.project_id = $1 AND d.deleted_at IS NULL
				 ORDER BY d.embedding <=> $2
				 LIMIT 10`,
				projectId, vStr,
			)
		}
	} else {
		searchPattern := "%" + query + "%"
		if isAll {
			rows, err = r.db.Query(ctx,
				`SELECT d.id, d.title, COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
				        COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
				        COALESCE(u1.display_name, u1.username, ''),
				        COALESCE(u2.display_name, u2.username, ''),
				        d.deleted_at
				 FROM documents d
				 LEFT JOIN users u1 ON d.created_by = u1.id
				 LEFT JOIN users u2 ON d.updated_by = u2.id
				 WHERE d.deleted_at IS NULL AND (d.title ILIKE $1 OR COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) ILIKE $1)
				 LIMIT 20`,
				searchPattern,
			)
		} else if isTeam {
			rows, err = r.db.Query(ctx,
				`SELECT d.id, d.title, COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
				        COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
				        COALESCE(u1.display_name, u1.username, ''),
				        COALESCE(u2.display_name, u2.username, ''),
				        d.deleted_at
				 FROM documents d
				 LEFT JOIN users u1 ON d.created_by = u1.id
				 LEFT JOIN users u2 ON d.updated_by = u2.id
				 WHERE d.team_id = $1 AND d.deleted_at IS NULL AND (d.title ILIKE $2 OR COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) ILIKE $2)
				 LIMIT 20`,
				projectId, searchPattern,
			)
		} else {
			rows, err = r.db.Query(ctx,
				`SELECT d.id, d.title, COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
				        COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
				        COALESCE(u1.display_name, u1.username, ''),
				        COALESCE(u2.display_name, u2.username, ''),
				        d.deleted_at
				 FROM documents d
				 LEFT JOIN users u1 ON d.created_by = u1.id
				 LEFT JOIN users u2 ON d.updated_by = u2.id
				 WHERE d.project_id = $1 AND d.deleted_at IS NULL AND (d.title ILIKE $2 OR COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) ILIKE $2)
				 LIMIT 20`,
				projectId, searchPattern,
			)
		}
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*domain.Document, 0)
	for rows.Next() {
		var doc domain.Document
		err := rows.Scan(&doc.ID, &doc.Title, &doc.Content, &doc.ProjectID, &doc.TeamID, &doc.ParentID, &doc.CreatedAt, &doc.UpdatedAt, &doc.CreatedByID, &doc.UpdatedByID, &doc.CreatedBy, &doc.UpdatedBy, &doc.DeletedAt)
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

func (r *PostgresDocumentRepository) RecordView(ctx context.Context, id string, documentID string, userID string, viewedAt time.Time) error {
	_, err := r.db.Exec(ctx,
		"INSERT INTO document_views (id, document_id, user_id, viewed_at) VALUES ($1, $2, $3, $4)",
		id, documentID, userID, viewedAt,
	)
	return err
}

func (r *PostgresDocumentRepository) GetAnalytics(ctx context.Context, documentID string) (*domain.DocumentAnalytics, error) {
	var viewsThisWeek int
	var viewsPrevWeek int
	var visitorsThisWeek int

	queryTrend := `
		SELECT 
			COALESCE(COUNT(*) FILTER (WHERE viewed_at >= CURRENT_DATE - INTERVAL '6 days'), 0) as views_this_week,
			COALESCE(COUNT(*) FILTER (WHERE viewed_at >= CURRENT_DATE - INTERVAL '13 days' AND viewed_at < CURRENT_DATE - INTERVAL '6 days'), 0) as views_prev_week,
			COALESCE(COUNT(DISTINCT user_id) FILTER (WHERE viewed_at >= CURRENT_DATE - INTERVAL '6 days'), 0) as visitors_this_week
		FROM document_views
		WHERE document_id = $1 AND viewed_at >= CURRENT_DATE - INTERVAL '13 days'
	`
	err := r.db.QueryRow(ctx, queryTrend, documentID).Scan(&viewsThisWeek, &viewsPrevWeek, &visitorsThisWeek)
	if err != nil {
		return nil, fmt.Errorf("failed to query analytics trend: %w", err)
	}

	queryHistory := `
		SELECT 
			d.day::text as date_val,
			COALESCE(COUNT(v.id), 0) as views_count,
			COALESCE(COUNT(DISTINCT v.user_id), 0) as visitors_count
		FROM (
			SELECT generate_series(
				CURRENT_DATE - INTERVAL '6 days',
				CURRENT_DATE,
				INTERVAL '1 day'
			)::date as day
		) d
		LEFT JOIN document_views v ON DATE(v.viewed_at) = d.day AND v.document_id = $1
		GROUP BY d.day
		ORDER BY d.day ASC
	`
	rows, err := r.db.Query(ctx, queryHistory, documentID)
	if err != nil {
		return nil, fmt.Errorf("failed to query analytics history: %w", err)
	}
	defer rows.Close()

	history := make([]domain.AnalyticsDataPoint, 0)
	for rows.Next() {
		var dp domain.AnalyticsDataPoint
		err := rows.Scan(&dp.Date, &dp.Views, &dp.UniqueVisitors)
		if err != nil {
			return nil, fmt.Errorf("failed to scan analytics data point: %w", err)
		}
		history = append(history, dp)
	}

	var trendPercentage float64
	if viewsPrevWeek == 0 {
		if viewsThisWeek > 0 {
			trendPercentage = 100.0
		} else {
			trendPercentage = 0.0
		}
	} else {
		trendPercentage = float64(viewsThisWeek-viewsPrevWeek) / float64(viewsPrevWeek) * 100.0
	}

	return &domain.DocumentAnalytics{
		TotalViews:      viewsThisWeek,
		TotalVisitors:   visitorsThisWeek,
		TrendPercentage: trendPercentage,
		History:         history,
	}, nil
}

func (r *PostgresDocumentRepository) AddFavorite(ctx context.Context, userID string, documentID string) error {
	_, err := r.db.Exec(ctx,
		"INSERT INTO user_favorites (user_id, document_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id, document_id) DO NOTHING",
		userID, documentID,
	)
	return err
}

func (r *PostgresDocumentRepository) RemoveFavorite(ctx context.Context, userID string, documentID string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM user_favorites WHERE user_id = $1 AND document_id = $2", userID, documentID)
	return err
}

func (r *PostgresDocumentRepository) IsFavorite(ctx context.Context, userID string, documentID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM user_favorites WHERE user_id = $1 AND document_id = $2)", userID, documentID).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}

func (r *PostgresDocumentRepository) AddWatch(ctx context.Context, userID string, documentID string) error {
	_, err := r.db.Exec(ctx,
		"INSERT INTO document_watches (user_id, document_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id, document_id) DO NOTHING",
		userID, documentID,
	)
	return err
}

func (r *PostgresDocumentRepository) RemoveWatch(ctx context.Context, userID string, documentID string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM document_watches WHERE user_id = $1 AND document_id = $2", userID, documentID)
	return err
}

func (r *PostgresDocumentRepository) IsWatching(ctx context.Context, userID string, documentID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM document_watches WHERE user_id = $1 AND document_id = $2)", userID, documentID).Scan(&exists)
	return exists, err
}

func (r *PostgresDocumentRepository) ListWatchers(ctx context.Context, documentID string) ([]string, error) {
	rows, err := r.db.Query(ctx, "SELECT user_id FROM document_watches WHERE document_id = $1", documentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	watchers := []string{}
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}
		watchers = append(watchers, userID)
	}
	return watchers, rows.Err()
}

func (r *PostgresDocumentRepository) CreateNotification(ctx context.Context, notification *domain.DocumentNotification) error {
	_, err := r.db.Exec(ctx, `INSERT INTO document_notifications (id, user_id, actor_id, document_id, document_title, event_type, is_read, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, notification.ID, notification.UserID, notification.ActorID, notification.DocumentID, notification.DocumentTitle, notification.EventType, notification.IsRead, notification.CreatedAt)
	return err
}

func (r *PostgresDocumentRepository) ListNotifications(ctx context.Context, userID string) ([]*domain.DocumentNotification, error) {
	rows, err := r.db.Query(ctx, `SELECT id, user_id, COALESCE(actor_id,''), document_id, document_title, event_type, is_read, created_at FROM document_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []*domain.DocumentNotification{}
	for rows.Next() {
		notification := &domain.DocumentNotification{}
		if err := rows.Scan(&notification.ID, &notification.UserID, &notification.ActorID, &notification.DocumentID, &notification.DocumentTitle, &notification.EventType, &notification.IsRead, &notification.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, notification)
	}
	return result, rows.Err()
}

func (r *PostgresDocumentRepository) MarkNotificationRead(ctx context.Context, userID string, notificationID string) error {
	command, err := r.db.Exec(ctx, "UPDATE document_notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2", notificationID, userID)
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return errors.New("notification not found")
	}
	return nil
}

func (r *PostgresDocumentRepository) GetReview(ctx context.Context, documentID string) (*domain.DocumentReview, error) {
	review := &domain.DocumentReview{DocumentID: documentID, Status: "draft"}
	err := r.db.QueryRow(ctx, `
		SELECT document_id, review_status, next_review_at, COALESCE(updated_by, ''), updated_at
		FROM document_reviews WHERE document_id = $1
	`, documentID).Scan(&review.DocumentID, &review.Status, &review.NextReviewAt, &review.UpdatedByID, &review.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		var exists bool
		if checkErr := r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM documents WHERE id = $1)", documentID).Scan(&exists); checkErr != nil {
			return nil, checkErr
		} else if !exists {
			return nil, errors.New("document not found")
		}
		return review, nil
	}
	if err != nil {
		return nil, err
	}
	return review, nil
}

func (r *PostgresDocumentRepository) SaveReview(ctx context.Context, review *domain.DocumentReview) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO document_reviews (document_id, review_status, next_review_at, updated_by, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (document_id) DO UPDATE SET
			review_status = EXCLUDED.review_status,
			next_review_at = EXCLUDED.next_review_at,
			updated_by = EXCLUDED.updated_by,
			updated_at = EXCLUDED.updated_at
	`, review.DocumentID, review.Status, review.NextReviewAt, review.UpdatedByID, review.UpdatedAt)
	return err
}

func (r *PostgresDocumentRepository) FindConfluenceImport(ctx context.Context, archiveSHA256, sourcePath, teamID, projectID string) (*domain.ConfluenceImportRecord, error) {
	record := &domain.ConfluenceImportRecord{}
	err := r.db.QueryRow(ctx, `
		SELECT archive_sha256, source_path, team_id, project_id, document_id, created_at
		FROM confluence_import_records
		WHERE archive_sha256 = $1 AND source_path = $2 AND team_id = $3 AND project_id = $4
	`, archiveSHA256, sourcePath, teamID, projectID).Scan(&record.ArchiveSHA256, &record.SourcePath, &record.TeamID, &record.ProjectID, &record.DocumentID, &record.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return record, nil
}

func (r *PostgresDocumentRepository) RecordConfluenceImport(ctx context.Context, record *domain.ConfluenceImportRecord) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO confluence_import_records (archive_sha256, source_path, team_id, project_id, document_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (archive_sha256, source_path, team_id, project_id) DO NOTHING
	`, record.ArchiveSHA256, record.SourcePath, record.TeamID, record.ProjectID, record.DocumentID, record.CreatedAt)
	return err
}

func (r *PostgresDocumentRepository) GetFavorites(ctx context.Context, userID string) ([]*domain.Favorite, error) {
	query := `
		SELECT 
			f.document_id,
			f.created_at,
			d.title,
			COALESCE(d.project_id, '') as project_id,
			d.team_id,
			COALESCE(p.name, '') as project_name,
			t.name as team_name,
			COALESCE((
				SELECT v.viewed_at 
				FROM document_views v 
				WHERE v.document_id = f.document_id AND v.user_id = f.user_id 
				ORDER BY v.viewed_at DESC 
				LIMIT 1
			), d.updated_at) as last_accessed
		FROM user_favorites f
		JOIN documents d ON f.document_id = d.id
		JOIN teams t ON d.team_id = t.id
		LEFT JOIN projects p ON d.project_id = p.id
		WHERE f.user_id = $1 AND d.deleted_at IS NULL AND (d.project_id IS NULL OR p.id IS NOT NULL)
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []*domain.Favorite{}
	for rows.Next() {
		var fav domain.Favorite
		var projectID string
		var teamID string
		var projectName string
		var teamName string

		err := rows.Scan(
			&fav.DocumentID,
			&fav.CreatedAt,
			&fav.Title,
			&projectID,
			&teamID,
			&projectName,
			&teamName,
			&fav.LastAccessedAt,
		)
		if err != nil {
			return nil, err
		}
		fav.UserID = userID
		fav.TeamID = teamID
		fav.ProjectID = projectID

		// Determine SpaceType and SpaceName
		if strings.HasPrefix(teamID, "personal_") {
			fav.SpaceType = "personal"
			fav.SpaceName = "Personal Space"
		} else if projectID != "" {
			fav.SpaceType = "project"
			fav.SpaceName = projectName
		} else {
			fav.SpaceType = "team"
			fav.SpaceName = teamName
		}

		list = append(list, &fav)
	}
	return list, nil
}

func (r *PostgresDocumentRepository) GetRecent(ctx context.Context, userID string, filterType string) ([]*domain.Document, error) {
	var rows pgx.Rows
	var err error

	if filterType == "views" {
		query := `
			SELECT id, title, content, project_id, team_id, parent_id, created_at, updated_at, created_by_id, updated_by_id, created_by, updated_by, deleted_at
			FROM (
				SELECT DISTINCT ON (d.id) d.id, d.title, COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, '') AS project_id, d.team_id, d.parent_id, d.created_at, d.updated_at,
				       COALESCE(d.created_by, '') AS created_by_id, COALESCE(d.updated_by, '') AS updated_by_id,
				       COALESCE(u1.display_name, u1.username, '') AS created_by,
				       COALESCE(u2.display_name, u2.username, '') AS updated_by,
				       dv.viewed_at AS event_time,
				       d.deleted_at
				FROM documents d
				INNER JOIN document_views dv ON d.id = dv.document_id
				LEFT JOIN users u1 ON d.created_by = u1.id
				LEFT JOIN users u2 ON d.updated_by = u2.id
				WHERE dv.user_id = $1 AND d.deleted_at IS NULL
				ORDER BY d.id, dv.viewed_at DESC
			) sub
			ORDER BY event_time DESC
			LIMIT 50
		`
		rows, err = r.db.Query(ctx, query, userID)
	} else if filterType == "edits" {
		query := `
			SELECT d.id, d.title, COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
			       COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
			       COALESCE(u1.display_name, u1.username, ''),
			       COALESCE(u2.display_name, u2.username, ''),
			       d.deleted_at
			FROM documents d
			LEFT JOIN users u1 ON d.created_by = u1.id
			LEFT JOIN users u2 ON d.updated_by = u2.id
			WHERE (d.updated_by = $1 OR d.created_by = $1) AND d.deleted_at IS NULL
			ORDER BY d.updated_at DESC
			LIMIT 50
		`
		rows, err = r.db.Query(ctx, query, userID)
	} else {
		query := `
			SELECT id, title, content, project_id, team_id, parent_id, created_at, updated_at, created_by_id, updated_by_id, created_by, updated_by, deleted_at
			FROM (
				SELECT DISTINCT ON (d.id) d.id, d.title, COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, '') AS project_id, d.team_id, d.parent_id, d.created_at, d.updated_at,
				       COALESCE(d.created_by, '') AS created_by_id, COALESCE(d.updated_by, '') AS updated_by_id,
				       COALESCE(u1.display_name, u1.username, '') AS created_by,
				       COALESCE(u2.display_name, u2.username, '') AS updated_by,
				       GREATEST(d.updated_at, COALESCE(dv.viewed_at, '1970-01-01 00:00:00'::timestamp)) AS event_time,
				       d.deleted_at
				FROM documents d
				LEFT JOIN document_views dv ON d.id = dv.document_id AND dv.user_id = $1
				LEFT JOIN users u1 ON d.created_by = u1.id
				LEFT JOIN users u2 ON d.updated_by = u2.id
				WHERE (dv.user_id = $1 OR d.updated_by = $1 OR d.created_by = $1) AND d.deleted_at IS NULL
				ORDER BY d.id, event_time DESC
			) sub
			ORDER BY event_time DESC
			LIMIT 50
		`
		rows, err = r.db.Query(ctx, query, userID)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*domain.Document, 0)
	for rows.Next() {
		var doc domain.Document
		err := rows.Scan(&doc.ID, &doc.Title, &doc.Content, &doc.ProjectID, &doc.TeamID, &doc.ParentID, &doc.CreatedAt, &doc.UpdatedAt, &doc.CreatedByID, &doc.UpdatedByID, &doc.CreatedBy, &doc.UpdatedBy, &doc.DeletedAt)
		if err != nil {
			return nil, err
		}
		list = append(list, &doc)
	}
	return list, nil
}

func (r *PostgresDocumentRepository) GetDocumentsWithMention(ctx context.Context, username string) ([]*domain.Document, error) {
	rows, err := r.db.Query(ctx, `
		SELECT d.id, d.title, COALESCE((SELECT cs.content FROM collaborative_states cs WHERE cs.document_id=d.id), d.content) AS content, COALESCE(d.project_id, ''), d.team_id, d.parent_id, d.created_at, d.updated_at,
		       COALESCE(d.created_by, ''), COALESCE(d.updated_by, ''),
		       COALESCE(u1.display_name, u1.username, ''),
		       COALESCE(u2.display_name, u2.username, ''),
		       d.deleted_at
		FROM documents d
		LEFT JOIN users u1 ON d.created_by = u1.id
		LEFT JOIN users u2 ON d.updated_by = u2.id
		WHERE d.content LIKE '%"type":"mention"%' 
		  AND d.content LIKE '%' || $1 || '%' 
		  AND d.deleted_at IS NULL
		ORDER BY d.updated_at DESC
	`, username)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*domain.Document, 0)
	for rows.Next() {
		var doc domain.Document
		err := rows.Scan(&doc.ID, &doc.Title, &doc.Content, &doc.ProjectID, &doc.TeamID, &doc.ParentID, &doc.CreatedAt, &doc.UpdatedAt, &doc.CreatedByID, &doc.UpdatedByID, &doc.CreatedBy, &doc.UpdatedBy, &doc.DeletedAt)
		if err != nil {
			return nil, err
		}
		list = append(list, &doc)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	return list, nil
}

func (r *PostgresDocumentRepository) ReplaceProperties(ctx context.Context, documentID string, properties []domain.DocumentProperty) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, "DELETE FROM document_properties WHERE document_id = $1", documentID); err != nil {
		return err
	}
	for _, property := range properties {
		if _, err := tx.Exec(ctx, `
			INSERT INTO document_properties (document_id, property_key, property_value, value_type, updated_at)
			VALUES ($1, $2, $3, $4, $5)
		`, documentID, property.Key, property.Value, property.ValueType, property.UpdatedAt); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *PostgresDocumentRepository) ListProperties(ctx context.Context, projectID string, teamID string, key string) ([]domain.DocumentProperty, error) {
	rows, err := r.db.Query(ctx, `
		SELECT p.document_id, d.title, COALESCE(d.project_id, ''), d.team_id,
		       p.property_key, p.property_value, p.value_type, p.updated_at
		FROM document_properties p
		JOIN documents d ON d.id = p.document_id
		WHERE d.deleted_at IS NULL
		  AND ($1 = '' OR d.project_id = $1)
		  AND ($2 = '' OR d.team_id = $2)
		  AND ($3 = '' OR p.property_key = $3)
		ORDER BY p.property_key, d.title
	`, projectID, teamID, key)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	properties := []domain.DocumentProperty{}
	for rows.Next() {
		var property domain.DocumentProperty
		if err := rows.Scan(&property.DocumentID, &property.Title, &property.ProjectID, &property.TeamID, &property.Key, &property.Value, &property.ValueType, &property.UpdatedAt); err != nil {
			return nil, err
		}
		properties = append(properties, property)
	}
	return properties, rows.Err()
}

func portalDocumentContent(name string) string {
	content, _ := json.Marshal(map[string]any{"type": "doc", "content": []any{map[string]any{"type": "heading", "attrs": map[string]any{"level": 1}, "content": []any{map[string]any{"type": "text", "text": name}}}}})
	return string(content)
}
