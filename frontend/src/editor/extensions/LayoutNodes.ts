import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TabsNodeView } from "../../components/editor/TabsNodeView";
import { CardsGridNodeView } from "../../components/editor/CardsGridNodeView";
import { CardItemNodeView } from "../../components/editor/CardItemNodeView";

export const CardsGrid = Node.create({
  name: "cardsGrid",
  group: "block",
  content: "cardItem+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      cardSize: {
        default: "md", // sm, md, lg
      },
      showBorder: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='cards-grid']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "cards-grid", class: "cards-grid" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardsGridNodeView);
  },
});

export const CardItem = Node.create({
  name: "cardItem",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      cardId: {
        default: null, // Will be populated in parseHTML or renderHTML if missing
        parseHTML: element => element.getAttribute('data-card-id'),
        renderHTML: attributes => {
          if (!attributes.cardId) {
            return { 'data-card-id': Math.random().toString(36).substr(2, 9) };
          }
          return { 'data-card-id': attributes.cardId };
        }
      }
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='card-item']" }];
  },

  renderHTML({ HTMLAttributes }) {
    if (!HTMLAttributes['data-card-id']) {
      HTMLAttributes['data-card-id'] = Math.random().toString(36).substr(2, 9);
    }
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "card-item", class: "card-item" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardItemNodeView);
  },
});

export const TabsContainer = Node.create({
  name: "tabsContainer",
  group: "block",
  content: "tabItem+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      activeTab: {
        default: 0,
      },
      showBorder: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='tabs-container']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "tabs-container", class: "tabs-container" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TabsNodeView);
  },
});

export const TabItem = Node.create({
  name: "tabItem",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      label: {
        default: "Tab",
      },
      tabId: {
        default: null, // Will be populated in parseHTML or renderHTML if missing
        parseHTML: element => element.getAttribute('data-tab-id'),
        renderHTML: attributes => {
          if (!attributes.tabId) {
            return { 'data-tab-id': Math.random().toString(36).substr(2, 9) };
          }
          return { 'data-tab-id': attributes.tabId };
        }
      }
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='tab-item']" }];
  },

  renderHTML({ HTMLAttributes }) {
    if (!HTMLAttributes['data-tab-id']) {
      HTMLAttributes['data-tab-id'] = Math.random().toString(36).substr(2, 9);
    }
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "tab-item", class: "tab-item" }), 0];
  },
});
