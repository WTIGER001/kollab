# Design Specification: Document Tagging (Labels)

This document describes the technical architecture and specifications for the document tagging/labeling system.

---

## 💾 1. Database Schema

The tagging system uses two relational tables: `tags` (defining the label) and `document_tags` (mapping label associations to documents).

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
CREATE INDEX IF NOT EXISTS idx_document_tags_doc_id ON document_tags(document_id);
```

### Constraints & Types
- `tags.name`: Handled as lowercase with spaces trimmed, ensuring case-insensitive uniqueness constraint.
- `document_tags.document_id`: Configured with `ON DELETE CASCADE` so that deleting a document automatically cleans up all associated tag mappings.

---

## 🔌 2. REST API Endpoints

All tagging API routes are protected behind OIDC/JWT authorization middleware.

### Global Tag Operations
- **`GET /api/tags`**
  - **Description**: Returns all tags sorted alphabetically by name. Joins document counts per tag.
  - **Response (200 OK)**:
    ```json
    [
      {
        "id": "tag_engineering",
        "name": "engineering",
        "description": "Technical designs and software engineering docs",
        "color": "#3b82f6",
        "createdAt": "2026-06-17T18:00:00Z",
        "pageCount": 4
      }
    ]
    ```

- **`POST /api/tags`**
  - **Description**: Creates a new global tag.
  - **Request Body**:
    ```json
    {
      "name": "tutorial",
      "description": "Step-by-step learning guides",
      "color": "#10b981"
    }
    ```
  - **Response (201 Created)**: Returns the newly created tag object.

- **`PUT /api/tags/{id}`**
  - **Description**: Renames a tag or updates its description and color.
  - **Response (200 OK)**: Returns the updated tag object.

- **`DELETE /api/tags/{id}`**
  - **Description**: Deletes a tag globally and removes all its associations from pages.
  - **Response (204 No Content)**

### Page Tag Operations
- **`GET /api/documents/{id}/tags`**
  - **Description**: Lists all tags assigned to a specific document.
  - **Response (200 OK)**: JSON array of `Tag` objects.

- **`POST /api/documents/{id}/tags/{tagId}`**
  - **Description**: Links a tag to a document.
  - **Response (201 Created)**

- **`DELETE /api/documents/{id}/tags/{tagId}`**
  - **Description**: Removes the link between a tag and a document.
  - **Response (204 No Content)**

---

## 🖥️ 3. Frontend Architecture

### Navigation & Routing
- Dedicated client route: `/my/tags`
- Managed via `routeState.isTagsPage` inside `App.tsx`'s URL location parser and router logic.
- Renders the [TagsView](file:///Users/johnbauer/Dev/Personal/arkm/frontend/src/components/TagsView.tsx) component.
- Access links are exposed in the primary sidebar, the top navbar profile menu, and within the Team Settings, Project Settings, and Personal space settings.

### Page-level Tag Display & Popover Editor
- Rendered inside a dedicated [DocumentTags](file:///Users/johnbauer/Dev/Personal/arkm/frontend/src/components/DocumentTags.tsx) component positioned at the bottom of the page, right above the comments section.
- Incorporates a Material UI `Popover` with a filterable search box.
- Allows on-the-fly creation of tag definitions if they don't exist yet, automatically binding them to the active page context.
- Available in both Read and Edit mode states.

