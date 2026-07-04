import type { ThemeOptions } from '@mui/material/styles';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  paper: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accent: string;
  glassBg: string;
  glassBorder: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  
  // Colors for Light and Dark modes
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };

  // Static CSS Variables (fonts, borders, shadows)
  cssVariables: Record<string, string>;

  // MUI Theme Overrides
  muiOverrides: (mode: "light" | "dark") => ThemeOptions;
}
