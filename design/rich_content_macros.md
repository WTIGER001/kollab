# Technical Design: Rich Content Macros

This document specifies the schema, HTML rendering, React node views, and collaboration models of Arkollab's rich content macro extensions: **Callout Panels** and **Inline Status Badges**.

---

## 1. Callout Panels

Callout Panels are container blocks styled based on their type to call out notes, tips, warnings, or info alerts.

```
┌────────────────────────────────────────────────────────┐
│ CalloutPanelView (React Wrapper)                       │
│                                                        │
│  [ℹ️ Icon]  [Editable Content Area (NodeViewContent)]  │
│             Supports nesting paragraphs, lists, etc.   │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Hover Actions: [Info] [Note] [Tip] [Warn] [🗑️]   │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 1.1 Tiptap Schema Definition
Callout panels are registered as custom Tiptap block nodes:
- **Group**: `block`
- **Content**: `block+` (allowing nested blocks like paragraphs, bullet points, and code blocks)
- **Defining**: `true` (boundaries are preserved during paste and Enter keystrokes)

#### Attribute Schema
- `type`: String (defaults to `"info"`; accepts `"info"`, `"note"`, `"tip"`, or `"warning"`)

### 1.2 Serialization (HTML Parser & Renderer)
To save and load document states, Tiptap translates nodes to and from HTML.

#### HTML Parser (ProseMirror AST ingestion)
```typescript
parseHTML() {
  return [
    {
      tag: "div[data-type=callout-panel]",
      getAttrs: (node) => ({
        type: (node as HTMLElement).getAttribute("data-callout-type") || "info",
      }),
    },
  ];
}
```

#### HTML Renderer (Output/Serialization)
```typescript
renderHTML({ HTMLAttributes }) {
  return [
    "div",
    mergeAttributes(HTMLAttributes, {
      "data-type": "callout-panel",
      "data-callout-type": HTMLAttributes.type,
    }),
    0, // Slot indicating where nested child contents should be output
  ];
}
```

### 1.3 React Node View: `CalloutPanelView`
- **Left Margin Highlight**: Styled with a solid 4px left border matching the alert type's color scheme.
- **Dynamic Icons**: Maps type attributes to Lucide React icons (`Info`, `AlertCircle`, `Lightbulb`, `AlertTriangle`).
- **Interactive Action Bar**: Appears on hover. Clicking an action button calls `updateAttributes({ type: "..." })` or `deleteNode()`.

---

## 2. Inline Status Badges

Inline Status Badges are inline markers that can be inserted directly within paragraphs to indicate states, priorities, or tasks (e.g. TODO, IN PROGRESS, DONE).

```
This task is currently [TODO ▾] and needs review.
```

### 2.1 Tiptap Schema Definition
Status badges are inline nodes:
- **Group**: `inline`
- **Inline**: `true`
- **Atom**: `true` (behaves as a single, immutable text widget block that moves together)

#### Attribute Schema
- `text`: String (defaults to `"TODO"`)
- `color`: String (defaults to `"blue"`; accepts `"blue"`, `"yellow"`, `"green"`, `"red"`, or `"gray"`)

### 2.2 Serialization (HTML Parser & Renderer)

#### HTML Parser
```typescript
parseHTML() {
  return [
    {
      tag: "span[data-type=inline-status]",
      getAttrs: (node) => ({
        text: (node as HTMLElement).getAttribute("data-status-text") || "TODO",
        color: (node as HTMLElement).getAttribute("data-status-color") || "blue",
      }),
    },
  ];
}
```

#### HTML Renderer
```typescript
renderHTML({ HTMLAttributes }) {
  return [
    "span",
    mergeAttributes(HTMLAttributes, {
      "data-type": "inline-status",
      "data-status-text": HTMLAttributes.text,
      "data-status-color": HTMLAttributes.color,
    }),
  ];
}
```

### 2.3 React Node View: `InlineStatusView`
- **Pill UI**: Rendered as a compact Material-UI `Chip` containing uppercase text and a custom background/border.
- **Popover Editor**: Clicking the badge displays an anchor-aligned popover containing:
  - A text input (limited to 16 characters) updating the status label.
  - A color dot grid to choose from the five theme colors.
  - A delete icon to remove the badge.

---

## 3. Collaboration Syncing via Node Attributes

When a user modifies a callout's type or a status badge's text/color, changes are distributed in real time without manual WebSocket messaging:

1. The React view calls `updateAttributes({ text: "NEW_VAL" })`.
2. This triggers a ProseMirror transaction modifying the node's properties.
3. The collaboration extension intercepts the transaction and updates the local `Y.Doc`.
4. Yjs serializes the node attribute change and propagates it to all connected clients.
5. Clients receive the Yjs transaction and re-render the React Node View with the new properties.
