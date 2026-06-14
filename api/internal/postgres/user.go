package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"arkollab/api/internal/domain"
)

type PostgresUserRepository struct {
	db *pgxpool.Pool
}

func NewPostgresUserRepository(db *pgxpool.Pool) *PostgresUserRepository {
	return &PostgresUserRepository{db: db}
}

func (r *PostgresUserRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	row := r.db.QueryRow(ctx, "SELECT id, username, password_hash, COALESCE(email, ''), COALESCE(display_name, '') FROM users WHERE username = $1", username)
	var u domain.User
	if err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Email, &u.DisplayName); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &u, nil
}

func (r *PostgresUserRepository) Create(ctx context.Context, u *domain.User) error {
	_, err := r.db.Exec(ctx, "INSERT INTO users (id, username, password_hash, email, display_name) VALUES ($1, $2, $3, $4, $5)", u.ID, u.Username, u.PasswordHash, u.Email, u.DisplayName)
	return err
}

func (r *PostgresUserRepository) Upsert(ctx context.Context, u *domain.User) error {
	var passwordHash *string
	if u.PasswordHash != "" {
		passwordHash = &u.PasswordHash
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO users (id, username, password_hash, email, display_name)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (id) DO UPDATE
		SET username = EXCLUDED.username,
		    email = EXCLUDED.email,
		    display_name = EXCLUDED.display_name,
		    password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash)
	`, u.ID, u.Username, passwordHash, u.Email, u.DisplayName)
	return err
}
