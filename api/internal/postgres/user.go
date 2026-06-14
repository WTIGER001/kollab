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
	row := r.db.QueryRow(ctx, "SELECT id, username, password_hash FROM users WHERE username = $1", username)
	var u domain.User
	if err := row.Scan(&u.ID, &u.Username, &u.PasswordHash); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &u, nil
}

func (r *PostgresUserRepository) Create(ctx context.Context, u *domain.User) error {
	_, err := r.db.Exec(ctx, "INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3)", u.ID, u.Username, u.PasswordHash)
	return err
}
