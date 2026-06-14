import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Selection } from "@tiptap/pm/state";
import { LayoutSectionView } from "../../components/LayoutSectionView";

export const LayoutSection = Node.create({
  name: "layoutSection",
  group: "block",
  content: "layoutColumn+", // Restricts children to layoutColumn nodes only
  defining: true,

  addAttributes() {
    return {
      layout: {
        default: "twocol", // 'twocol' | 'threecol' | 'asymmetric-left' | 'asymmetric-right'
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="layout-section"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "layout-section",
        class: `layout-section layout-${HTMLAttributes.layout || "twocol"}`
      }),
      ["div", { class: "layout-columns-container" }, 0]
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LayoutSectionView);
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        const { $from } = selection;

        // Find current layoutColumn node
        let currentDepth = $from.depth;
        let columnNode = null;
        let columnPos = -1;

        while (currentDepth > 0) {
          const node = $from.node(currentDepth);
          if (node.type.name === "layoutColumn") {
            columnNode = node;
            columnPos = $from.before(currentDepth);
            break;
          }
          currentDepth--;
        }

        if (!columnNode) return false;

        // Find parent layoutSection node
        let sectionNode = null;
        let sectionPos = -1;
        let depth = currentDepth - 1;

        while (depth > 0) {
          const node = $from.node(depth);
          if (node.type.name === "layoutSection") {
            sectionNode = node;
            sectionPos = $from.before(depth);
            break;
          }
          depth--;
        }

        if (!sectionNode) return false;

        // Get all columns within the section
        const columnsInfo: { pos: number; node: any }[] = [];
        sectionNode.forEach((child, offset) => {
          if (child.type.name === "layoutColumn") {
            columnsInfo.push({
              pos: sectionPos + 1 + offset,
              node: child
            });
          }
        });

        const currentColumnIndex = columnsInfo.findIndex(c => c.pos === columnPos);
        if (currentColumnIndex === -1) return false;

        if (currentColumnIndex < columnsInfo.length - 1) {
          // Move to next column
          const nextColPos = columnsInfo[currentColumnIndex + 1].pos;
          const nextSelection = Selection.near(state.tr.doc.resolve(nextColPos + 1));
          dispatch(state.tr.setSelection(nextSelection).scrollIntoView());
          return true;
        } else {
          // We are in the last column. Exit section downwards.
          const afterSectionPos = sectionPos + sectionNode.nodeSize;
          const nodeAfter = state.tr.doc.nodeAt(afterSectionPos);

          if (nodeAfter) {
            const nextSelection = Selection.near(state.tr.doc.resolve(afterSectionPos));
            dispatch(state.tr.setSelection(nextSelection).scrollIntoView());
            return true;
          } else {
            // Insert a new paragraph below the layoutSection
            const paragraph = state.schema.nodes.paragraph.createAndFill();
            if (paragraph) {
              const tr = state.tr.insert(afterSectionPos, paragraph);
              const nextSelection = Selection.near(tr.doc.resolve(afterSectionPos));
              dispatch(tr.setSelection(nextSelection).scrollIntoView());
              return true;
            }
          }
        }

        return false;
      },

      "Shift-Tab": ({ editor }) => {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        const { $from } = selection;

        // Find current layoutColumn node
        let currentDepth = $from.depth;
        let columnNode = null;
        let columnPos = -1;

        while (currentDepth > 0) {
          const node = $from.node(currentDepth);
          if (node.type.name === "layoutColumn") {
            columnNode = node;
            columnPos = $from.before(currentDepth);
            break;
          }
          currentDepth--;
        }

        if (!columnNode) return false;

        // Find parent layoutSection node
        let sectionNode = null;
        let sectionPos = -1;
        let depth = currentDepth - 1;

        while (depth > 0) {
          const node = $from.node(depth);
          if (node.type.name === "layoutSection") {
            sectionNode = node;
            sectionPos = $from.before(depth);
            break;
          }
          depth--;
        }

        if (!sectionNode) return false;

        // Get all columns within the section
        const columnsInfo: { pos: number; node: any }[] = [];
        sectionNode.forEach((child, offset) => {
          if (child.type.name === "layoutColumn") {
            columnsInfo.push({
              pos: sectionPos + 1 + offset,
              node: child
            });
          }
        });

        const currentColumnIndex = columnsInfo.findIndex(c => c.pos === columnPos);
        if (currentColumnIndex === -1) return false;

        if (currentColumnIndex > 0) {
          // Move to previous column
          const prevColPos = columnsInfo[currentColumnIndex - 1].pos;
          const nextSelection = Selection.near(state.tr.doc.resolve(prevColPos + 1));
          dispatch(state.tr.setSelection(nextSelection).scrollIntoView());
          return true;
        } else {
          // We are in the first column. Exit section upwards.
          if (sectionPos > 0) {
            const nextSelection = Selection.near(state.tr.doc.resolve(sectionPos - 1), -1); // search backwards
            dispatch(state.tr.setSelection(nextSelection).scrollIntoView());
            return true;
          } else {
            // Insert a new paragraph above the layoutSection
            const paragraph = state.schema.nodes.paragraph.createAndFill();
            if (paragraph) {
              const tr = state.tr.insert(0, paragraph);
              const nextSelection = Selection.near(tr.doc.resolve(1));
              dispatch(tr.setSelection(nextSelection).scrollIntoView());
              return true;
            }
          }
        }

        return false;
      }
    };
  }
});
