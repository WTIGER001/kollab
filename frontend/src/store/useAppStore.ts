import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  themeMode: "light" | "dark";
  activeThemeId: string;
  helpOpen: boolean;
  createSpaceOpen: boolean;
  developerMode: boolean;
  sidebarWidth: number;
  
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setThemeMode: (mode: "light" | "dark") => void;
  toggleThemeMode: () => void;
  setActiveThemeId: (id: string) => void;
  setHelpOpen: (open: boolean) => void;
  setCreateSpaceOpen: (open: boolean) => void;
  toggleDeveloperMode: () => void;
  setSidebarWidth: (width: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  themeMode: "dark",
  activeThemeId: "default",
  helpOpen: false,
  createSpaceOpen: false,
  developerMode: false,
  sidebarWidth: 280,
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setThemeMode: (mode) => set({ themeMode: mode }),
  toggleThemeMode: () => set((state) => ({ themeMode: state.themeMode === "light" ? "dark" : "light" })),
  setActiveThemeId: (id) => set({ activeThemeId: id }),
  setHelpOpen: (open) => set({ helpOpen: open }),
  setCreateSpaceOpen: (open) => set({ createSpaceOpen: open }),
  toggleDeveloperMode: () => set((state) => ({ developerMode: !state.developerMode })),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
}));
