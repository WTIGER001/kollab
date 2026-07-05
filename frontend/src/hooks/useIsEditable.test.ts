import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useIsEditable } from './useIsEditable';

describe('useIsEditable', () => {
  it('returns true when editor is null', () => {
    const { result } = renderHook(() => useIsEditable(null));
    expect(result.current).toBe(true);
  });

  it('initializes with editor.isEditable', () => {
    const mockEditor = {
      isEditable: false,
      isDestroyed: false,
      on: vi.fn(),
      off: vi.fn(),
    } as any;
    
    const { result } = renderHook(() => useIsEditable(mockEditor));
    expect(result.current).toBe(false);
  });

  it('updates when editor triggers an update event', () => {
    let updateCallback: () => void = () => {};
    const mockEditor = {
      isEditable: false,
      isDestroyed: false,
      on: vi.fn((event, cb) => {
        if (event === 'update') updateCallback = cb;
      }),
      off: vi.fn(),
    } as any;
    
    const { result } = renderHook(() => useIsEditable(mockEditor));
    expect(result.current).toBe(false);
    
    // Simulate editor changing state and triggering update
    act(() => {
      mockEditor.isEditable = true;
      updateCallback();
    });
    
    expect(result.current).toBe(true);
  });

  it('cleans up event listeners on unmount', () => {
    const mockEditor = {
      isEditable: true,
      isDestroyed: false,
      on: vi.fn(),
      off: vi.fn(),
    } as any;
    
    const { unmount } = renderHook(() => useIsEditable(mockEditor));
    
    expect(mockEditor.on).toHaveBeenCalledWith('update', expect.any(Function));
    expect(mockEditor.on).toHaveBeenCalledWith('transaction', expect.any(Function));
    
    unmount();
    
    expect(mockEditor.off).toHaveBeenCalledWith('update', expect.any(Function));
    expect(mockEditor.off).toHaveBeenCalledWith('transaction', expect.any(Function));
  });
});
