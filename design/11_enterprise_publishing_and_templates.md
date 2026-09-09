# Technical Design: Enterprise Publishing, Templates, & Transclusion

This document outlines the architecture for advanced enterprise features inspired by Confluence, specifically the separation of Drafts and Published states, the Page Blueprint engine, and content transclusion (Excerpts and Includes).

---

## 1. Draft vs. Published Separation

> [!NOTE]
> **Status:** 🟡 Publication snapshots and live excerpt includes are implemented. Reader-mode routing, whole-page includes, and revision-pinned references remain planned.

To support large-scale enterprise editing without exposing incomplete thoughts to a wide audience, the collaborative Yjs state is formally separated from the "Published" state that read-only viewers see.

### 1.1 Database Schema Enhancements
The `documents` table tracks the active draft. Migration `0009_document_publications.sql` stores the safe, readable snapshot in a separate one-row-per-document mapping, avoiding a disruptive rewrite of existing document scans.

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
3. The editor flushes and awaits the ordinary draft-save request, then the backend generates a new `document_versions` row, capturing that confirmed AST. A failed save or publish leaves the editor open; it never promotes a merely queued debounce timer to a publication.
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
> **Status:** 🟡 Excerpt definitions and live excerpt includes are implemented. Whole-page includes and revision-pinned references remain planned.

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
- **Status**: Planned.

#### 3. The `includeExcerpt` Macro
Used to embed a specific fragment from an external document.
- **Node Type**: `macroBlock` with `type: "excerpt-include"`
- **Attributes**: `config.pageId`, with optional `config.excerptId`
- **Resolution**: The React macro view reads the current source through `GET /api/documents/{pageId}`. The existing document read middleware therefore remains the authorization boundary; a missing or revoked source renders an access-safe message rather than cached source text.

### 3.2 Transclusion Rendering Engine
Because transclusions must be resolved before the user sees them, the backend or the React NodeView must fetch the target content.

1. **Stable source blocks**: New `excerpt` nodes receive a generated `excerptId` serialized in `data-excerpt-id`. Existing excerpts without an ID remain readable and can be selected as the first excerpt on a source page.
2. **Client-side resolution**: `excerpt-include` fetches the source page from the ordinary protected document endpoint; no local sidebar-tree cache is trusted as source content.
3. **Excerpt filtering**: The macro traverses the returned Tiptap JSON and renders the selected `attrs.excerptId`, or the first explicit excerpt for backward-compatible includes.
4. **Cycle safety**: A macro rejects a direct self-include. Included content is text-only rather than recursively rendering nested include macros, so a longer include cycle cannot recurse through the renderer.
5. **Future expansion**: Whole-page embeds, revision IDs, server-side fragment responses, and published-state snapshots will add explicit provenance/version labels without changing the saved excerpt ID format.
