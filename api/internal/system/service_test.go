package system

import (
	"context"
	"testing"
	"time"
	"kollab/api/internal/domain"
)

type mockSystemRepo struct{}

func (m *mockSystemRepo) GetSettings(ctx context.Context) (*domain.SystemSettings, error) {
	return &domain.SystemSettings{WelcomeTitle: "Welcome"}, nil
}
func (m *mockSystemRepo) UpdateSettings(ctx context.Context, settings *domain.SystemSettings) error {
	return nil
}
func (m *mockSystemRepo) RecordAuditLog(ctx context.Context, auditLog *domain.AuditLog) error {
	return nil
}
func (m *mockSystemRepo) GetAuditLogsForPage(ctx context.Context, docID string) ([]*domain.AuditLog, error) {
	return []*domain.AuditLog{{ID: "log1", Action: "create"}}, nil
}
func (m *mockSystemRepo) EnsurePartitions(ctx context.Context) error { return nil }
func (m *mockSystemRepo) PrunePartitions(ctx context.Context) error { return nil }
func (m *mockSystemRepo) PruneTrash(ctx context.Context) error { return nil }
func (m *mockSystemRepo) Ping(ctx context.Context) error { return nil }
func (m *mockSystemRepo) ExportBackup(ctx context.Context) (map[string]interface{}, error) {
	return map[string]interface{}{"data": "backup"}, nil
}
func (m *mockSystemRepo) GetSyncOperations(ctx context.Context, sinceID int) ([]map[string]interface{}, error) {
	return []map[string]interface{}{{"id": 1}}, nil
}
func (m *mockSystemRepo) ImportBackup(ctx context.Context, data map[string]interface{}) error {
	return nil
}

func TestSystemService(t *testing.T) {
	svc := NewSystemService(&mockSystemRepo{})
	ctx := context.Background()

	settings, err := svc.GetSettings(ctx)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if settings.WelcomeTitle != "Welcome" {
		t.Errorf("expected welcome title to be Welcome")
	}

	err = svc.UpdateSettings(ctx, &domain.SystemSettings{WelcomeTitle: "Updated"})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}

	err = svc.RecordAuditLog(ctx, "doc1", "user1", "create")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}

	logs, err := svc.GetAuditLogsForPage(ctx, "doc1")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(logs) != 1 {
		t.Errorf("expected 1 log, got %d", len(logs))
	}

	err = svc.EnsurePartitions(ctx)
	if err != nil {
		t.Errorf("EnsurePartitions failed: %v", err)
	}

	err = svc.PrunePartitions(ctx)
	if err != nil {
		t.Errorf("PrunePartitions failed: %v", err)
	}

	err = svc.PruneTrash(ctx)
	if err != nil {
		t.Errorf("PruneTrash failed: %v", err)
	}

	err = svc.Ping(ctx)
	if err != nil {
		t.Errorf("Ping failed: %v", err)
	}

	backup, err := svc.ExportBackup(ctx)
	if err != nil {
		t.Errorf("ExportBackup failed: %v", err)
	}
	if backup["data"] != "backup" {
		t.Errorf("unexpected backup data")
	}

	syncOps, err := svc.GetSyncOperations(ctx, 0)
	if err != nil {
		t.Errorf("GetSyncOperations failed: %v", err)
	}
	if len(syncOps) != 1 {
		t.Errorf("expected 1 sync op")
	}

	// Just invoke the worker to cover its instantiation
	svc.StartCleanupWorker(ctx, 1*time.Millisecond)
	time.Sleep(10 * time.Millisecond) // Let worker run once
}
