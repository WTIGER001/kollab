import { useEffect, useState, useRef } from "react";
import { Editor } from "@tiptap/react";
import * as Y from "yjs";

export interface UserPresence {
  userId: string;
  username: string;
  color: string;
}

// Safe Base64 conversions for large Uint8Arrays to prevent Stack Overflow crashes
const uint8ArrayToBase64 = (arr: Uint8Array): string => {
  let binary = "";
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
};

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const usePresence = (
  activeDocId: string | null,
  authToken: string | null,
  editor: Editor | null,
  ydoc: Y.Doc,
  onSyncReady: (isFirst: boolean) => void
) => {
  const [connected, setConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // Keep callback reference updated without triggering connection re-effects
  const onSyncReadyRef = useRef(onSyncReady);
  useEffect(() => {
    onSyncReadyRef.current = onSyncReady;
  }, [onSyncReady]);

  const sendMsg = (msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  useEffect(() => {
    if (!authToken || !activeDocId) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setActiveUsers([]);
      return;
    }

    const connect = () => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const wsUrl = `ws://localhost:8080/api/ws?token=${authToken}&docId=${activeDocId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error("Presence WebSocket error:", err);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "presence") {
            const users = msg.users || [];
            setActiveUsers(users);
            if (editor && !editor.isDestroyed) {
              editor.view.dispatch(
                editor.view.state.tr.setMeta("presence-users", users)
              );
            }
          } else if (msg.type === "cursor") {
            if (editor && !editor.isDestroyed) {
              editor.view.dispatch(
                editor.view.state.tr.setMeta("presence-cursor", {
                  userId: msg.userId,
                  username: msg.username,
                  color: msg.color,
                  position: msg.position,
                  anchor: msg.anchor,
                  docId: msg.docId
                })
              );
            }
          } else if (msg.type === "sync") {
            // Decode base64 to binary Yjs update blob safely
            const binaryUpdate = base64ToUint8Array(msg.update);
            // Apply it locally, specifying "websocket" origin to prevent infinite loop
            Y.applyUpdate(ydoc, binaryUpdate, "websocket");
          } else if (msg.type === "sync-history") {
            // Apply all historical updates transactionally
            const hasHistory = msg.updates && msg.updates.length > 0;
            if (hasHistory) {
              Y.transact(ydoc, () => {
                msg.updates.forEach((updateStr: string) => {
                  const binaryUpdate = base64ToUint8Array(updateStr);
                  Y.applyUpdate(ydoc, binaryUpdate, "websocket");
                });
              }, "websocket");
              onSyncReadyRef.current(false);
            } else {
              onSyncReadyRef.current(true);
            }
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [authToken, activeDocId, editor, ydoc]); // Safely omitted onSyncReady

  // Synchronize local Yjs document changes over the WebSocket channel
  useEffect(() => {
    if (!ydoc || !activeDocId || !connected) return;

    const handleYjsUpdate = (update: Uint8Array, origin: any) => {
      // Avoid infinite feedback loops by checking update origin
      if (origin !== "websocket") {
        const base64Update = uint8ArrayToBase64(update);
        sendMsg({
          type: "sync",
          docId: activeDocId,
          update: base64Update,
        });
      }
    };

    ydoc.on("update", handleYjsUpdate);
    return () => {
      ydoc.off("update", handleYjsUpdate);
    };
  }, [ydoc, activeDocId, connected]);

  // Broadcast local user's selection updates to room
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const handleSelectionUpdate = () => {
      if (!activeDocId) return;
      const { from, to } = editor.state.selection;
      sendMsg({
        type: "cursor",
        docId: activeDocId,
        position: to,
        anchor: from
      });
    };

    editor.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, activeDocId, connected]);

  // Synchronously switch rooms when document selection changes
  useEffect(() => {
    if (connected && activeDocId) {
      sendMsg({
        type: "join",
        docId: activeDocId
      });
    }
  }, [activeDocId, connected]);

  return { connected, activeUsers };
};
