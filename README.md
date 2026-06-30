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
- [Go 1.21+](https://go.dev/doc/install)
- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 15+](https://www.postgresql.org/download/) (configured with the `pgvector` extension)

### 1. Database Setup
Create a PostgreSQL database and run the schema setup:
```bash
psql -d arkollab -f api/internal/postgres/init.sql
```

### 2. Run the Go Backend Server
Navigate to the root level and boot the Go API/WS router:
```bash
go run api/cmd/server/main.go
```

### 3. Run the React Frontend Application
Install dependencies and launch the Vite development server:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your web browser.

### 🐳 Docker Development Workflow (Alternative)

If you want to run the database and the Go backend inside Docker (which includes LibreOffice out-of-the-box for high-fidelity document previews) while still using Go `air` for hot-reloading:

1. **Start the Docker development environment**:
   Run the dev compose setup from the repository root:
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```
   This builds the development Go image, installs LibreOffice and fonts, mounts the `./api` directory for live syncing, starts the `pgvector` database, and runs the API under `air` on `localhost:8080`.

2. **Run the React Frontend Application locally**:
   In another terminal, start your local Vite development server:
   ```bash
   cd frontend
   npm run dev
   ```
   Vite will proxy all `/api` and websocket requests to the hot-reloading Docker container on `http://localhost:8080`.

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
