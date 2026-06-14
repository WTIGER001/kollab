package domain

import (
	"context"
	"time"
)

type Task struct {
	ID         string    `json:"id"`
	DocumentID string    `json:"documentId"`
	DocTitle   string    `json:"docTitle,omitempty"` // populated during joins for tasks list
	Content    string    `json:"content"`
	Assignee   string    `json:"assignee"` // username without @ prefix
	DueDate    *string   `json:"dueDate"`   // YYYY-MM-DD format
	Completed  bool      `json:"completed"`
	ProjectID  *string   `json:"projectId,omitempty"`
	TeamID     string    `json:"teamId,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type TaskRepository interface {
	SyncDocumentTasks(ctx context.Context, docID string, tasks []*Task) error
	GetTasksByAssignee(ctx context.Context, username string) ([]*Task, error)
}
