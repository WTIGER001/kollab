import { Node } from "@tiptap/core";

export const LayoutColumn = Node.create({
  name: "layoutColumn",
  group: "block",
  content: "block+", // Allows any block elements inside the column
  defining: true,
  isolating: true, // Prevents cursor/delete operations from leaking outside the column boundaries

  parseHTML() {
    return [
      {
        tag: 'div[data-type="layout-column"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      { 
        ...HTMLAttributes, 
        "data-type": "layout-column", 
        class: "layout-column" 
      },
      0 // Indicates where child content is rendered
    ];
  },
});
