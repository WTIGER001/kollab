import { Node, mergeAttributes } from '@tiptap/core';

export interface JiraMacroOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    jiraMacro: {
      insertJiraMacro: (attributes: { issueKey?: string; jql?: string }) => ReturnType;
    };
  }
}

export const JiraMacroExtension = Node.create<JiraMacroOptions>({
  name: 'jiraMacro',
  group: 'block',
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      issueKey: {
        default: 'KOL-101',
      },
      jql: {
        default: 'project = KOL AND status = "In Progress"',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="jira-macro"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'jira-macro',
        class: 'kollab-jira-macro-card',
        style: 'border: 1px solid var(--border-color); border-radius: var(--border-radius-card); padding: 16px; margin: 16px 0; background-color: var(--panel-color);',
      }),
      [
        'div',
        { style: 'display: flex; justify-content: space-between; align-items: center;' },
        ['strong', { style: 'color: var(--secondary-color); font-size: 16px;' }, `📌 Jira Issue: ${node.attrs.issueKey}`],
        ['span', { style: 'padding: 4px 8px; border-radius: 12px; background-color: rgba(25, 118, 210, 0.15); color: var(--secondary-color); font-weight: 600; font-size: 12px;' }, 'In Progress'],
      ],
      ['p', { style: 'margin: 8px 0 0 0; color: var(--text-secondary); font-size: 14px;' }, `JQL Query: ${node.attrs.jql}`],
    ];
  },

  addCommands() {
    return {
      insertJiraMacro:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },
});
