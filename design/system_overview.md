# Technical Design: System Architecture Overview

Arkollab is a lightweight knowledge management platform featuring a block-based collaborative canvas, a backend plugin engine, and semantic search capabilities.

---

## 1. System Components & High-Level Flow

```
┌──────────────────────────────────────────────┐
│            React Client Application          │
│  - App Shell, Sidebar, Navigation             │
│  - Tiptap / ProseMirror editor canvas         │
└──────────────────────┬───────────────────────┘
                       │
             WebSockets / REST HTTP
                       │
                       ▼
┌──────────────────────────────────────────────┐
│            Go API Gateway Server             │
│  - WebSocket Hub presence cursors / Yjs sync │
│  - REST controller CRUD & auth middlewares   │
└──────────────────────┬───────────────────────┘
                       │
             Database Queries / pgvector
                       │
                       ▼
┌──────────────────────────────────────────────┐
│          PostgreSQL Database + pgvector      │
│  - Tables: users, documents, versions, tags  │
│  - Vector embeddings and HNSW search indexes │
└──────────────────────────────────────────────┘
```

---

## 2. Core Stack Specifications

*   **Frontend**: React (MUI v9 client styles) utilizing Tiptap editor engine and ProseMirror document framework.
*   **Backend**: Go REST/WebSocket server using `chi` router and Gorilla WebSocket pumps.
*   **Database**: PostgreSQL 16 (with `pgvector` container extension for vector HNSW distance checks).
*   **Local LLM Embeddings**: Ollama service executing the `nomic-embed-text` (768-dimension) model.

---

## 3. Database Schema

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table containing parent-child navigation mapping
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,                -- ProseMirror JSON document string
    project_id VARCHAR(50) NOT NULL,
    parent_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    embedding vector(768),                -- 768-dim nomic-embed-text vectors
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HNSW Vector Index for Cosine Similarity Searches
CREATE INDEX idx_documents_embedding ON documents USING hnsw (embedding vector_cosine_ops);
```

---

## 4. 12-Month Gantt Roadmap

*   **Q1: CRUD API & Auth Middleware**: SQLite & Postgres schema migrations, JWT/Logto OIDC JWKS token validation, team workspace scoping.
*   **Q2: Collaborative Editor Shell**: Tiptap headless canvas bindings, WebSocket roomRelay handlers, cursor presence, Yjs synchronization updates, toolbar layout adjustments.
*   **Q3: Hybrid Search & Versioning**: `pgvector` HNSW indexes, Ollama http embedding client, debounced versions, Named milestones, Search modal overlays (`⌘P`), History drawers.
*   **Q4: Rich Content Blocks**: Callout panels, status badges, expandable blocks, export integrations (PDF/Word), metrics dashboards.
