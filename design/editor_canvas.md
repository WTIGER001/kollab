# Technical Design: Editor Canvas, Collaboration, & Presence

This document details the architecture, configurations, and collaborative sync loop of the Tiptap/ProseMirror editor canvas in Project Arkollab.

---

## 1. Tiptap & ProseMirror Core Architecture

Arkollab utilizes a headless editor model where the DOM is managed React-declaratively, while the underlying document model is tracked as a ProseMirror Abstract Syntax Tree (AST).

```
┌────────────────────────────────────────────────────────┐
│             Arkollab Main App (React Container)        │
│  - App Shell, Sidebar, Navigation, Dialogs, Theme      │
└────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│           Tiptap Editor Canvas (Headless DOM)          │
│  - ProseMirror core state selection & document schema  │
└────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│     Custom UI Macro Plugins (Web Components / React)   │
│  - CalloutPanelView, InlineStatusView, LayoutColumn    │
└────────────────────────────────────────────────────────┘
```

### 1.1 Document AST Structure
ProseMirror represents documents as a nested node tree (JSON) rather than flat HTML, which guarantees structured data validation and seamless operational transformation (OT) mapping:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [
        { "type": "text", "text": "Product Roadmap Q3/Q4" }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "This is a collaborative document." }
      ]
    }
  ]
}
```

---

## 2. Collaborative Syncing Loop (Yjs & WebSockets)

Real-time multi-user editing is achieved by anchoring Tiptap's collaboration extension to a shared **Yjs document (`Y.Doc`)** synced over a WebSocket network loop.

### 2.1 Sync Architecture

```
Client A (Y.Doc) <──[WS binary updates]──> Go WebSocket Hub ──> Client B (Y.Doc)
       │                                                              │
       ▼ (local update)                                               ▼ (local update)
Tiptap Editor A                                                Tiptap Editor B
```

1. **State updates**: Any change in Client A’s Tiptap editor is captured as an incremental update transaction in the local `Y.Doc`.
2. **Websocket relay**: The transaction updates are serialized into binary blobs, base64 encoded, and transmitted to the Go backend WebSocket server using the `sync` message type.
3. **Broadcast**: The Go backend stores the cumulative base64 updates in-memory (and in `document_versions` during debounced snapshots) and broadcasts the updates to all other connected clients in the same document room.
4. **Integration**: Client B receives the updates, applies them to their local `Y.Doc`, and the collaboration extension updates the Tiptap editor state seamlessly.

### 2.2 WebSocket Communication Payloads

WebSockets handle Yjs syncing and presence messages. The Go backend router accepts connections at `/api/ws`.

#### Client-to-Server Messages
- **Join room**:
  ```json
  {
    "type": "join",
    "docId": "doc_welcome_eng"
  }
  ```
- **Sync document state (Yjs update blob)**:
  ```json
  {
    "type": "sync",
    "docId": "doc_welcome_eng",
    "update": "AQJ4...[Base64 encoded Yjs update binary]..."
  }
  ```

#### Server-to-Client Messages
- **Initial Sync History**:
  Sent immediately upon registration to bootstrap a new client's editor canvas.
  ```json
  {
    "type": "sync-history",
    "docId": "doc_welcome_eng",
    "updates": [
      "AQJ4...",
      "AgK2..."
    ]
  }
  ```
- **Presence List**:
  Broadcast to all room occupants when clients join or leave.
  ```json
  {
    "type": "presence",
    "docId": "doc_welcome_eng",
    "users": [
      { "userId": "sh4ag0cxowti", "username": "John Doe", "color": "#8b5cf6" },
      { "userId": "mock-user-id", "username": "Alice Smith", "color": "#3b82f6" }
    ]
  }
  ```

---

## 3. Remote Cursor & Selection Presence

To track cursor positions and selections in real-time, Arkollab implements a custom ProseMirror plugin: [PresenceCursors](file:///Users/johnbauer/Dev/Personal/arkm/frontend/src/editor/extensions/PresenceCursors.ts).

### 3.1 Cursors Coordination Flow
1. **Local Selection Listener**: The client tracks cursor changes via `onSelectionUpdate` or keyboard/pointer interactions.
2. **WebSocket Broadcast**: A coordinates payload containing selection index boundaries is sent:
   ```json
   {
     "type": "cursor",
     "docId": "doc_welcome_eng",
     "position": 124,
     "anchor": 128
   }
   ```
3. **State Mapping**: Upon receiving peer cursor notifications, the custom extension feeds meta information into the ProseMirror transaction:
   ```typescript
   tr.setMeta("presence-cursor", { userId, username, color, position, anchor });
   ```
4. **Decoration Rendering**: The plugin maps positions to active coordinates, drawing:
   - **Inline highlight ranges** (from `anchor` to `position`) styled with transluscent colors (`${color}33`).
   - **Caret line widgets** styled with the peer user's color.
   - **Hover Labels** displaying the editor username temporarily.

---

## 4. Shadow DOM UI Macro Plugin Architecture

Arkollab allows runtime loading of dynamic macros and custom widgets via a **Shadow DOM Web Components** model. This provides complete isolation, ensuring CSS stylesheets from plugins cannot pollute the core application design.

```
┌────────────────────────────────────────────────────────┐
│            Tiptap Editor Canvas (Headless DOM)         │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ mounts
┌────────────────────────────────────────────────────────┐
│     <macro-status-picker config="..." data="...">      │
│  - Shadow Root (isolated CSS context)                  │
│  - Renders custom inputs & color panels                │
└────────────────────────────────────────────────────────┘
```

### 4.1 Lifecycle of Runtime Plugins
1. **Plugin Storage**: Plugin scripts are stored in the asset storage layer and registered in the database.
2. **Client Script Mounting**: When loading a document, active script elements are injected:
   ```javascript
   const script = document.createElement("script");
   script.src = "https://cdn.arkollab.internal/plugins/status-badge.js";
   document.head.appendChild(script);
   ```
3. **Web Component Definition**: The custom plugin script registers a standard Custom Element:
   ```javascript
   customElements.define("macro-status-badge", class extends HTMLElement { ... });
   ```
4. **Editor Mapping**: Tiptap maps its internal node schemas (e.g. `MacroBlock`) to render corresponding HTML nodes:
   ```typescript
   renderHTML({ HTMLAttributes }) {
     return ["macro-status-badge", mergeAttributes(HTMLAttributes)];
   }
   ```
