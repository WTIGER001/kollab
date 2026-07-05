package team

import (
	"context"
	"testing"
	"kollab/api/internal/domain"
)

func TestInMemoryTeamRepository(t *testing.T) {
	repo := NewInMemoryTeamRepository()
	ctx := context.Background()

	// List seeded team
	team, err := repo.GetTeamByAbbreviation(ctx, "eng")
	if err != nil {
		t.Fatalf("expected to get seed team, got %v", err)
	}
	if team.Name != "Engineering" {
		t.Errorf("expected Engineering, got %s", team.Name)
	}

	// Create project
	proj := &domain.Project{
		ID: "new_proj",
		TeamID: "team_eng",
		Name: "New Proj",
	}
	err = repo.CreateProject(ctx, proj)
	if err != nil {
		t.Fatalf("expected no error creating project, got %v", err)
	}

	// Update project
	proj.Name = "Updated Proj"
	err = repo.UpdateProject(ctx, proj)
	if err != nil {
		t.Fatalf("expected no error updating project, got %v", err)
	}

	updatedProj, _ := repo.GetProjectByID(ctx, "new_proj")
	if updatedProj.Name != "Updated Proj" {
		t.Errorf("expected updated name, got %s", updatedProj.Name)
	}
}
