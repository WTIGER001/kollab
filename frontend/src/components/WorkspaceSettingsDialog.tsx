import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Tabs,
  Tab,
  TextField,
  Button,
  Typography,
  IconButton
} from "@mui/material";
import { X, Sparkles } from "lucide-react";
import type { ColorScheme, WorkspaceTheme } from "../services/api";

interface WorkspaceSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  currentTheme: WorkspaceTheme | null;
  onSave: (name: string, logoUrl: string, lightMode: ColorScheme, darkMode: ColorScheme) => void;
}

export const WorkspaceSettingsDialog: React.FC<WorkspaceSettingsDialogProps> = ({
  open,
  onClose,
  currentTheme,
  onSave
}) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  
  // Color scheme state defaults (based on Tailwind/harmony palettes)
  const [lightColors, setLightColors] = useState<ColorScheme>({
    primary: "#8b5cf6",
    secondary: "#6366f1",
    background: "#f8fafc",
    paper: "#ffffff",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    border: "#e2e8f0",
    accent: "#3b82f6"
  });

  const [darkColors, setDarkColors] = useState<ColorScheme>({
    primary: "#8b5cf6",
    secondary: "#6366f1",
    background: "#0b0c10",
    paper: "#161824",
    textPrimary: "#ffffff",
    textSecondary: "#94a3b8",
    border: "#1e293b",
    accent: "#3b82f6"
  });

  // Load current theme values when open
  useEffect(() => {
    if (open && currentTheme) {
      setName(currentTheme.name);
      setLogoUrl(currentTheme.logoUrl || "");
      if (currentTheme.lightMode) setLightColors(currentTheme.lightMode);
      if (currentTheme.darkMode) setDarkColors(currentTheme.darkMode);
    }
  }, [open, currentTheme]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleSave = () => {
    onSave(name, logoUrl, lightColors, darkColors);
    onClose();
  };

  const renderColorInput = (
    label: string, 
    key: keyof ColorScheme, 
    colors: ColorScheme, 
    setColors: React.Dispatch<React.SetStateAction<ColorScheme>>
  ) => {
    const value = colors[key];

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, display: "block", mb: 0.5 }}>
          {label}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <input
            type="color"
            value={value}
            onChange={(e) => setColors(prev => ({ ...prev, [key]: e.target.value }))}
            style={{
              width: 38,
              height: 38,
              padding: 0,
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              backgroundColor: "transparent",
              cursor: "pointer"
            }}
          />
          <TextField
            size="small"
            value={value}
            onChange={(e) => setColors(prev => ({ ...prev, [key]: e.target.value }))}
            fullWidth
            slotProps={{
              htmlInput: {
                style: {
                  fontSize: "12px",
                  fontFamily: "monospace",
                }
              }
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "action.hover",
                "& fieldset": { borderColor: "var(--border-color)" },
                "&:hover fieldset": { borderColor: "primary.main" }
              }
            }}
          />
        </Box>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            backgroundColor: "background.paper",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--border-color)",
            color: "text.primary",
            borderRadius: 3,
            boxShadow: "var(--shadow-premium)"
          }
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 3, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ p: 0.75, borderRadius: 1.5, backgroundColor: "color-mix(in srgb, var(--primary-color) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)", display: "flex" }}>
            <Sparkles size={16} style={{ color: "var(--accent-purple)" }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', letterSpacing: "-0.01em" }}>
            Workspace Settings
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "text.disabled", "&:hover": { color: "text.primary" } }}>
          <X size={16} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          sx={{
            borderBottom: "1px solid var(--border-color)",
            px: 2,
            "& .MuiTab-root": {
              color: "text.disabled",
              fontSize: "12.5px",
              fontWeight: 600,
              textTransform: "none",
              py: 2,
              minWidth: 100,
              "&.Mui-selected": { color: "primary.light" }
            },
            "& .MuiTabs-indicator": { backgroundColor: "primary.light" }
          }}
        >
          <Tab label="General Settings" />
          <Tab label="Light Palette Editor" />
          <Tab label="Dark Palette Editor" />
        </Tabs>

        <Box sx={{ p: 4 }}>
          {tabIndex === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <TextField
                label="Workspace Branding Name"
                placeholder="e.g. Arkloud"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                slotProps={{
                  inputLabel: { style: { fontSize: "13px" } },
                  htmlInput: { style: { fontSize: "13.5px" } }
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "var(--border-color)" },
                    "&:hover fieldset": { borderColor: "primary.main" }
                  }
                }}
              />

              <TextField
                label="Branding Logo URL (Optional)"
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                fullWidth
                slotProps={{
                  inputLabel: { style: { fontSize: "13px" } },
                  htmlInput: { style: { fontSize: "13.5px" } }
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "var(--border-color)" },
                    "&:hover fieldset": { borderColor: "primary.main" }
                  }
                }}
              />
            </Box>
          )}

          {tabIndex === 1 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
              <Box>
                {renderColorInput("Primary Accent Brand Color", "primary", lightColors, setLightColors)}
                {renderColorInput("Secondary Accent Color", "secondary", lightColors, setLightColors)}
                {renderColorInput("Background Base Color", "background", lightColors, setLightColors)}
                {renderColorInput("Paper Component Color", "paper", lightColors, setLightColors)}
              </Box>
              <Box>
                {renderColorInput("Primary Body Text Color", "textPrimary", lightColors, setLightColors)}
                {renderColorInput("Secondary/Muted Text Color", "textSecondary", lightColors, setLightColors)}
                {renderColorInput("Border & Line Color", "border", lightColors, setLightColors)}
                {renderColorInput("Special Highlight Accent", "accent", lightColors, setLightColors)}
              </Box>
            </Box>
          )}

          {tabIndex === 2 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
              <Box>
                {renderColorInput("Primary Accent Brand Color", "primary", darkColors, setDarkColors)}
                {renderColorInput("Secondary Accent Color", "secondary", darkColors, setDarkColors)}
                {renderColorInput("Background Base Color", "background", darkColors, setDarkColors)}
                {renderColorInput("Paper Component Color", "paper", darkColors, setDarkColors)}
              </Box>
              <Box>
                {renderColorInput("Primary Body Text Color", "textPrimary", darkColors, setDarkColors)}
                {renderColorInput("Secondary/Muted Text Color", "textSecondary", darkColors, setDarkColors)}
                {renderColorInput("Border & Line Color", "border", darkColors, setDarkColors)}
                {renderColorInput("Special Highlight Accent", "accent", darkColors, setDarkColors)}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0, borderTop: "1px solid var(--border-color)", display: "flex", gap: 1.5 }}>
        <Button
          onClick={onClose}
          sx={{
            color: "text.secondary",
            fontSize: "12px",
            fontWeight: 600,
            textTransform: "none",
            "&:hover": { backgroundColor: "action.hover" }
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{
            py: 1,
            px: 3,
            fontSize: "12px",
            fontWeight: 700,
            bgcolor: "primary.main",
            borderRadius: "6px",
            textTransform: "none",
            boxShadow: "0 4px 12px rgba(139, 92, 246, 0.2)",
            "&:hover": { bgcolor: "primary.dark" }
          }}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};
