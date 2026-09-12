# Administration Settings Navigation and Local Users

## Status

Implemented. Server administration uses route-backed navigation instead of horizontal tabs. This removes the tab overflow failure mode and gives each setting group a stable URL.

## Route model

| Navigation item | Route | Content owner |
| --- | --- | --- |
| General | `/_admin/settings` | `ServerSettingsPage` (`general`) |
| Appearance | `/_admin/settings/appearance` | `ServerSettingsPage` (`appearance`) |
| Authentication | `/_admin/settings/authentication` | `ServerSettingsPage` (`authentication`) |
| Local users | `/_admin/users` | `AdminLocalUsersPage` |
| Audit & retention | `/_admin/settings/retention` | `ServerSettingsPage` (`retention`) |
| Document previews | `/_admin/settings/previews` | `ServerSettingsPage` (`previews`) |
| Backup & sync | `/_admin/settings/backups` | `ServerSettingsPage` (`backups`) |
| Integrations | `/_admin/settings/integrations` | `ServerSettingsPage` (`integrations`) |
| System images | `/_admin/_images` | `ImageLibraryView` |
| System templates | `/_admin/_templates` | `TemplateLibraryView` |
| Cloud backups (prototype) | `/_admin/backups` | `AdminBackupsPage` |
| Admin guide | `/_admin/help` | `AdminHelpPage` |

`MainLayout` detects the `/_admin` route prefix and substitutes `AdminSidebar` for the document/space `Sidebar`. The normal resizer is not rendered in the administration shell. The Users item is shown only when the authenticated deployment uses `authMode=local`; its route separately redirects OIDC deployments to the main settings route.

```mermaid
flowchart LR
  Layout[MainLayout] -->|/_admin/*| AdminNav[AdminSidebar]
  Layout -->|workspace routes| WorkspaceNav[Document Sidebar]
  AdminNav --> General["/_admin/settings"]
  AdminNav --> Users["/_admin/users"]
  General --> Settings[ServerSettingsPage section]
  Users --> LocalUsers[AdminLocalUsersPage]
```

## Local-user API

All routes are mounted only when `JWKSCache.AllowsLocalCredentials()` is true and are protected by JWT authentication plus `system.admin` permission checks.

| Method | Endpoint | Effect |
| --- | --- | --- |
| `GET` | `/api/admin/users` | List local accounts. |
| `POST` | `/api/admin/users` | Create a local account. |
| `PUT` | `/api/admin/users/{id}` | Update `email` and `displayName`; username is intentionally immutable. |
| `PUT` | `/api/admin/users/{id}/active` | Enable or disable sign-in. |
| `PUT` | `/api/admin/users/{id}/password` | Replace the password after password-policy validation. |
| `DELETE` | `/api/admin/users/{id}` | Permanently remove a local account. |

The `domain.UserRepository` now provides `UpdateProfile` and `Delete`, implemented by both the in-memory and Postgres repositories. The Postgres implementation uses `UPDATE … RETURNING` so the UI receives the persisted profile exactly as stored.

## Safety boundaries

- A local user must satisfy the existing 12-character upper/lower/numeric password policy at creation and password reset.
- User management endpoints call `requireSystemAdmin` before reading or mutating accounts.
- The current principal cannot disable or delete its own account. This prevents the most immediate accidental administrator lockout.
- The UI requires a second explicit **Remove permanently** action in the account row; no modal is needed and the affected user remains visible while confirming.
- Account deletion relies on database foreign-key policies: authored content uses `ON DELETE SET NULL` where required, while user-scoped watch and notification records are cascaded.

```mermaid
sequenceDiagram
  participant A as System administrator
  participant UI as AdminLocalUsersPage
  participant API as UserHandler
  participant Auth as AuthService
  participant DB as UserRepository
  A->>UI: Save profile / disable / remove
  UI->>API: Authorized /api/admin/users request
  API->>API: requireSystemAdmin + self-action guard
  API->>Auth: Apply validated operation
  Auth->>DB: UpdateProfile, SetActive, UpdatePassword, or Delete
  DB-->>UI: Updated user or 204
  UI-->>A: Inline success or error state
```

## Responsive navigation and forms

Below 900 CSS pixels, `MainLayout` renders the active sidebar inside a temporary MUI `Drawer`, capped at `min(320px, 100vw - 32px)`. Its portal, backdrop, focus trap, Escape handling, and focus restoration keep the content full width and avoid interacting with the covered page. Drawer padding accounts for device safe areas and the optional 26-pixel classification banner. The banner has a fixed flex basis and no longer shrinks the content calculation unexpectedly.

Mobile open state is local to the layout and closes on route-key or breakpoint changes. Desktop authoring state remains in `useAppStore`; desktop administration has its own open state. Entering administration therefore displays its navigation even when the workspace sidebar was collapsed, and returning to authoring preserves that preference. Admin links are router links with active-page semantics. No authoring sidebar or resizer is rendered on an admin route.

The shell uses `100dvh`, flex children with `min-height: 0` and `min-width: 0`, and scrollable route content instead of subtracting a fixed navbar height. `TopNavbar` exposes labelled 44-pixel mobile controls and routes mobile search directly to `/search`; desktop search submits through the router. The mobile keyboard shortcut also opens search.

`ServerSettingsPage` uses a section heading rather than a breadcrumb/tab strip, stacks its header actions on phones, retains the save controls outside the scrolling form, and guards concurrent submissions. Banner fields, palette editors, retention controls, logo sizes, backup controls, integration lists, and user profiles fit narrow widths. Long integration/cloud-history tables have local scroll regions; they do not widen the shell. Theme-preview cards use a two-column phone grid and retain their keyboard-accessible Select buttons. Version/build metadata is omitted from the phone settings footer to preserve form space.

See [responsive authoring](responsive_authoring.md) and the [mobile user guide](../user_guide/mobile.md). Unit coverage in `MainLayout.test.tsx` checks admin/workspace substitution, collapse, return navigation, mobile overlay dismissal/focus, and search. Settings tests verify no tab list and duplicate-save prevention. Browser checks use an isolated mock-data entry point, not production account credentials.
