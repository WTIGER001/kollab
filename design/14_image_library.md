# Technical Design: Image Library

This document specifies the technical architecture for the Image Library feature, which serves as a centralized repository for reusable media assets.

---

## 1. System Overview

The Image Library provides a place to store reusable images at the System, Team, Project, and Personal levels. Unlike page-specific attachments (which are bound to a specific document ID), images in the library can be referenced across multiple documents and contexts.

### 1.1 Organizational Scopes
The library is divided into four strict isolation scopes:
1. **System Level (`_system`)**: Global assets available to all users (e.g., company logos, default hero banners). Managed by workspace administrators.
2. **Team Level (`{Team}`)**: Assets available to all members of a specific team.
3. **Project Level (`{Team}/p/{Project}`)**: Assets restricted to a specific project.
4. **Personal Level (`personal`)**: Private assets available only to the individual user.

---

## 2. Frontend Routing Architecture

The React frontend maps these scopes to specific isolated views using the following route structure:

| Scope | React Router Path | API Parameter Resolution |
| :--- | :--- | :--- |
| **System** | `/_system/_images` | `scope=system` |
| **Team** | `/teams/:teamId/_images` | `scope=team`, `teamId=:teamId` |
| **Project**| `/teams/:teamId/p/:projectId/_images` | `scope=project`, `projectId=:projectId` |
| **Personal**| `/personal/_images` | `scope=personal` |

---

## 3. Data Model

### 3.1 Database Schema (PostgreSQL)
A new `library_images` table will be introduced to track these assets independently of the `attachments` table.

```sql
CREATE TABLE library_images (
    id VARCHAR(255) PRIMARY KEY,
    image_id VARCHAR(255) NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL, -- The user-friendly "simple name"
    
    -- Scope Resolution
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('system', 'team', 'project', 'personal')),
    team_id VARCHAR(255) REFERENCES teams(id) ON DELETE CASCADE,
    project_id VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 4. REST API Endpoints

### 4.1 Asset Management
- `GET /api/library/images`
  - Query Params: `scope`, `teamId`, `projectId`
  - Returns: Array of `LibraryImage` models based on RBAC and scope.
- `POST /api/library/images`
  - Multipart form upload.
  - Body: `file`, `scope`, `teamId`, `projectId`, `displayName`
- `PUT /api/library/images/:id`
  - Body: `{ displayName: string }`
  - Usage: Allows users to update the simple name of the image.
- `DELETE /api/library/images/:id`
  - Deletes the database record and initiates a cascade delete to the underlying File Storage.

### 4.2 Optional Service Boundary

`LibraryImageHandler` accepts an optional `domain.LibraryImageService` so the core API can run before a media-store implementation is configured. In that state, `GET` responds with an empty JSON array, while upload and rename respond with `503 Service Unavailable`. Delete is idempotent and returns `204 No Content`. This keeps library routes safe in mock and incremental deployments without presenting a transport failure as a successful upload.
