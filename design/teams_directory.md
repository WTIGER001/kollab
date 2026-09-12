# Teams Directory Design Specification

This document details the architectural and aesthetic implementation of the Teams Directory view, accessible at `/teams`.

## Component Architecture

- **`TeamsDirectoryView.tsx`**: A standalone top-level route component rendered by `App.tsx` when the URL matches `/teams`.
- **Data Flow**: 
  - Receives `teams` and `projects` globally fetched by `useTeams` and `useProjects("all")` hooks in `App.tsx`.
  - Computes `directoryTeams` using `useMemo` to filter out personal spaces (identified by the `personal_` ID prefix) and sort the remaining teams alphabetically.

## Routing Strategy
The router in `App.tsx` mounts `<TeamsDirectoryView />` on the `/teams` path.
- **Team Navigation**: Clicking a Team card fires `navigate('/teams/{team.abbreviation || team.id}')`, which resolves to `TeamPortalWrapper`.
- **Project Navigation**: Clicking a Project chip fires `navigate('/teams/{team.abbreviation}/p/{project.abbreviation}')`, resolving to the project context within `TeamPortalWrapper`. Note that `e.stopPropagation()` is used to prevent the parent Team card click event from firing.

## Top-Level Page Creation

`MainLayout` resolves the page destination from the wizard's selected team or project and passes that scope to `POST /api/documents`. The document hierarchy is independent of the space identity: a root-level page sends `parentId: null`; only an explicitly selected existing document (or a sidebar action's pending document) is sent as `parentId`.

This separation is required because `documents.parent_id` is a foreign key to `documents.id`, while a team or project ID identifies a row in `teams` or `projects`. Treating a space ID as a parent document ID rejects page creation in a newly created, otherwise empty space. After a successful mutation, the relevant React Query `['documents', projectId, teamId]` entry is invalidated before navigation. Errors remain in the wizard and are surfaced through the shared toast store.

## Aesthetic Implementation (Theme Engine Compliance)

The directory is built to strictly adhere to the application's dynamic Theme Engine using CSS variables:
1. **Glassmorphism**: Team cards utilize `var(--glass-bg)` and `backdrop-filter: blur(10px)` to provide a modern, premium look.
2. **Dynamic Hover Effects**: 
   - Cards elevate slightly (`transform: translateY(-4px)`).
   - Borders highlight using `primary.main`.
   - Backgrounds transition smoothly to a 4% mix of `--primary-color` and `--glass-bg`.
3. **Background Accents**: A soft, blurred, absolute-positioned div (`.accent-glow-blue`) sits behind the header to inject a vibrant splash of the primary brand color, enhancing the visual depth of the page.
4. **Project Chips**: Implemented as small `<Chip>` components that use color mixing (`color-mix`) with `--primary-color` to ensure they match the active theme's palette without hardcoded hex values.
