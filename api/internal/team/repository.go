package team

import (
	"context"
	"errors"
	"sort"
	"sync"

	"arkollab/api/internal/domain"
)

type InMemoryTeamRepository struct {
	mu          sync.RWMutex
	teams       map[string]*domain.Team
	projects    map[string]*domain.Project
	teamMembers map[string]map[string]bool // teamID -> userID -> true
	users       map[string]*domain.User    // userID -> user details
}

func NewInMemoryTeamRepository() *InMemoryTeamRepository {
	repo := &InMemoryTeamRepository{
		teams:       make(map[string]*domain.Team),
		projects:    make(map[string]*domain.Project),
		teamMembers: make(map[string]map[string]bool),
		users:       make(map[string]*domain.User),
	}
	repo.seed()
	return repo
}

func (r *InMemoryTeamRepository) seed() {
	r.teams["team_arkloud"] = &domain.Team{ID: "team_arkloud", Name: "Arkloud", Abbreviation: "arkloud", Description: "Main organization workspace"}
	r.teams["team_eng"] = &domain.Team{ID: "team_eng", Name: "Engineering", Abbreviation: "eng", Description: "Engineering & Development department"}
	r.teams["team_mkt"] = &domain.Team{ID: "team_mkt", Name: "Marketing", Abbreviation: "mkt", Description: "Brand & Launch campaign team"}

	r.projects["proj_arkollab_test"] = &domain.Project{ID: "proj_arkollab_test", Name: "Arkollab Test", TeamID: "team_arkloud", Abbreviation: "arkollab", Description: "Arkollab team collaborative testing sandbox"}
	r.projects["proj_wiki"] = &domain.Project{ID: "proj_wiki", Name: "Engineering Wiki", TeamID: "team_eng", Abbreviation: "wiki", Description: "Technical specifications and style guides"}
	r.projects["proj_roadmap"] = &domain.Project{ID: "proj_roadmap", Name: "Product Roadmap", TeamID: "team_eng", Abbreviation: "roadmap", Description: "Product roadmap timeline and schedule"}
	r.projects["proj_campaign"] = &domain.Project{ID: "proj_campaign", Name: "Summer Launch 2026", TeamID: "team_mkt", Abbreviation: "campaign", Description: "Summer launch assets and press releases"}

	r.teamMembers["team_arkloud"] = map[string]bool{"sh4ag0cxowti": true}
	r.teamMembers["team_eng"] = map[string]bool{"mock-user-id": true}

	r.users["sh4ag0cxowti"] = &domain.User{ID: "sh4ag0cxowti", Username: "sh4ag0cxowti"}
	r.users["mock-user-id"] = &domain.User{ID: "mock-user-id", Username: "mock-user"}
}

func (r *InMemoryTeamRepository) GetTeamsByUserID(ctx context.Context, userID string) ([]*domain.Team, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var list []*domain.Team
	for _, t := range r.teams {
		if members, exists := r.teamMembers[t.ID]; exists {
			if members[userID] {
				list = append(list, t)
			}
		}
	}

	// Fallback if user is not explicitly mapped to any team: return all teams
	if len(list) == 0 {
		for _, t := range r.teams {
			list = append(list, t)
		}
	}

	// Stable sort by ID
	sort.Slice(list, func(i, j int) bool {
		return list[i].ID < list[j].ID
	})

	return list, nil
}

func (r *InMemoryTeamRepository) GetProjectsByTeamID(ctx context.Context, teamID string) ([]*domain.Project, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var list []*domain.Project
	for _, p := range r.projects {
		if teamID == "" || p.TeamID == teamID {
			list = append(list, p)
		}
	}
	return list, nil
}

func (r *InMemoryTeamRepository) GetProjectByID(ctx context.Context, id string) (*domain.Project, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	p, exists := r.projects[id]
	if !exists {
		return nil, errors.New("project not found")
	}
	return p, nil
}

func (r *InMemoryTeamRepository) GetUsersByTeamID(ctx context.Context, teamID string) ([]*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var list []*domain.User
	members, exists := r.teamMembers[teamID]
	if !exists {
		return list, nil
	}

	for userID := range members {
		if u, ok := r.users[userID]; ok {
			list = append(list, u)
		} else {
			list = append(list, &domain.User{ID: userID, Username: userID})
		}
	}

	// Stable sort by ID
	sort.Slice(list, func(i, j int) bool {
		return list[i].ID < list[j].ID
	})

	return list, nil
}

func (r *InMemoryTeamRepository) UpdateTeam(ctx context.Context, team *domain.Team) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, t := range r.teams {
		if t.ID != team.ID && t.Abbreviation == team.Abbreviation && team.Abbreviation != "" {
			return errors.New("team abbreviation must be unique systemwide")
		}
	}

	t, exists := r.teams[team.ID]
	if !exists {
		return errors.New("team not found")
	}

	t.Name = team.Name
	t.Abbreviation = team.Abbreviation
	t.Description = team.Description
	return nil
}

func (r *InMemoryTeamRepository) UpdateProject(ctx context.Context, project *domain.Project) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, p := range r.projects {
		if p.ID != project.ID && p.TeamID == project.TeamID && p.Abbreviation == project.Abbreviation && project.Abbreviation != "" {
			return errors.New("project abbreviation must be unique in this team")
		}
	}

	p, exists := r.projects[project.ID]
	if !exists {
		return errors.New("project not found")
	}

	p.Name = project.Name
	p.LogoURL = project.LogoURL
	p.Abbreviation = project.Abbreviation
	p.Description = project.Description
	return nil
}

func (r *InMemoryTeamRepository) GetTeamByAbbreviation(ctx context.Context, abbreviation string) (*domain.Team, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, t := range r.teams {
		if t.Abbreviation == abbreviation {
			return t, nil
		}
	}
	return nil, errors.New("team not found")
}

func (r *InMemoryTeamRepository) CreateTeam(ctx context.Context, team *domain.Team) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, t := range r.teams {
		if t.Abbreviation == team.Abbreviation && team.Abbreviation != "" {
			return errors.New("team abbreviation must be unique systemwide")
		}
	}

	r.teams[team.ID] = team
	return nil
}

func (r *InMemoryTeamRepository) CreateProject(ctx context.Context, project *domain.Project) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, p := range r.projects {
		if p.TeamID == project.TeamID && p.Abbreviation == project.Abbreviation && project.Abbreviation != "" {
			return errors.New("project abbreviation must be unique in this team")
		}
	}

	r.projects[project.ID] = project
	return nil
}

func (r *InMemoryTeamRepository) AddTeamMember(ctx context.Context, teamID string, userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.teamMembers[teamID]; !exists {
		r.teamMembers[teamID] = make(map[string]bool)
	}
	r.teamMembers[teamID][userID] = true
	return nil
}

func (r *InMemoryTeamRepository) RemoveTeamMember(ctx context.Context, teamID string, userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if members, exists := r.teamMembers[teamID]; exists {
		delete(members, userID)
	}
	return nil
}

func (r *InMemoryTeamRepository) ListAllUsers(ctx context.Context) ([]*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var users []*domain.User
	for _, u := range r.users {
		users = append(users, u)
	}

	sort.Slice(users, func(i, j int) bool {
		return users[i].Username < users[j].Username
	})

	return users, nil
}
