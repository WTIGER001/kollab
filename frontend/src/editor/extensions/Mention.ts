import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MentionView } from "../../components/MentionView";

export const Mention = Node.create({
  name: "mention",
  group: "inline",
  inline: true,
  atom: true, // Behaves as a single immutable inline widget within text lines

  addAttributes() {
    return {
      id: {
        default: "",
      },
      username: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-type=mention]",
        getAttrs: (node) => ({
          id: (node as HTMLElement).getAttribute("data-id") || "",
          username: (node as HTMLElement).getAttribute("data-username") || "",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "mention",
        "data-id": HTMLAttributes.id,
        "data-username": HTMLAttributes.username,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MentionView);
  },
});
