import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alignment: {
        default: "left",
        parseHTML: element => element.style.textAlign || "left",
        renderHTML: attributes => {
          if (!attributes.alignment || attributes.alignment === "left") {
            return {};
          }
          return { style: `text-align: ${attributes.alignment}` };
        },
      },
    };
  },
});

export const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alignment: {
        default: "left",
        parseHTML: element => element.style.textAlign || "left",
        renderHTML: attributes => {
          if (!attributes.alignment || attributes.alignment === "left") {
            return {};
          }
          return { style: `text-align: ${attributes.alignment}` };
        },
      },
    };
  },
});
