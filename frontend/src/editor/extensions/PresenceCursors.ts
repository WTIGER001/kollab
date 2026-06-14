import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface RemoteCursor {
  userId: string;
  username: string;
  color: string;
  position: number;
  anchor: number;
}

export interface PresenceCursorsState {
  decorations: DecorationSet;
  cursors: Map<string, RemoteCursor>;
}

export const PresenceCursorsKey = new PluginKey<PresenceCursorsState>("presenceCursors");

export const PresenceCursors = Extension.create({
  name: "presenceCursors",

  addProseMirrorPlugins() {
    return [
      new Plugin<PresenceCursorsState>({
        key: PresenceCursorsKey,
        state: {
          init() {
            return {
              decorations: DecorationSet.empty,
              cursors: new Map<string, RemoteCursor>(),
            };
          },
          apply(tr, value, _oldState, newState) {
            let { decorations, cursors } = value;

            // Map decorations forward through the transaction mapping
            decorations = decorations.map(tr.mapping, tr.doc);

            let changed = false;

            // 1. Handle user presence updates to prune users who disconnected or left the document
            const activeUsers = tr.getMeta("presence-users") as { userId: string }[] | undefined;
            if (activeUsers) {
              const activeUserIds = new Set(activeUsers.map((u) => u.userId));
              for (const [userId] of cursors) {
                if (!activeUserIds.has(userId)) {
                  cursors.delete(userId);
                  changed = true;
                }
              }
            }

            // 2. Handle peer cursor coordinate updates
            const cursorMeta = tr.getMeta("presence-cursor") as RemoteCursor | undefined;
            if (cursorMeta) {
              // Ensure we clamp position and anchor to current doc content size to prevent crash
              const maxPos = newState.doc.content.size;
              const position = Math.min(Math.max(0, cursorMeta.position), maxPos);
              const anchor = Math.min(Math.max(0, cursorMeta.anchor), maxPos);

              cursors.set(cursorMeta.userId, {
                ...cursorMeta,
                position,
                anchor,
              });
              changed = true;
            }

            // If cursors map changed, or if document changes require recalculation of positions
            if (changed || tr.docChanged) {
              const decos: Decoration[] = [];
              const maxPos = newState.doc.content.size;

              cursors.forEach((cursor) => {
                const pos = Math.min(cursor.position, maxPos);
                const anc = Math.min(cursor.anchor, maxPos);

                // Add inline background color decoration for selection ranges
                if (pos !== anc) {
                  const from = Math.min(pos, anc);
                  const to = Math.max(pos, anc);
                  decos.push(
                    Decoration.inline(from, to, {
                      style: `background-color: ${cursor.color}33;`,
                      class: "remote-selection",
                    })
                  );
                }

                // Add custom widget decoration for the cursor caret and temporary hover label
                const widget = Decoration.widget(pos, () => {
                  const container = document.createElement("span");
                  container.className = "remote-cursor-container";

                  const caret = document.createElement("span");
                  caret.className = "remote-cursor-caret";
                  caret.style.borderLeftColor = cursor.color;

                  const label = document.createElement("span");
                  label.className = "remote-cursor-label";
                  label.style.backgroundColor = cursor.color;
                  label.innerText = cursor.username;

                  container.appendChild(caret);
                  container.appendChild(label);
                  return container;
                }, {
                  side: 1, // Draw widget on the correct side of the text boundary
                  key: cursor.userId,
                });

                decos.push(widget);
              });

              return {
                decorations: DecorationSet.create(newState.doc, decos),
                cursors,
              };
            }

            return { decorations, cursors };
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorations;
          },
        },
      }),
    ];
  },
});
