# Technical Design: Enterprise Publishing, Templates, & Transclusion

This document outlines the architecture for advanced enterprise features inspired by Confluence, specifically the separation of Drafts and Published states, the Page Blueprint engine, and content transclusion (Excerpts and Includes).

---

## 1. Draft vs. Published Separation

> [!NOTE]
> **Status:** ⚪ Planned

To support large-scale enterprise editing without exposing incomplete thoughts to a wide audience, the collaborative Yjs state is formally separated from the "Published" state that read-only viewers see.

### 1.1 Database Schema Enhancements
The `documents` table tracks the active draft, while the `published_version_id` points to the safe, readable snapshot.

```sql
ALTER TABLE documents 
ADD COLUMN published_version_id VARCHAR(255) REFERENCES document_versions(id) ON DELETE SET NULL,
ADD COLUMN has_unpublished_changes BOOLEAN NOT NULL DEFAULT FALSE;
```

### 1.2 Routing & Rendering Logic
- **Viewers (Read-Only)**: When a user without edit permissions (or an editor who is just browsing) visits a page, the backend serves the `content` from the `document_versions` row matching `published_version_id`. They do **not** connect to the Yjs WebSocket relay.
- **Editors (Drafting)**: When a user clicks "Edit", they join the Yjs WebSocket room. The Yjs room is seeded by the `documents.content` column (the active draft). 

### 1.3 Publishing Lifecycle
1. Authors collaborate in real-time in the Yjs room (`has_unpublished_changes = TRUE`).
2. An author clicks the **"Publish"** button.
3. The backend generates a new `document_versions` row, capturing the current Yjs AST.
4. The backend updates `documents.published_version_id` to this new version ID and sets `has_unpublished_changes = FALSE`.

---

## 2. Page Blueprints & Templates

> [!NOTE]
> **Status:** ⚪ Planned

The Template engine allows administrators and users to define standardized layouts (e.g., PRDs, Meeting Notes) that can be instantiated across different scopes.

### 2.1 Database Schema
```sql
CREATE TYPE template_scope AS ENUM ('system', 'team', 'personal');

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL, -- The ProseMirror JSON AST
    scope template_scope NOT NULL DEFAULT 'system',
    team_id VARCHAR(255) REFERENCES teams(id) ON DELETE CASCADE, -- Null if system or personal
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE, -- Null if system or team
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 2.2 Template Instantiation Flow
1. **Creation**: A user clicks "Create from Template".
2. **Selection**: A modal queries `GET /api/templates` and presents a gallery. The backend filters available templates based on the current context:
   - **Inside a Team Space**: The user can choose from **Team Templates** (`team_id` matches the active team) and **System Templates** (`scope = 'system'`).
   - **Inside a Personal Space**: The user can choose from **Personal Templates** (`user_id` matches the active user) and **System Templates** (`scope = 'system'`).
3. **Instantiation**: The frontend fetches the template's JSON AST. When issuing the `POST /api/documents` request, it injects this AST into the new document payload rather than a blank `StarterKit`.
4. **Placeholder Nodes**: Tiptap is configured with a custom `placeholderBlock` node that renders instructional text (e.g., *"Type meeting attendees here..."*). As soon as the user focuses and types, the node transforms into standard text.

### 2.3 Block Templates (Snippets)
While Page Blueprints define an entire new document, Block Templates (or Snippets) allow users to insert pre-configured chunks of content into any *existing* page.
- **Data Model**: Uses the same `templates` table, but distinguished via a new column `template_type ENUM ('page', 'block')`.
- **UX Flow**: A user types a slash command (e.g., `/snippet` or `/block`) in the editor. A dropdown menu appears showing available Snippets (e.g., "Standard Meeting Agenda", "Warning Banner", "Author Bio Card").
- **Instantiation**: When selected, the snippet's JSON AST is injected directly at the user's current cursor position. It instantly becomes standard, editable content on the page without altering the rest of the document.

---

## 3. Transclusion: Include Page & Excerpt Macros

> [!NOTE]
> **Status:** ⚪ Planned

Transclusion allows authors to define a single source of truth and embed it across multiple pages to prevent duplicate data maintenance.

### 3.1 Node Schemas

#### 1. The `excerpt` Wrapper Macro
Used by authors to define a fragment of content that can be referenced elsewhere.
- **Node Type**: `excerpt` (Group: `block`, Content: `block+`)
- **Attributes**: `excerptId` (Unique string generated on creation).
- **Rendering**: Renders as a standard `div` with a subtle dashed border only visible in Edit mode.

#### 2. The `includePage` Macro
Used to embed an entire external document.
- **Node Type**: `includePage` (Group: `block`, `atom: true`)
- **Attributes**: `documentId`

#### 3. The `includeExcerpt` Macro
Used to embed a specific fragment from an external document.
- **Node Type**: `includeExcerpt` (Group: `block`, `atom: true`)
- **Attributes**: `documentId`, `excerptId`

### 3.2 Transclusion Rendering Engine
Because transclusions must be resolved before the user sees them, the backend or the React NodeView must fetch the target content.

1. **Client-Side Resolution**: When the `includePage` React NodeView mounts, it fires `GET /api/documents/{documentId}/published`.
2. **Recursive Loop Prevention**: The request payload includes an `X-Transclusion-Path` header (e.g., `docA -> docB`). The backend rejects the request if a cycle is detected.
3. **AST Injection**: The fetched AST is rendered within a read-only, nested `<EditorContent>` instance. It is styled with a "Link" icon to indicate to the reader that the block is sourced from elsewhere.
4. **Excerpt Filtering**: For `includeExcerpt`, the backend traverses the requested document's AST, isolates the node matching `attrs.excerptId`, and returns only that fragment.
