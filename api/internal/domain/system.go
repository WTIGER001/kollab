package domain

import (
	"context"
	"time"
)

type SystemSettings struct {
	AuditRetentionPolicy     string `json:"auditRetentionPolicy"`
	AuditRetentionCustomDays int    `json:"auditRetentionCustomDays"`
	AuditLogDestination      string `json:"auditLogDestination"`
	TrashRetentionPolicy     string `json:"trashRetentionPolicy"`
	TrashRetentionCustomDays int    `json:"trashRetentionCustomDays"`
	AIRateLimit              int    `json:"aiRateLimit"`
	WelcomeTitle             string `json:"welcomeTitle"`
	WelcomeText              string `json:"welcomeText"`
}

type AuditLog struct {
	ID              string    `json:"id"`
	DocumentID      string    `json:"documentId"`
	UserID          string    `json:"userId"`
	Action          string    `json:"action"` // "view" | "edit"
	CreatedAt       time.Time `json:"createdAt"`
	UserDisplayName string    `json:"userDisplayName"`
	UserEmail       string    `json:"userEmail"`
}

type SystemRepository interface {
	GetSettings(ctx context.Context) (*SystemSettings, error)
	UpdateSettings(ctx context.Context, settings *SystemSettings) error
	RecordAuditLog(ctx context.Context, log *AuditLog) error
	GetAuditLogsForPage(ctx context.Context, docID string) ([]*AuditLog, error)
	EnsurePartitions(ctx context.Context) error
	PrunePartitions(ctx context.Context) error
	PruneTrash(ctx context.Context) error
	Ping(ctx context.Context) error
}

type SystemService interface {
	GetSettings(ctx context.Context) (*SystemSettings, error)
	UpdateSettings(ctx context.Context, settings *SystemSettings) error
	RecordAuditLog(ctx context.Context, documentID string, userID string, action string) error
	GetAuditLogsForPage(ctx context.Context, docID string) ([]*AuditLog, error)
	EnsurePartitions(ctx context.Context) error
	PrunePartitions(ctx context.Context) error
	PruneTrash(ctx context.Context) error
	StartCleanupWorker(ctx context.Context, interval time.Duration)
	Ping(ctx context.Context) error
}
