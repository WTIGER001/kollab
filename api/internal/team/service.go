package team

import (
	"context"

	"arkollab/api/internal/domain"
)

type TeamService struct {
	repo domain.TeamRepository
}

func NewTeamService(repo domain.TeamRepository) *TeamService {
	return &TeamService{
		repo: repo,
	}
}

func (s *TeamService) ListTeams(ctx context.Context, userID string) ([]*domain.Team, error) {
	return s.repo.GetTeamsByUserID(ctx, userID)
}

func (s *TeamService) ListProjects(ctx context.Context, teamID string) ([]*domain.Project, error) {
	return s.repo.GetProjectsByTeamID(ctx, teamID)
}

func (s *TeamService) GetProject(ctx context.Context, id string) (*domain.Project, error) {
	return s.repo.GetProjectByID(ctx, id)
}

func (s *TeamService) ListTeamUsers(ctx context.Context, teamID string) ([]*domain.User, error) {
	return s.repo.GetUsersByTeamID(ctx, teamID)
}
