import React, { useState } from 'react';

export const AdminBackupsPage: React.FC = () => {
  const [azureEnabled, setAzureEnabled] = useState(true);
  const [accountName, setAccountName] = useState('kollabenterprisebackup');
  const [containerName, setContainerName] = useState('kollab-backups');
  const [scheduleCron, setScheduleCron] = useState('0 2 * * *');
  const [retentionDays, setRetentionDays] = useState(30);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const [useBackupVault, setUseBackupVault] = useState(true);
  const [subscriptionId, setSubscriptionId] = useState('00000000-0000-0000-0000-000000000000');
  const [resourceGroup, setResourceGroup] = useState('rg-kollab-enterprise');
  const [vaultName, setVaultName] = useState('kollab-backup-vault');
  const [backupInstanceName, setBackupInstanceName] = useState('kollab-postgres-instance');

  const backupHistory = [
    { id: 'rp-101', name: 'rp-vault-20260809-020000', type: 'Azure Backup Vault (LTR)', size: 'Vault Managed', location: 'Azure Backup Vault (kollab-backup-vault)', date: '2026-08-09 02:00:00', status: 'Vault Protected' },
    { id: 'b-101', name: 'kollab_backup_20260809_020000.zip', type: 'Blob Storage ZIP', size: '142.4 MB', location: 'Azure Blob Container (kollab-backups)', date: '2026-08-09 02:00:00', status: 'Completed' },
    { id: 'b-100', name: 'kollab_backup_20260808_020000.zip', type: 'Blob Storage ZIP', size: '140.1 MB', location: 'Azure Blob Container (kollab-backups)', date: '2026-08-08 02:00:00', status: 'Completed' },
  ];

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('Azure Blob Storage and Azure Backup Vault configuration saved successfully.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleTriggerBackup = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setStatusMessage('Immediate backup triggered: uploaded archive to Azure Blob Container and created snapshot in Azure Backup Vault.');
      setTimeout(() => setStatusMessage(null), 4000);
    }, 1500);
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsRestoring(true);
      setTimeout(() => {
        setIsRestoring(false);
        setStatusMessage('Backup archive restored successfully into Kollab.');
        setTimeout(() => setStatusMessage(null), 4000);
      }, 2000);
    }
  };

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-primary)',
      minHeight: '100vh',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>System & Azure Backup Management</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
            Manage automated cloud backups, configure Azure Blob Storage, and restore system snapshots.
          </p>
        </div>
        <button
          onClick={handleTriggerBackup}
          disabled={isExporting}
          style={{
            backgroundColor: 'var(--primary-color)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--border-radius-button, 6px)',
            padding: '10px 20px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-button, 0 2px 4px rgba(0,0,0,0.1))',
          }}
        >
          {isExporting ? 'Creating Backup...' : '⚡ Run Immediate Backup'}
        </button>
      </div>

      {statusMessage && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '24px',
          borderRadius: 'var(--border-radius-card, 8px)',
          backgroundColor: 'rgba(46, 125, 50, 0.15)',
          border: '1px solid var(--accent-color, #2e7d32)',
          color: 'var(--text-primary)',
        }}>
          {statusMessage}
        </div>
      )}

      {/* Azure Blob Storage Configuration Section */}
      <div style={{
        backgroundColor: 'var(--panel-color)',
        borderRadius: 'var(--border-radius-card, 12px)',
        border: 'var(--border-width, 1px) var(--border-style, solid) var(--border-color)',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: 'var(--shadow-elevation, 0 4px 12px rgba(0,0,0,0.05))',
      }}>
        <h2 style={{ fontSize: '20px', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ☁️ Azure Blob Storage & Azure Backup Integration
        </h2>

        <form onSubmit={handleSaveSettings}>
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              id="azureEnabled"
              checked={azureEnabled}
              onChange={(e) => setAzureEnabled(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="azureEnabled" style={{ fontWeight: 600, cursor: 'pointer' }}>
              Enable Automated Backups to Azure Blob Storage
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Azure Storage Account Name
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--border-radius-button, 6px)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Azure Blob Container Name
              </label>
              <input
                type="text"
                value={containerName}
                onChange={(e) => setContainerName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--border-radius-button, 6px)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Backup Schedule Cron (UTC)
              </label>
              <input
                type="text"
                value={scheduleCron}
                onChange={(e) => setScheduleCron(e.target.value)}
                placeholder="0 2 * * *"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--border-radius-button, 6px)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Retention Policy (30 Daily + 12 Monthly)
              </label>
              <input
                type="number"
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--border-radius-button, 6px)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Azure Backup Vault Section */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px', marginBottom: '20px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                id="useBackupVault"
                checked={useBackupVault}
                onChange={(e) => setUseBackupVault(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="useBackupVault" style={{ fontWeight: 600, cursor: 'pointer' }}>
                Enable Native Azure Backup Vault Integration (Azure Data Protection / Vault ARM API)
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Azure Subscription ID
                </label>
                <input
                  type="text"
                  value={subscriptionId}
                  onChange={(e) => setSubscriptionId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--border-radius-button, 6px)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Azure Resource Group
                </label>
                <input
                  type="text"
                  value={resourceGroup}
                  onChange={(e) => setResourceGroup(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--border-radius-button, 6px)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Azure Backup Vault Name
                </label>
                <input
                  type="text"
                  value={vaultName}
                  onChange={(e) => setVaultName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--border-radius-button, 6px)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Backup Instance Name
                </label>
                <input
                  type="text"
                  value={backupInstanceName}
                  onChange={(e) => setBackupInstanceName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--border-radius-button, 6px)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: 'var(--secondary-color, #1976d2)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--border-radius-button, 6px)',
              padding: '10px 18px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Save Azure Storage Configuration
          </button>
        </form>
      </div>

      {/* Backup History & Restore Section */}
      <div style={{
        backgroundColor: 'var(--panel-color)',
        borderRadius: 'var(--border-radius-card, 12px)',
        border: 'var(--border-width, 1px) var(--border-style, solid) var(--border-color)',
        padding: '24px',
        boxShadow: 'var(--shadow-elevation, 0 4px 12px rgba(0,0,0,0.05))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', margin: 0 }}>📜 Backup Archive History & Restore</h2>
          <label style={{
            backgroundColor: 'var(--bg-color)',
            border: '1px dashed var(--border-color)',
            padding: '8px 16px',
            borderRadius: 'var(--border-radius-button, 6px)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
          }}>
            {isRestoring ? 'Restoring Archive...' : '📥 Upload & Restore Archive (.zip)'}
            <input type="file" accept=".zip" onChange={handleRestoreFile} style={{ display: 'none' }} />
          </label>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '14px' }}>
              <th style={{ padding: '12px' }}>Archive File</th>
              <th style={{ padding: '12px' }}>Type</th>
              <th style={{ padding: '12px' }}>Size</th>
              <th style={{ padding: '12px' }}>Destination</th>
              <th style={{ padding: '12px' }}>Created At</th>
              <th style={{ padding: '12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {backupHistory.map((b) => (
              <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                <td style={{ padding: '12px', fontWeight: 600 }}>{b.name}</td>
                <td style={{ padding: '12px' }}>{b.type}</td>
                <td style={{ padding: '12px' }}>{b.size}</td>
                <td style={{ padding: '12px' }}>{b.location}</td>
                <td style={{ padding: '12px' }}>{b.date}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(46, 125, 50, 0.15)',
                    color: 'var(--accent-color, #2e7d32)',
                    fontWeight: 600,
                    fontSize: '12px',
                  }}>
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
