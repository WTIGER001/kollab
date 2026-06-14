import { Node } from "@tiptap/core";

export const NoFormatPanel = Node.create({
  name: "noFormatPanel",
  group: "block",
  content: "text*", // Only plain text content is allowed
  code: true, // Behaves as a pre-formatted block, ignoring standard editor marks
  defining: true, // Preserves container boundaries when splitting or pasting
  marks: "", // Restricts all text styling (bold, italic, links, etc.) inside the block

  parseHTML() {
    return [
      {
        tag: 'pre[data-type="no-format"]',
      },
      {
        tag: "pre.no-format-panel",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "pre",
      {
        ...HTMLAttributes,
        "data-type": "no-format",
        class: "no-format-panel",
      },
      ["code", { class: "no-format-text" }, 0],
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Allow user to escape the monospace panel by pressing Enter on an empty block
      Enter: () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from } = selection;

        if ($from.parent.type.name === "noFormatPanel" && $from.parent.textContent === "") {
          return this.editor.commands.exitCode();
        }
        return false;
      },
    };
  },
});
