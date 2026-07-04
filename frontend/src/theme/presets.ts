import type { ThemePreset } from "./types";

export const themeDefault: ThemePreset = {
  id: "default",
  name: "Default (Glassmorphism)",
  colors: {
    light: {
      primary: "#6366f1",
      secondary: "#a855f7",
      background: "#f8fafc",
      paper: "#ffffff",
      textPrimary: "#0f172a",
      textSecondary: "#475569",
      border: "rgba(0, 0, 0, 0.08)",
      accent: "#ec4899",
      glassBg: "rgba(255, 255, 255, 0.6)",
      glassBorder: "rgba(0, 0, 0, 0.08)",
    },
    dark: {
      primary: "#818cf8",
      secondary: "#c084fc",
      background: "#09090b",
      paper: "#121214",
      textPrimary: "#f8fafc",
      textSecondary: "#94a3b8",
      border: "rgba(255, 255, 255, 0.08)",
      accent: "#ec4899",
      glassBg: "rgba(255, 255, 255, 0.02)",
      glassBorder: "rgba(255, 255, 255, 0.08)",
    }
  },
  cssVariables: {
    "--font-sans": '"Outfit", "Inter", system-ui, -apple-system, sans-serif',
    "--font-headings": '"Outfit", sans-serif',
    "--border-radius-card": "8px",
    "--border-radius-button": "8px",
    "--shadow-elevation": "0 4px 12px rgba(0, 0, 0, 0.1)",
    "--shadow-button": "0 4px 12px rgba(0, 0, 0, 0.15)",
    "--border-style": "solid",
    "--border-width": "1px",
  },
  muiOverrides: (mode) => ({
    palette: { mode },
    shape: { borderRadius: 12 },
    typography: { fontFamily: '"Outfit", "Inter", "system-ui", "-apple-system", sans-serif' },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: "none",
            fontWeight: 600,
            transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
            "&:active": { transform: "scale(0.97)" },
          },
          contained: {
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            "&:hover": { boxShadow: "0 6px 16px rgba(0, 0, 0, 0.25)", transform: "translateY(-1px)" },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: `1px solid ${mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'}`,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'light' ? "rgba(255, 255, 255, 0.85)" : "rgba(18, 18, 20, 0.75)",
            backdropFilter: "blur(16px)",
            boxShadow: mode === 'light' ? "0 12px 40px rgba(0, 0, 0, 0.1)" : "inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 12px 40px rgba(0, 0, 0, 0.4)",
          },
        },
      },
    },
  }),
};

export const themeWorkbench: ThemePreset = {
  id: "workbench",
  name: "Workbench (Technical)",
  colors: {
    light: {
      primary: "#059669",
      secondary: "#0284c7",
      background: "#f1f5f9",
      paper: "#ffffff",
      textPrimary: "#0f172a",
      textSecondary: "#475569",
      border: "rgba(0, 0, 0, 0.15)",
      accent: "#d97706",
      glassBg: "#ffffff",
      glassBorder: "rgba(0, 0, 0, 0.15)",
    },
    dark: {
      primary: "#10b981", 
      secondary: "#0ea5e9", 
      background: "#0f1115",
      paper: "#1a1d24",
      textPrimary: "#f1f5f9",
      textSecondary: "#cbd5e1",
      border: "rgba(255, 255, 255, 0.15)",
      accent: "#f59e0b",
      glassBg: "#1a1d24",
      glassBorder: "rgba(255, 255, 255, 0.15)",
    }
  },
  cssVariables: {
    "--font-sans": '"JetBrains Mono", "Inter", monospace, sans-serif',
    "--font-headings": '"JetBrains Mono", monospace',
    "--border-radius-card": "0px",
    "--border-radius-button": "0px",
    "--shadow-elevation": "none",
    "--shadow-button": "none",
    "--border-style": "dashed",
    "--border-width": "1px",
  },
  muiOverrides: (mode) => ({
    palette: { mode },
    shape: { borderRadius: 0 },
    typography: { fontFamily: '"JetBrains Mono", "Inter", monospace, sans-serif' },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 500,
            border: "1px solid transparent",
          },
          contained: {
            boxShadow: "none",
            "&:hover": { boxShadow: "none", border: `1px solid ${mode === 'light' ? '#059669' : '#10b981'}` },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: `1px solid ${mode === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)'}`,
            boxShadow: "none",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'light' ? "#ffffff" : "#1a1d24",
            boxShadow: "none",
            border: `1px solid ${mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'}`,
          },
        },
      },
    },
  }),
};

export const themeEditorial: ThemePreset = {
  id: "editorial",
  name: "Editorial (Refined)",
  colors: {
    light: {
      primary: "#c2410c", 
      secondary: "#b45309",
      background: "#fdfbf7",
      paper: "#ffffff",
      textPrimary: "#1c1917", 
      textSecondary: "#57534e",
      border: "rgba(0, 0, 0, 0.1)",
      accent: "#047857",
      glassBg: "#ffffff",
      glassBorder: "rgba(0, 0, 0, 0.1)",
    },
    dark: {
      primary: "#ea580c", 
      secondary: "#d97706",
      background: "#1c1917", 
      paper: "#292524",
      textPrimary: "#fafaf9", 
      textSecondary: "#a8a29e",
      border: "rgba(255, 255, 255, 0.1)",
      accent: "#10b981",
      glassBg: "#292524",
      glassBorder: "rgba(255, 255, 255, 0.1)",
    }
  },
  cssVariables: {
    "--font-sans": '"Inter", system-ui, -apple-system, sans-serif',
    "--font-headings": '"Playfair Display", "Georgia", serif',
    "--border-radius-card": "4px",
    "--border-radius-button": "9999px",
    "--shadow-elevation": "0 10px 30px rgba(0, 0, 0, 0.05)",
    "--shadow-button": "0 2px 8px rgba(194, 65, 12, 0.2)",
    "--border-style": "solid",
    "--border-width": "1px",
  },
  muiOverrides: (mode) => ({
    palette: { mode },
    shape: { borderRadius: 4 },
    typography: { 
      fontFamily: '"Inter", "system-ui", "-apple-system", sans-serif',
      h1: { fontFamily: '"Playfair Display", "Georgia", serif', fontWeight: 600 },
      h2: { fontFamily: '"Playfair Display", "Georgia", serif', fontWeight: 600 },
      h3: { fontFamily: '"Playfair Display", "Georgia", serif', fontWeight: 600 },
      h4: { fontFamily: '"Playfair Display", "Georgia", serif', fontWeight: 600 },
      h5: { fontFamily: '"Playfair Display", "Georgia", serif', fontWeight: 600 },
      h6: { fontFamily: '"Playfair Display", "Georgia", serif', fontWeight: 600 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 9999,
            textTransform: "none",
            fontWeight: 500,
            letterSpacing: "0.01em",
          },
          contained: {
            boxShadow: `0 2px 8px ${mode === 'light' ? 'rgba(194, 65, 12, 0.2)' : 'rgba(234, 88, 12, 0.2)'}`,
            "&:hover": { boxShadow: `0 4px 12px ${mode === 'light' ? 'rgba(194, 65, 12, 0.3)' : 'rgba(234, 88, 12, 0.3)'}` },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: `1px solid ${mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'}`,
            boxShadow: mode === 'light' ? "0 10px 30px rgba(0, 0, 0, 0.05)" : "0 10px 30px rgba(0, 0, 0, 0.2)",
          },
        },
      },
    },
  }),
};

export const themeNeobrutal: ThemePreset = {
  id: "neobrutal",
  name: "Neobrutalism (Bold)",
  colors: {
    light: {
      primary: "#ec4899", 
      secondary: "#3b82f6", 
      background: "#fde047", 
      paper: "#ffffff",
      textPrimary: "#000000",
      textSecondary: "#3f3f46",
      border: "#000000",
      accent: "#8b5cf6",
      glassBg: "#ffffff",
      glassBorder: "#000000",
    },
    dark: {
      primary: "#f472b6", 
      secondary: "#60a5fa", 
      background: "#18181b", 
      paper: "#27272a",
      textPrimary: "#ffffff",
      textSecondary: "#d4d4d8",
      border: "#34d399", 
      accent: "#a78bfa",
      glassBg: "#27272a",
      glassBorder: "#34d399",
    }
  },
  cssVariables: {
    "--font-sans": '"Inter", system-ui, -apple-system, sans-serif',
    "--font-headings": '"Inter", system-ui, sans-serif',
    "--border-radius-card": "12px",
    "--border-radius-button": "8px",
    "--shadow-elevation": "4px 4px 0px var(--border)",
    "--shadow-button": "2px 2px 0px var(--border)",
    "--border-style": "solid",
    "--border-width": "3px",
  },
  muiOverrides: (mode) => {
    const borderColor = mode === 'light' ? '#000000' : '#34d399';
    return {
      palette: { mode },
      shape: { borderRadius: 12 },
      typography: { 
        fontFamily: '"Inter", "system-ui", "-apple-system", sans-serif',
        allVariants: { color: mode === 'light' ? "#000000" : "#ffffff", fontWeight: 700 } 
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              border: `2px solid ${borderColor}`,
              textTransform: "uppercase",
              fontWeight: 800,
              transition: "none",
              "&:active": { transform: "translate(2px, 2px)", boxShadow: "none" },
            },
            contained: {
              boxShadow: `2px 2px 0px ${borderColor}`,
              "&:hover": { boxShadow: `2px 2px 0px ${borderColor}` },
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: "none",
              border: `3px solid ${borderColor}`,
              boxShadow: `4px 4px 0px ${borderColor}`,
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              border: `3px solid ${borderColor}`,
              boxShadow: `4px 4px 0px ${borderColor}`,
            }
          }
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              border: `4px solid ${borderColor}`,
              boxShadow: `8px 8px 0px ${borderColor}`,
            },
          },
        },
      },
    };
  },
};

export const presets = [themeDefault, themeWorkbench, themeEditorial, themeNeobrutal];
