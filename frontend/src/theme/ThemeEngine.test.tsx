import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { useTheme } from "@mui/material/styles";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../store/useAppStore";
import { contrastRatio, readableForeground, readableOn } from "./contrast";
import { ThemeEngine } from "./ThemeEngine";
import { presets } from "./presets";

vi.mock("../services/api", () => ({
  fetchOIDCConfig: vi.fn().mockResolvedValue({ theme: null }),
}));

const ThemeProbe = () => {
  const theme = useTheme();
  return <output>{`${theme.palette.primary.main}|${theme.palette.primary.contrastText}`}</output>;
};

const renderThemeEngine = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ThemeEngine><ThemeProbe /></ThemeEngine>
  </QueryClientProvider>,
);

describe("ThemeEngine", () => {
  beforeEach(() => {
    useAppStore.setState({ activeThemeId: "default", themeMode: "dark" });
  });

  afterEach(() => {
    ["--bg-color", "--panel-color", "--text-secondary", "--accent-blue", "--primary-text-color", "--toolbar-text-color"].forEach((property) => {
      document.documentElement.style.removeProperty(property);
    });
  });

  it("uses softer default dark surfaces and a high-contrast informational blue", async () => {
    renderThemeEngine();

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--bg-color")).toBe("#15171c");
    });
    expect(document.documentElement.style.getPropertyValue("--panel-color")).toBe("#20232b");
    expect(document.documentElement.style.getPropertyValue("--text-secondary")).toBe("#cbd5e1");
    expect(document.documentElement.style.getPropertyValue("--accent-blue")).toBe("#7dd3fc");
    expect(document.documentElement.style.getPropertyValue("--primary-text-color")).toMatch(/^#[0-9a-f]{6}$/);
    expect(document.documentElement.style.getPropertyValue("--toolbar-text-color")).toMatch(/^#[0-9a-f]{6}$/);
    expect(screen.getByText("#5b5bd6|#ffffff")).toBeInTheDocument();
  });

  it("uses a readable blue on light surfaces", async () => {
    useAppStore.setState({ themeMode: "light" });
    renderThemeEngine();

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--accent-blue")).toBe("#2563eb");
    });
  });

  it.each(presets.flatMap((preset) => (["light", "dark"] as const).map((mode) => [preset.id, mode] as const)))(
    "keeps %s %s primary labels and toolbar text distinct from the page",
    async (presetId, mode) => {
      useAppStore.setState({ activeThemeId: presetId, themeMode: mode });
      renderThemeEngine();

      const preset = presets.find((item) => item.id === presetId)!;
      const colors = preset.colors[mode];
      await waitFor(() => {
        expect(document.documentElement.style.getPropertyValue("--primary-color")).toBe(colors.primary);
      });
      expect(document.documentElement.style.getPropertyValue("--bg-color")).toBe(colors.background);
      const surfaces = [colors.background, colors.paper];
      const primaryText = document.documentElement.style.getPropertyValue("--primary-text-color");
      const toolbarText = document.documentElement.style.getPropertyValue("--toolbar-text-color");
      const accent = document.documentElement.style.getPropertyValue("--accent-blue");
      expect(document.documentElement.style.getPropertyValue("--primary-contrast")).toBe(readableForeground(colors.primary));
      for (const color of [primaryText, toolbarText, accent]) {
        expect(contrastRatio(color, colors.background)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(color, colors.paper)).toBeGreaterThanOrEqual(4.5);
      }
      expect(primaryText).toBe(readableOn(colors.primary, colors.textPrimary, surfaces, mode === "dark" ? 0.55 : 0.88));
      expect(screen.getByRole("status").textContent).toBe(`${colors.primary}|${readableForeground(colors.primary)}`);
    },
  );
});
