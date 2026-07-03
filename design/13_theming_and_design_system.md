# Technical Design: Theming & Design System Architecture

This document specifies the architecture for Kollab's global and workspace-level theming engine. It details how design tokens (colors, typography, shapes) are stored, injected into the React DOM, and inherited by native components and Shadow DOM macros.

---

## 1. Design Token Architecture

> [!NOTE]
> **Status:** ⚪ Planned

Instead of defining raw hex codes individually, Kollab uses a structured `ThemeConfig` JSON payload. This allows for centralized control over the look and feel of the entire platform or specific workspaces.

### 1.1 The `ThemeConfig` Payload
The database stores this configuration as a `JSONB` column on the `workspaces` and `projects` tables.

```json
{
  "palette": {
    "light": {
      "primary": "#3b82f6",
      "secondary": "#8b5cf6",
      "background": "#ffffff",
      "surface": "#f8fafc",
      "text": "#0f172a"
    },
    "dark": {
      "primary": "#60a5fa",
      "secondary": "#a78bfa",
      "background": "#0f172a",
      "surface": "#1e293b",
      "text": "#f8fafc"
    }
  },
  "typography": {
    "headingFontFamily": "\"Inter\", sans-serif",
    "bodyFontFamily": "\"Roboto\", sans-serif",
    "monospaceFontFamily": "\"JetBrains Mono\", monospace"
  },
  "shape": {
    "borderRadius": "8px" // 0px for sharp, 9999px for pill
  }
}
```

### 1.2 Hierarchical Resolution
1. **System Default**: Hardcoded baseline theme.
2. **Workspace Override**: Administrators can set a theme for the entire team space.
3. **Project Override**: Specific projects (e.g., a public Help Center) can define a custom theme that overrides the workspace theme.

---

## 2. CSS Custom Property Injection

> [!NOTE]
> **Status:** ⚪ Planned

When the React application initializes, a `ThemeProvider` context fetches the resolved `ThemeConfig` and dynamically injects it into the `:root` pseudo-class as CSS Variables.

### 2.1 Dynamic Theme Swapping
The system listens to the user's `prefers-color-scheme` or manual toggle. Based on the active mode, it maps the correct palette variants (light or dark) to the active variables:

```javascript
// Example Injection Logic
const root = document.documentElement;

// Inject active palette
root.style.setProperty('--color-primary', activeTheme.primary);
root.style.setProperty('--color-background', activeTheme.background);
root.style.setProperty('--color-text', activeTheme.text);

// Inject static tokens
root.style.setProperty('--font-heading', config.typography.headingFontFamily);
root.style.setProperty('--shape-radius', config.shape.borderRadius);
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
