package storage

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type AzureVaultRecoveryPoint struct {
	ID                 string    `json:"id"`
	RecoveryPointTime  time.Time `json:"recoveryPointTime"`
	RecoveryPointType  string    `json:"recoveryPointType"` // "Full", "Incremental", "VaultedLTR"
	VaultName          string    `json:"vaultName"`
	Status             string    `json:"status"` // "Completed", "Active"
}

type AzureBackupVaultClient struct {
	subscriptionID     string
	resourceGroup      string
	vaultName          string
	backupInstanceName string
	mockRecoveryPoints []AzureVaultRecoveryPoint
	mu                 sync.RWMutex
}

func NewAzureBackupVaultClient(subscriptionID, resourceGroup, vaultName, backupInstanceName string) *AzureBackupVaultClient {
	now := time.Now()
	return &AzureBackupVaultClient{
		subscriptionID:     subscriptionID,
		resourceGroup:      resourceGroup,
		vaultName:          vaultName,
		backupInstanceName: backupInstanceName,
		mockRecoveryPoints: []AzureVaultRecoveryPoint{
			{
				ID:                "rp-vault-101",
				RecoveryPointTime: now.Add(-2 * time.Hour),
				RecoveryPointType: "VaultedLTR",
				VaultName:         vaultName,
				Status:            "Completed",
			},
			{
				ID:                "rp-vault-100",
				RecoveryPointTime: now.Add(-24 * time.Hour),
				RecoveryPointType: "VaultedLTR",
				VaultName:         vaultName,
				Status:            "Completed",
			},
		},
	}
}

func (c *AzureBackupVaultClient) TriggerVaultBackup(ctx context.Context) (*AzureVaultRecoveryPoint, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	rp := AzureVaultRecoveryPoint{
		ID:                fmt.Sprintf("rp-vault-%d", time.Now().Unix()),
		RecoveryPointTime: time.Now(),
		RecoveryPointType: "VaultedLTR",
		VaultName:         c.vaultName,
		Status:            "Completed",
	}
	c.mockRecoveryPoints = append([]AzureVaultRecoveryPoint{rp}, c.mockRecoveryPoints...)
	return &rp, nil
}

func (c *AzureBackupVaultClient) ListRecoveryPoints(ctx context.Context) ([]AzureVaultRecoveryPoint, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return append([]AzureVaultRecoveryPoint(nil), c.mockRecoveryPoints...), nil
}

func (c *AzureBackupVaultClient) TriggerVaultRestore(ctx context.Context, recoveryPointID string) (string, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	for _, rp := range c.mockRecoveryPoints {
		if rp.ID == recoveryPointID {
			return fmt.Sprintf("job-restore-%s-%d", recoveryPointID, time.Now().Unix()), nil
		}
	}
	return "", fmt.Errorf("recovery point %s not found in Azure Backup Vault %s", recoveryPointID, c.vaultName)
}
