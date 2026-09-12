# Backups and restores

Server administrators can export and restore complete local server archives. Azure Blob Storage and Azure Backup Vault screens remain prototypes and should not be relied on for recovery.

## Export a complete archive

1. Open **Server Settings → Backup & sync**.
2. Select **Export Full Server Backup ZIP**.
3. Store the downloaded ZIP privately. It contains page content, versions, accounts, permissions, settings, and uploaded files.

An export briefly coordinates activity across API replicas so the database and files are captured consistently. It preserves the local workspace's data; replica presence and installation-specific coordination credentials are excluded.

## Restore an archive

1. Ask editors to save their current work.
2. Open **Server Settings → Backup & sync** and select **Upload & Restore Backup ZIP**.
3. Choose a complete archive from the same compatible application schema.
4. Wait for confirmation. Open editors reload to use the restored state.

Restore replaces the target installation's application data and files. It is different from [synchronization](synchronization.md), which merges changes and reviews conflicts. Partial or legacy archives and mismatched migration versions are rejected; no compatibility with old sync formats is provided.

If validation or the database transaction fails, the existing data is retained and staged files are rolled back. If recovery files are preserved after an interruption or rollback failure, stop retrying and have the server administrator reconcile the recovery directory and database outcome. Workspace operations remain blocked until recovery is complete.

See [deployment and recovery operations](admin_deployment_guide.md) and [the technical design](../design/multi_instance_sync.md).
