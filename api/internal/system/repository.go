package system

import (
	"context"
	"sync"

	"arkollab/api/internal/domain"
)

type InMemorySystemRepository struct {
	mu        sync.RWMutex
	settings  domain.SystemSettings
	auditLogs []*domain.AuditLog
}

func NewInMemorySystemRepository() *InMemorySystemRepository {
	return &InMemorySystemRepository{
		settings: domain.SystemSettings{
			AuditRetentionPolicy:     "forever",
			AuditRetentionCustomDays: 30,
			AuditLogDestination:      "postgres",
			TrashRetentionPolicy:     "forever",
			TrashRetentionCustomDays: 30,
			AIRateLimit:              10,
			WelcomeTitle:             "Welcome to Arkollab",
			WelcomeText:              "A premium block-based document workspace. Connect with Logto Single-Sign-On (SSO) to synchronize your team workspaces.",
			AsposeEnabled:            true,
		},
		auditLogs: make([]*domain.AuditLog, 0),
	}
}

func (r *InMemorySystemRepository) GetSettings(ctx context.Context) (*domain.SystemSettings, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	copySettings := r.settings
	return &copySettings, nil
}

func (r *InMemorySystemRepository) UpdateSettings(ctx context.Context, s *domain.SystemSettings) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.settings = *s
	return nil
}

func (r *InMemorySystemRepository) RecordAuditLog(ctx context.Context, log *domain.AuditLog) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.auditLogs = append(r.auditLogs, log)
	return nil
}

func (r *InMemorySystemRepository) GetAuditLogsForPage(ctx context.Context, docID string) ([]*domain.AuditLog, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var list []*domain.AuditLog
	for i := len(r.auditLogs) - 1; i >= 0; i-- {
		l := r.auditLogs[i]
		if l.DocumentID == docID {
			list = append(list, l)
		}
	}
	return list, nil
}

func (r *InMemorySystemRepository) EnsurePartitions(ctx context.Context) error {
	return nil
}

func (r *InMemorySystemRepository) PrunePartitions(ctx context.Context) error {
	return nil
}

func (r *InMemorySystemRepository) PruneTrash(ctx context.Context) error {
	return nil
}

func (r *InMemorySystemRepository) Ping(ctx context.Context) error {
	return nil
}

func (r *InMemorySystemRepository) ExportBackup(ctx context.Context) (map[string]interface{}, error) {
	return map[string]interface{}{
		"users":           []interface{}{},
		"teams":           []interface{}{},
		"projects":        []interface{}{},
		"documents":       []interface{}{},
		"comments":        []interface{}{},
		"principal_roles": []interface{}{},
		"tags":            []interface{}{},
	}, nil
}

func (r *InMemorySystemRepository) GetSyncOperations(ctx context.Context, sinceID int) ([]map[string]interface{}, error) {
	return []map[string]interface{}{}, nil
}
