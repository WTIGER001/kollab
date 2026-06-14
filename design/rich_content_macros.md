# Technical Design: Rich Content Macros

This document specifies the schemas, serialization behaviors, and rendering models of Arkollab's rich content macro extensions: **Callout Panels**, **Inline Status Badges**, **Task Lists**, **Expandable Accordions**, **Inline Dates**, **Symbols**, and **No Format Panels**.

---

## 1. Callout Panels

Callout Panels are container blocks styled based on their type to call out notes, tips, warnings, error messages, success checks, or info alerts, supporting a customizable title and rich text body.

- **Group**: `block`
- **Content**: `block+` (allowing nested blocks like paragraphs, bullet points, and code blocks)
- **Defining**: `true`
- **Attributes**:
  - `type` (defaults to `"info"`; accepts `"info"`, `"warning"`, `"error"`, `"check"`, `"note"`, or `"tip"`)
  - `title` (defaults to `""`)

### Serialization (HTML Parser & Renderer)
- **Tag Parser**:
  ```typescript
  {
    tag: "div[data-type=callout-panel]",
    getAttrs: (node) => ({
      type: (node as HTMLElement).getAttribute("data-callout-type") || "info",
      title: (node as HTMLElement).getAttribute("data-callout-title") || "",
    })
  }
  ```
- **Tag Renderer**:
  ```typescript
  [
    "div",
    {
      "data-type": "callout-panel",
      "data-callout-type": HTMLAttributes.type,
      "data-callout-title": HTMLAttributes.title,
    },
    0
  ]
  ```

---

## 2. Inline Status Badges

Inline Status Badges are inline markers that can be inserted directly within paragraphs to indicate states, priorities, or tasks (e.g. TODO, APPROVED, BLOCKED).

- **Group**: `inline`, `inline: true`, `atom: true`
- **Attributes**:
  - `text` (default `"TODO"`)
  - `color` (default `"blue"`; accepts `"blue"`, `"yellow"`, `"green"`, `"red"`, or `"gray"`)

### Serialization (HTML Parser & Renderer)
- **Tag Parser**:
  ```typescript
  {
    tag: "span[data-type=inline-status]",
    getAttrs: (node) => ({
      text: (node as HTMLElement).getAttribute("data-status-text") || "TODO",
      color: (node as HTMLElement).getAttribute("data-status-color") || "blue",
    })
  }
  ```
- **Tag Renderer**:
  ```typescript
  ["span", { "data-type": "inline-status", "data-status-text": HTMLAttributes.text, "data-status-color": HTMLAttributes.color }]
  ```

---

## 3. Task Lists

Task lists display a checkable list of items. Checking/unchecking updates the list state.

- **Extension**: `@tiptap/extension-task-list` and `@tiptap/extension-task-item`
- **TaskList Node**: `group: "block"`, `content: "taskItem+"`
- **TaskItem Node**: `content: "paragraph block*"`, `defining: true`, `isolating: true`
- **Attributes**: `checked` (boolean, default `false`)

### Serialization (HTML Parser & Renderer)
- **TaskList Parser**: `{ tag: "ul[data-type=taskList]" }`
- **TaskList Renderer**: `["ul", { "data-type": "taskList" }, 0]`
- **TaskItem Parser**: `{ tag: "li[data-type=taskItem]" }`
- **TaskItem Renderer**: `["li", { "data-type": "taskItem", "data-checked": HTMLAttributes.checked }, 0]`

---

## 4. Expandable Accordions (Details/Summary)

Expandable boxes are collapsible accordions leveraging HTML5 `<details>` and `<summary>` elements.

- **Details Node**: `group: "block"`, `content: "detailsSummary detailsContent"`, `defining: true`
  - **Attribute**: `open` (boolean, default `true`)
  - **Tag Renderer**: `["details", { "data-type": "details", class: "details-macro" }, 0]`
  - **Toggling Interaction**: Implemented using a custom ProseMirror `Plugin` capturing click events on the `<summary>` element:
    - In **Edit Mode** (`view.editable` is true), the plugin dispatches a `setNodeMarkup` transaction toggling the `open` attribute so the expansion state is saved in the document and synchronized in real time.
    - In **Read-Only Mode** (`view.editable` is false), the plugin directly updates the DOM element's `open` attribute to allow local reader collapse/expand actions without attempting invalid document modifications.
- **DetailsSummary Node**: `group: "block"`, `content: "inline*"`, `defining: true`, `isolating: true`
  - **Tag Renderer**: `["summary", {}, 0]`
  - **Keyboard Shortcut**: Pressing `Enter` intercepts the text break, shifting cursor focus directly into the `detailsContent` block.
- **DetailsContent Node**: `group: "block"`, `content: "block+"`, `defining: true`, `isolating: true`
  - **Tag Renderer**: `["div", { class: "details-content", "data-type": "details-content" }, 0]`

---

## 5. Inline Date Selector Pills

Date selector pills display dates inline and support calendar selection.

- **Group**: `inline`, `inline: true`, `atom: true`
- **Attribute**: `date` (string `YYYY-MM-DD`, defaults to today's local date)

### React Node View (`InlineDateView`)
- Rendered as an inline chip wrapping a `<Calendar>` icon.
- Clicking the badge anchors an MUI `Popover` displaying an `<input type="date">`.
- Triggering `updateAttributes({ date })` distributes modifications over Yjs room document relays.

### Serialization (HTML Parser & Renderer)
- **Tag Parser**:
  ```typescript
  {
    tag: "span[data-type=inline-date]",
    getAttrs: (node) => ({
      date: (node as HTMLElement).getAttribute("data-date") || new Date().toISOString().split("T")[0],
    })
  }
  ```
- **Tag Renderer**:
  ```typescript
  ["span", { "data-type": "inline-date", "data-date": HTMLAttributes.date }]
  ```

---

## 6. Symbol Picker (Inline Text Insertion)

The symbol picker does not use a custom node schema. It relies on standard browser text selections:

1. The user clicks a symbol icon in the toolbar, opening a Popover grid.
2. The click event retrieves the target symbol character (e.g. `Ω`, `→`).
3. The editor inserts the character as raw text at the current cursor selection:
   ```typescript
   editor.chain().focus().insertContent(symbolChar).run();
   ```
4. Because it inserts standard characters, it integrates naturally with Yjs text synchronization, with zero operational overhead.

---

## 7. No Format Panels

No Format panels render plain unformatted text in a monospace block, ignoring standard typographic marks.

- **Group**: `block`
- **Content**: `text*` (disallows nested node structures)
- **Code**: `true` (ProseMirror disables typographic keybindings inside)
- **Marks**: `""` (disallows bold, italic, links, etc.)

### Serialization (HTML Parser & Renderer)
- **Tag Parser**: `{ tag: "pre[data-type=no-format]" }`
- **Tag Renderer**:
  ```typescript
  ["pre", { "data-type": "no-format", class: "no-format-panel" }, 
    ["code", { class: "no-format-text" }, 0]
  ]
  ```
- **Keyboard Shortcut**: Pressing `Enter` on a blank line inside the panel executes a `lift` command, inserting a clean paragraph node below to exit the block.

---

## 8. Hierarchical Macros (Children Display & Page Index)

Children Display and Page Index macros dynamically render lists of document structures within the active workspace/space.

### Schema Attributes & Tiptap Node Configuration
- **Node Type**: `macroBlock` (a leaf block node, `atom: true`)
- **Attributes**:
  - `type`: string (accepts `"children-display"` or `"page-index"`)
  - `config`: object (defaults to `{}`)

### Serialization
- **Tag Parser**:
  ```typescript
  {
    tag: "macro-block",
    getAttrs: (node) => ({
      type: (node as HTMLElement).getAttribute("type") || "status-badge",
      config: JSON.parse((node as HTMLElement).getAttribute("config") || "{}"),
    })
  }
  ```
- **Tag Renderer**:
  ```typescript
  ["macro-block", { type: HTMLAttributes.type, config: JSON.stringify(HTMLAttributes.config) }]
  ```

### Rendering Engine (`MacroBlockView`)
1. **DocumentContext Integration**:
   - `EditorCanvas` provides a React `DocumentContext` conveying the full hierarchically built `documents` tree, the `activeDocId` string, and the `onSelectDoc` navigation callback function.
   - `MacroBlockView` consumes this context to retrieve up-to-date document layouts.
2. **Children Display Render Logic**:
   - Locates the active document node in the hierarchical tree using a recursive depth-first search helper.
   - Retrieves its child sub-pages from the node's `children` array.
   - Renders a nested bulleted directory tree. Click handlers on the page titles trigger the `onSelectDoc(child.id)` navigation callback.
3. **Page Index Render Logic**:
   - Flattens the hierarchical tree of active documents into a single flat array.
   - Sorts the document list alphabetically by `title` (case-insensitive).
   - Groups the sorted pages by their first character (normalized to uppercase letters, with non-alphabetic characters grouped under `#`).
   - Renders a multi-column responsive index grid showcasing pages under their respective letter headers. Click actions invoke navigation.

