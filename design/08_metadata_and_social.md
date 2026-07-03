# Technical Design: Metadata, Social, & Collaboration

This document specifies the technical design for document metadata and social features in Kollab, including comments, tasks, global tagging, and user avatars.

---

## 1. Document Comments & Nested Threads

> [!NOTE]
> **Status:** ⚪ Planned

Comments are stored in PostgreSQL using a nested parent-child hierarchy to form threads.

```sql
CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(255) PRIMARY KEY,
    document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    parent_id VARCHAR(255) REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

### 1.1 Go Backend Domain Layer
- **Authorization**: When updating or deleting, the service verifies `comment.CreatedBy == userID`.
- **Endpoints**: Standard REST endpoints (`GET`, `POST`, `PUT`, `DELETE`) secured with OIDC tokens.

### 1.2 Frontend Rendering (`<PageComments>`)
- Decodes the OIDC JWT payload locally for identity.
- Filters top-level comments and maps nested replies.
- Provides read-only guards if the document is soft-deleted (in Trash Bin).

---

## 2. Task Synchronization & Dashboard

> [!NOTE]
> **Status:** ⚪ Planned

Operates on a **split-state synchronization model**: the ProseMirror document is the source of truth, while a background process parses tasks into a relational database for dashboard aggregation.

### 2.1 Backend Parsing Pipeline (AST Walk)
When a document is saved:
1. Traverses the ProseMirror JSON searching for `taskItem` nodes.
2. Accumulates text and `inlineDate` nodes.
3. Extracts `@username` mentions via regex.
4. Re-syncs the `tasks` table for that `document_id`.

### 2.2 My Tasks Dashboard
- Queries `GET /api/tasks?username=...` for the current user's checklist items across all documents.
- Groups tasks by document and displays urgency badges (Overdue, Due Today, Future).

---

## 3. Document Tagging (Labels)

> [!NOTE]
> **Status:** ⚪ Planned

The tagging system uses `tags` (global definitions) and `document_tags` (mapping associations).

### 3.1 Schema
```sql
CREATE TABLE IF NOT EXISTS tags (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_tags (
    document_id VARCHAR(255) REFERENCES documents(id) ON DELETE CASCADE,
    tag_id VARCHAR(255) REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, tag_id)
);
```

### 3.2 Frontend Integration
- **Global Page**: `/my/tags` renders `TagsView` to manage tag definitions.
- **Document Tags**: Rendered in `DocumentTags.tsx` at the bottom of the page via a filterable MUI `Popover`, allowing on-the-fly tag creation.

---

## 4. User Initials Avatar

> [!NOTE]
> **Status:** ⚪ Planned

The `UserAvatar` component ensures a consistent, premium display of user profiles. It uses an algorithm to extract initials:
1. Split the trimmed display name by whitespace.
2. Extract the first character of each word.
3. Join, uppercase, and slice to a maximum of 3 characters.

```typescript
export const getInitials = (name: string): string => {
  if (!name) return "?";
  return name.trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0)).join("").toUpperCase().slice(0, 3);
};
```
