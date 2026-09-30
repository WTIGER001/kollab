import { useQuery } from "@tanstack/react-query";
import { fetchOIDCConfig } from "../services/api";
import React, { useEffect, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useAppStore } from '../store/useAppStore';
import { readableForeground, readableOn } from './contrast';
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
    
    const surfaces = [activeColors.background, activeColors.paper];
    const accentBlue = themeMode === "dark" ? "#7dd3fc" : "#2563eb";
    // Base colors
    root.style.setProperty("--primary-color", activeColors.primary);
    root.style.setProperty("--primary-contrast", readableForeground(activeColors.primary));
    // Filled actions can use the primary color directly. Text links and
    // navigation affordances start as a mix toward the text color, then move
    // further toward it when a preset surface would otherwise fall below WCAG AA.
    root.style.setProperty(
      "--primary-text-color",
      readableOn(activeColors.primary, activeColors.textPrimary, surfaces, themeMode === "dark" ? 0.55 : 0.88),
    );
    root.style.setProperty(
      "--toolbar-text-color",
      readableOn(activeColors.textSecondary, activeColors.textPrimary, surfaces, 0.6),
    );
    root.style.setProperty("--secondary-color", activeColors.secondary);
    root.style.setProperty("--bg-color", activeColors.background);
    root.style.setProperty("--panel-color", activeColors.paper);
    root.style.setProperty("--text-primary", activeColors.textPrimary);
    root.style.setProperty("--text-secondary", activeColors.textSecondary);
    root.style.setProperty("--border-color", activeColors.border);
    root.style.setProperty("--accent-color", activeColors.accent);
    // Informational blue is used for compact labels and icons. A brighter sky
    // shade is needed on dark surfaces, while the light-mode shade retains
    // readable contrast on white cards.
    root.style.setProperty("--accent-blue", readableOn(accentBlue, activeColors.textPrimary, surfaces));
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
      ...overrides,
      palette: {
        ...overrides.palette,
        mode: resolvedMode,
        primary: { 
          main: activeColors.primary, 
          light: activeColors.primary, 
          dark: activeColors.primary, 
          contrastText: readableForeground(activeColors.primary)
        },
        secondary: { main: activeColors.secondary },
        background: { default: activeColors.background, paper: activeColors.paper },
        text: { primary: activeColors.textPrimary, secondary: activeColors.textSecondary },
        divider: activeColors.border,
      },
    });
  }, [activePreset, themeMode]);

  return (
    <ThemeProvider theme={muiTheme}>
      {children}
    </ThemeProvider>
  );
};
