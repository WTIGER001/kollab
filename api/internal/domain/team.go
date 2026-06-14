package domain

import (
	"context"
)

type Team struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Project struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	TeamID string `json:"teamId"`
}

type TeamRepository interface {
	GetTeamsByUserID(ctx context.Context, userID string) ([]*Team, error)
	GetProjectsByTeamID(ctx context.Context, teamID string) ([]*Project, error)
	GetProjectByID(ctx context.Context, id string) (*Project, error)
	GetUsersByTeamID(ctx context.Context, teamID string) ([]*User, error)
}

type TeamService interface {
	ListTeams(ctx context.Context, userID string) ([]*Team, error)
	ListProjects(ctx context.Context, teamID string) ([]*Project, error)
	GetProject(ctx context.Context, id string) (*Project, error)
	ListTeamUsers(ctx context.Context, teamID string) ([]*User, error)
}
