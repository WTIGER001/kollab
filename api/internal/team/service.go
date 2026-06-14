package team

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"

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
	personalTeamID := "personal_" + userID
	teams, err := s.repo.GetTeamsByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	hasPersonal := false
	for _, t := range teams {
		if t.ID == personalTeamID {
			hasPersonal = true
			break
		}
	}

	if !hasPersonal {
		personalTeam := &domain.Team{
			ID:           personalTeamID,
			Name:         "Personal Space",
			Abbreviation: "personal_" + userID,
			Description:  "Your private personal space",
		}
		err = s.repo.CreateTeam(ctx, personalTeam)
		if err == nil {
			_ = s.repo.AddTeamMember(ctx, personalTeamID, userID)
			teams = append(teams, personalTeam)
		}
	}

	return teams, nil
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

func (s *TeamService) UpdateTeam(ctx context.Context, team *domain.Team) error {
	return s.repo.UpdateTeam(ctx, team)
}

func (s *TeamService) UpdateProject(ctx context.Context, project *domain.Project) error {
	return s.repo.UpdateProject(ctx, project)
}

func (s *TeamService) GetTeamByAbbreviation(ctx context.Context, abbreviation string) (*domain.Team, error) {
	return s.repo.GetTeamByAbbreviation(ctx, abbreviation)
}

func (s *TeamService) CreateTeam(ctx context.Context, name string, abbreviation string, description string, userID string) (*domain.Team, error) {
	if name == "" {
		return nil, errors.New("name is required")
	}
	if abbreviation == "" {
		return nil, errors.New("abbreviation is required")
	}

	team := &domain.Team{
		ID:           "team_" + newUUID(),
		Name:         name,
		Abbreviation: abbreviation,
		Description:  description,
	}

	if err := s.repo.CreateTeam(ctx, team); err != nil {
		return nil, err
	}

	// Make the creator a member of the team
	_ = s.repo.AddTeamMember(ctx, team.ID, userID)

	return team, nil
}

func (s *TeamService) CreateProject(ctx context.Context, teamID string, name string, logoURL string, abbreviation string, description string) (*domain.Project, error) {
	if teamID == "" {
		return nil, errors.New("teamID is required")
	}
	if name == "" {
		return nil, errors.New("name is required")
	}
	if abbreviation == "" {
		return nil, errors.New("abbreviation is required")
	}

	project := &domain.Project{
		ID:           "proj_" + newUUID(),
		Name:         name,
		TeamID:       teamID,
		LogoURL:      logoURL,
		Abbreviation: abbreviation,
		Description:  description,
	}

	if err := s.repo.CreateProject(ctx, project); err != nil {
		return nil, err
	}

	return project, nil
}

func newUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
