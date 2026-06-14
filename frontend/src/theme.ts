import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#8b5cf6", // Accent purple
      light: "#a78bfa",
      dark: "#7c3aed",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#3b82f6", // Accent blue
      light: "#60a5fa",
      dark: "#2563eb",
      contrastText: "#ffffff",
    },
    background: {
      default: "#08090c", // bg-dark
      paper: "#10121a",   // panel-dark
    },
    text: {
      primary: "#f8fafc",   // text-primary
      secondary: "#94a3b8", // text-secondary
      disabled: "#64748b",  // text-muted
    },
    divider: "rgba(255, 255, 255, 0.06)",
  },
  typography: {
    fontFamily: '"Outfit", "Inter", "system-ui", "-apple-system", sans-serif',
    h1: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 600,
    },
    h3: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 600,
    },
    button: {
      textTransform: "none", // Avoid capitalization
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        },
        contained: {
          boxShadow: "0 4px 12px rgba(139, 92, 246, 0.25)",
          "&:hover": {
            boxShadow: "0 6px 16px rgba(139, 92, 246, 0.4)",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: "all 0.2s ease",
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: 10,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
          backgroundImage: "none", // Remove default overlay gradient in dark mode
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 10,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
          backgroundImage: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
});
