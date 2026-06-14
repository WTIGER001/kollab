# Developer & AI Agent Guidelines

To maintain documentation integrity as Project Arkollab expands, all developers and AI agents must follow this dual-documentation mandate for **every feature modification or code change**.

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

*   **Style**: Highly technical, containing type models, JSON payload examples, SQL schemas, block definitions, and sequence diagrams.
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

To ensure a seamless user experience, all UI elements, custom components, and editing controls must have explicit support for both **light and dark themes**.
- Avoid hardcoding dark-only or light-only background, text, and border colors (e.g., solid black borders or pure white backgrounds) unless they are theme-aware.
- Use dynamic theme checks (e.g., matching the `themeMode` variable or React theme context) or standard color tokens that adapt automatically.
- Test visual contrast and readability of all elements (like icons, menus, input placeholder texts, and drag handles) in both light and dark modes.

---

## 🔲 Dialogs vs Pages Policy

- **Prefer dedicated pages over dialogs/modals**: Only in rare situations should dialogs or modal windows be used. Feature views (like audit logs, Page activity, Trash bin, etc.) must be built as full pages with their own dedicated routes.
- **Trash Bin Routing**: The Trash Bin must be its own page and its own route, scoped per parent context:
  - Team Trash: `/teams/{teamId}/trash` (or by abbreviation if applicable)
  - Project Trash: `/projects/{projectId}/trash`
  - Personal Trash: `/personal/trash`

---

## 🚫 Server Execution Policy

- **Do NOT start or run the servers**: The AI agent must not run the Go backend server (`go run cmd/server/main.go`, `./server`) or the React frontend development server (`npm run dev`, `vite`). The user will manage and run the servers themselves.
- **Verification only**: The AI agent should limit execution commands to compilation, type checking, and automated tests (e.g., `go test`, `npx tsc --noEmit`) to verify the correctness of the code.

---

## 🛠️ Checklist for Agents

Before completing a turn, verify:
- [ ] Did you modify or add any feature?
- [ ] If yes, is the user-facing instruction added/updated in the [user_guide/](file:///Users/johnbauer/Dev/Personal/arkm/user_guide/) folder?
- [ ] If yes, is the technical implementation design documented in the [design/](file:///Users/johnbauer/Dev/Personal/arkm/design/) folder?
- [ ] Do all new or modified UI elements fully support both light and dark theme modes?
- [ ] Did you verify that all links in the documentation are clickable and reference the correct files?
