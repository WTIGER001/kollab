package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"arkollab/api/internal/domain"
)

type PostgresTeamRepository struct {
	db *pgxpool.Pool
}

func NewPostgresTeamRepository(db *pgxpool.Pool) *PostgresTeamRepository {
	return &PostgresTeamRepository{db: db}
}

func (r *PostgresTeamRepository) GetTeamsByUserID(ctx context.Context, userID string) ([]*domain.Team, error) {
	query := `
		WITH user_teams AS (
			SELECT t.id, t.name
			FROM teams t
			JOIN team_members tm ON t.id = tm.team_id
			WHERE tm.user_id = $1
		)
		SELECT id, name FROM user_teams
		UNION ALL
		SELECT id, name FROM teams
		WHERE NOT EXISTS (SELECT 1 FROM user_teams)
		ORDER BY id
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.Team
	for rows.Next() {
		var t domain.Team
		if err := rows.Scan(&t.ID, &t.Name); err != nil {
			return nil, err
		}
		list = append(list, &t)
	}
	return list, nil
}

func (r *PostgresTeamRepository) GetProjectsByTeamID(ctx context.Context, teamID string) ([]*domain.Project, error) {
	var rows pgx.Rows
	var err error
	if teamID == "" {
		rows, err = r.db.Query(ctx, "SELECT id, name, team_id FROM projects")
	} else {
		rows, err = r.db.Query(ctx, "SELECT id, name, team_id FROM projects WHERE team_id = $1", teamID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.Project
	for rows.Next() {
		var p domain.Project
		if err := rows.Scan(&p.ID, &p.Name, &p.TeamID); err != nil {
			return nil, err
		}
		list = append(list, &p)
	}
	return list, nil
}

func (r *PostgresTeamRepository) GetProjectByID(ctx context.Context, id string) (*domain.Project, error) {
	row := r.db.QueryRow(ctx, "SELECT id, name, team_id FROM projects WHERE id = $1", id)
	var p domain.Project
	if err := row.Scan(&p.ID, &p.Name, &p.TeamID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}
	return &p, nil
}

func (r *PostgresTeamRepository) GetUsersByTeamID(ctx context.Context, teamID string) ([]*domain.User, error) {
	rows, err := r.db.Query(ctx, `
		SELECT tm.user_id, COALESCE(u.username, tm.user_id)
		FROM team_members tm
		LEFT JOIN users u ON tm.user_id = u.id
		WHERE tm.team_id = $1
		ORDER BY tm.user_id
	`, teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.User
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(&u.ID, &u.Username); err != nil {
			return nil, err
		}
		list = append(list, &u)
	}
	return list, nil
}
