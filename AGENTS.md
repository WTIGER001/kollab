# Developer & AI Agent Guidelines

To maintain documentation integrity as Project Kollab expands, all developers and AI agents must follow this dual-documentation mandate for **every feature modification or code change**.

---

## 📜 The Dual-Documentation Rule

For every code change, addition, or bug fix, you must update or create files in two distinct documentation structures located in the root of the workspace:
1. **User Guide (`user_guide/`)**: Non-technical, user-facing instructions on how to use the feature.
2. **Design Specifications (`design/`)**: Highly technical documents detailing how the feature is implemented (schemas, APIs, node models, code relationships) intended for other developers and AI agents.

---

## 📁 1. User Guide Structure (`user_guide/`)

The user guide is located in the [user_guide/](file:///Users/johnbauer/Dev/Personal/arkm/user_guide/) folder and is organized hierarchically into small, focused markdown pages.

*   **Style**: Friendly, non-technical, task-oriented. Focus on how a user triggers, configures, and interacts with the UI.
*   **Visuals**: Include layout instructions and shortcuts (e.g. `⌘P` for search).
*   **Hierarchy**:
    *   [user_guide/README.md](file:///Users/johnbauer/Dev/Personal/arkm/user_guide/README.md): Index and getting started manual.
    *   [user_guide/search.md](file:///Users/johnbauer/Dev/Personal/arkm/user_guide/search.md): Global search and conceptual queries.
    *   [user_guide/version_history.md](file:///Users/johnbauer/Dev/Personal/arkm/user_guide/version_history.md): Automated snapshots, Named milestones, and restored version overlays.
    *   [user_guide/editor_macros.md](file:///Users/johnbauer/Dev/Personal/arkm/user_guide/editor_macros.md): Callout boxes and inline status badge toggles.

---

## 📁 2. Design Specification Structure (`design/`)

The design specifications are located in the [design/](file:///Users/johnbauer/Dev/Personal/arkm/design/) folder and are organized into modular, technical pages.

*   **Style**: Highly technical, containing type models, JSON payload examples, SQL schemas, block definitions, and sequence diagrams. Use Mermaidjs syntax for all drawings. 
*   **Content**: Explain the *why* and the *how* of the engineering design, detailing security boundaries, REST endpoints, and WebSocket updates.
*   **Hierarchy**:
    *   [design/README.md](file:///Users/johnbauer/Dev/Personal/arkm/design/README.md): Table of contents and index of design specifications.
    *   [design/system_overview.md](file:///Users/johnbauer/Dev/Personal/arkm/design/system_overview.md): High-level architecture, technology stack, and Gantt charts.
    *   [design/editor_canvas.md](file:///Users/johnbauer/Dev/Personal/arkm/design/editor_canvas.md): Tiptap/ProseMirror headless editor configurations and Shadows DOM layouts.
    *   [design/search_engine.md](file:///Users/johnbauer/Dev/Personal/arkm/design/search_engine.md): pgvector settings, Ollama embedding gateways, and database ILIKE keywords fallback logic.
    *   [design/version_control.md](file:///Users/johnbauer/Dev/Personal/arkm/design/version_control.md): Debouncing rules, sandbox preview editor uncoupling, and websocket-relay restorations.
    *   [design/rich_content_macros.md](file:///Users/johnbauer/Dev/Personal/arkm/design/rich_content_macros.md): CalloutPanel block elements and InlineStatus inline popover update attributes.

---

## 🌗 Theme Support Mandate

To ensure a seamless user experience across the dynamic Theme Engine and Light/Dark modes, all custom UI elements and editing controls must exclusively use the injected CSS variables for styling. **Never hardcode hex colors or rely solely on MUI's static palette for custom components.**

**Mandatory CSS Variables:**
- **Colors**: `var(--primary-color)`, `var(--secondary-color)`, `var(--bg-color)`, `var(--panel-color)`, `var(--accent-color)`
- **Text**: `var(--text-primary)`, `var(--text-secondary)`
- **Borders & Shapes**: `var(--border-color)`, `var(--border-width)`, `var(--border-style)`, `var(--border-radius-card)`, `var(--border-radius-button)`
- **Shadows**: `var(--shadow-elevation)`, `var(--shadow-button)`
- **Glassmorphism**: `var(--glass-bg)`, `var(--glass-border)`

- Avoid hardcoding dark-only or light-only background, text, and border colors unless explicitly required for a highly specific visual effect.
- Test visual contrast and readability of all elements (like icons, menus, input placeholder texts, and drag handles) in both light and dark modes across multiple theme presets (Default, Workbench, Editorial, Neobrutal).

---

## 🔲 Dialogs vs Pages Policy

- **Prefer dedicated pages over dialogs/modals**: Only in rare situations should dialogs or modal windows be used. Feature views (like audit logs, Page activity, Trash bin, etc.) must be built as full pages with their own dedicated routes.
- **Trash Bin Routing**: The Trash Bin must be its own page and its own route, scoped per parent context:
  - Team Trash: `/teams/{teamId}/trash` (or by abbreviation if applicable)
  - Project Trash: `/projects/{projectId}/trash`
  - Personal Trash: `/personal/trash`

---

## 🔇 Server Execution & Verification Policy

- **Default to non-server verification**: Prefer compilation, type checking, unit tests, and other non-server checks (for example, `go test` and `npx tsc --noEmit`).
- **Quiet verification servers are allowed when they materially validate a change**: An AI agent may start the Go backend or React/Vite frontend only to run a bounded browser, integration, or end-to-end verification. This is not authorization for normal interactive development, long-running monitoring, or deployment.
- **Keep server output out of the model context**: Launch the process in the background, redirect both stdout and stderr to an explicit file under `/private/tmp`, and use the framework's quiet/error-only log mode where available. Do not tail or poll the log while tests are passing. Never leave the server attached to the command session: stopping that session can replay a large buffered log into the model context.
- **Use an observable completion condition**: Wait through a narrowly scoped health check or test runner, not by reading live server output. On a failure, inspect only the smallest useful log excerpt (normally the last 100 lines).
- **Clean up after verification**: Record the launched process ID and stop only that process when the verification is complete or fails. Do not terminate user-owned servers or broad process groups. If a compatible user-owned server is already running, reuse it instead of starting another.
- **Recommended Vite pattern**: `npm run dev -- --host 127.0.0.1 --logLevel error >/private/tmp/kollab-vite.log 2>&1 &`. Use a task-specific log filename and PID in real commands so concurrent agent work cannot collide.

---

## 🧪 Automated Testing Policy

All AI agents must enforce and maintain our automated testing standard:

- **Backend (Go)**: Maintain >60% statement coverage. Use the dual-repository pattern in `api/internal/http/handler/handler_test.go` (`runIntegrationTests`) to verify endpoints against both in-memory mocks and a real Postgres database via `testcontainers-go`.
- **Frontend (React)**: Use Vitest and React Testing Library (RTL) for component logic. The UI should be testable via Mock Mode (`isMockMode = true`) without requiring the Go backend to be active.
- **Coverage Check**: Always run `go test -coverpkg=./... -coverprofile=coverage.out ./... && go tool cover -func=coverage.out | grep total` when modifying backend logic to ensure coverage does not drop.

---

## 🛠️ Checklist for Agents

Before completing a turn, verify:
- [ ] Did you modify or add any feature?
- [ ] If yes, is the user-facing instruction added/updated in the [user_guide/](file:///Users/johnbauer/Dev/Personal/arkm/user_guide/) folder?
- [ ] If yes, is the technical implementation design documented in the [design/](file:///Users/johnbauer/Dev/Personal/arkm/design/) folder?
- [ ] Do all new or modified UI elements fully support both light and dark theme modes?
- [ ] Did you verify that all links in the documentation are clickable and reference the correct files?
