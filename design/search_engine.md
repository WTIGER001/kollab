# Technical Design: Hybrid Search Engine

This document specifies the technical design, database indexing, and AI client configurations powering Arkollab's semantic and keyword search engine.

---

## 1. Vector Database Schema & pgvector Setup

Arkollab stores documents as block-based ProseMirror AST structures in a PostgreSQL database. To support Retrieval-Augmented Generation (RAG) and semantic searches, we leverage the `pgvector` extension.

```
                  ┌──────────────────────┐
                  │ Search Query Input   │
                  └──────────┬───────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │  Ollama Embeddings API      │
              │  - nomic-embed-text (768d)  │
              └──────────────┬──────────────┘
                             │ (Vector generated?)
              ┌──────────────┴──────────────┐
              │                             │
       Yes    ▼                             ▼ No (Offline Fallback)
┌───────────────────────────┐ ┌───────────────────────────┐
│ Cosine Distance Lookup    │ │ ILIKE Keyword Scan        │
│ pgvector <=> HNSW index   │ │ title/content ILIKE match │
└───────────────────────────┘ └───────────────────────────┘
```

### 1.1 DB Schema DDL
The following migration SQL initializes vector extensions and sets up indexes:

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Document Schema holding 768-dimension vector embeddings
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    project_id VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
    parent_id VARCHAR(255) REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    embedding vector(768)
);

-- HNSW Cosine Similarity Index
CREATE INDEX IF NOT EXISTS idx_documents_embedding 
ON documents USING hnsw (embedding vector_cosine_ops);
```

### 1.2 Cosine Distance Metric
Arkollab uses **Cosine Distance** (`<=>`) for vector similarity, measuring the cosine of the angle between two multi-dimensional documents:
$$Distance(A, B) = 1 - \frac{A \cdot B}{\|A\| \|B\|}$$

A distance of `0.0` represents absolute identity, while `2.0` represents diametric opposition.

---

## 2. Local AI Embedding Client (Ollama)

Embeddings are generated locally using the Ollama service to reduce dependency latency and preserve data privacy.

### 2.1 Configuration Variables
The Go backend reads client configurations from system environment variables:
- `OLLAMA_BASE_URL`: Defaults to `http://localhost:11434`
- `OLLAMA_EMBED_MODEL`: Defaults to `nomic-embed-text` (which outputs 768-dimension vectors)

### 2.2 Ollama API Contract
Go communicates with Ollama via HTTP POST request to `/api/embeddings`.

#### Request Schema
```json
{
  "model": "nomic-embed-text",
  "prompt": "Welcome to the Engineering Wiki! This is the collaborative home for software specs."
}
```

#### Response Schema
```json
{
  "embedding": [
    0.0142859,
    -0.0829141,
    ...
    0.0031948
  ]
}
```

---

## 3. Search Coordination & Offline Fallback Logic

To ensure the application remains functional even if Ollama is offline or vector generation fails, Arkollab implements a hybrid fallback pipeline.

### 3.1 Flow Control in `postgres/document.go`

When a user triggers a global workspace search:
1. The backend attempts to generate a vector embedding of the search query string.
2. **If vector generation succeeds**: The database performs a vector cosine similarity search.
3. **If vector generation fails (e.g. Ollama service unreachable)**: The database performs a standard ILIKE wildcard text matching query across the document title and content.

### 3.2 SQL Queries

#### Case A: Vector Search (HNSW Cosine Similarity)
```sql
SELECT id, title, content, project_id, parent_id, created_at, updated_at
FROM documents
WHERE project_id = $1
ORDER BY embedding <=> $2
LIMIT 10;
```
*Note: `$1` represents the project identifier; `$2` represents the formatted vector string `[0.014, -0.082, ...]`.*

#### Case B: Keyword Fallback (LIKE Matching)
```sql
SELECT id, title, content, project_id, parent_id, created_at, updated_at
FROM documents
WHERE project_id = $1 
  AND (title ILIKE $2 OR content ILIKE $2)
LIMIT 20;
```
*Note: `$2` represents the search wildcard pattern `'%<query>%'`.*

---

## 4. REST API Endpoints

### 4.1 Search API
- **Endpoint**: `/api/search`
- **Method**: `GET`
- **Query Params**:
  - `q`: Search term (e.g., `/api/search?q=developer&project_id=proj_wiki`)
  - `project_id`: Project workspace constraints
- **Response Payload**:
  ```json
  [
    {
      "id": "doc_guides_eng",
      "title": "Developer Style Guides",
      "content": "{\"type\":\"doc\",\"content\":[...]}",
      "projectId": "proj_wiki",
      "parentId": null,
      "createdAt": "2026-06-14T01:00:00Z",
      "updatedAt": "2026-06-14T03:00:00Z"
    }
  ]
  ```
