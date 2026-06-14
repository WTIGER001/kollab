import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ExcerptView } from "../../components/ExcerptView";

export const Excerpt = Node.create({
  name: "excerpt",
  group: "block",
  content: "block+", // Allows paragraphs, task lists, unformatted panels etc.
  defining: true,

  parseHTML() {
    return [
      {
        tag: "div[data-type=excerpt-panel]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "excerpt-panel",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExcerptView);
  },
});
