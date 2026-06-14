package task

import (
	"context"
	"sync"

	"arkollab/api/internal/domain"
)

type InMemoryTaskRepository struct {
	mu    sync.RWMutex
	tasks map[string]*domain.Task
}

func NewInMemoryTaskRepository() *InMemoryTaskRepository {
	return &InMemoryTaskRepository{
		tasks: make(map[string]*domain.Task),
	}
}

func (r *InMemoryTaskRepository) SyncDocumentTasks(ctx context.Context, docID string, tasks []*domain.Task) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Delete old tasks for this document
	for id, t := range r.tasks {
		if t.DocumentID == docID {
			delete(r.tasks, id)
		}
	}

	// Insert new tasks
	for _, t := range tasks {
		r.tasks[t.ID] = t
	}

	return nil
}

func (r *InMemoryTaskRepository) GetTasksByAssignee(ctx context.Context, username string) ([]*domain.Task, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var list []*domain.Task
	for _, t := range r.tasks {
		if t.Assignee == username {
			// Return a copy to avoid concurrency issues
			taskCopy := *t
			list = append(list, &taskCopy)
		}
	}
	return list, nil
}
