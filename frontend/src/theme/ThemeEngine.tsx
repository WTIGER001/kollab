import React, { useEffect, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useAppStore } from '../store/useAppStore';
import { presets } from './presets';
import type { ThemePreset } from './types';

export const ThemeEngine: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeThemeId, themeMode } = useAppStore();

  const activePreset: ThemePreset = useMemo(() => {
    return presets.find(p => p.id === activeThemeId) || presets[0];
  }, [activeThemeId]);

  // Apply CSS Variables to the root element
  useEffect(() => {
    const root = document.documentElement;
    const activeColors = activePreset.colors[themeMode];
    
    // Base colors
    root.style.setProperty("--primary-color", activeColors.primary);
    root.style.setProperty("--secondary-color", activeColors.secondary);
    root.style.setProperty("--bg-color", activeColors.background);
    root.style.setProperty("--panel-color", activeColors.paper);
    root.style.setProperty("--text-primary", activeColors.textPrimary);
    root.style.setProperty("--text-secondary", activeColors.textSecondary);
    root.style.setProperty("--border-color", activeColors.border);
    root.style.setProperty("--accent-color", activeColors.accent);

    // Apply specific CSS variables from preset
    Object.entries(activePreset.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

  }, [activePreset, themeMode]);

  // Construct the MUI Theme
  const muiTheme = useMemo(() => {
    const overrides = activePreset.muiOverrides(themeMode);
    const activeColors = activePreset.colors[themeMode];
    
    // Resolve mode
    const resolvedMode = overrides.palette?.mode || themeMode;

    return createTheme({
      palette: {
        mode: resolvedMode,
        primary: { 
          main: activeColors.primary, 
          light: activeColors.primary, 
          dark: activeColors.primary, 
          contrastText: resolvedMode === 'light' ? "#ffffff" : "#ffffff"
        },
        secondary: { main: activeColors.secondary },
        background: { default: activeColors.background, paper: activeColors.paper },
        text: { primary: activeColors.textPrimary, secondary: activeColors.textSecondary },
        divider: activeColors.border,
      },
      ...overrides,
    });
  }, [activePreset, themeMode]);

  return (
    <ThemeProvider theme={muiTheme}>
      {children}
    </ThemeProvider>
  );
};
