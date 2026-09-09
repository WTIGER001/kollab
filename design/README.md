# Kollab System Design & Specifications

This directory contains the hierarchical technical specifications of Project Kollab. It details the data schemas, DOM models, API endpoints, and WebSocket relays designed for developers and AI agents.

---

## 🗂️ Table of Contents

### 🖥️ [1. System Architecture Overview](file:///Users/johnbauer/Dev/Personal/kollab/design/01_system_overview.md)
*High-level architecture, technology stack details, database indexing strategy, and Gantt charts.*

### 🗄️ [23. Database Migrations](23_database_migrations.md)
*Append-only PostgreSQL migration ledger, checksums, and transactional application lifecycle.*

### 🔐 [24. OIDC Authentication](24_oidc_authentication.md)
*OIDC discovery, JWKS verification, issuer/audience binding, and local-development isolation.*

### 👤 [25. Local Identity](25_local_identity.md)
*Explicit local-account mode, bootstrap administration, password controls, and account suspension.*

### 🔐 [26. Confluence-Style Permissions](26_confluence_style_permissions.md)
*Space roles, page general/specific access, and inherited view restrictions.*

### 🧭 [26. Macro Roadmap](26_macro_roadmap.md)
*Living, prioritised catalog of formatting, engineering, typed-data, and enterprise-integration macros.*

### 🎨 [2. Editor Core & Canvas](file:///Users/johnbauer/Dev/Personal/kollab/design/02_editor_core.md)
*Tiptap headless editor integration, Yjs syncing updates, WebSocket relays, presence cursors, shadow DOM plugin architecture, and read-only states.*

### ⚙️ Systems & Administration
- [15. Server Settings & Branding](file:///Users/johnbauer/Dev/Personal/kollab/design/15_server_settings_and_branding.md) - Site title, welcome messages, auth background imagery.
- [16. URL Slugs & Aliases](file:///Users/johnbauer/Dev/Personal/kollab/design/16_url_slugs.md) - Dynamic slug auto-generation, uniqueness constraints, and old-alias redirection routing.
- [17. Automated Testing Strategy](file:///Users/johnbauer/Dev/Personal/kollab/design/17_automated_testing.md) - Dual-execution backend E2E testing, testcontainers-go, and frontend component mocking.
- [18. Enterprise System & Scoped Backups with Azure](file:///Users/johnbauer/Dev/Personal/kollab/design/18_enterprise_backups_and_azure.md) - Proposed Azure backup architecture; current adapters are prototypes.
- [20. Jira & Confluence Live Integrations](file:///Users/johnbauer/Dev/Personal/kollab/design/20_jira_confluence_integrations.md) - Proposed integration architecture; current transport is placeholder-only.
- [21. Confluence Space Migration Engine](file:///Users/johnbauer/Dev/Personal/kollab/design/21_confluence_migration_engine.md) - Confluence ZIP export parser, XHTML to Tiptap AST transformer, media attachment migration.
- [22. Kubernetes & Azure Deployment Architecture](file:///Users/johnbauer/Dev/Personal/kollab/design/22_kubernetes_and_azure_deployment.md) - Future AKS/Azure reference; deployment manifests are not included.

### 🧩 [3. Macros & Plugins](file:///Users/johnbauer/Dev/Personal/kollab/design/03_macros_and_plugins.md)
*Native rich content macros (Callouts, Status Badges), advanced plugins (Polyglot blocks, Data tables), and external integrations (GitLab).*

### 🔍 [4. Hybrid Search & AI Providers](file:///Users/johnbauer/Dev/Personal/kollab/design/04_search_and_ai.md)
*Postgres pgvector similarity queries, Ollama embedding configurations, keyword fallback logic, and the Multi-Provider LLM adapter.*

### ⏳ [5. Data Lifecycle & Version Control](file:///Users/johnbauer/Dev/Personal/kollab/design/05_data_lifecycle.md)
*Version DB schemas, auto-snapshot rules, history restorations, soft deletes, cascading page deletions, and trash recovery.*

### 🔐 [6. Access & Permissions Model](file:///Users/johnbauer/Dev/Personal/kollab/design/06_access_and_permissions.md)
*Role-Based Access Control (RBAC), Attribute-Based Access Control (ABAC), go-permissions integration, and Confluence-style hierarchical inheritance.*

### 💾 [7. Import, Export & Media Preview](file:///Users/johnbauer/Dev/Personal/kollab/design/07_import_export_media.md)
*Word/PDF/HTML serialization, page hierarchy JSON trees, and isolated Media Preview Service architecture.*

### 💬 [8. Metadata, Social, & Collaboration](file:///Users/johnbauer/Dev/Personal/kollab/design/08_metadata_and_social.md)
*Document comments, nested threads, task AST parser synchronization, global tagging, and user avatars.*

### 🏠 [9. Customizable Workspace Homepage](file:///Users/johnbauer/Dev/Personal/kollab/design/09_custom_homepage.md)
*Dynamic, document-based user dashboard utilizing the Tiptap editor engine and the Workspace Directory Macro.*

### 🔔 [10. Watch Capabilities & Notifications](file:///Users/johnbauer/Dev/Personal/kollab/design/10_watch_and_notifications.md)
*Subscription data models, event routing pipelines, WebSocket real-time pushes, and email digest batching.*

### 🏢 [11. Enterprise Publishing, Templates, & Transclusion](file:///Users/johnbauer/Dev/Personal/kollab/design/11_enterprise_publishing_and_templates.md)
*Draft vs. Published state separation, the Page Blueprint engine, and dynamic content transclusion (Excerpts and Includes).*

### 🔗 [12. Page Routing and Custom Slugs](file:///Users/johnbauer/Dev/Personal/kollab/design/12_page_routing_and_slugs.md)
*Dual UUID/Slug URL resolution, title-based auto-generation, global uniqueness constraints, and user-defined nickname overrides.*
