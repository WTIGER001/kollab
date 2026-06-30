# Arkollab Plugin Specification & Extensibility Architecture

This document defines the plugin model for Project Arkollab. It details the technical boundaries for frontend-only and full-stack plugins, outlines the initial feature lineup, and contrasts them with popular Confluence equivalents.

---

## 1. High-Level Plugin Architecture

Arkollab is designed from the ground up to support runtime-pluggable extensions. The architecture decouples the core document engine from plugin execution, ensuring security, performance, and cross-framework flexibility.

```
                  ┌──────────────────────────────────────────┐
                  │          Arkollab Host Application          │
                  └─────┬──────────────────────────────┬─────┘
                        │                              │
     (Frontend Sandbox) │                              │ (Wasm Sandbox)
                        ▼                              ▼
            ┌───────────────────────┐      ┌───────────────────────┐
            │   Shadow DOM Module   │      │    wazero Go Wasm     │
            │   (Frontend UI/Macro) │      │   (Backend Engine)    │
            └───────────────────────┘      └───────────────────────┘
```

---

## 2. Frontend-Only vs. Full-Stack (Frontend/Backend) Plugins

Arkollab supports two classes of plugins based on complexity, integration requirements, and security boundaries.

### 2.1 Frontend-Only Plugins (Visual Macros)
Frontend-only plugins are client-side UI widgets that render interactive components inline within documents. They require no custom backend logic.

- **How they are registered**: Registered via an administrative JSON manifest pointing to a compiled JavaScript bundle hosted on Azure Blob Storage.
- **Execution Environment**: **Shadow DOM Web Components**. By wrapping the plugin inside a Shadow DOM, we ensure the plugin's CSS cannot pollute or break the parent Arkollab application styles, and vice versa.
- **Data Hook**: The Tiptap editor holds the node's state as a structured JSON block (e.g., `{ "type": "status-badge", "attrs": { "status": "Done" } }`). This JSON is passed directly to the custom element as a DOM attribute.
- **Use Cases**: Mermaid diagram viewer, formatting wrappers, local charts, drawing canvases.

### 2.2 Full-Stack Plugins (Frontend + Backend Tools)
Full-stack plugins couple a frontend Web Component with isolated backend logic running inside the Go host application.

- **How they are registered**: The admin uploads a bundle containing the frontend JS file and a compiled `.wasm` file.
- **Backend Runtime**: **WebAssembly (Wasm) via wazero**. Wazero is a zero-dependency WebAssembly runtime written in pure Go. It allows Arkollab to execute compiled Go, Rust, or TypeScript bytecode securely in an isolated sandbox.
- **Agentic Integration (LLM Tools)**: The Wasm manifest defines the plugin's REST/database access parameters and API methods. Arkollab reads this schema and registers the plugin as a **Tool** for the inline LLM assistant, enabling the AI to run the plugin dynamically on user request.
- **Use Cases**: Jira issue synchronization, active database connectors, server-side data exporters, hit counters, external webhooks.

---

## 3. Comparison Matrix: Arkollab vs. Confluence Add-ons

Here is how Arkollab replaces and improves upon the most popular enterprise Confluence add-ons:

| Confluence Add-on / Macro | Arkollab Equivalent Plugin | Tech Model | Key UX Advantage in Arkollab |
| :--- | :--- | :--- | :--- |
| **Draw.io Diagrams** | `arkollab-drawio` | Frontend-Only | Fully offline drawing canvas, storing raw vectors directly inside the block JSON. |
| **Excalidraw Sketching** | `arkollab-excalidraw` | Frontend-Only | Hand-drawn sketching canvas, running 100% locally with high performance and zero network dependency. |
| **Mermaid.js** | `arkollab-mermaid` | Frontend-Only | Edit code on the left, watch live SVG re-renders on the right in real time. |
| **Jira Issues Macro** | `arkollab-jira-sync` | Full-Stack | Fully integrated with LLM: write *"List open P0 bugs"* and let the AI trigger the Wasm tool to render the table. |
| **Chart / Table Filter** | `arkollab-charts` | Frontend-Only | Connect charts directly to Arkollab tables via block IDs. As you edit the table, the chart updates instantly. |
| **Excerpt / Include** | `arkollab-excerpts` | Full-Stack | Re-use sections across documents. Go backend maps dependency hooks so updates to source blocks propagate automatically. |
| **Page Properties Report** | `arkollab-properties` | Full-Stack | Index properties in Postgres. Use pgvector to query properties using natural language semantic searches. |

---

## 4. Deep Dive: Initial Plugin Lineup Specification

### 4.1 Draw.io (`arkollab-drawio`)
- **Category**: Visual Collaboration
- **Type**: Frontend-Only
- **UX Flow**:
  - Hitting `/draw` inserts an interactive canvas block.
  - Double-clicking the block launches a full-screen vector drawing overlay (utilizing the open-source Draw.io embed API).
  - On save, the SVG/XML payload is saved inside the block’s JSON content. The page displays a high-performance cached SVG vector in read mode.

### 4.2 Mermaid Diagrams (`arkollab-mermaid`)
- **Category**: Technical Documentation
- **Type**: Frontend-Only
- **UX Flow**:
  - In edit mode, renders a split-screen block: a clean code editor (using a lightweight Monaco or code-field instance) and a preview panel.
  - Uses the `mermaid` JS library to parse text descriptions into diagram representations (flowcharts, sequence diagrams, mindmaps) on keypress.

### 4.3 Interactive Tables (`arkollab-tables`)
- **Category**: Formatting & Data
- **Type**: Frontend-Only
- **UX Flow**:
  - Replaces Confluence's basic rigid tables. Arkollab tables support column type declarations (Text, Number, Date, Status Selectors, and User tags).
  - Renders calculations dynamically (e.g., column sums, averages) using lightweight spreadsheets math engines.

### 4.4 Image & Asset Manager (`arkollab-image`)
- **Category**: Media
- **Type**: Full-Stack
- **UX Flow**:
  - Supports drag-and-drop file upload.
  - The Go backend stream-uploads the binary to Azure Blob Storage, returns the CDN URL, and triggers an asynchronous task to write image descriptive tags (via multi-modal LLM) to enable semantic image search.

### 4.5 Jira Issues Sync (`arkollab-jira-sync`)
- **Category**: External Integrations
- **Type**: Full-Stack
- **UX Flow**:
  - Renders a live table of Jira issues.
  - The Go backend hosts the Wasm connector using cached OAuth tokens, handling token refresh cycles and API calls.
  - If a user types *"Add issue"*, the Web Component opens an overlay dialog to create a ticket on Jira without leaving the editor.

### 4.6 Dynamic Charts (`arkollab-charts`)
- **Category**: Business Intelligence
- **Type**: Frontend-Only
- **UX Flow**:
  - Uses chart rendering libraries (such as Chart.js or Recharts).
  - Users select an existing Table Block ID on the page as the datasource.
  - Supports Line, Bar, Pie, and Scatter configurations.

### 4.7 Excerpts & Transclusions (`arkollab-excerpts`)
- **Category**: Document Reuse
- **Type**: Full-Stack
- **UX Flow**:
  - **Excerpt Define**: Highlight any block on a page and mark it as an Excerpt with a unique ID.
  - **Excerpt Include**: Hitting `/include` lets you select an existing Excerpt ID.
  - The Go backend maintains a dependency mapping. When the source block is modified, the change is written once in the database, and all pages including it display the updated block immediately.

### 4.8 Page Properties & Reporting (`arkollab-properties`)
- **Category**: Knowledge Base Analytics
- **Type**: Full-Stack
- **UX Flow**:
  - **Page Properties**: A metadata table at the top of a page (e.g., `Owner: Engineering`, `Release: Q3`, `Priority: High`).
  - **Page Properties Report**: A macro block `/properties-report` where users define filters (e.g., release="Q3"). The Go backend runs a fast SQL query using Postgres JSONB indexing:
    ```sql
    SELECT document_id, title, content->'properties' 
    FROM document_blocks 
    WHERE content->'properties'->>'release' = 'Q3';
    ```

### 4.9 Excalidraw Sketching (`arkollab-excalidraw`)
- **Category**: Visual Collaboration
- **Type**: Frontend-Only
- **UX Flow**:
  - Hitting `/excalidraw` inserts an offline hand-drawn sketching widget.
  - Clicking the **Edit Sketch** button opens a fullscreen Dialog mounting the local Excalidraw React canvas library.
  - On save, it compiles the sketch elements, generates a vector SVG (respecting light/dark modes), and stores the vector content and elements array in the block attributes. In read-only mode, the document renders the cached vector SVG with support for fullscreen lightbox zoom-in click previews.

---

## 5. Detailed API Design for Plugins

### 5.1 Frontend Web Component Lifecycle Interface
Every Arkollab UI plugin must export a class implementing the standard Custom Element lifecycle:

```typescript
interface ArkollabPluginElement extends HTMLElement {
  // Triggered when block is mounted to the document
  connectedCallback(): void;
  
  // Triggered when attributes (like config data) change
  attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
  
  // Custom hook: Called by Arkollab to fetch current plugin state JSON before saving page
  getPluginState(): Record<string, any>;
}
```

### 5.2 Go Backend Wasm Host Interface
The Go host defines standard WASI-like exports that the Wasm module can invoke to talk safely back to Arkollab:

```go
// Exposed functions inside the Wasm host runner:
// - HostLog(message string)
// - HostFetchUrl(url string, method string, headers string, body string) string
// - HostGetDocumentBlocks(documentID string) string
```
By restricting the capabilities of Wasm modules to this host import list, plugins cannot read the host environment variables, access arbitrary files, or make unmonitored raw sockets calls.
