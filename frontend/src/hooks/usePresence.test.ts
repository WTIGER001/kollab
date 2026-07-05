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
