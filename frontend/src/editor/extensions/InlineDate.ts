import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { InlineDateView } from "../../components/InlineDateView";

export const InlineDate = Node.create({
  name: "inlineDate",
  group: "inline",
  inline: true,
  atom: true, // Behaves as a single leaf node in the text line

  addAttributes() {
    return {
      date: {
        default: () => {
          const now = new Date();
          const offset = now.getTimezoneOffset();
          const localNow = new Date(now.getTime() - offset * 60 * 1000);
          return localNow.toISOString().split("T")[0]; // YYYY-MM-DD local format
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-type=inline-date]",
        getAttrs: (node) => ({
          date: (node as HTMLElement).getAttribute("data-date") || new Date().toISOString().split("T")[0],
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "inline-date",
        "data-date": HTMLAttributes.date,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineDateView);
  },
});
