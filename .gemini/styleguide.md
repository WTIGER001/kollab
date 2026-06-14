# Project Guidelines & Rules

Always read, prioritize, and adhere to the guidelines specified in the project root's [agent_guidelines.md](file:///Users/johnbauer/Dev/Personal/arkm/agent_guidelines.md) file.

Specifically:
- **Do NOT run the Go server or frontend development server**: The user will manage and run the servers themselves.
- **Verification only**: Limit execution commands to compilation, type checking, and automated tests (e.g. `go test`, `npx tsc --noEmit`) to verify correctness.
- **Dialogs vs Pages Policy**: Prefer dedicated full pages over dialogs/modals (except in rare situations). The Trash Bin must be its own page and its own route, scoped per parent: `/teams/{teamId}/trash`, `/projects/{projectId}/trash`, or `/personal/trash`.
- **Documentation**: Follow the dual-documentation mandate (user guides and design specs) for every code edit.
