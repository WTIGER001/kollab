# Project Portal Design Specification

This document details the architectural implementation of the Project Portal view.

## Component Architecture

- **`ProjectPortal.tsx`**: A standalone component rendered by `ProjectPortalWrapper` in `App.tsx` when the URL matches the `/teams/:teamId/p/:projectId` route.
- **`ProjectPortalWrapper`**: A route injection wrapper in `App.tsx` that extracts `teamId` and `projectId` from `useParams()`, resolves the global Team and Project contexts, and passes them as typed props into `<ProjectPortal>`. It also provides a robust `navigateTo` handler for resolving complex URL state routing.

## Data Fetching Strategy

Unlike `TeamPortal` (which primarily displays team members via `fetchTeamUsers`), the `ProjectPortal` focuses on documents.
- Upon mounting, `ProjectPortal` uses a `useEffect` hook to invoke `fetchDocuments(project.id)`. 
- This API call retrieves all documents mapped to the current project space from the backend.
- A `loadingDocs` state flag renders a standard MUI `<CircularProgress>` while the fetch is pending.

## Theme Engine Compatibility

The Project Portal rigorously conforms to the Kollab dynamic Theme Engine:
1. **Glassmorphism**: Project document cards utilize `var(--glass-bg)` and `backdrop-filter: blur(10px)`.
2. **CSS Properties**: Hardcoded numbers are replaced with `var(--border-radius-card)` and `var(--border-color)` to allow the ThemeEngine to dynamically resize/recolor elements based on the active `ThemePreset`.
3. **Hover States**: Color mixing `color-mix(in srgb, var(--primary-color) 4%, var(--glass-bg))` is used to generate theme-aware hover effects without requiring hardcoded hex values.

## Routing Isolation

Previously, `/teams/:teamId/p/:projectId` routed to the `TeamPortalWrapper`, creating a confusing user experience where clicking a Project rendered the parent Team's workspace instead of the Project's workspace. By introducing `ProjectPortalWrapper`, we effectively decouple the Team UI from the Project UI, establishing a distinct routing boundary.
