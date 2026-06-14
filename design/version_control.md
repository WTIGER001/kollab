# Technical Design: Version Control & Restorations

This document specifies the technical design, database schemas, auto-snapshot rules, and front-end uncoupling mechanisms of Arkollab's document version control system.

---

## 1. Version Database Schema

Document versions are stored in the `document_versions` database table. Each entry references a historical snapshot of the complete document content.

```
                  ┌──────────────────────┐
                  │ Document Save Event  │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
     Manual │                                 │ Auto-saved
            ▼                                 ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│ Manual Milestone        │         │ Check Snaphot Rules     │
│ Summary provided by user│         │ - Time > 5 minutes?     │
└───────────┬─────────────┘         │ - Author changed?       │
            │                       └────────────┬────────────┘
            │                                    │ Yes
            └────────────────┬───────────────────┘
                             │
                             ▼
               ┌───────────────────────────┐
               │ Insert Version Snapshot   │
               │ previous content recorded │
               └───────────────────────────┘
```

### 1.1 DB Schema DDL
```sql
CREATE TABLE IF NOT EXISTS document_versions (
    id VARCHAR(255) PRIMARY KEY,
    document_id VARCHAR(255) REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,                  -- Historical ProseMirror JSON state
    version_number INT NOT NULL,            -- Sequential version count
    created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    change_summary VARCHAR(255),            -- "Auto-saved snapshot" or named summary
    created_at TIMESTAMP NOT NULL
);
```

---

## 2. Version Snapshot & Auto-Save Rules

To prevent bloating the database with version records on every keystroke, the Go backend enforces strict rate-limiting and identity guards on auto-saves.

### 2.1 Auto-Snapshot Deciding Logic
When `UpdateDocument` is called during collaborative sync:
1. The backend fetches the latest version snapshot for the document:
   ```sql
   SELECT id, document_id, content, version_number, created_by, change_summary, created_at
   FROM document_versions
   WHERE document_id = $1
   ORDER BY version_number DESC
   LIMIT 1;
   ```
2. A snapshot of the **previous** document content is triggered if any of the following conditions are met:
   - **No history**: No previous snapshot exists (`latest == nil`).
   - **Time elapsed**: More than **5 minutes** have passed since the last snapshot was created:
     $$\Delta t = t_{now} - t_{latest} > 5 \text{ minutes}$$
   - **Author hand-over**: The user editing the document is different from the contributor of the last snapshot:
     $$\text{user\_id}_{current} \neq \text{user\_id}_{latest}$$
3. When saving, the version number is incremented sequentially:
   $$\text{version\_number} = \text{version\_number}_{latest} + 1$$
4. The auto-save snapshot captures the **previous** content state of the document, ensuring we save history prior to the current update event.

### 2.2 Manual Milestone Overrides
Users can explicitly record a milestone checkpoint. This bypasses time and author checks, creating a snapshot immediately with a user-provided change summary.

---

## 3. Version Restoration & Safe Snapshots

To prevent data loss, the restore operation performs a double-snapshot transaction.

### 3.1 Restore Lifecycle
1. The client requests a restore event to a specific target version ID.
2. **Pre-Restore Backup**: The backend saves an emergency snapshot of the document’s current state (using `"Snapshot before restore"` as the change summary). This ensures that any work completed since the last version snapshot is not lost.
3. **Restoration**: The backend overwrites the document's active `content` column with the target version's content.
4. **Re-Indexing**: The restored content is pushed to a background goroutine to regenerate its AI embedding.

---

## 4. Frontend Uncoupling & Preview Canvas

To allow users to browse and compare historical versions without interrupting active co-authors, Arkollab decouples the editor canvases.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Arkollab Editor Shell                           │
│                                                                        │
│  ┌──────────────────────────────┐    ┌──────────────────────────────┐  │
│  │    Collaborative Canvas      │    │    Preview Canvas (Drawer)   │  │
│  │  - Active Yjs room sync      │    │  - Read-Only (`editable=f`)  │  │
│  │  - Connected to Go WS Relay  │    │  - Separate StarterKit state │  │
│  │                              │    │  - Overlays version content  │  │
│  └──────────────────────────────┘    └──────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Collaborative Editor**: Initialized with collaboration extensions connected to the active Yjs sync relay.
- **History Preview Editor**: Initialized as a read-only instance (`editable: false`) without the collaboration or presence extensions. It is mounted in the slide-out history drawer. Clicking a version fetches its raw content and injects it into the preview container, ensuring active Yjs sessions are unaffected.
- **Restore Command**: Triggers a POST call to the backend. Once the backend updates the active document content, the WebSocket hub broadcasts the update to all active rooms, refreshing their Yjs states simultaneously.
