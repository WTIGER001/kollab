import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CalloutPanelView } from "../../components/CalloutPanelView";

export const CalloutPanel = Node.create({
  name: "calloutPanel",
  group: "block",
  content: "block+", // Allows nested blocks (paragraphs, lists, etc.)
  defining: true, // Retains boundaries on copy/paste or Enter keystrokes

  addAttributes() {
    return {
      type: {
        default: "info", // "info" | "warning" | "error" | "check" | "note" | "tip"
      },
      title: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-type=callout-panel]",
        getAttrs: (node) => ({
          type: (node as HTMLElement).getAttribute("data-callout-type") || "info",
          title: (node as HTMLElement).getAttribute("data-callout-title") || "",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout-panel",
        "data-callout-type": HTMLAttributes.type,
        "data-callout-title": HTMLAttributes.title,
      }),
      0, // Renders child content within the tag
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutPanelView);
  },
});
