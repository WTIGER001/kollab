import { create } from 'zustand';

interface ToastState {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info" | "warning";
  showToast: (message: string, severity?: "success" | "error" | "info" | "warning") => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  open: false,
  message: "",
  severity: "info",
  showToast: (message, severity = "info") => set({ open: true, message, severity }),
  hideToast: () => set({ open: false }),
}));
