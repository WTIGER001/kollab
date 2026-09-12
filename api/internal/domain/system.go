package domain

import (
	"context"
	"time"
)

type SystemSettings struct {
	AuditRetentionPolicy          string `json:"auditRetentionPolicy"`
	AuditRetentionCustomDays      int    `json:"auditRetentionCustomDays"`
	AuditLogDestination           string `json:"auditLogDestination"`
	TrashRetentionPolicy          string `json:"trashRetentionPolicy"`
	TrashRetentionCustomDays      int    `json:"trashRetentionCustomDays"`
	AIRateLimit                   int    `json:"aiRateLimit"`
	WelcomeTitle                  string `json:"welcomeTitle"`
	WelcomeText                   string `json:"welcomeText"`
	AuthLogoURL                   string `json:"authLogoUrl"`
	AuthLogoSize                  string `json:"authLogoSize"`
	AuthLegalDisclaimer           string `json:"authLegalDisclaimer"`
	AuthLoginButtonText           string `json:"authLoginButtonText"`
	AsposeEnabled                 bool   `json:"asposeEnabled"`
	AsposeLicense                 string `json:"asposeLicense"`
	ClassificationBannerEnabled   bool   `json:"classificationBannerEnabled"`
	ClassificationBannerText      string `json:"classificationBannerText"`
	ClassificationBannerBgColor   string `json:"classificationBannerBgColor"`
	ClassificationBannerTextColor string `json:"classificationBannerTextColor"`
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
	ExportBackup(ctx context.Context) (map[string]interface{}, error)
	GetSyncOperations(ctx context.Context, sinceID int) ([]map[string]interface{}, error)
	RestoreBackup(ctx context.Context, data map[string]interface{}) error
	ApplySyncOperations(ctx context.Context, ops []map[string]interface{}) error
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
	ExportBackup(ctx context.Context) (map[string]interface{}, error)
	GetSyncOperations(ctx context.Context, sinceID int) ([]map[string]interface{}, error)
	RestoreBackup(ctx context.Context, data map[string]interface{}) error
	ApplySyncOperations(ctx context.Context, ops []map[string]interface{}) error
}
