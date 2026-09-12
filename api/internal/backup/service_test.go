package backup

import (
	"context"
	"testing"
	"time"

	"kollab/api/internal/domain"
)

type mockSystemService struct{}

func (m *mockSystemService) GetSettings(ctx context.Context) (*domain.SystemSettings, error) { return &domain.SystemSettings{}, nil }
func (m *mockSystemService) UpdateSettings(ctx context.Context, settings *domain.SystemSettings) error { return nil }
func (m *mockSystemService) RecordAuditLog(ctx context.Context, documentID string, userID string, action string) error { return nil }
func (m *mockSystemService) GetAuditLogsForPage(ctx context.Context, docID string) ([]*domain.AuditLog, error) { return nil, nil }
func (m *mockSystemService) EnsurePartitions(ctx context.Context) error { return nil }
func (m *mockSystemService) PrunePartitions(ctx context.Context) error { return nil }
func (m *mockSystemService) PruneTrash(ctx context.Context) error { return nil }
func (m *mockSystemService) StartCleanupWorker(ctx context.Context, interval time.Duration) {}
func (m *mockSystemService) Ping(ctx context.Context) error { return nil }
func (m *mockSystemService) ExportBackup(ctx context.Context) (map[string]interface{}, error) { return map[string]interface{}{"status": "ok"}, nil }
func (m *mockSystemService) GetSyncOperations(ctx context.Context, sinceID int) ([]map[string]interface{}, error) { return nil, nil }

func TestBackupServiceExports(t *testing.T) {
	ctx := context.Background()
	svc := NewService(&mockSystemService{})

	teamZip, err := svc.ExportTeamBackup(ctx, "team-123")
	if err != nil {
		t.Fatalf("ExportTeamBackup failed: %v", err)
	}
	if len(teamZip) == 0 {
		t.Fatalf("ExportTeamBackup returned empty zip")
	}

	restoredCount, err := svc.RestoreScopedBackup(ctx, teamZip, "team-123")
	if err != nil {
		t.Fatalf("RestoreScopedBackup failed: %v", err)
	}
	if restoredCount != 1 {
		t.Errorf("Expected 1 restored page, got %d", restoredCount)
	}

	projZip, err := svc.ExportProjectBackup(ctx, "proj-456")
	if err != nil {
		t.Fatalf("ExportProjectBackup failed: %v", err)
	}
	if len(projZip) == 0 {
		t.Fatalf("ExportProjectBackup returned empty zip")
	}

	err = svc.ConfigureAzure(AzureBackupConfig{
		Enabled:       true,
		AccountName:   "kollabstorage",
		AccountKey:    "key123",
		ContainerName: "backups",
	})
	if err != nil {
		t.Fatalf("ConfigureAzure failed: %v", err)
	}

	sas, err := svc.UploadBackupToAzure(ctx, "test_backup.zip", teamZip)
	if err != nil {
		t.Fatalf("UploadBackupToAzure failed: %v", err)
	}
	if sas == "" {
		t.Errorf("Expected SAS URL, got empty string")
	}
}

func(s *mockSystemService) RestoreBackup(ctx context.Context,data map[string]interface{}) error {return nil}
func(s *mockSystemService) ApplySyncOperations(ctx context.Context,ops []map[string]interface{}) error {return nil}
