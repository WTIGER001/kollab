package team

import (
	"context"
	"errors"

	"github.com/google/uuid"

	goperm "github.com/wtiger001/go-permissions"
	"kollab/api/internal/domain"
	"kollab/api/internal/permissions"
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
			if err := s.repo.AddTeamMember(ctx, personalTeamID, userID); err != nil {
				return nil, err
			}
			if permissions.TeamPermissions != nil {
				if err := permissions.TeamPermissions.GrantRole(ctx, permissions.TeamPermissions.OwnerRole.ID, goperm.PrincipalUser, userID, personalTeamID); err != nil {
					return nil, err
				}
			}
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

func (s *TeamService) isTeamMember(ctx context.Context, teamID string, userID string) bool {
	teams, err := s.repo.GetTeamsByUserID(ctx, userID)
	if err != nil {
		return false
	}
	for _, t := range teams {
		if t.ID == teamID {
			return true
		}
	}
	return false
}

func (s *TeamService) UpdateTeam(ctx context.Context, userID string, team *domain.Team) error {
	if !s.isTeamMember(ctx, team.ID, userID) {
		return errors.New("unauthorized: must be a team member to update team")
	}
	return s.repo.UpdateTeam(ctx, team)
}

func (s *TeamService) UpdateProject(ctx context.Context, userID string, project *domain.Project) error {
	if !s.isTeamMember(ctx, project.TeamID, userID) {
		return errors.New("unauthorized: must be a team member to update project")
	}
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
		ID:           "team_" + uuid.New().String(),
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

func (s *TeamService) CreateProject(ctx context.Context, userID string, teamID string, name string, logoURL string, abbreviation string, description string) (*domain.Project, error) {
	if !s.isTeamMember(ctx, teamID, userID) {
		return nil, errors.New("unauthorized: must be a team member to create project in team")
	}
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
		ID:           "proj_" + uuid.New().String(),
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

func (s *TeamService) AddTeamMember(ctx context.Context, actorID string, teamID string, userID string) error {
	if !s.isTeamMember(ctx, teamID, actorID) {
		return errors.New("unauthorized: must be a team member to add users")
	}
	return s.repo.AddTeamMember(ctx, teamID, userID)
}

func (s *TeamService) RemoveTeamMember(ctx context.Context, actorID string, teamID string, userID string) error {
	if !s.isTeamMember(ctx, teamID, actorID) {
		return errors.New("unauthorized: must be a team member to remove users")
	}
	return s.repo.RemoveTeamMember(ctx, teamID, userID)
}

func (s *TeamService) ListAllUsers(ctx context.Context) ([]*domain.User, error) {
	return s.repo.ListAllUsers(ctx)
}
