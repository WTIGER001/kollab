import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore } from './useToastStore';

describe('useToastStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useToastStore.setState({
      open: false,
      message: '',
      severity: 'info',
    });
  });

  it('shows toast with default severity', () => {
    const { showToast } = useToastStore.getState();
    
    showToast('Hello World');
    
    const state = useToastStore.getState();
    expect(state.open).toBe(true);
    expect(state.message).toBe('Hello World');
    expect(state.severity).toBe('info');
  });

  it('shows toast with custom severity', () => {
    const { showToast } = useToastStore.getState();
    
    showToast('An error occurred', 'error');
    
    const state = useToastStore.getState();
    expect(state.open).toBe(true);
    expect(state.message).toBe('An error occurred');
    expect(state.severity).toBe('error');
  });

  it('hides toast', () => {
    const { showToast, hideToast } = useToastStore.getState();
    
    showToast('Will be hidden soon');
    expect(useToastStore.getState().open).toBe(true);
    
    hideToast();
    expect(useToastStore.getState().open).toBe(false);
    // Message and severity typically remain until next toast to prevent visual glitches during exit animation
    expect(useToastStore.getState().message).toBe('Will be hidden soon');
  });
});
