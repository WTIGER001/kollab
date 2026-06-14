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
			SELECT t.id, t.name, COALESCE(t.abbreviation, '') AS abbreviation, COALESCE(t.description, '') AS description
			FROM teams t
			JOIN team_members tm ON t.id = tm.team_id
			WHERE tm.user_id = $1
		)
		SELECT id, name, abbreviation, description FROM user_teams
		UNION ALL
		SELECT id, name, COALESCE(abbreviation, ''), COALESCE(description, '') FROM teams
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
		if err := rows.Scan(&t.ID, &t.Name, &t.Abbreviation, &t.Description); err != nil {
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
		rows, err = r.db.Query(ctx, "SELECT id, name, team_id, COALESCE(logo_url, ''), COALESCE(abbreviation, ''), COALESCE(description, '') FROM projects")
	} else {
		rows, err = r.db.Query(ctx, "SELECT id, name, team_id, COALESCE(logo_url, ''), COALESCE(abbreviation, ''), COALESCE(description, '') FROM projects WHERE team_id = $1", teamID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.Project
	for rows.Next() {
		var p domain.Project
		if err := rows.Scan(&p.ID, &p.Name, &p.TeamID, &p.LogoURL, &p.Abbreviation, &p.Description); err != nil {
			return nil, err
		}
		list = append(list, &p)
	}
	return list, nil
}

func (r *PostgresTeamRepository) GetProjectByID(ctx context.Context, id string) (*domain.Project, error) {
	row := r.db.QueryRow(ctx, "SELECT id, name, team_id, COALESCE(logo_url, ''), COALESCE(abbreviation, ''), COALESCE(description, '') FROM projects WHERE id = $1", id)
	var p domain.Project
	if err := row.Scan(&p.ID, &p.Name, &p.TeamID, &p.LogoURL, &p.Abbreviation, &p.Description); err != nil {
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

func (r *PostgresTeamRepository) UpdateTeam(ctx context.Context, team *domain.Team) error {
	var exists bool
	err := r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM teams WHERE id != $1 AND abbreviation = $2)", team.ID, team.Abbreviation).Scan(&exists)
	if err != nil {
		return err
	}
	if exists && team.Abbreviation != "" {
		return errors.New("team abbreviation must be unique systemwide")
	}

	_, err = r.db.Exec(ctx, `
		UPDATE teams
		SET name = $1, abbreviation = $2, description = $3
		WHERE id = $4
	`, team.Name, team.Abbreviation, team.Description, team.ID)
	return err
}

func (r *PostgresTeamRepository) UpdateProject(ctx context.Context, project *domain.Project) error {
	var exists bool
	err := r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM projects WHERE id != $1 AND team_id = $2 AND abbreviation = $3)", project.ID, project.TeamID, project.Abbreviation).Scan(&exists)
	if err != nil {
		return err
	}
	if exists && project.Abbreviation != "" {
		return errors.New("project abbreviation must be unique in this team")
	}

	_, err = r.db.Exec(ctx, `
		UPDATE projects
		SET name = $1, logo_url = $2, abbreviation = $3, description = $4
		WHERE id = $5
	`, project.Name, project.LogoURL, project.Abbreviation, project.Description, project.ID)
	return err
}

func (r *PostgresTeamRepository) GetTeamByAbbreviation(ctx context.Context, abbreviation string) (*domain.Team, error) {
	row := r.db.QueryRow(ctx, "SELECT id, name, COALESCE(abbreviation, ''), COALESCE(description, '') FROM teams WHERE abbreviation = $1", abbreviation)
	var t domain.Team
	if err := row.Scan(&t.ID, &t.Name, &t.Abbreviation, &t.Description); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("team not found")
		}
		return nil, err
	}
	return &t, nil
}

func (r *PostgresTeamRepository) CreateTeam(ctx context.Context, team *domain.Team) error {
	var exists bool
	if team.Abbreviation != "" {
		err := r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM teams WHERE abbreviation = $1)", team.Abbreviation).Scan(&exists)
		if err != nil {
			return err
		}
		if exists {
			return errors.New("team abbreviation must be unique systemwide")
		}
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO teams (id, name, abbreviation, description)
		VALUES ($1, $2, $3, $4)
	`, team.ID, team.Name, team.Abbreviation, team.Description)
	return err
}

func (r *PostgresTeamRepository) CreateProject(ctx context.Context, project *domain.Project) error {
	var exists bool
	if project.Abbreviation != "" {
		err := r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM projects WHERE team_id = $1 AND abbreviation = $2)", project.TeamID, project.Abbreviation).Scan(&exists)
		if err != nil {
			return err
		}
		if exists {
			return errors.New("project abbreviation must be unique in this team")
		}
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO projects (id, name, team_id, logo_url, abbreviation, description)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, project.ID, project.Name, project.TeamID, project.LogoURL, project.Abbreviation, project.Description)
	return err
}

func (r *PostgresTeamRepository) AddTeamMember(ctx context.Context, teamID string, userID string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO team_members (team_id, user_id)
		VALUES ($1, $2)
		ON CONFLICT (team_id, user_id) DO NOTHING
	`, teamID, userID)
	return err
}
