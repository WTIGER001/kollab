package task

import (
	"context"
	"testing"
	"kollab/api/internal/domain"
)

func TestInMemoryTaskRepository(t *testing.T) {
	repo := NewInMemoryTaskRepository()
	ctx := context.Background()

	// 1. Sync tasks for document
	tasks := []*domain.Task{
		{
			ID: "task1",
			DocumentID: "doc1",
			Assignee: "user1",
		},
		{
			ID: "task2",
			DocumentID: "doc1",
			Assignee: "user2",
		},
	}
	err := repo.SyncDocumentTasks(ctx, "doc1", tasks)
	if err != nil {
		t.Fatalf("expected no error syncing tasks, got %v", err)
	}

	// 2. Get tasks by assignee
	user1Tasks, err := repo.GetTasksByAssignee(ctx, "user1")
	if err != nil {
		t.Fatalf("expected no error getting tasks, got %v", err)
	}
	if len(user1Tasks) != 1 || user1Tasks[0].ID != "task1" {
		t.Errorf("expected 1 task for user1 (task1), got %v", user1Tasks)
	}

	// 3. Sync again to overwrite
	newTasks := []*domain.Task{
		{
			ID: "task3",
			DocumentID: "doc1",
			Assignee: "user1",
		},
	}
	err = repo.SyncDocumentTasks(ctx, "doc1", newTasks)
	if err != nil {
		t.Fatalf("expected no error syncing new tasks, got %v", err)
	}

	// 4. Verify overwrite
	user1TasksNew, _ := repo.GetTasksByAssignee(ctx, "user1")
	if len(user1TasksNew) != 1 || user1TasksNew[0].ID != "task3" {
		t.Errorf("expected task3 for user1, got %v", user1TasksNew)
	}
	user2Tasks, _ := repo.GetTasksByAssignee(ctx, "user2")
	if len(user2Tasks) != 0 {
		t.Errorf("expected 0 tasks for user2, got %d", len(user2Tasks))
	}
}
