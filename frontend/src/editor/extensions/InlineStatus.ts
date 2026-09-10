import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { InlineStatusView } from "../../components/InlineStatusView";

export const InlineStatus = Node.create({
  name: "inlineStatus",
  group: "inline",
  inline: true,
  atom: true, // Behaves as a single immutable inline widget within text lines

  addAttributes() {
    return {
      text: {
        default: "TODO",
      },
      color: {
        default: "blue", // "blue" | "yellow" | "green" | "red" | "gray"
      },
    };
  },

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
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "inline-status",
        "data-status-text": HTMLAttributes.text,
        "data-status-color": HTMLAttributes.color,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineStatusView);
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { selection } = this.editor.state;
        if (!(selection instanceof NodeSelection) || selection.node.type !== this.type) {
          return false;
        }
        window.dispatchEvent(new CustomEvent("open-inline-status", { detail: { pos: selection.from } }));
        return true;
      },
    };
  },
});
