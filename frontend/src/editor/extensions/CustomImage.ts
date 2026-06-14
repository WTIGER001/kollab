import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageComponent } from "../../components/ImageComponent";

export const CustomImage = Node.create({
  name: "customImage",
  group: "block",
  inline: false,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      imageId: {
        default: null,
      },
      size: {
        default: "O", // '1' (300px) | '2' (600px) | '3' (900px) | '4' (1200px) | 'O' (Original)
      },
      alignment: {
        default: "center", // 'left' | 'center' | 'right'
      },
      originalWidth: {
        default: null,
      },
      originalHeight: {
        default: null,
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="custom-image"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "custom-image",
        class: `custom-image-wrapper align-${HTMLAttributes.alignment || "center"} size-${HTMLAttributes.size || "O"}`
      }),
      ["img", { src: HTMLAttributes.src, alt: HTMLAttributes.alt, title: HTMLAttributes.title }]
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent);
  }
});
