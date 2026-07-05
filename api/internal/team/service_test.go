package team

import (
	"context"
	"strings"
	"testing"
	"kollab/api/internal/domain"
)

func TestTeamService(t *testing.T) {
	repo := NewInMemoryTeamRepository()
	service := NewTeamService(repo)
	ctx := context.Background()

	// List Teams (creates personal team)
	teams, err := service.ListTeams(ctx, "user1")
	if err != nil {
		t.Fatalf("expected no error listing teams, got %v", err)
	}
	
	hasPersonal := false
	for _, team := range teams {
		if team.ID == "personal_user1" {
			hasPersonal = true
			break
		}
	}
	if !hasPersonal {
		t.Error("expected personal team to be created automatically")
	}

	// Create Team
	team, err := service.CreateTeam(ctx, "New Team", "ntm", "desc", "user1")
	if err != nil {
		t.Fatalf("expected no error creating team, got %v", err)
	}
	if team.Name != "New Team" {
		t.Errorf("expected team name, got %s", team.Name)
	}

	// Create Project
	proj, err := service.CreateProject(ctx, "user1", team.ID, "New Project", "", "np", "desc")
	if err != nil {
		t.Fatalf("expected no error creating project, got %v", err)
	}

	// List Projects
	projects, err := service.ListProjects(ctx, team.ID)
	if err != nil || len(projects) != 1 {
		t.Errorf("expected 1 project, got %d", len(projects))
	}
	if projects[0].ID != proj.ID {
		t.Errorf("expected project ID %s, got %s", proj.ID, projects[0].ID)
	}

	// Create team with empty name
	_, err = service.CreateTeam(ctx, "", "fail", "desc", "user1")
	if err == nil || !strings.Contains(err.Error(), "name is required") {
		t.Errorf("expected error for empty name, got %v", err)
	}

	// Create project with unauthorized user
	_, err = service.CreateProject(ctx, "unknown_user", team.ID, "Fail Project", "", "fp", "desc")
	if err == nil {
		t.Error("expected unauthorized error for non-member creating project")
	}

	// ListTeamUsers
	users, err := service.ListTeamUsers(ctx, team.ID)
	if err != nil {
		t.Fatalf("expected no err listing team users, got %v", err)
	}
	if len(users) != 1 {
		t.Errorf("expected 1 user, got %d", len(users))
	}

	// UpdateTeam
	updatedTeam := &domain.Team{ID: team.ID, Name: "Updated Team Name", Abbreviation: "updated", Description: "Updated desc"}
	err = service.UpdateTeam(ctx, "user1", updatedTeam)
	if err != nil {
		t.Fatalf("expected no err updating team, got %v", err)
	}
	if updatedTeam.Name != "Updated Team Name" {
		t.Errorf("expected updated team name, got %v", updatedTeam.Name)
	}

	// UpdateProject
	updatedProj := &domain.Project{ID: proj.ID, TeamID: team.ID, Name: "Updated Project", LogoURL: "updated-icon", Abbreviation: "up", Description: "Updated desc"}
	err = service.UpdateProject(ctx, "user1", updatedProj)
	if err != nil {
		t.Fatalf("expected no err updating project, got %v", err)
	}
	if updatedProj.Name != "Updated Project" {
		t.Errorf("expected updated project name, got %v", updatedProj.Name)
	}

	// GetProject
	fetchedProj, err := service.GetProject(ctx, proj.ID)
	if err != nil {
		t.Fatalf("expected no err getting project, got %v", err)
	}
	if fetchedProj.ID != proj.ID {
		t.Errorf("expected proj ID %s, got %s", proj.ID, fetchedProj.ID)
	}

	// GetTeamByAbbreviation
	fetchedTeamByAbbr, err := service.GetTeamByAbbreviation(ctx, "updated")
	if err != nil {
		t.Fatalf("expected no err getting team by abbreviation, got %v", err)
	}
	if fetchedTeamByAbbr.ID != team.ID {
		t.Errorf("expected team ID %s, got %s", team.ID, fetchedTeamByAbbr.ID)
	}

	// AddTeamMember
	err = service.AddTeamMember(ctx, "user1", team.ID, "user2")
	if err != nil {
		t.Fatalf("expected no err adding team member, got %v", err)
	}

	// RemoveTeamMember
	err = service.RemoveTeamMember(ctx, "user1", team.ID, "user2")
	if err != nil {
		t.Fatalf("expected no err removing team member, got %v", err)
	}

	// ListAllUsers
	allUsers, err := service.ListAllUsers(ctx)
	if err != nil {
		t.Fatalf("expected no err listing all users, got %v", err)
	}
	if len(allUsers) == 0 { // InMemoryTeamRepository list all users returns empty, but shouldn't error
		t.Logf("ListAllUsers returned %v", allUsers)
	}

}
