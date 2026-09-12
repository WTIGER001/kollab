import { useQuery } from "@tanstack/react-query";
import { fetchOIDCConfig } from "../services/api";
import React, { useEffect, useMemo } from 'react';
import { ThemeProvider, createTheme, getContrastRatio } from '@mui/material/styles';
import { useAppStore } from '../store/useAppStore';
import { presets } from './presets';
import type { ThemePreset } from './types';

export const ThemeEngine: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeThemeId, themeMode } = useAppStore();

  const { data: workspaceConfig } = useQuery({ queryKey: ["oidcConfig"], queryFn: fetchOIDCConfig });
  const activePreset: ThemePreset = useMemo(() => {
    const preset = presets.find(p => p.id === activeThemeId) || presets[0];
    const saved = workspaceConfig?.theme;
    if (preset.id !== "default" || !saved) return preset;
    return { ...preset, colors: { light: { ...preset.colors.light, ...saved.lightMode }, dark: { ...preset.colors.dark, ...saved.darkMode } } };
  }, [activeThemeId, workspaceConfig?.theme]);

  // Apply CSS Variables to the root element
  useEffect(() => {
    const root = document.documentElement;
    const activeColors = activePreset.colors[themeMode];
    
    // Base colors
    root.style.setProperty("--primary-color", activeColors.primary);
    root.style.setProperty("--primary-contrast", getContrastRatio(activeColors.primary, "#ffffff") >= 4.5 ? "#ffffff" : "#111111");
    root.style.setProperty("--secondary-color", activeColors.secondary);
    root.style.setProperty("--bg-color", activeColors.background);
    root.style.setProperty("--panel-color", activeColors.paper);
    root.style.setProperty("--text-primary", activeColors.textPrimary);
    root.style.setProperty("--text-secondary", activeColors.textSecondary);
    root.style.setProperty("--border-color", activeColors.border);
    root.style.setProperty("--accent-color", activeColors.accent);
    root.style.setProperty("--glass-bg", activeColors.glassBg);
    root.style.setProperty("--glass-border", activeColors.glassBorder);
    root.style.colorScheme = themeMode;

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
          contrastText: getContrastRatio(activeColors.primary, "#ffffff") >= 4.5 ? "#ffffff" : "#111111"
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
