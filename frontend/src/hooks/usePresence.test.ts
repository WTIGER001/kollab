import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as Y from 'yjs';
import { usePresence } from './usePresence';
import { WS_BASE_URL } from '../services/api';

class MockWebSocket {
  url: string;
  readyState: number;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  });

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  constructor(url: string) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    MockWebSocket.instances.push(this);
  }

  // Helper for tests to open the socket
  triggerOpen() {
    this.readyState = 1; // OPEN
    if (this.onopen) this.onopen();
  }
}

describe('usePresence', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    MockWebSocket.instances = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('skips websocket connection if activeDocId or authToken is null', () => {
    const ydoc = new Y.Doc();
    const onSyncReady = vi.fn();
    const { result } = renderHook(() => 
      usePresence(null, 'token', null, ydoc, onSyncReady)
    );
    
    expect(MockWebSocket.instances).toHaveLength(0);
    expect(result.current.activeUsers).toEqual([]);
  });

  it('bypasses real-time sync for templates', () => {
    const ydoc = new Y.Doc();
    const onSyncReady = vi.fn();
    renderHook(() => 
      usePresence('template_123', 'token', null, ydoc, onSyncReady)
    );
    
    expect(MockWebSocket.instances).toHaveLength(0);
    expect(onSyncReady).toHaveBeenCalledWith(true);
  });

  it('connects to websocket and sends join message', () => {
    const ydoc = new Y.Doc();
    const onSyncReady = vi.fn();
    const { result } = renderHook(() => 
      usePresence('doc-1', 'token', null, ydoc, onSyncReady)
    );
    
    expect(MockWebSocket.instances).toHaveLength(1);
    const ws = MockWebSocket.instances[0];
    expect(ws.url).toBe(`${WS_BASE_URL}/api/ws?token=token&docId=doc-1`);
    
    act(() => {
      ws.triggerOpen();
    });
    
    expect(result.current.connected).toBe(true);
    expect(ws.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'join',
      docId: 'doc-1'
    }));
  });

  it('attempts reconnection on close', () => {
    const ydoc = new Y.Doc();
    const onSyncReady = vi.fn();
    renderHook(() => 
      usePresence('doc-1', 'token', null, ydoc, onSyncReady)
    );
    
    const ws = MockWebSocket.instances[0];
    
    act(() => {
      ws.triggerOpen();
    });
    
    act(() => {
      ws.close();
    });
    
    // Fast forward 3 seconds for reconnection
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    expect(MockWebSocket.instances).toHaveLength(2); // new instance created
  });

  it('handles sync history and incoming sync messages', () => {
    const ydoc = new Y.Doc();
    const onSyncReady = vi.fn();
    renderHook(() => 
      usePresence('doc-1', 'token', null, ydoc, onSyncReady)
    );
    
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.triggerOpen();
    });
    
    // Simulate empty sync history
    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({ type: 'sync-history', updates: [] })
      });
    });
    
    expect(onSyncReady).toHaveBeenCalledWith(true);
    
    // Let's create an update from another Y.Doc and apply it
    const otherDoc = new Y.Doc();
    otherDoc.getText('test').insert(0, 'hello from websocket');
    const update = Y.encodeStateAsUpdate(otherDoc);
    const base64Update = btoa(String.fromCharCode(...update));
    
    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({ type: 'sync', update: base64Update })
      });
    });
    
    expect(ydoc.getText('test').toString()).toBe('hello from websocket');
  });
  
  it('sends Yjs document updates to the websocket', () => {
    const ydoc = new Y.Doc();
    const onSyncReady = vi.fn();
    renderHook(() => 
      usePresence('doc-1', 'token', null, ydoc, onSyncReady)
    );
    
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.triggerOpen();
    });
    
    // Clear initial join call
    ws.send.mockClear();
    
    // Trigger a Yjs update
    act(() => {
      ydoc.getText('test').insert(0, 'hello');
    });
    
    expect(ws.send).toHaveBeenCalled();
    const callArgs = JSON.parse(ws.send.mock.calls[0][0]);
    expect(callArgs.type).toBe('sync');
    expect(callArgs.update).toBeDefined();
  });
});

describe('durable collaboration snapshots', () => {
  it('keeps first initialization read-only until acknowledged', () => {
    vi.stubGlobal('WebSocket', MockWebSocket); MockWebSocket.instances = [];
    const doc = new Y.Doc();
    const ready = vi.fn();
    const editor = { isDestroyed: false, on: vi.fn(), off: vi.fn() } as unknown as import('@tiptap/core').Editor;
    const { unmount } = renderHook(() => usePresence('new-doc', 'token', editor, doc, () => doc.getMap('seed').set('text', 'one copy'), true, ready));
    const socket = MockWebSocket.instances[0];
    act(() => socket.triggerOpen());
    act(() => socket.onmessage?.({ data: JSON.stringify({ type: 'sync-history', snapshot: true, version: 0, updates: [], epoch: 'initial' }) }));
    expect(ready).not.toHaveBeenCalledWith(true);
    const sent = JSON.parse(socket.send.mock.calls.at(-1)![0]);
    act(() => socket.onmessage?.({ data: JSON.stringify({ type: 'sync-ack', requestId: sent.requestId, version: 1 }) }));
    expect(ready).toHaveBeenLastCalledWith(true);
    unmount(); doc.destroy(); vi.unstubAllGlobals();
  });
  it('reloads a losing seed and a changed restore epoch before merging', () => {
    const reload = vi.fn();
    const originalWindow = window;
    vi.stubGlobal('window', new Proxy(originalWindow, { get: (target, key) => key === 'location' ? { reload } : Reflect.get(target, key) }));
    vi.stubGlobal('WebSocket', MockWebSocket);
    for (const firstInitialization of [true, false]) {
      MockWebSocket.instances = []; reload.mockClear();
      const doc = new Y.Doc();
      const editor = { isDestroyed: false, on: vi.fn(), off: vi.fn() } as unknown as import('@tiptap/core').Editor;
      const { unmount } = renderHook(() => usePresence('new-doc', 'token', editor, doc, vi.fn(), true));
      const socket = MockWebSocket.instances[0]; act(() => socket.triggerOpen());
      act(() => socket.onmessage?.({ data: JSON.stringify({ type: 'sync-history', snapshot: true, version: firstInitialization ? 0 : 3, updates: [], epoch: 'before' }) }));
      const remote = new Y.Doc(); remote.getMap('remote').set('unsafe-merge', true);
      act(() => socket.onmessage?.({ data: JSON.stringify({ type: 'sync', snapshot: true, version: 4, epoch: firstInitialization ? 'before' : 'after', update: btoa(String.fromCharCode(...Y.encodeStateAsUpdate(remote))) }) }));
      expect(reload).toHaveBeenCalledOnce();
      expect(doc.getMap('remote').size).toBe(0);
      unmount(); doc.destroy(); remote.destroy();
    }
    vi.unstubAllGlobals();
  });
  it('does not persist uninitialized editors or viewer state', () => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    const editor = { isDestroyed: false, on: vi.fn(), off: vi.fn() } as unknown as import('@tiptap/core').Editor;
    for (const [readyEditor, canWrite] of [[null, true], [editor, false]] as const) {
      MockWebSocket.instances = [];
      const doc = new Y.Doc();
      const { unmount } = renderHook(() => usePresence('doc', 'token', readyEditor, doc, vi.fn(), canWrite));
      const socket = MockWebSocket.instances[0];
      act(() => socket.triggerOpen());
      act(() => socket.onmessage?.({data: JSON.stringify({type:'sync-history', snapshot:true, version:0, updates:[]})}));
      expect(socket.send.mock.calls.map(([payload]) => JSON.parse(payload).type)).not.toContain('sync');
      unmount(); doc.destroy();
    }
    vi.unstubAllGlobals();
  });
  it('merges a conflict snapshot before retrying and retains offline edits', () => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    MockWebSocket.instances = [];
    const local = new Y.Doc();
    const remote = new Y.Doc();
    const paragraph = new Y.XmlElement('paragraph');
    const text = new Y.XmlText();
    text.insert(0, 'durable readable text');
    paragraph.insert(0, [text]);
    local.getXmlFragment('default').insert(0, [paragraph]);
    local.getMap('content').set('offline', 'kept');
    remote.getMap('content').set('remote', 'kept');
    const editor = { isDestroyed: false, on: vi.fn(), off: vi.fn() } as unknown as import('@tiptap/core').Editor;
    const { unmount } = renderHook(() => usePresence('durable-doc', 'token', editor, local, vi.fn()));
    const socket = MockWebSocket.instances[0];
    act(() => socket.triggerOpen());
    act(() => socket.onmessage?.({ data: JSON.stringify({ type: 'sync-history', snapshot: true, version: 4, updates: [btoa(String.fromCharCode(...Y.encodeStateAsUpdate(remote)))] }) }));
    const sent = JSON.parse(socket.send.mock.calls.at(-1)![0]);
    expect(sent.snapshot).toBe(true);
    expect(JSON.parse(sent.content)).toEqual({ type: 'doc', content: [{type:'paragraph', content:[{type:'text', text:'durable readable text'}]}] });
    expect(sent.version).toBe(4);
    const merged = new Y.Doc();
    Y.applyUpdate(merged, Uint8Array.from(atob(sent.update), c => c.charCodeAt(0)));
    expect(merged.getMap('content').toJSON()).toEqual({ offline: 'kept', remote: 'kept' });
    act(() => local.getMap('content').set('later', 'kept'));
    act(() => socket.onmessage?.({ data: JSON.stringify({ type: 'sync-ack', requestId: sent.requestId, version: 5 }) }));
    const next = JSON.parse(socket.send.mock.calls.at(-1)![0]);
    expect(next.version).toBe(5);
    Y.applyUpdate(merged, Uint8Array.from(atob(next.update), c => c.charCodeAt(0)));
    expect(merged.getMap('content').get('later')).toBe('kept');
    unmount(); vi.unstubAllGlobals();
  });
});
