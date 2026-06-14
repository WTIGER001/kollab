# Technical Design: Task Synchronization & Dashboard

This document specifies the technical design, database schemas, AST parsing pipeline, and UI routing mechanisms for Arkollab's task management system.

---

## 1. System Architecture

The task management system operates on a **split-state synchronization model**:
1. The source of truth for the document remains the ProseMirror/Yjs collaborative XML/JSON tree.
2. In the background on every document save/update, the Go backend parses the document JSON to extract task checklist items.
3. These parsed items are synced to a dedicated relational database table (`tasks`) for rapid query indexing.
4. The dashboard queries this database table to present a global review interface, and redirects the user back to the source-of-truth document for interaction.

```
┌────────────────────────────────────────────────────────┐
│                   ProseMirror Document                 │
│  - Edit Mode: User types "@username" or "//due-date"    │
└────────────────────────────────────────────────────────┘
                            │
                            ▼ (Document Save Event)
┌────────────────────────────────────────────────────────┐
│                Backend AST Parsing Pipeline            │
│  - Walks prosemirrorNode tree for "taskItem" elements  │
│  - Extracts text content, assignees, and inline dates │
└────────────────────────────────────────────────────────┘
                            │
                            ▼ (Sync Transaction)
┌────────────────────────────────────────────────────────┐
│                   PostgreSQL DB Tasks                  │
│  - Deletes obsolete document task mappings             │
│  - Inserts new tasks with relational columns           │
└────────────────────────────────────────────────────────┘
                            │
                            ▼ (Dashboard Query)
┌────────────────────────────────────────────────────────┐
│                    My Tasks Dashboard                  │
│  - Fetches tasks, groups by page, displays urgency     │
│  - Clicking navigates user back to Document Editor     │
└────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

Tasks are stored in a relational Postgres table designed for quick lookup by username.

```sql
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    assignee VARCHAR(255) NOT NULL,
    due_date DATE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Index for assignee username lookup
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
```

---

## 3. Backend Parsing Pipeline (AST Walk)

When a document save event occurs, the Go backend `DocumentService` executes a debounced sync transaction:
1. **Node Extraction**: Recursively traverses the document's ProseMirror JSON structure searching for `type == "taskItem"` nodes.
2. **Text & Date Compilation**:
   - Accumulates raw text under child `text` nodes.
   - Captures the `date` attribute from any nested `inlineDate` nodes.
3. **Assignee Extraction**: Applies a regular expression matching `@([a-zA-Z0-9_.-]+)` against the compiled text. If a match is found, the username is extracted.
4. **Relational Synchronization**: In a single database transaction, deletes existing tasks associated with the `document_id` and inserts the newly generated list.

---

## 4. Query Model & API Endpoint

### 4.1 Fetching Tasks
The endpoint `GET /api/tasks?username=...` queries the postgres repository:
- Joins the `documents` table to retrieve `title` (document context), `project_id`, and `team_id` (routing context).
- Filters out tasks belonging to soft-deleted documents (`d.deleted_at IS NULL`).
- Sorts results: incomplete first, followed by due date ascending (closest deadline first), and lastly creation timestamp.

---

## 5. UI Integration & Editor Shortcuts

### 5.1 Editor Input Rules & Autocomplete
- **User Mentions (`@`)**: Typing `@` triggers a dropdown matching user profiles in the current team space, inserting the selected username in the active task list item.
- **Date Trigger (`//`)**: Typing `//` inserts an `inlineDate` node, which mounts [InlineDateView.tsx](file:///Users/johnbauer/Dev/Personal/arkm/frontend/src/components/InlineDateView.tsx) and calls `.showPicker()` to display the calendar selector instantly.

### 5.2 My Tasks Dashboard View
- Access is provided in the **TopNavbar User Profile Dropdown**.
- Lists current user's checklist items grouped by document.
- Renders due date urgency badges:
  - Overdue (red): `dueDate < today`
  - Due Today (orange): `dueDate == today`
  - Future (green): `dueDate > today`
- Row click routes the user back to the document editor using the combined `team_id`, `project_id`, and `document_id` path.
