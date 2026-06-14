import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TableOfContentsView } from "../../components/TableOfContentsView";

export const TableOfContents = Node.create({
  name: "tableOfContents",
  group: "block",
  content: "", // Renders as a leaf node without editable text content inside
  selectable: true,
  draggable: true,
  atom: true, // Treats the node as a single atom in the editor selection

  parseHTML() {
    return [
      {
        tag: "div[data-type=table-of-contents]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "table-of-contents",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableOfContentsView);
  },
});
