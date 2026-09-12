package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kollab/api/internal/domain"
)

type integrationRepository struct {
	db *pgxpool.Pool
}

func NewIntegrationRepository(db *pgxpool.Pool) domain.IntegrationRepository {
	return &integrationRepository{db: db}
}

func (r *integrationRepository) Create(ctx context.Context, integration *domain.Integration) error {
	if integration.ID == "" {
		integration.ID = uuid.New().String()
	}

	credsJSON, err := json.Marshal(integration.Credentials)
	if err != nil {
		return fmt.Errorf("failed to marshal credentials: %w", err)
	}

	query := `
		INSERT INTO integrations (id, scope, entity_id, provider, name, url, credentials, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING created_at, updated_at
	`

	var entityID sql.NullString
	if integration.EntityID != "" {
		entityID = sql.NullString{String: integration.EntityID, Valid: true}
	} else {
		entityID = sql.NullString{Valid: false}
	}

	err = r.db.QueryRow(ctx, query,
		integration.ID,
		integration.Scope,
		entityID,
		integration.Provider,
		integration.Name,
		integration.URL,
		credsJSON,
	).Scan(&integration.CreatedAt, &integration.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to insert integration: %w", err)
	}

	return nil
}

func (r *integrationRepository) GetByID(ctx context.Context, id string) (*domain.Integration, error) {
	query := `
		SELECT id, scope, entity_id, provider, name, url, credentials, created_at, updated_at
		FROM integrations
		WHERE id = $1
	`

	var integration domain.Integration
	var entityID sql.NullString
	var credsBytes []byte

	err := r.db.QueryRow(ctx, query, id).Scan(
		&integration.ID,
		&integration.Scope,
		&entityID,
		&integration.Provider,
		&integration.Name,
		&integration.URL,
		&credsBytes,
		&integration.CreatedAt,
		&integration.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("integration not found")
		}
		return nil, fmt.Errorf("failed to get integration: %w", err)
	}

	if entityID.Valid {
		integration.EntityID = entityID.String
	}

	if len(credsBytes) > 0 {
		if err := json.Unmarshal(credsBytes, &integration.Credentials); err != nil {
			return nil, fmt.Errorf("failed to unmarshal credentials: %w", err)
		}
	}

	return &integration, nil
}

func (r *integrationRepository) GetByScope(ctx context.Context, scope domain.IntegrationScope, entityID string) ([]*domain.Integration, error) {
	query := `
		SELECT id, scope, entity_id, provider, name, url, credentials, created_at, updated_at
		FROM integrations
		WHERE scope = $1 AND (entity_id = $2 OR ($2 = '' AND entity_id IS NULL))
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, query, scope, entityID)
	if err != nil {
		return nil, fmt.Errorf("failed to query integrations: %w", err)
	}
	defer rows.Close()

	integrations := make([]*domain.Integration, 0)
	for rows.Next() {
		var integration domain.Integration
		var eID sql.NullString
		var credsBytes []byte

		if err := rows.Scan(
			&integration.ID,
			&integration.Scope,
			&eID,
			&integration.Provider,
			&integration.Name,
			&integration.URL,
			&credsBytes,
			&integration.CreatedAt,
			&integration.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan integration: %w", err)
		}

		if eID.Valid {
			integration.EntityID = eID.String
		}

		if len(credsBytes) > 0 {
			if err := json.Unmarshal(credsBytes, &integration.Credentials); err != nil {
				return nil, fmt.Errorf("failed to unmarshal credentials: %w", err)
			}
		}

		integrations = append(integrations, &integration)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return integrations, nil
}

func (r *integrationRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM integrations WHERE id = $1`
	tag, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete integration: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("integration not found")
	}
	return nil
}
