package domain

import (
	"context"
)

type Team struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Abbreviation string `json:"abbreviation"`
	Description  string `json:"description"`
}

type Project struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	TeamID       string `json:"teamId"`
	LogoURL      string `json:"logoUrl"`
	Abbreviation string `json:"abbreviation"`
	Description  string `json:"description"`
}

type TeamRepository interface {
	GetTeamsByUserID(ctx context.Context, userID string) ([]*Team, error)
	GetProjectsByTeamID(ctx context.Context, teamID string) ([]*Project, error)
	GetProjectByID(ctx context.Context, id string) (*Project, error)
	GetUsersByTeamID(ctx context.Context, teamID string) ([]*User, error)
	UpdateTeam(ctx context.Context, team *Team) error
	UpdateProject(ctx context.Context, project *Project) error
	GetTeamByAbbreviation(ctx context.Context, abbreviation string) (*Team, error)
	CreateTeam(ctx context.Context, team *Team) error
	CreateProject(ctx context.Context, project *Project) error
	AddTeamMember(ctx context.Context, teamID string, userID string) error
}

type TeamService interface {
	ListTeams(ctx context.Context, userID string) ([]*Team, error)
	ListProjects(ctx context.Context, teamID string) ([]*Project, error)
	GetProject(ctx context.Context, id string) (*Project, error)
	ListTeamUsers(ctx context.Context, teamID string) ([]*User, error)
	UpdateTeam(ctx context.Context, team *Team) error
	UpdateProject(ctx context.Context, project *Project) error
	GetTeamByAbbreviation(ctx context.Context, abbreviation string) (*Team, error)
	CreateTeam(ctx context.Context, name string, abbreviation string, description string, userID string) (*Team, error)
	CreateProject(ctx context.Context, teamID string, name string, logoURL string, abbreviation string, description string) (*Project, error)
}
