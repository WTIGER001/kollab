# Technical Design: Enterprise Publishing, Templates, & Transclusion

This document outlines the architecture for advanced enterprise features inspired by Confluence, specifically the separation of Drafts and Published states, the Page Blueprint engine, and content transclusion (Excerpts and Includes).

---

## 1. Draft vs. Published Separation

> [!NOTE]
> **Status:** 🟢 The workspace page is the live document. An approved content review records one audience snapshot. Read-only share links, excerpt includes, and read-only search use that snapshot. Whole-page includes and revision-pinned references remain planned.

The page people open in the workspace is `documents.content`, including the collaborative projection. Checkpoints and restores write `document_versions` and stay in history. They are not a visibility gate.

Audience surfaces use a separate snapshot so a share link or excerpt does not reveal a later draft. That snapshot is recorded when a content review is set to `approved`. A page that has never been approved keeps serving live content on those surfaces.

### 1.1 Database Schema
Migration `0009_document_publications.sql` stores one row per document. It does not add `published_version_id` or `has_unpublished_changes` to `documents`.

```sql
CREATE TABLE IF NOT EXISTS document_publications (
    document_id VARCHAR(255) PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
    version_id VARCHAR(255) NOT NULL REFERENCES document_versions(id) ON DELETE RESTRICT,
    published_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`DocumentService.PublishDocument` writes a `document_versions` row from the current document content and upserts `document_publications`. `POST /api/documents/{id}/publish` remains for compatibility. The editor does not call it. `UpdateDocumentReview` calls it when `status == "approved"`. Changing the review away from approved leaves the last row in place.

### 1.2 Routing & Rendering Logic
- **Workspace reads**: `GetDocument` returns the live page for editors and for signed-in readers inside the workspace.
- **Share links**: `OpenSharedDocument` renders live content when the link grants write. Otherwise it replaces `doc.Content` with `AudienceDocument` when a snapshot exists, then renders HTML.
- **Read-only search**: after the live-content SQL match, a caller who cannot write and who supplied a query is passed through `ForReader`. A hit whose query is absent from the approved title and text is dropped. Text that exists only in an older snapshot and was removed from the live page is not found by the SQL search.
- **Editors**: they join the Yjs room seeded from the live page. **Done** saves a named checkpoint and leaves edit mode. It does not write `document_publications`.

### 1.3 Review snapshot
1. The author saves the live page.
2. The content-review block sets status to `approved`.
3. `PublishDocument` captures the current AST as a version and points `document_publications.version_id` at it.
4. A later draft stays on the live page until the review is approved again.

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
- **Resolution**: The React macro view calls `GET /api/documents/{pageId}/published` and uses that snapshot when one exists. A 404 (`document has not been published`) falls back to `GET /api/documents/{pageId}`. Both requests use the existing document read middleware; a missing or revoked source renders an access-safe message rather than cached source text.

### 3.2 Transclusion Rendering Engine
Because transclusions must be resolved before the user sees them, the backend or the React NodeView must fetch the target content.

1. **Stable source blocks**: New `excerpt` nodes receive a generated `excerptId` serialized in `data-excerpt-id`. Existing excerpts without an ID remain readable and can be selected as the first excerpt on a source page.
2. **Client-side resolution**: `excerpt-include` prefers the approved snapshot from `GET /api/documents/{pageId}/published` and falls back to the live protected document when the page has never been approved. No local sidebar-tree cache is trusted as source content.
3. **Excerpt filtering**: The macro traverses the returned Tiptap JSON and renders the selected `attrs.excerptId`, or the first explicit excerpt for backward-compatible includes.
4. **Cycle safety**: A macro rejects a direct self-include. Included content is text-only rather than recursively rendering nested include macros, so a longer include cycle cannot recurse through the renderer.
5. **Future expansion**: Whole-page embeds, revision IDs, and server-side fragment responses will add explicit provenance/version labels without changing the saved excerpt ID format. The audience snapshot is already the approved content review.
