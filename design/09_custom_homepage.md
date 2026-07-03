# Technical Design: Customizable Workspace Homepage

This document specifies the architecture for Kollab's dynamic, user-customizable homepage. Instead of a static dashboard, the homepage leverages the core Tiptap editor engine, allowing users to build their dashboard using rich text and live macro widgets.

---

## 1. Core Concept: The "Home" Document

> [!NOTE]
> **Status:** ⚪ Planned

To maximize reusability of the Kollab editor and provide ultimate flexibility, the homepage is not a hardcoded React layout. Instead, it is a specialized `document` record assigned to the user.

- **Storage**: When a user provisions their account, a special document is created in the database with a unique flag or associated via a `user_profiles` table as their `home_document_id`.
- **Editor Integration**: The `/home` route mounts the standard `EditorCanvas` component, loading the user's home document.
- **Customization**: Because it is a standard document, users can type notes, add images, format text, and insert macros just like any other page.

---

## 2. Default Seed Content

> [!NOTE]
> **Status:** ⚪ Planned

Upon account creation, the user's home document is seeded with a default JSON AST to provide immediate value. The default layout is structured to provide navigation and situational awareness.

### 2.1 Default AST Structure
```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [
        { "type": "text", "text": "👋 Welcome to Kollab" }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "This is your personal homepage. You can edit this page, add notes, or insert macro widgets." }
      ]
    },
    {
      "type": "workspaceDirectoryViewer",
      "attrs": {
        "displayMode": "cards"
      }
    }
  ]
}
```

---

## 3. The Workspace Directory Macro

> [!NOTE]
> **Status:** ⚪ Planned

To fulfill the requirement of showing teams and projects the user has access to, we introduce a new system macro: `workspaceDirectoryViewer`.

### 3.1 Node Schema
- **Node Type**: `workspaceDirectoryViewer` (Group: `block`, `atom: true`)
- **Attributes**:
  - `displayMode` (enum: `"cards"`, `"list"`, defaults to `"cards"`)
  - `showDescriptions` (boolean, defaults to `true`)
  - `enableFiltering` (boolean, defaults to `true`)

### 3.2 Rendering Engine (`WorkspaceDirectoryView`)

1. **Data Fetching & Metadata Aggregation**:
   - On mount, the React NodeView triggers an asynchronous `GET /api/workspaces/directory` HTTP request.
   - The backend utilizes the `go-permissions` engine and identity provider to retrieve all `Teams` and `Projects` where the user holds at least a `Viewer` role to see the metadata.
   - Crucially, the query aggregates metadata for each space: `created_at`, `last_updated` (based on the most recently modified document), and `total_page_count`.
   
2. **Backend Query Optimization**:
   ```sql
   SELECT 
       s.id, s.name, s.description, s.type, s.avatar_color,
       s.created_at,
       MAX(d.updated_at) as last_updated,
       COUNT(d.id) as total_page_count
   FROM spaces s
   LEFT JOIN documents d ON d.project_id = s.id
   WHERE s.id IN (
       -- Subquery resolved by go-permissions indicating spaces the user can read
       SELECT object_id FROM authorized_spaces WHERE user_id = $1
   )
   GROUP BY s.id
   ORDER BY s.type, s.name;
   ```

3. **Search & Filter Controls**:
   - If `enableFiltering` is true, a toolbar is rendered above the directory layout for real-time filtering.
   - **Search Bar**: Filters spaces by `name` or `description` using a client-side fuzzy search.
   - **Sort Dropdown**: Allows sorting the grid/list by `Name (A-Z)`, `Recently Updated`, `Date Created`, or `Largest Size (Page Count)`.

4. **UI Layout**:
   - **Cards Mode**: Renders a CSS Grid of Material UI Cards. Each card displays the Team/Project name, the `UserAvatar`, truncated description, and footer metadata (e.g., "Updated 2 days ago • 15 pages"). Clicking the card navigates the user to that space.
   - **List Mode**: Renders a dense, table-like list with sortable column headers for name, type, date created, last updated, and total pages.

---

## 4. Expanding the Dashboard with Macros

> [!NOTE]
> **Status:** ⚪ Planned

Because the homepage is a Tiptap document, users can expand their dashboard using existing and future macros designed in `03_macros_and_plugins.md`:

*   **My Tasks**: Users can insert a `taskRollupViewer` macro to see all incomplete tasks assigned to them across the workspace.
*   **Recent Activity**: A `recentActivityViewer` macro can display documents the user has recently edited or viewed.
*   **GitLab MRs**: Developers can insert the GitLab Merge Request macro to track their active code reviews.

---

## 5. Security and Read-Only Restrictions

> [!NOTE]
> **Status:** ⚪ Planned

- **Ownership**: The home document is strictly owned by the individual user. It cannot be shared via a public link (`sharing_links` restrictions apply) unless the user explicitly bypasses the safeguard.
- **System Lock**: Administrators can define a "System Default Homepage" that is pushed to all users. In this mode, the document is served with `isEditing = false`, and users cannot modify the layout.

---

## 6. Configurable Default Landing Page

> [!NOTE]
> **Status:** ⚪ Planned

To improve daily workflow efficiency, users are not forced to land on the system homepage upon authentication. They can configure their default login destination.

### 6.1 User Preference Schema
The `users` (or `user_profiles`) table contains fields to track their preference:
```sql
ALTER TABLE users ADD COLUMN default_landing_page_type VARCHAR(50) DEFAULT 'system_home';
-- Used only if type is 'specific_page', holds the immutable UUID of the target page
ALTER TABLE users ADD COLUMN default_landing_page_target VARCHAR(255);
```

### 6.2 Supported Landing Views
Via the `/my/settings` page, users can select one of three behaviors:
1. **System Homepage (`system_home`)**: Routes to `/home` (the standard Workspace Directory).
2. **Recent Activities (`recent`)**: Routes to `/recent` (a timeline of recently edited and watched documents).
3. **Specific Page (`specific_page`)**: Routes directly to a chosen document (e.g., a specific team dashboard or personal scratchpad).

### 6.3 Routing Logic & Fail-safes
When an authenticated user visits the root URL (`/`), the application evaluates their profile:
- If `specific_page` is set, the router looks up the active slug for the `default_landing_page_target` UUID and redirects to `/docs/{slug}`.
- **Graceful Fallback**: If the user selected a specific page, but that page was subsequently deleted or their access was revoked, the router catches the `404 Not Found` or `403 Forbidden` API response and silently falls back to redirecting them to `/home`.
