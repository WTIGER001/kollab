# Kollab

Kollab is a premium, real-time collaborative block-based document workspace and knowledge base. Built using Go, React, and Yjs, it supports multi-user cooperative editing, advanced document macros, inline task assignments, and a hybrid semantic search engine.

---

## 🚀 Key Features

- 👥 **Real-time Collaboration & Presence**: Seamless peer-to-peer syncing utilizing Yjs over WebSockets, featuring active cursors, selection highlights, and user presence carets.
- ➕ **Dynamic Macro Organizer Dialog**: A tabbed modal (`+` toolbar trigger) grouping 40+ block and inline macros (e.g. Columns, Tables, Status Badges, Callout Panels, Expandable Boxes). Supports pinning favorite macros to the formatting toolbar.
- 📋 **Checklist Task Syncing**: Write checks like `"Review schema @jbauer //2026-06-30"`. The system parses checklist items on document save, updates a PostgreSQL `tasks` index, and presents a color-coded due date **My Tasks** dashboard in the user profile menu.
- 🔍 **Hybrid Search Engine**: Supports semantic searches powered by `pgvector` embeddings as well as traditional keyword fallbacks.
- ⏳ **Debounced Version Snapshots**: Automatic session backups, inactivity checkouts, milestone checkpoints, and read-only version restorations.
- 🛡️ **Graceful Crash Recovery**: Wrap-around React error boundary layout ensuring runtime render crashes fail gracefully to an elegant error details screen instead of a blank page.

---

## 📂 Repository Structure

```
├── api/             # Go (Golang) REST and WebSocket Server
│   ├── cmd/         # Entry points (server)
│   ├── internal/    # Core service domains (document, tasks, team, presence, Yjs hub)
│   └── sql/         # Schema init scripts
├── frontend/        # React, Vite, Material-UI, and Tiptap Web Application
│   ├── src/         # UI Components, Editor extensions, and API hooks
│   └── tests/       # End-to-end testing suite
├── design/          # System Architecture & Technical Specifications
└── user_guide/      # User-facing manual topics & guides
```

---

## 🛠️ Tech Stack

### Backend
- **Core**: Go (Golang)
- **Database**: PostgreSQL (with `pgvector` for vector query embeddings)
- **Real-Time Sync**: Yjs collaborative updates relayed via WebSocket connections

### Frontend
- **Framework**: React (TypeScript) + Vite
- **UI & Theme**: Material-UI (MUI) styled with premium glassmorphism and Outfit typography
- **Text Editor**: Tiptap (ProseMirror AST)

---

## 🏁 Getting Started

### Prerequisites
- [Go 1.26.2+](https://go.dev/doc/install)
- [Node.js 22+](https://nodejs.org/)
- [PostgreSQL 15+](https://www.postgresql.org/download/) (configured with the `pgvector` extension)

### 1. Database Setup
Create a PostgreSQL database with the `pgvector` extension available. The backend applies versioned migrations automatically at startup; do not manually replay `init.sql` against an existing installation.

### 2. Run the Go Backend Server
Set `DATABASE_URL` and a private `JWT_SECRET` of at least 32 bytes in your environment, then run:
```bash
cd api
AUTH_MODE=local PORT=8081 go run ./cmd/server
```
For an explicitly disposable local database only, set `DEV_DATABASE=true` instead of `DATABASE_URL`. This requires Docker and seeds sample data. Production startup fails if its persistent database URL is absent.

### 3. Run the React Frontend Application
Install dependencies and launch the Vite development server:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:8090` in your web browser. Kollab reserves host port `8081` for its local API; the service itself continues to listen on `8080` inside Docker. The dev server uses port `8090` strictly, so it reports a conflict instead of silently choosing a different address.

### 🐳 Docker Development Workflow (Alternative)

If you want to run the database and the Go backend inside Docker (which includes LibreOffice out-of-the-box for high-fidelity document previews) while still using Go `air` for hot-reloading:

1. **Start the full development workspace**:
   From the repository root, run:
   ```bash
   ./dev.sh
   ```
   This builds and starts the development Go image, pgvector database, and media-preview service in Docker, then starts Vite at `http://localhost:8090` in the current terminal. It installs frontend dependencies only if `frontend/node_modules` is missing.

2. **Stop development services**:
   Press `Ctrl+C` to stop Vite. To stop the Docker services as well, run:
   ```bash
   ./dev.sh --down
   ```

   You can still start Docker Compose and Vite manually if you prefer separate terminals.

---

## 🧪 Verification & Linting

### Frontend type-checking
```bash
cd frontend
npx tsc --noEmit
```

### Run Go tests
```bash
go test ./...
```

## Multiple API processes and offline synchronization

The Docker Compose configuration defaults to two API replicas. Set `API_REPLICAS` to override the count. Replicas must share PostgreSQL, `JWT_SECRET`, authentication settings, and the same writable uploads mount. The supplied Caddy configuration discovers and balances those replicas.

Separate installations can exchange signed v3 synchronization packages in both directions with explicit conflict review. Old sync formats are unsupported. See the [administrator guide](user_guide/synchronization.md) and [technical design](design/multi_instance_sync.md). Azure backup and Jira remain prototypes.
