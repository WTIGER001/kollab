# Editor Mode Synchronization and Document Analytics Specification

This specification documents the technical architecture, class interfaces, CSS rules, and recursive tree algorithms utilized to support readonly editing states and document statistics.

---

## 1. Editable State Synchronization

The editing state is managed by the React host state `isEditing: boolean` inside [EditorCanvas.tsx](file:///Users/johnbauer/Dev/Personal/arkm/frontend/src/components/EditorCanvas.tsx).

When `isEditing` changes, it is synchronized with the ProseMirror/Tiptap instance via `editor.setEditable(isEditing)` within a React `useEffect`:

```typescript
// Synchronize state with Tiptap
useEffect(() => {
  if (editor && !editor.isDestroyed) {
    editor.setEditable(isEditing);
  }
}, [editor, isEditing]);
```

ProseMirror dynamically updates the host DOM element attributes, setting `contenteditable="true"` or `contenteditable="false"` accordingly.

---

## 2. CSS Contenteditable Selectors

In order to avoid messy class additions, we leverage ProseMirror's native state indicator attribute (`contenteditable`) in our stylesheet [index.css](file:///Users/johnbauer/Dev/Personal/arkm/frontend/src/index.css):

* **Editing Layout Guides**:
  ```css
  .ProseMirror[contenteditable="true"] .layout-column {
    border: 1px dashed rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.01);
  }
  ```
* **Seamless Read-Only Presentation**:
  ```css
  .ProseMirror[contenteditable="false"] .layout-column {
    border: 1px solid transparent;
    padding: 0;
    background: transparent;
  }
  ```

---

## 3. Node View Guards

Custom React Node Views (such as [CalloutPanelView.tsx](file:///Users/johnbauer/Dev/Personal/arkm/frontend/src/components/CalloutPanelView.tsx) or [ImageComponent.tsx](file:///Users/johnbauer/Dev/Personal/arkm/frontend/src/components/ImageComponent.tsx)) receive the parent `editor` as a prop in `NodeViewProps`.

To lock down views:
1. **Action Bars**: Action headers, floating grids, or delete buttons are wrapped in `{editor?.isEditable && ( ... )}` to prevent them from mounting at all.
2. **Interaction Handlers**: Click and double-click actions check `if (!editor?.isEditable) return;` at entry.
3. **Cursor Accents**: CSS selectors within the node wrapper alter `cursor: isEditable ? "pointer" : "default"` and remove hover border animations.

---

## 4. Page Analytics Algorithm

To compute structural statistics recursively, the page analytics reader parses the editor's JSON node output rather than parsing raw text.

The parser traverses the content tree:

```typescript
const visit = (node: any) => {
  if (node.type === "paragraph") paragraphs++;
  else if (node.type === "heading") headings++;
  else if (node.type === "table") tables++;
  else if (node.type === "customImage" || node.type === "image") images++;
  else if (node.type === "calloutPanel") callouts++;
  else if (node.type === "inlineStatus") statuses++;
  else if (node.type === "inlineDate") dates++;
  else if (node.type === "taskItem") tasks++;
  
  if (node.content) {
    node.content.forEach(visit);
  }
};

editor.getJSON().content?.forEach(visit);
```

This ensures block-level elements nested deep inside custom columns or tables are counted accurately.
Word counts are calculated by cleaning and splitting the plaintext output of `editor.getText()`.
Est. Reading Time assumes a standard adult reading pace of 200 words per minute.
