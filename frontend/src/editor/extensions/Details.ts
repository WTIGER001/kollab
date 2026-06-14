import { Node } from "@tiptap/core";

export const Details = Node.create({
  name: "details",
  group: "block",
  content: "detailsSummary detailsContent",
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        keepOnSplit: false,
        parseHTML: (element) => element.hasAttribute("open"),
        renderHTML: (attributes) => {
          if (attributes.open) {
            return { open: "" };
          }
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "details[data-type=details]",
      },
      {
        tag: "details",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      {
        ...HTMLAttributes,
        "data-type": "details",
        class: "details-macro",
      },
      0,
    ];
  },
});

export const DetailsSummary = Node.create({
  name: "detailsSummary",
  group: "block",
  content: "inline*",
  defining: true,
  isolating: true,
  selectable: false,

  parseHTML() {
    return [
      {
        tag: "summary",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["summary", HTMLAttributes, 0];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from } = selection;
        if ($from.parent.type.name === "detailsSummary") {
          // Enter inside summary moves cursor into detailsContent block
          const nextPos = $from.after() + 2; // Position inside DetailsContent first paragraph
          try {
            return this.editor.commands.setTextSelection(nextPos);
          } catch {
            return false;
          }
        }
        return false;
      },
    };
  },
});

export const DetailsContent = Node.create({
  name: "detailsContent",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  selectable: false,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="details-content"]',
      },
      {
        tag: "div.details-content",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        ...HTMLAttributes,
        "data-type": "details-content",
        class: "details-content",
      },
      0,
    ];
  },
});
