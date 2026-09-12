import { useToastStore } from "../store/useToastStore";
import { useEffect, useState, useRef } from "react";
import { Editor } from "@tiptap/react";
import * as Y from "yjs";
import { yDocToProsemirrorJSON } from "@tiptap/y-tiptap";

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

import { WS_BASE_URL, getSharedProtocol } from "../services/api";

export const usePresence = (
  activeDocId: string | null,
  authToken: string | null,
  editor: Editor | null,
  ydoc: Y.Doc,
  onSyncReady: (isFirst: boolean) => void,
  canWrite = true,
  onSynchronized?: (ready: boolean) => void
) => {
  const epochRef = useRef<string | null>(null);
  const initializingRef = useRef(false);
  const synchronizedCallback = useRef(onSynchronized);
  synchronizedCallback.current = onSynchronized;
  const [connected, setConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const snapshotRef = useRef({ enabled: false, version: 0, inFlight: false, pending: false, sent: "", requestId: 0 });
  const flushSnapshotRef = useRef<() => void>(() => {});
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
      synchronizedCallback.current?.(true);
      return;
    }

    if (activeDocId.startsWith('template_')) {
      // Templates do not use real-time presence/sync
      setActiveUsers([]);
      // Call onSyncReady immediately to load initialContent
      onSyncReadyRef.current(true);
      synchronizedCallback.current?.(true);
      return;
    }

    snapshotRef.current = { enabled: false, version: 0, inFlight: false, pending: false, sent: "", requestId: 0 };
    flushSnapshotRef.current = () => {
      const state = snapshotRef.current;
      if (!canWrite || !editor || editor.isDestroyed || !state.enabled || state.inFlight || !state.pending || wsRef.current?.readyState !== WebSocket.OPEN) return;
      const update = uint8ArrayToBase64(Y.encodeStateAsUpdate(ydoc));
      state.sent = update; state.inFlight = true; state.pending = false; state.requestId++;
      wsRef.current.send(JSON.stringify({ type: "sync", docId: activeDocId, update, content: JSON.stringify(yDocToProsemirrorJSON(ydoc, "default")), snapshot: true, version: state.version, requestId: state.requestId }));
    };
    const connect = () => {
      synchronizedCallback.current?.(false);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }

      const wsUrl = `${WS_BASE_URL}/api/ws?token=${encodeURIComponent(authToken)}&docId=${encodeURIComponent(activeDocId)}`;
      const ws = new WebSocket(wsUrl, getSharedProtocol(activeDocId));
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onclose = (event) => {
        if (event?.code === 1012) { window.location.reload(); return; }
        setConnected(false);
        snapshotRef.current.inFlight = false;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error("Presence WebSocket error:", err);
      };

      ws.onmessage = (event) => {
        const lines = event.data.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const msg = JSON.parse(trimmed);
            if (msg.epoch) {
              if (epochRef.current && epochRef.current !== msg.epoch) { window.location.reload(); return; }
              epochRef.current = msg.epoch;
            }
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
            } else if (msg.type === "sync-ack") {
              const state = snapshotRef.current;
              state.version = Math.max(state.version, msg.version || 0);
              if (msg.requestId === state.requestId) {
                state.inFlight = false;
                initializingRef.current = false;
                synchronizedCallback.current?.(true);
                state.pending = state.sent !== uint8ArrayToBase64(Y.encodeStateAsUpdate(ydoc));
                flushSnapshotRef.current();
              }
            } else if (msg.type === "sync-error") {
              snapshotRef.current.inFlight = false;
              snapshotRef.current.pending = true;
              useToastStore.getState().showToast(msg.error || "Synchronization failed. Keep this page open.", "error");
            } else if (msg.type === "sync") {
              if (initializingRef.current && msg.version > 0) { window.location.reload(); return; }
              // Decode base64 to binary Yjs update blob safely
              const binaryUpdate = base64ToUint8Array(msg.update);
              // Apply it locally, specifying "websocket" origin to prevent infinite loop
              Y.applyUpdate(ydoc, binaryUpdate, "websocket");
              if (msg.snapshot) {
                snapshotRef.current.version = Math.max(snapshotRef.current.version, msg.version || 0);
                flushSnapshotRef.current();
              }
            } else if (msg.type === "document-tree-updated") {
              window.dispatchEvent(new CustomEvent("document-tree-updated"));
            } else if (msg.type === "sync-history") {
              // Another replica won first initialization. No editing is enabled
              // yet, so reload its seed instead of merging duplicate initial text.
              if (initializingRef.current && msg.version > 0) { window.location.reload(); return; }
              initializingRef.current = !!msg.snapshot && msg.version === 0 && !!editor;
              if (msg.snapshot) {
                snapshotRef.current.enabled = true;
                snapshotRef.current.version = msg.version || 0;
                snapshotRef.current.inFlight = true;
              }
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
              if (!msg.snapshot || !initializingRef.current || !canWrite) synchronizedCallback.current?.(true);
              if (msg.snapshot) {
                snapshotRef.current.inFlight = false;
                snapshotRef.current.pending = true;
                flushSnapshotRef.current();
              }
            }
          } catch (err) {
            console.error("Error parsing WebSocket message line:", trimmed, err);
          }
        }
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [authToken, activeDocId, editor, ydoc, canWrite]); // Safely omitted onSyncReady

  // Synchronize local Yjs document changes over the WebSocket channel
  useEffect(() => {
    if (!canWrite || !ydoc || !activeDocId || !connected) return;

    const handleYjsUpdate = (update: Uint8Array, origin: any) => {
      // Avoid infinite feedback loops by checking update origin
      if (origin !== "websocket") {
        if (snapshotRef.current.enabled) {
          snapshotRef.current.pending = true;
          flushSnapshotRef.current();
          return;
        }
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
  }, [ydoc, activeDocId, connected, canWrite]);

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
