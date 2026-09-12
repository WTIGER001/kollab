package storage

import (
	"context"
	"testing"
)

func TestAzureBackupVaultClient(t *testing.T) {
	client := NewAzureBackupVaultClient("sub-123", "rg-kollab", "kollab-backup-vault", "kollab-instance")
	ctx := context.Background()

	rps, err := client.ListRecoveryPoints(ctx)
	if err != nil {
		t.Fatalf("ListRecoveryPoints failed: %v", err)
	}
	if len(rps) == 0 {
		t.Fatalf("Expected initial mock recovery points")
	}

	newRP, err := client.TriggerVaultBackup(ctx)
	if err != nil {
		t.Fatalf("TriggerVaultBackup failed: %v", err)
	}
	if newRP.ID == "" {
		t.Errorf("Expected recovery point ID")
	}

	jobID, err := client.TriggerVaultRestore(ctx, newRP.ID)
	if err != nil {
		t.Fatalf("TriggerVaultRestore failed: %v", err)
	}
	if jobID == "" {
		t.Errorf("Expected restore job ID")
	}
}
