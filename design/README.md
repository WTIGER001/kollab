# Arkollab System Design & Specifications

This directory contains the hierarchical technical specifications of Project Arkollab. It details the data schemas, DOM models, API endpoints, and WebSocket relays designed for developers and AI agents.

---

## 🗂️ Table of Contents

### 🖥️ [1. System Overview & Roadmap](file:///Users/johnbauer/Dev/Personal/arkm/design/system_overview.md)
*High-level architecture, technology stack details, database indexing strategy, Gantt charts, and deployment roadmaps.*

### 🎨 [2. Editor Canvas & Shadow DOM](file:///Users/johnbauer/Dev/Personal/arkm/design/editor_canvas.md)
*Tiptap headless editor integration, ProseMirror AST structures, collaborative Yjs syncing updates, and Shadow DOM web component lifecycles.*

### 🔍 [3. Hybrid Search Engine](file:///Users/johnbauer/Dev/Personal/arkm/design/search_engine.md)
*Postgres pgvector similarity queries, HNSW indexes, Ollama nomic-embed-text HTTP client configurations, and keyword fallback logic.*

### ⏳ [4. Version Control & Restorations](file:///Users/johnbauer/Dev/Personal/arkm/design/version_control.md)
*Automated snapshot triggers, author handover checks, sandbox preview uncoupling, and WebSocket transclusion restore operations.*

### 🛠️ [5. Rich Content Macros](file:///Users/johnbauer/Dev/Personal/arkm/design/rich_content_macros.md)
*Tiptap node schemas, attribute bindings, HTML parsing rules, and dynamic React node view components (CalloutPanel and InlineStatus).*

### 🗑️ [6. Soft Delete & Restoration](file:///Users/johnbauer/Dev/Personal/arkm/design/trash_undelete.md)
*Nullable soft deletion columns, cascading recursive CTE database queries, permanent purging, and parent-orphaning restoration checks.*

### 💬 [7. Document Comments & Threads](file:///Users/johnbauer/Dev/Personal/arkm/design/comments.md)
*PostgreSQL table schemas, Go service layer domains, CRUD HTTP REST endpoints, OIDC authorization checks, and React nested threads state rendering.*

### 👤 [8. User Initials Avatar](file:///Users/johnbauer/Dev/Personal/arkm/design/user_avatar.md)
*Technical specifications, initials calculation algorithm, and interface bindings of the custom UserAvatar component.*

### 📋 [9. Task Synchronization & Dashboard](file:///Users/johnbauer/Dev/Personal/arkm/design/tasks.md)
*Technical specifications of the AST parser, relational schema sync transactions, autocomplete input rules, and urgency layout.*

### 🏷️ [10. Document Tagging & Labels](file:///Users/johnbauer/Dev/Personal/arkm/design/tags.md)
*Technical specifications for global tag models, mapping structures, REST endpoints, and the React tags editor.*

### 🔐 [11. Permissions & Access Control](file:///Users/johnbauer/Dev/Personal/arkm/design/permissions.md)
*Technical specifications for the permissions model, go-permissions integration, role hierarchy inheritance, share link TTLs, ABAC tags, and Zero Trust security controls.*



