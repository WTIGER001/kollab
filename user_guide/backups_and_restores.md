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

## Restore a team or project from another server

Open **Server Settings → Team & project transfer**, or use **Open team & project transfer** under **Backup & sync**. This dedicated page is available before the destination exists. Server administrator access is required on both servers.

1. On the source server, choose **Team and its projects** or **One project**, select the source space, and click **Download transfer ZIP**.
2. On the destination server, upload that ZIP under **Import as a new team or project**. The archive preview shows its name, export date, and counts of pages, projects, versions, comments, and files.
3. Enter the new space's name and abbreviation. Team archives always create a new team. For a project archive, select an existing **Parent team** or enter a name and abbreviation to create one.
4. Choose a **Local owner**. Optionally map each source member or author to an existing local user. No accounts are created and matching names are never mapped automatically. For an existing parent team, the owner and mapped members must already belong to that team.
5. Review the destination and access settings, select the review checkbox, and click **Create team & import** or **Create project & import**. Use **Open imported team/project** when it finishes.

Names and abbreviations must be available in the destination context. Abbreviations contain 1–64 letters, numbers, underscores or hyphens, beginning with a letter or number. Resolve a conflict by changing the proposed name or abbreviation; an import never overwrites or merges an existing space. Each successful import creates a separate copy.

The local owner receives owner access. Mapped members receive editor access. Unmapped authors are assigned to the owner; unmapped memberships are omitted. The importing administrator is also added to newly created teams. Imported pages inherit the destination's access settings. Source permission exceptions and sharing links are excluded, so review the destination membership before importing sensitive pages.

Transfer archives preserve page trees (including trash), versions, comments, attachments, referenced images, tags, tasks, page properties, reviews, and publications. Team transfers also carry team templates and scoped image libraries. Pages and files receive new IDs, and included page and media references are rewritten. A project page whose parent is outside the archive becomes a root page. Matching existing tag names are reused without changing their settings.

Account credentials, integrations, server settings, sharing links, favorites, watches, notifications, audit history, collaborative sessions, and generated attachment previews are excluded. External page references and task assignee text may need updating. Attachment previews can be regenerated after import. Use [full-server restore](#restore-an-archive) when you need to replace an entire installation.

Use a **transfer ZIP**, up to 256 MiB compressed and expanded, exported with this feature. Full-server backups and old prototype team/project archives are rejected by this page. Missing files and invalid references are rejected before import. A failed database or file write leaves existing spaces intact. If the server says the commit could not be confirmed, check the teams directory before retrying: the new space may already exist, and newly written files are retained for recovery.

The **Cloud backups (preview)** page is a prototype. Its controls do not save settings, create backups, or restore data; its messages now say this explicitly.

See the [team/project transfer design](../design/scoped_transfers.md).

Hero buttons and image backgrounds that point to pages or images inside the archive follow the newly imported copies. External website links retain their original destinations.
