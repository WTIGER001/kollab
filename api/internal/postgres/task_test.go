package postgres

import (
	"testing"
	"time"

	"kollab/api/internal/domain"
)

func TestPostgresTaskRepository(t *testing.T) {
	db, ctx := setupTestDB(t)
	repo := NewPostgresTaskRepository(db)

	docRepo := NewPostgresDocumentRepository(db)
	doc := &domain.Document{
		ID: "doc_for_task",
		Title: "Task Doc",
		Slug: "task-doc",
		ProjectID: "proj_wiki",
		TeamID: "team_eng",
		CreatedByID: "sh4ag0cxowti",
		UpdatedByID: "sh4ag0cxowti",
		Content: "{}",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	_ = docRepo.Create(ctx, doc)

	tasks := []*domain.Task{
		{
			ID: "task_1",
			DocumentID: "doc_for_task",
			Assignee: "sh4ag0cxowti",
			Content: "Do this",
			Completed: false,
			CreatedAt: time.Now(),
		},
	}

	if err := repo.SyncDocumentTasks(ctx, "doc_for_task", tasks); err != nil {
		t.Fatalf("failed to sync tasks: %v", err)
	}

	fetched, err := repo.GetTasksByAssignee(ctx, "sh4ag0cxowti")
	if err != nil {
		t.Fatalf("failed to get tasks: %v", err)
	}
	
	found := false
	for _, tsk := range fetched {
		if tsk.ID == "task_1" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected to find synced task")
	}
}
