package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kollab/api/internal/domain"
)

type PostgresTemplateRepository struct {
	db *pgxpool.Pool
}

func NewPostgresTemplateRepository(db *pgxpool.Pool) *PostgresTemplateRepository {
	return &PostgresTemplateRepository{db: db}
}

func (r *PostgresTemplateRepository) Create(ctx context.Context, template *domain.Template) error {
	if template.ID == "" {
		template.ID = uuid.New().String()
	}

	query := `
		INSERT INTO templates (id, title, description, content, scope, template_type, team_id, user_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		RETURNING created_at
	`

	err := r.db.QueryRow(ctx, query,
		template.ID,
		template.Title,
		template.Description,
		template.Content,
		template.Scope,
		template.TemplateType,
		template.TeamID,
		template.UserID,
	).Scan(&template.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to insert template: %w", err)
	}

	return nil
}

func (r *PostgresTemplateRepository) GetByID(ctx context.Context, id string) (*domain.Template, error) {
	var template domain.Template
	query := `SELECT id, title, COALESCE(description, ''), content, scope, template_type, team_id, user_id, created_at FROM templates WHERE id = $1`

	err := r.db.QueryRow(ctx, query, id).Scan(
		&template.ID,
		&template.Title,
		&template.Description,
		&template.Content,
		&template.Scope,
		&template.TemplateType,
		&template.TeamID,
		&template.UserID,
		&template.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("template not found")
		}
		return nil, fmt.Errorf("failed to get template by id: %w", err)
	}

	return &template, nil
}

func (r *PostgresTemplateRepository) GetByContext(ctx context.Context, scope *domain.TemplateScope, templateType *domain.TemplateType, teamID *string, userID *string) ([]*domain.Template, error) {
	query := `SELECT id, title, COALESCE(description, ''), content, scope, template_type, team_id, user_id, created_at FROM templates WHERE 1=1`
	var args []interface{}
	argId := 1

	if scope != nil {
		query += fmt.Sprintf(" AND scope = $%d", argId)
		args = append(args, *scope)
		argId++
	}

	if templateType != nil {
		query += fmt.Sprintf(" AND template_type = $%d", argId)
		args = append(args, *templateType)
		argId++
	}

	if teamID != nil {
		query += fmt.Sprintf(" AND (team_id = $%d OR team_id IS NULL)", argId)
		args = append(args, *teamID)
		argId++
	}

	if userID != nil {
		query += fmt.Sprintf(" AND (user_id = $%d OR user_id IS NULL)", argId)
		args = append(args, *userID)
		argId++
	}

	query += ` ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query templates: %w", err)
	}
	defer rows.Close()

	templates := make([]*domain.Template, 0)
	for rows.Next() {
		var template domain.Template
		if err := rows.Scan(
			&template.ID,
			&template.Title,
			&template.Description,
			&template.Content,
			&template.Scope,
			&template.TemplateType,
			&template.TeamID,
			&template.UserID,
			&template.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan template: %w", err)
		}
		templates = append(templates, &template)
	}

	return templates, nil
}

func (r *PostgresTemplateRepository) Update(ctx context.Context, template *domain.Template) error {
	query := `
		UPDATE templates 
		SET title = $2, description = $3, content = $4, scope = $5, template_type = $6, team_id = $7, user_id = $8
		WHERE id = $1
	`

	cmdTag, err := r.db.Exec(ctx, query,
		template.ID,
		template.Title,
		template.Description,
		template.Content,
		template.Scope,
		template.TemplateType,
		template.TeamID,
		template.UserID,
	)

	if err != nil {
		return fmt.Errorf("failed to update template: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("template not found")
	}

	return nil
}

func (r *PostgresTemplateRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM templates WHERE id = $1`
	cmdTag, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete template: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("template not found")
	}

	return nil
}
