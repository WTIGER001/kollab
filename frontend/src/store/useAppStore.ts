import { create } from 'zustand';

const THEME_PRESET_STORAGE_KEY = "kollab:theme-preset";
const themePresetIds = new Set(["default", "workbench", "editorial", "neobrutal"]);
const getInitialThemePreset = () => {
  try {
    const value = globalThis.localStorage?.getItem(THEME_PRESET_STORAGE_KEY);
    if (value && themePresetIds.has(value)) return value;
  } catch { /* Browser storage is optional. */ }
  return "default";
};

const THEME_MODE_STORAGE_KEY = "kollab:theme-mode";

const getInitialThemeMode = (): "light" | "dark" => {
  if (typeof window === "undefined") return "dark";

  try {
    const storedMode = globalThis.localStorage?.getItem(THEME_MODE_STORAGE_KEY);
    if (storedMode === "light" || storedMode === "dark") return storedMode;
  } catch {
    // Private browsing or a locked-down browser can reject local storage.
  }

  return "dark";
};

const persistThemeMode = (mode: "light" | "dark") => {
  try {
    globalThis.localStorage?.setItem(THEME_MODE_STORAGE_KEY, mode);
  } catch {
    // Theme switching remains available even when browser storage is disabled.
  }
};

interface AppState {
  sidebarOpen: boolean;
  themeMode: "light" | "dark";
  activeThemeId: string;
  helpOpen: boolean;
  createSpaceOpen: boolean;
  createSpaceInitialTab: 0 | 1;
  createSpaceTeamId: string | null;
  createPageOpen: boolean;
  developerMode: boolean;
  sidebarWidth: number;
  
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setThemeMode: (mode: "light" | "dark") => void;
  toggleThemeMode: () => void;
  setActiveThemeId: (id: string) => void;
  setHelpOpen: (open: boolean) => void;
  setCreateSpaceOpen: (open: boolean) => void;
  openCreateSpace: (options?: { initialTab?: 0 | 1; teamId?: string | null }) => void;
  setCreatePageOpen: (open: boolean) => void;
  toggleDeveloperMode: () => void;
  setSidebarWidth: (width: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  themeMode: getInitialThemeMode(),
  activeThemeId: getInitialThemePreset(),
  helpOpen: false,
  createSpaceOpen: false,
  createSpaceInitialTab: 0,
  createSpaceTeamId: null,
  createPageOpen: false,
  developerMode: false,
  sidebarWidth: 280,
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setThemeMode: (mode) => {
    persistThemeMode(mode);
    set({ themeMode: mode });
  },
  toggleThemeMode: () => set((state) => {
    const themeMode = state.themeMode === "light" ? "dark" : "light";
    persistThemeMode(themeMode);
    return { themeMode };
  }),
  setActiveThemeId: (id) => {
    if (!themePresetIds.has(id)) return;
    try { globalThis.localStorage?.setItem(THEME_PRESET_STORAGE_KEY, id); } catch { /* Browser storage is optional. */ }
    set({ activeThemeId: id });
  },
  setHelpOpen: (open) => set({ helpOpen: open }),
  setCreateSpaceOpen: (open) => set({ createSpaceOpen: open }),
  openCreateSpace: (options = {}) => set({
    createSpaceOpen: true,
    createSpaceInitialTab: options.initialTab ?? 0,
    createSpaceTeamId: options.teamId ?? null,
  }),
  setCreatePageOpen: (open) => set({ createPageOpen: open }),
  toggleDeveloperMode: () => set((state) => ({ developerMode: !state.developerMode })),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
}));
