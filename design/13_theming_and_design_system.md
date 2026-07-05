# Technical Design: Theming & Design System Architecture

This document specifies the architecture for Kollab's global and workspace-level theming engine. It details how design tokens (colors, typography, shapes) are stored, injected into the React DOM, and inherited by native components and Shadow DOM macros.

---

## 1. Design Token Architecture & Presets

> [!NOTE]
> **Status:** 🟢 Implemented

Kollab utilizes a dynamic `ThemeEngine` that manages a suite of aesthetic presets (e.g., Default, Workbench, Editorial, Neobrutalism). These presets are defined in `src/theme/presets.ts`.

### 1.1 The `ThemePreset` Interface
Instead of defining raw hex codes individually, Kollab uses a structured `ThemePreset` object:

```typescript
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
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  cssVariables: Record<string, string>;
  muiOverrides: (mode: "light" | "dark") => ThemeOptions;
}
```

### 1.2 Hierarchical Resolution
1. **System Default**: The "Default (Glassmorphism)" preset is the baseline.
2. **User/Admin Evaluation**: An interactive `<ThemeEngine>` component wraps the application. The active theme ID is tracked in the Zustand `useAppStore` (`activeThemeId`), allowing instant aesthetic swapping.
3. **Workspace/Project Override (Planned)**: The active theme ID will be persisted to the database and fetched during application load.

---

## 2. CSS Custom Property Injection

> [!NOTE]
> **Status:** 🟢 Implemented

When the React application initializes, the `<ThemeEngine>` wrapper component fetches the resolved `ThemePreset` and dynamically injects it into the `:root` document as CSS Variables.

### 2.1 Dynamic Theme Swapping
The system listens to the active `themeMode` (light/dark) and the `activeThemeId`. Based on these, it resolves the MUI `ThemeOptions` and injects raw CSS variables for UI components (like the Tiptap editor) that live outside MUI's direct styling scope:

```javascript
// Inside ThemeEngine.tsx
const root = document.documentElement;
const activeColors = activePreset.colors[themeMode];

// Inject active palette based on light/dark mode
root.style.setProperty('--primary-color', activeColors.primary);
root.style.setProperty('--bg-color', activeColors.background);

// Inject static tokens (fonts, borders, shadows)
Object.entries(activePreset.cssVariables).forEach(([key, value]) => {
  root.style.setProperty(key, value);
});
```

---

## 3. Component & Macro Inheritance

> [!NOTE]
> **Status:** ⚪ Planned

All UI elements must utilize these CSS variables rather than hardcoded styles to ensure visual consistency.

### 3.1 Standard UI Components
Native React components (Buttons, Cards, Dialogs) consume these variables directly via CSS or Tailwind/MUI integrations.

```css
.action-button {
  background-color: var(--color-primary);
  border-radius: var(--shape-radius);
  font-family: var(--font-heading);
  color: var(--color-text-inverse);
}
```

> [!WARNING]
> **Hover Effects and Light Mode Compatibility:** Never hardcode absolute low-opacity white values (e.g., `backgroundColor: "rgba(255, 255, 255, 0.05)"`) for component hover or selected states. While these values create a faint highlight in dark mode, they add white to white in light mode, making buttons blindingly bright or invisible. Always use theme-aware MUI tokens like `"action.hover"` or injected CSS variables like `"var(--glass-bg)"` which automatically invert and adapt their opacities for the active theme mode.

### 3.2 Shadow DOM Macro Injection
Because external plugin scripts execute within an isolated Shadow DOM (`<macro-status-badge>`), they do not naturally inherit CSS variables from the `:root` document. 

To solve this, the Tiptap NodeView wrapper acts as a **Style Forwarder**:
1. The React wrapper creates the Shadow Root.
2. It explicitly injects a `<style>` block into the Shadow Root that proxies the current active CSS variables.

```javascript
const shadowStyle = document.createElement('style');
shadowStyle.textContent = `
  :host {
    --macro-primary: var(--color-primary);
    --macro-radius: var(--shape-radius);
    --macro-font: var(--font-body);
  }
`;
shadowRoot.appendChild(shadowStyle);
```

This ensures that even third-party plugins automatically conform to the workspace's rounded corners, typography, and dark-mode color palettes without requiring the plugin author to write custom themeing logic.
