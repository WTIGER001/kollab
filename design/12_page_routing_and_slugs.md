# Technical Design: Page Routing and Custom Slugs

This document specifies the routing architecture for Kollab documents, transitioning from strict UUID-based URLs to memorable, human-readable "nicknames" or slugs.

---

## 1. Routing & Resolution Logic

> [!NOTE]
> **Status:** ⚪ Planned

Kollab URLs must support a dual-resolution system where users can safely share either the underlying immutable UUID or the dynamic, human-readable slug.

### 1.1 Dual Routing Strategy
- **UUID Routing**: `https://kollab.internal/docs/{uuid}`
  - The fallback mechanism. If a link is constructed using the `id`, the backend will instantly resolve it. This guarantees that deep-links and bookmarks never break even if the document is renamed.
- **Slug Routing**: `https://kollab.internal/docs/{slug}`
  - The preferred, default URL shown in the browser address bar. The frontend router will attempt to fetch by `slug`. If the API returns a 404, it assumes the parameter might be an invalid slug and throws a "Page Not Found".

### 1.2 Database Schema Updates
The `documents` table requires a new, globally unique column for the URL nickname.

```sql
ALTER TABLE documents ADD COLUMN slug VARCHAR(255) UNIQUE;

-- Create an index to optimize the frontend slug-based GET requests
CREATE INDEX idx_documents_slug ON documents(slug);
```

---

## 2. Slug Generation & Conflict Resolution

> [!NOTE]
> **Status:** ⚪ Planned

### 2.1 Auto-Generation (The Default Path)
When a user types the title of a new document (e.g., "Q3 Engineering Roadmap"), the frontend debounces the input and automatically generates a proposed slug by:
1. Converting all text to lowercase.
2. Replacing spaces and special characters with hyphens.
3. Stripping non-alphanumeric characters.
*(Result: `q3-engineering-roadmap`)*

### 2.2 Uniqueness Constraints (Collision Handling)
Since slugs are globally unique across the workspace, the backend API enforces strict duplicate prevention on `POST /documents` and `PUT /documents`.

If `q3-engineering-roadmap` already exists:
1. The backend appends a sequential integer suffix (e.g., `-1`, `-2`).
2. The system iteratively checks `q3-engineering-roadmap-1`, `q3-engineering-roadmap-2` until a unique slot is found.
3. The successful slug is persisted.

---

## 3. Custom Nickname Overrides

> [!NOTE]
> **Status:** ⚪ Planned

Users are not strictly bound to the auto-generated title-based slug.

### 3.1 The Page Details Modal
Users can open a "Page Info / Settings" dialog from the document header. This dialog includes a text input allowing them to explicitly override the Page Nickname.

### 3.2 Validation Rules for Custom Slugs
- **Format**: Must match the regex `^[a-z0-9-]+$` (only lowercase letters, numbers, and hyphens).
- **Uniqueness Check**: When the user clicks "Save," the frontend fires a pre-flight `GET /api/documents/check-slug?slug={input}` to instantly validate availability before submitting the form.
- **Redirection**: If a user successfully changes the slug of an existing page, any user currently viewing the page via the old slug will remain connected via their WebSocket session, and the frontend will silently use the History API to push the new URL to their address bar without reloading.

---

## 4. Slug Aliases & Permanent Redirection

> [!NOTE]
> **Status:** ⚪ Planned

To prevent broken links when a document is renamed or its slug is explicitly changed, Kollab implements a historical alias system.

### 4.1 Alias Table
```sql
CREATE TABLE IF NOT EXISTS document_slug_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    old_slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 4.2 Redirect Flow
When a user visits a slug (e.g. `GET /docs/q3-roadmap`):
1. The backend searches the `documents` table for `slug = 'q3-roadmap'`.
2. If no active document is found, it queries `document_slug_aliases` for `old_slug = 'q3-roadmap'`.
3. If an alias is found, it fetches the document's current active slug (e.g. `q4-roadmap`) and issues a `301 Moved Permanently` to the new route.
4. If neither exist, a standard `404 Not Found` is returned.
