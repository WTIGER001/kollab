# Design Specification: Document Comments & Nested Threads

This document details the architecture, data structures, backend endpoints, and frontend implementation of the document comments and nested replies system.

---

## 1. Database Schema

Comments are stored in the PostgreSQL database using a table that supports nested parent-child hierarchies to form threads.

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
CREATE INDEX IF NOT EXISTS idx_comments_doc_id ON comments(document_id);
```

### Cascading Deletion
- Declaring `parent_id REFERENCES comments(id) ON DELETE CASCADE` guarantees that if a parent comment is deleted, all child replies nested under that comment are automatically purged by the database.

---

## 2. Go Backend Domain Layer

The Go structures map exactly to the schema models and define clean repository and service interfaces.

```go
package domain

import (
	"context"
	"time"
)

type Comment struct {
	ID            string    `json:"id"`
	DocumentID    string    `json:"documentId"`
	ParentID      *string   `json:"parentId,omitempty"`
	Content       string    `json:"content"`
	CreatedBy     string    `json:"createdBy"`
	CreatedByName string    `json:"createdByName"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type CommentRepository interface {
	GetByDocumentID(ctx context.Context, docID string) ([]*Comment, error)
	GetByID(ctx context.Context, id string) (*Comment, error)
	Create(ctx context.Context, comment *Comment) error
	Update(ctx context.Context, comment *Comment) error
	Delete(ctx context.Context, id string) error
}

type CommentService interface {
	ListByDocument(ctx context.Context, docID string) ([]*Comment, error)
	CreateComment(ctx context.Context, docID string, parentID *string, content, userID, userDisplayName string) (*Comment, error)
	UpdateComment(ctx context.Context, id, content, userID string) (*Comment, error)
	DeleteComment(ctx context.Context, id, userID string) error
}
```

### Authorization Logic
- When updating or deleting a comment, the service layer retrieves the comment by ID and checks if `comment.CreatedBy == userID`.
- If the IDs match, the repository action is executed. Otherwise, the service returns an unauthorized error.

---

## 3. HTTP REST API Endpoints

All endpoints are registered under protected paths requiring a valid OIDC bearer token in the `Authorization` header.

### 3.1 List Comments
- **URL**: `GET /api/documents/{id}/comments`
- **Output**: Array of `Comment` JSON objects.

### 3.2 Create Comment / Reply
- **URL**: `POST /api/documents/{id}/comments`
- **Input**:
  ```json
  {
    "parentId": "optional-parent-comment-id-or-null",
    "content": "This is a comment content"
  }
  ```
- **Output**: The created `Comment` JSON object (including `id`, `createdByName`, `createdAt`, etc.) with HTTP `201 Created`.

### 3.3 Update Comment
- **URL**: `PUT /api/comments/{commentId}`
- **Input**:
  ```json
  {
    "content": "Updated comment content"
  }
  ```
- **Output**: The updated `Comment` JSON object.
- **Failures**: Returns `403 Forbidden` if user is not the author.

### 3.4 Delete Comment
- **URL**: `DELETE /api/comments/{commentId}`
- **Output**: HTTP `204 No Content`.
- **Failures**: Returns `403 Forbidden` if user is not the author.

---

## 4. Frontend Client API & UI Integration

### 4.1 Client API
Defined in [api.ts](file:///Users/johnbauer/Dev/Personal/arkm/frontend/src/services/api.ts):
- `fetchComments(docId)`
- `createComment(docId, parentId, content)`
- `updateComment(id, content)`
- `deleteComment(id)`

### 4.2 React UI Rendering (`<PageComments>`)
Embedded at the bottom of [EditorCanvas.tsx](file:///Users/johnbauer/Dev/Personal/arkm/frontend/src/components/EditorCanvas.tsx):
- **OIDC Identity Parser**: Decodes the OIDC JWT payload locally without external library calls to extract the authenticated user ID (`sub`) and display name.
- **Nesting Structure**: Filters top-level comments and maps replies nested beneath their parent.
- **State Control**:
  - Toggles inline edit text fields.
  - Toggles inline reply input boxes.
  - Toggles local likes count and user liked state.
- **Orphaning Safety**: Hides editing controls and shows a read-only warning message if the document has been soft-deleted and placed in the Trash Bin.
