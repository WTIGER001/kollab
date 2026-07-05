import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface PlaceholderBlockOptions {
  HTMLAttributes: Record<string, any>;
}

export const PlaceholderBlock = Node.create<PlaceholderBlockOptions>({
  name: "placeholderBlock",

  group: "block",
  content: "inline*",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      placeholderText: {
        default: "Type here...",
        parseHTML: (element) => element.getAttribute("data-placeholder"),
        renderHTML: (attributes) => {
          return {
            "data-placeholder": attributes.placeholderText,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="placeholder-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "placeholder-block",
        class: "template-placeholder-block",
      }),
      0,
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("placeholderBlockTransform"),
        props: {
          handleTextInput(view, from, to, text) {
            const { state } = view;
            const $from = state.doc.resolve(from);
            
            // If the user types inside a placeholderBlock, we want to transform it into a regular paragraph
            if ($from.parent.type.name === "placeholderBlock") {
              const pos = $from.before();
              const tr = state.tr;
              
              // Change the node type to paragraph
              tr.setNodeMarkup(pos, state.schema.nodes.paragraph);
              // Insert the text that was typed
              tr.insertText(text, from, to);
              
              view.dispatch(tr);
              return true; // We handled the input
            }
            
            return false;
          },
        },
      }),
    ];
  },
});
