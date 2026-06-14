import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MacroBlockView } from "../../components/MacroBlockView";

export const MacroBlock = Node.create({
  name: "macroBlock",
  group: "block",
  atom: true, // Define as leaf block element

  addAttributes() {
    return {
      type: {
        default: "status-badge",
      },
      config: {
        default: { status: "Active" },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "macro-block",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["macro-block", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MacroBlockView);
  },
});
