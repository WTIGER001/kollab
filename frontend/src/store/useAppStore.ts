import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  themeMode: "light" | "dark";
  helpOpen: boolean;
  createSpaceOpen: boolean;
  developerMode: boolean;
  sidebarWidth: number;
  
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setThemeMode: (mode: "light" | "dark") => void;
  toggleThemeMode: () => void;
  setHelpOpen: (open: boolean) => void;
  setCreateSpaceOpen: (open: boolean) => void;
  toggleDeveloperMode: () => void;
  setSidebarWidth: (width: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  themeMode: "dark",
  helpOpen: false,
  createSpaceOpen: false,
  developerMode: false,
  sidebarWidth: 280,
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setThemeMode: (mode) => set({ themeMode: mode }),
  toggleThemeMode: () => set((state) => ({ themeMode: state.themeMode === "light" ? "dark" : "light" })),
  setHelpOpen: (open) => set({ helpOpen: open }),
  setCreateSpaceOpen: (open) => set({ createSpaceOpen: open }),
  toggleDeveloperMode: () => set((state) => ({ developerMode: !state.developerMode })),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
}));
