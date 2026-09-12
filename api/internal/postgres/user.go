package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kollab/api/internal/domain"
)

type PostgresUserRepository struct {
	db *pgxpool.Pool
}

func NewPostgresUserRepository(db *pgxpool.Pool) *PostgresUserRepository {
	return &PostgresUserRepository{db: db}
}

func (r *PostgresUserRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	row := r.db.QueryRow(ctx, "SELECT id, username, COALESCE(password_hash, ''), COALESCE(email, ''), COALESCE(display_name, ''), is_active FROM users WHERE username = $1", username)
	var u domain.User
	if err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Email, &u.DisplayName, &u.IsActive); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &u, nil
}

func (r *PostgresUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	row := r.db.QueryRow(ctx, "SELECT id, username, COALESCE(password_hash, ''), COALESCE(email, ''), COALESCE(display_name, ''), is_active FROM users WHERE id = $1", id)
	var u domain.User
	if err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Email, &u.DisplayName, &u.IsActive); err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *PostgresUserRepository) List(ctx context.Context) ([]*domain.User, error) {
	rows, err := r.db.Query(ctx, "SELECT id, username, COALESCE(password_hash, ''), COALESCE(email, ''), COALESCE(display_name, ''), is_active FROM users ORDER BY username")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	users := []*domain.User{}
	for rows.Next() {
		u := &domain.User{}
		if err := rows.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Email, &u.DisplayName, &u.IsActive); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *PostgresUserRepository) Create(ctx context.Context, u *domain.User) error {
	_, err := r.db.Exec(ctx, "INSERT INTO users (id, username, password_hash, email, display_name, is_active) VALUES ($1, $2, $3, $4, $5, $6)", u.ID, u.Username, u.PasswordHash, u.Email, u.DisplayName, u.IsActive)
	return err
}

func (r *PostgresUserRepository) Upsert(ctx context.Context, u *domain.User) error {
	isActive := u.IsActive
	if !isActive {
		isActive = true
	}
	var passwordHash *string
	if u.PasswordHash != "" {
		passwordHash = &u.PasswordHash
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO users (id, username, password_hash, email, display_name, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE
		SET username = EXCLUDED.username,
		    email = EXCLUDED.email,
		    display_name = EXCLUDED.display_name,
		    password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash)
	`, u.ID, u.Username, passwordHash, u.Email, u.DisplayName, isActive)
	return err
}

func (r *PostgresUserRepository) SetActive(ctx context.Context, id string, active bool) error {
	_, err := r.db.Exec(ctx, "UPDATE users SET is_active = $2 WHERE id = $1", id, active)
	return err
}
func (r *PostgresUserRepository) UpdatePassword(ctx context.Context, id, passwordHash string) error {
	_, err := r.db.Exec(ctx, "UPDATE users SET password_hash = $2 WHERE id = $1", id, passwordHash)
	return err
}

func (r *PostgresUserRepository) UpdateProfile(ctx context.Context, id, email, displayName string) (*domain.User, error) {
	row := r.db.QueryRow(ctx, "UPDATE users SET email = $2, display_name = $3 WHERE id = $1 RETURNING id, username, COALESCE(password_hash, ''), COALESCE(email, ''), COALESCE(display_name, ''), is_active", id, email, displayName)
	var u domain.User
	if err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Email, &u.DisplayName, &u.IsActive); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &u, nil
}

func (r *PostgresUserRepository) Delete(ctx context.Context, id string) error {
	command, err := r.db.Exec(ctx, "DELETE FROM users WHERE id = $1", id)
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return errors.New("user not found")
	}
	return nil
}

// CreateInitialLocalAdmin serializes first-account creation so a public setup
// endpoint cannot race into creating more than one administrator.
func (r *PostgresUserRepository) CreateInitialLocalAdmin(ctx context.Context, u *domain.User) (bool, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext('kollab:first-local-admin'))"); err != nil {
		return false, err
	}
	var exists bool
	if err := tx.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM users)").Scan(&exists); err != nil {
		return false, err
	}
	if exists {
		return false, nil
	}
	if _, err := tx.Exec(ctx, "INSERT INTO users (id, username, password_hash, email, display_name, is_active) VALUES ($1, $2, $3, $4, $5, TRUE)", u.ID, u.Username, u.PasswordHash, u.Email, u.DisplayName); err != nil {
		return false, err
	}
	return true, tx.Commit(ctx)
}
