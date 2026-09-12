import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    localStorage.removeItem('kollab:theme-mode');
    // Reset store state before each test
    useAppStore.setState({
      sidebarOpen: true,
      themeMode: 'dark',
      activeThemeId: 'default',
      helpOpen: false,
      createSpaceOpen: false,
      developerMode: false,
      sidebarWidth: 280,
    });
  });

  it('toggles sidebar state', () => {
    const { toggleSidebar } = useAppStore.getState();
    
    expect(useAppStore.getState().sidebarOpen).toBe(true);
    toggleSidebar();
    expect(useAppStore.getState().sidebarOpen).toBe(false);
    toggleSidebar();
    expect(useAppStore.getState().sidebarOpen).toBe(true);
  });

  it('sets sidebar state explicitly', () => {
    const { setSidebarOpen } = useAppStore.getState();
    
    setSidebarOpen(false);
    expect(useAppStore.getState().sidebarOpen).toBe(false);
    setSidebarOpen(false); // test idempotent
    expect(useAppStore.getState().sidebarOpen).toBe(false);
  });

  it('toggles theme mode', () => {
    const { toggleThemeMode } = useAppStore.getState();
    
    expect(useAppStore.getState().themeMode).toBe('dark');
    toggleThemeMode();
    expect(useAppStore.getState().themeMode).toBe('light');
    toggleThemeMode();
    expect(useAppStore.getState().themeMode).toBe('dark');
  });

  it('sets theme mode explicitly', () => {
    const { setThemeMode } = useAppStore.getState();
    
    setThemeMode('light');
    expect(useAppStore.getState().themeMode).toBe('light');
    expect(localStorage.setItem).toHaveBeenCalledWith('kollab:theme-mode', 'light');
  });

  it('toggles developer mode', () => {
    const { toggleDeveloperMode } = useAppStore.getState();
    
    expect(useAppStore.getState().developerMode).toBe(false);
    toggleDeveloperMode();
    expect(useAppStore.getState().developerMode).toBe(true);
  });

  it('sets simple properties correctly', () => {
    const { setActiveThemeId, setHelpOpen, setCreateSpaceOpen, setSidebarWidth } = useAppStore.getState();
    
    setActiveThemeId('workbench');
    expect(useAppStore.getState().activeThemeId).toBe('workbench');
    expect(localStorage.setItem).toHaveBeenCalledWith('kollab:theme-preset', 'workbench');
    setActiveThemeId('unknown-preset');
    expect(useAppStore.getState().activeThemeId).toBe('workbench');
    
    setHelpOpen(true);
    expect(useAppStore.getState().helpOpen).toBe(true);
    
    setCreateSpaceOpen(true);
    expect(useAppStore.getState().createSpaceOpen).toBe(true);
    
    setSidebarWidth(350);
    expect(useAppStore.getState().sidebarWidth).toBe(350);
  });
});
