# Soft Delete & Trash Restoration Specification

This document details the design and implementation of soft-deletes, cascading page deletions, and space-level undelete operations in the Arkollab collaborative text editor.

---

## 💾 1. Database Schema & Migration

A nullable `deleted_at` timestamp is added to the `documents` table to facilitate soft deletion without breaking relational integrity.

```sql
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at) WHERE deleted_at IS NULL;
```

---

## 🔄 2. Recursive Soft-Delete Cascades

When a page is deleted, all descendant sub-pages must also be soft-deleted recursively to prevent orphaned nodes. This is achieved via a recursive Common Table Expression (CTE) query.

### Postgres Query:
```sql
WITH RECURSIVE descendants AS (
    SELECT id FROM documents WHERE id = $1
    UNION ALL
    SELECT d.id FROM documents d JOIN descendants desc_ ON d.parent_id = desc_.id
)
UPDATE documents SET deleted_at = NOW() WHERE id IN (SELECT id FROM descendants);
```

---

## 🗑️ 3. Permanent Deletion

Users can choose to purge documents from the Trash Bin permanently. Doing so hard-deletes the page and all sub-pages recursively:

### Postgres Query:
```sql
WITH RECURSIVE descendants AS (
    SELECT id FROM documents WHERE id = $1
    UNION ALL
    SELECT d.id FROM documents d JOIN descendants desc_ ON d.parent_id = desc_.id
)
DELETE FROM documents WHERE id IN (SELECT id FROM descendants);
```

---

## 🚀 4. Restoration and Orphaning Checks

When a user restores a soft-deleted page, the `deleted_at` column is cleared (`NULL`). However, to avoid rendering issues in the sidebar hierarchy:
- We check if the restored page's parent page (`parentId`) is still soft-deleted.
- If the parent is still soft-deleted, the restored page's `parentId` is updated to `nil`, effectively orphaning it and moving it to the root level of the workspace space.

---

## 📡 5. Go HTTP Handler & Router Endpoints

Endpoints registered in `api/internal/http/router.go` handle trash operations:

- **Soft / Permanent Delete**: `DELETE /api/documents/{id}?permanent=true`
- **List Trash**: `GET /api/documents/trash?projectId={projectId}&teamId={teamId}` (When listing trash by `teamId`, documents belonging to projects are filtered out: `project_id IS NULL OR project_id = ''`).
- **Undelete / Restore**: `POST /api/documents/{id}/restore`

> [!NOTE]
> Similarly, document listings via `GET /api/documents?teamId={teamId}` filter out documents owned by projects to ensure clean separation between project-specific workspaces and general team spaces.

---

## 🎨 6. Front-End Trash Page & Banner Overlay

1. **Trash Page & Routing**: Triggered by the Trash Bin button in the sidebar. Renders a dedicated page view (`TrashView`) scoped by the parent space.
   - Team Trash: `/teams/{teamId}/trash`
   - Project Trash: `/teams/{teamId}/p/{projectId}/trash`
   - Personal Trash: `/personal/trash`
   The view shows soft-deleted pages in a table containing the page title and deleted date, alongside restore and permanent delete actions. A back button allows navigation back to the workspace.
2. **Banner Overlay Warning**: If a user navigates to a soft-deleted page directly, an alert banner is displayed above the title. The editor is configured as read-only (`isEditing = false`), and quick action buttons allow the user to restore or permanently purge the document.
