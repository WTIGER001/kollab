package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"arkollab/api/internal/domain"
)

type PostgresThemeRepository struct {
	db *pgxpool.Pool
}

func NewPostgresThemeRepository(db *pgxpool.Pool) *PostgresThemeRepository {
	return &PostgresThemeRepository{db: db}
}

func (r *PostgresThemeRepository) GetDefaultTheme(ctx context.Context) (*domain.WorkspaceTheme, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, name, logo_url, light_mode, dark_mode, is_default
		FROM workspace_themes
		WHERE is_default = TRUE
		LIMIT 1
	`)

	var t domain.WorkspaceTheme
	var lightBytes, darkBytes []byte
	err := row.Scan(&t.ID, &t.Name, &t.LogoURL, &lightBytes, &darkBytes, &t.IsDefault)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("default theme not found")
		}
		return nil, err
	}

	if err := json.Unmarshal(lightBytes, &t.LightMode); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(darkBytes, &t.DarkMode); err != nil {
		return nil, err
	}

	return &t, nil
}

func (r *PostgresThemeRepository) SaveTheme(ctx context.Context, theme *domain.WorkspaceTheme) error {
	lightBytes, err := json.Marshal(theme.LightMode)
	if err != nil {
		return err
	}
	darkBytes, err := json.Marshal(theme.DarkMode)
	if err != nil {
		return err
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO workspace_themes (id, name, logo_url, light_mode, dark_mode, is_default)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			logo_url = EXCLUDED.logo_url,
			light_mode = EXCLUDED.light_mode,
			dark_mode = EXCLUDED.dark_mode,
			is_default = EXCLUDED.is_default
	`, theme.ID, theme.Name, theme.LogoURL, lightBytes, darkBytes, theme.IsDefault)
	return err
}

func (r *PostgresThemeRepository) GetUserPreference(ctx context.Context, userID string) (*domain.UserPreference, error) {
	row := r.db.QueryRow(ctx, `
		SELECT user_id, theme_mode, updated_at
		FROM user_preferences
		WHERE user_id = $1
	`, userID)

	var p domain.UserPreference
	err := row.Scan(&p.UserID, &p.ThemeMode, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &domain.UserPreference{
				UserID:    userID,
				ThemeMode: "dark",
				UpdatedAt: time.Now(),
			}, nil
		}
		return nil, err
	}

	return &p, nil
}

func (r *PostgresThemeRepository) SaveUserPreference(ctx context.Context, pref *domain.UserPreference) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO user_preferences (user_id, theme_mode, updated_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id) DO UPDATE SET
			theme_mode = EXCLUDED.theme_mode,
			updated_at = EXCLUDED.updated_at
	`, pref.UserID, pref.ThemeMode, pref.UpdatedAt)
	return err
}
