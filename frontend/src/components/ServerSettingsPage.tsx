import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  Divider
} from "@mui/material";
import type { ColorScheme, WorkspaceTheme, SystemSettings } from "../services/api";
import { downloadBackup, restoreBackup } from "../services/api";
import { IntegrationsManager } from "./IntegrationsManager";
import { useAppStore } from "../store/useAppStore";
import { presets } from "../theme/presets";
import { ThemeSelector } from "./ThemeSelector";
import { SyncTransferPanel } from "./SyncTransferPanel";
import { LogoSelector } from "./LogoSelector";

interface ServerSettingsPageProps {
  currentTheme: WorkspaceTheme | null;
  onSave: (name: string, logoUrl: string, lightMode: ColorScheme, darkMode: ColorScheme) => void | Promise<void>;
  systemSettings: SystemSettings | null;
  onSaveSettings: (settings: SystemSettings) => Promise<void>;
  onBack: () => void;
  showToast: (message: string, severity: "success" | "error" | "info" | "warning") => void;
  section?: "general" | "appearance" | "retention" | "previews" | "backups" | "authentication" | "integrations";
}

const themeVariableOr = (value: string | undefined, fallback: string) =>
  value?.startsWith("var(--") ? value : fallback;

const sectionTitles = {
  general: "General",
  appearance: "Appearance",
  retention: "Audit & retention",
  previews: "Document previews",
  backups: "Backup & sync",
  authentication: "Authentication",
  integrations: "Integrations",
} as const;

export const ServerSettingsPage: React.FC<ServerSettingsPageProps> = ({
  currentTheme,
  onSave,
  systemSettings,
  onSaveSettings,
  onBack,
  showToast,
  section = "general",
}) => {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  
  const { activeThemeId, setActiveThemeId, themeMode } = useAppStore();

  // Audit settings states
  const [policy, setPolicy] = useState("forever");
  const [customDays, setCustomDays] = useState(30);
  const [destination, setDestination] = useState("postgres");
  const [trashPolicy, setTrashPolicy] = useState("forever");
  const [trashCustomDays, setTrashCustomDays] = useState(30);

  // New settings states
  const [welcomeTitle, setWelcomeTitle] = useState("Welcome to Kollab");
  const [welcomeText, setWelcomeText] = useState("Your workspace for shared notes, plans, and knowledge.");
  const [authLogoUrl, setAuthLogoUrl] = useState("");
  const [authLogoSize, setAuthLogoSize] = useState("Medium");
  const [authLegalDisclaimer, setAuthLegalDisclaimer] = useState("");
  const [authLoginButtonText, setAuthLoginButtonText] = useState("Log In to Workspace");
  const [aiRateLimit, setAiRateLimit] = useState(10);
  const [asposeEnabled, setAsposeEnabled] = useState(true);
  const [asposeLicense, setAsposeLicense] = useState("");
  const [classificationBannerEnabled, setClassificationBannerEnabled] = useState(false);
  const [classificationBannerText, setClassificationBannerText] = useState("UNCLASSIFIED");
  const [classificationBannerBgColor, setClassificationBannerBgColor] = useState("var(--primary-color)");
  const [classificationBannerTextColor, setClassificationBannerTextColor] = useState("var(--bg-color)");
  const effectiveBannerBgColor = themeVariableOr(classificationBannerBgColor, "var(--primary-color)");
  const effectiveBannerTextColor = themeVariableOr(classificationBannerTextColor, "var(--bg-color)");

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

  // Load current theme values and system settings when mounted or changed
  useEffect(() => {
    if (currentTheme) {
      setName(currentTheme.name);
      setLogoUrl(currentTheme.logoUrl || "");
      if (currentTheme.lightMode) setLightColors(currentTheme.lightMode);
      if (currentTheme.darkMode) setDarkColors(currentTheme.darkMode);
    }
    if (systemSettings) {
      setPolicy(systemSettings.auditRetentionPolicy);
      setCustomDays(systemSettings.auditRetentionCustomDays);
      setDestination(systemSettings.auditLogDestination);
      setTrashPolicy(systemSettings.trashRetentionPolicy || "forever");
      setTrashCustomDays(systemSettings.trashRetentionCustomDays || 30);
      setWelcomeTitle(systemSettings.welcomeTitle || "Welcome to Kollab");
      setWelcomeText(systemSettings.welcomeText || "Your workspace for shared notes, plans, and knowledge.");
      setAuthLogoUrl(systemSettings.authLogoUrl || "");
      setAuthLogoSize(systemSettings.authLogoSize || "Medium");
      setAuthLegalDisclaimer(systemSettings.authLegalDisclaimer || "");
      setAuthLoginButtonText(systemSettings.authLoginButtonText || "Log In to Workspace");
      setAiRateLimit(systemSettings.aiRateLimit || 10);
      setAsposeEnabled(systemSettings.asposeEnabled !== false);
      setAsposeLicense(systemSettings.asposeLicense || "");
      setClassificationBannerEnabled(!!systemSettings.classificationBannerEnabled);
      setClassificationBannerText(systemSettings.classificationBannerText || "UNCLASSIFIED");
      setClassificationBannerBgColor(themeVariableOr(systemSettings.classificationBannerBgColor, "var(--primary-color)"));
      setClassificationBannerTextColor(themeVariableOr(systemSettings.classificationBannerTextColor, "var(--bg-color)"));
    }
  }, [currentTheme, systemSettings]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(name, logoUrl, lightColors, darkColors);
      await onSaveSettings({
        auditRetentionPolicy: policy,
        auditRetentionCustomDays: customDays,
        auditLogDestination: destination,
        trashRetentionPolicy: trashPolicy,
        trashRetentionCustomDays: trashCustomDays,
        welcomeTitle: welcomeTitle,
        welcomeText: welcomeText,
        authLogoUrl: authLogoUrl,
        authLogoSize: authLogoSize,
        authLegalDisclaimer: authLegalDisclaimer,
        authLoginButtonText: authLoginButtonText,
        aiRateLimit: aiRateLimit,
        asposeEnabled: asposeEnabled,
        asposeLicense: asposeLicense,
        classificationBannerEnabled: classificationBannerEnabled,
        classificationBannerText: classificationBannerText,
        classificationBannerBgColor: effectiveBannerBgColor,
        classificationBannerTextColor: effectiveBannerTextColor
      });
      showToast("Server settings saved successfully", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to save server settings", "error");
    } finally {
      setIsSaving(false);
    }
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
    <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", bgcolor: "var(--bg-color)", color: "var(--text-primary)" }}>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between", gap: 2, px: { xs: 2, md: 4 }, py: 2, flexShrink: 0, borderBottom: "1px solid var(--border-color)" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: "var(--text-secondary)", fontSize: "12px", mb: 0.25 }}>Server Settings</Typography>
          <Typography component="h1" variant="h5" sx={{ fontSize: { xs: "22px", md: "26px" }, fontWeight: 800, overflowWrap: "anywhere" }}>{sectionTitles[section]}</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, flexShrink: 0 }}>
          <Button
            onClick={onBack}
            disabled={isSaving}
            sx={{
              minHeight: 44,
              color: "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 600,
              textTransform: "none",
              "&:hover": { backgroundColor: "var(--glass-bg)" }
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving}
            sx={{
              minHeight: 44, flex: { xs: 1, sm: "none" }, whiteSpace: "nowrap", color: "var(--primary-contrast)",
              py: 1,
              px: 3,
              fontSize: "13px",
              fontWeight: 700,
              bgcolor: "var(--primary-color)",
              borderRadius: "6px",
              textTransform: "none",
              boxShadow: "var(--shadow-button)",
              "&:hover": { bgcolor: "var(--secondary-color)" }
            }}
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflowY: "auto", overscrollBehavior: "contain", pb: "max(24px, env(safe-area-inset-bottom))", p: { xs: 2, md: 5 }, maxWidth: "1000px", width: "100%" }}>
        {section === "general" && (
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

            <LogoSelector
              label="Branding Logo URL (Optional)"
              value={logoUrl}
              onChange={setLogoUrl}
              scope="system"
            />


            <TextField
              label="AI Assistant Global Rate Limit (requests/min)"
              type="number"
              value={aiRateLimit}
              onChange={(e) => setAiRateLimit(parseInt(e.target.value) || 10)}
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

            <Divider sx={{ my: 1 }} />

            {/* Security Classification Top Banner Card */}
            <Box sx={{ p: 3, border: "1px solid var(--border-color)", borderRadius: 2, bgcolor: "var(--glass-bg)" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>
                    Security Classification Banner
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Display an optional thin classification banner across the top of all pages (e.g., UNCLASSIFIED, PROPRIETARY, RESTRICTED).
                  </Typography>
                </Box>
                <Switch
                  slotProps={{ input: { "aria-label": "Enable Security Classification Banner" } }}
                  checked={classificationBannerEnabled}
                  onChange={(e) => setClassificationBannerEnabled(e.target.checked)}
                  color="primary"
                />
              </Box>

              {classificationBannerEnabled && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
                  {/* Banner Presets */}
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 1 }}>
                      QUICK PRESETS
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setClassificationBannerText("UNCLASSIFIED");
                          setClassificationBannerBgColor("var(--primary-color)");
                          setClassificationBannerTextColor("var(--bg-color)");
                        }}
                        sx={{ borderColor: "var(--primary-color)", color: "var(--primary-color)", fontWeight: 700 }}
                      >
                        🟢 UNCLASSIFIED
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setClassificationBannerText("COMPANY PROPRIETARY");
                          setClassificationBannerBgColor("var(--accent-color)");
                          setClassificationBannerTextColor("var(--bg-color)");
                        }}
                        sx={{ borderColor: "var(--accent-color)", color: "var(--accent-color)", fontWeight: 700 }}
                      >
                        🟡 PROPRIETARY
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setClassificationBannerText("CONFIDENTIAL");
                          setClassificationBannerBgColor("var(--secondary-color)");
                          setClassificationBannerTextColor("var(--bg-color)");
                        }}
                        sx={{ borderColor: "var(--secondary-color)", color: "var(--secondary-color)", fontWeight: 700 }}
                      >
                        🟠 CONFIDENTIAL
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setClassificationBannerText("RESTRICTED / SECRET");
                          setClassificationBannerBgColor("var(--text-primary)");
                          setClassificationBannerTextColor("var(--bg-color)");
                        }}
                        sx={{ borderColor: "var(--text-primary)", color: "var(--text-primary)", fontWeight: 700 }}
                      >
                        🔴 RESTRICTED
                      </Button>
                    </Box>
                  </Box>

                  {/* Banner Text & Theme Tokens */}
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "2fr 1fr 1fr" }, gap: 2 }}>
                    <TextField
                      label="Classification Text"
                      value={classificationBannerText}
                      onChange={(e) => setClassificationBannerText(e.target.value)}
                      placeholder="UNCLASSIFIED"
                      size="small"
                    />
                    <TextField
                      label="Background theme variable"
                      value={classificationBannerBgColor}
                      onChange={(e) => setClassificationBannerBgColor(e.target.value)}
                      helperText="Example: var(--primary-color)"
                      size="small"
                    />
                    <TextField
                      label="Text theme variable"
                      value={classificationBannerTextColor}
                      onChange={(e) => setClassificationBannerTextColor(e.target.value)}
                      helperText="Example: var(--bg-color)"
                      size="small"
                    />
                  </Box>

                  {/* Banner Live Preview */}
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 1 }}>
                      LIVE PREVIEW
                    </Typography>
                    <Box
                      sx={{
                        width: "100%",
                        height: 26,
                        backgroundColor: effectiveBannerBgColor,
                        color: effectiveBannerTextColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "12px",
                        letterSpacing: "1.5px",
                        borderRadius: "var(--border-radius-card)",
                        textTransform: "uppercase"
                      }}
                    >
                      {classificationBannerText || "UNCLASSIFIED"}
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {section === "appearance" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {/* Theme Engine Section */}
            <Box>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>
                Dynamic Theme Engine
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                Choose an appearance preset for this browser. The selected style applies throughout the application.
              </Typography>
              <ThemeSelector 
                activeThemeId={activeThemeId}
                onSelectTheme={setActiveThemeId}
                themeMode={themeMode}
                presets={presets}
              />
            </Box>

            <Divider />

            {/* Custom Palette Overrides */}
            <Box>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>
                Custom Palette Overrides
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                Save workspace colors for Light and Dark modes. These colors apply when the Default preset is selected.
              </Typography>
              
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" }, gap: 4 }}>
                {/* Light Palette */}
                <Box sx={{ p: 3, border: "1px solid var(--border-color)", borderRadius: 2, bgcolor: "var(--glass-bg)" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, color: "text.primary" }}>
                    Light Mode Overrides
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {renderColorInput("Primary Theme Highlight", "primary", lightColors, setLightColors)}
                    {renderColorInput("Secondary Theme Color", "secondary", lightColors, setLightColors)}
                    {renderColorInput("Brand Accent Callout", "accent", lightColors, setLightColors)}
                    {renderColorInput("Body Background Canvas", "background", lightColors, setLightColors)}
                    {renderColorInput("Paper Component Background", "paper", lightColors, setLightColors)}
                    {renderColorInput("Primary Text Font Color", "textPrimary", lightColors, setLightColors)}
                    {renderColorInput("Secondary Label Font Color", "textSecondary", lightColors, setLightColors)}
                    {renderColorInput("Border Grid lines Color", "border", lightColors, setLightColors)}
                  </Box>
                </Box>

                {/* Dark Palette */}
                <Box sx={{ p: 3, border: "1px solid var(--border-color)", borderRadius: 2, bgcolor: "var(--glass-bg)" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, color: "text.primary" }}>
                    Dark Mode Overrides
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {renderColorInput("Primary Theme Highlight", "primary", darkColors, setDarkColors)}
                    {renderColorInput("Secondary Theme Color", "secondary", darkColors, setDarkColors)}
                    {renderColorInput("Brand Accent Callout", "accent", darkColors, setDarkColors)}
                    {renderColorInput("Body Background Canvas", "background", darkColors, setDarkColors)}
                    {renderColorInput("Paper Component Background", "paper", darkColors, setDarkColors)}
                    {renderColorInput("Primary Text Font Color", "textPrimary", darkColors, setDarkColors)}
                    {renderColorInput("Secondary Label Font Color", "textSecondary", darkColors, setDarkColors)}
                    {renderColorInput("Border Grid lines Color", "border", darkColors, setDarkColors)}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {section === "retention" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Audit Log Panel */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "text.primary" }}>
                Audit Log Retention Policy
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                Configure how long page viewing and modification history is archived. High-security compliance environments should use the "forever" setting.
              </Typography>

              <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                <FormControl size="small" sx={{ minWidth: 0, width: { xs: "100%", sm: 240 } }}>
                  <InputLabel id="audit-policy-label">Retention Policy</InputLabel>
                  <Select
                    labelId="audit-policy-label"
                    value={policy}
                    label="Retention Policy"
                    onChange={(e) => setPolicy(e.target.value)}
                  >
                    <MenuItem value="forever">Archive Forever</MenuItem>
                    <MenuItem value="30days">30 Days</MenuItem>
                    <MenuItem value="90days">90 Days</MenuItem>
                    <MenuItem value="custom">Custom Days Limit</MenuItem>
                  </Select>
                </FormControl>

                {policy === "custom" && (
                  <TextField
                    size="small"
                    label="Days to Retain"
                    type="number"
                    value={customDays}
                    onChange={(e) => setCustomDays(parseInt(e.target.value) || 30)}
                    sx={{ width: 120 }}
                  />
                )}
              </Box>
            </Box>

            {/* Trash Retention Panel */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "text.primary" }}>
                Trash Bin Pruning Policy
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                Configure how long deleted pages remain in the Trash Bin before they are permanently purged from the server database.
              </Typography>

              <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                <FormControl size="small" sx={{ minWidth: 0, width: { xs: "100%", sm: 240 } }}>
                  <InputLabel id="trash-policy-label">Pruning Policy</InputLabel>
                  <Select
                    labelId="trash-policy-label"
                    value={trashPolicy}
                    label="Pruning Policy"
                    onChange={(e) => setTrashPolicy(e.target.value)}
                  >
                    <MenuItem value="forever">Keep Deleted Pages Forever</MenuItem>
                    <MenuItem value="30days">Prune After 30 Days</MenuItem>
                    <MenuItem value="90days">Prune After 90 Days</MenuItem>
                    <MenuItem value="custom">Custom Days Limit</MenuItem>
                  </Select>
                </FormControl>

                {trashPolicy === "custom" && (
                  <TextField
                    size="small"
                    label="Days to Retain"
                    type="number"
                    value={trashCustomDays}
                    onChange={(e) => setTrashCustomDays(parseInt(e.target.value) || 30)}
                    sx={{ width: 120 }}
                  />
                )}
              </Box>
            </Box>

            <Divider sx={{ borderColor: "var(--border-color)" }} />

            {/* Storage Destinations Panel */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "text.primary" }}>
                Audit Storage Target Destination
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                Route compliance log telemetry to local database tables or stream them off-host to cloud SIEM analytics pipelines.
              </Typography>

              <Box sx={{ maxWidth: 400 }}>
                <FormControl size="small" fullWidth>
                  <Select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  >
                    <MenuItem value="postgres">PostgreSQL Partitioned Database Table (Default)</MenuItem>
                    <MenuItem value="file" disabled>External File Storage (Eventually)</MenuItem>
                    <MenuItem value="cloudwatch" disabled>AWS CloudWatch / Cloud Logging (Eventually)</MenuItem>
                    <MenuItem value="azure" disabled>Azure Log Analytics (Eventually)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Box>
        )}

        {section === "previews" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "text.primary" }}>
                Aspose Media Preview Engine
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                Enable or disable the high-fidelity Aspose conversion library for Office documents (Word, Excel, PowerPoint) and apply your commercial license key.
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, bgcolor: "action.hover", borderRadius: "6px", border: "1px solid var(--border-color)", mb: 3 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Enable Aspose Office Previews
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    When disabled, Kollab falls back to basic LibreOffice PDF rendering.
                  </Typography>
                </Box>
                <Switch
                  slotProps={{ input: { "aria-label": "Enable document previews" } }}
                  checked={asposeEnabled}
                  onChange={(e) => setAsposeEnabled(e.target.checked)}
                  color="primary"
                />
              </Box>
            </Box>

            {asposeEnabled && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "text.primary" }}>
                  Aspose License XML Key
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                  Paste your XML license file content or Base64 encoded string here. If blank, Aspose operates in evaluation mode with watermarks.
                </Typography>
                <TextField
                  multiline
                  rows={6}
                  placeholder="<License>...</License>"
                  value={asposeLicense}
                  onChange={(e) => setAsposeLicense(e.target.value)}
                  fullWidth
                  slotProps={{
                    htmlInput: { style: { fontFamily: "monospace", fontSize: "12px" } }
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
            )}
          </Box>
        )}

        {section === "backups" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "text.primary" }}>
                Full-server backup & restore
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2.5 }}>
                Export the entire Kollab server state (including database seed JSON and all uploaded attachment media) as a single portable ZIP archive, or restore a previously saved backup file.
              </Typography>

              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 3 }}>
                <Button
                  variant="contained"
                  onClick={async () => {
                    try {
                      const blob = await downloadBackup();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `kollab_backup_${new Date().toISOString().slice(0, 10)}.zip`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error("Backup failed:", err);
                      alert("Backup failed: " + (err instanceof Error ? err.message : String(err)));
                    }
                  }}
                  sx={{ textTransform: "none", bgcolor: "var(--primary-color)", color: "#fff", "&:hover": { bgcolor: "var(--primary-dark)" } }}
                >
                  Export Full Server Backup ZIP
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".zip";
                    input.onchange = async (e: any) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      if (!window.confirm("Restore this backup? This replaces the installation's current data and uploads. Keep a current backup before continuing.")) return;
                      formData.append("backup", file);
                      try {
                        const data = await restoreBackup(formData);
                        alert(data.message || "Backup restored successfully!");
                      } catch (err) {
                        alert("Restore failed: " + (err instanceof Error ? err.message : String(err)));
                      }
                    };
                    input.click();
                  }}
                  sx={{ textTransform: "none" }}
                >
                  Upload & Restore Backup ZIP
                </Button>
              </Box>
            </Box>

            <Divider sx={{ borderColor: "var(--border-color)", borderStyle: "dashed" }} />

            <Box sx={{ color: "var(--text-primary)" }}><Typography variant="h6">Restore a team or project from another server</Typography><Typography sx={{ color: "var(--text-secondary)", my: 1 }}>Create a new destination and import a portable team or project archive while preserving existing spaces.</Typography><Button component="a" href="/_admin/transfers" sx={{ color: "var(--primary-color)" }}>Open team & project transfer</Button></Box>
            <SyncTransferPanel />
          </Box>
        )}
        {section === "authentication" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Typography variant="h6" sx={{ color: "text.primary", fontWeight: 600 }}>
              Authentication Screen Branding
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Customize the public login screen for your users. If any field is left blank, it will not be displayed.
            </Typography>

            <LogoSelector
              label="Auth Logo URL"
              value={authLogoUrl}
              onChange={setAuthLogoUrl}
              scope="system"
            />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Logo Height
              </Typography>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                <Select
                  value={["Small", "Medium", "Large"].includes(authLogoSize) ? authLogoSize : "Custom"}
                  onChange={(e) => setAuthLogoSize(e.target.value === "Custom" ? "150" : e.target.value)}
                  size="small"
                  sx={{
                    width: { xs: "100%", sm: 200 },
                    backgroundColor: "var(--bg-color)",
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--border-color)" },
                  }}
                >
                  <MenuItem value="Small">Small (48px)</MenuItem>
                  <MenuItem value="Medium">Medium (80px)</MenuItem>
                  <MenuItem value="Large">Large (120px)</MenuItem>
                  <MenuItem value="Custom">Custom</MenuItem>
                </Select>
                {(!["Small", "Medium", "Large"].includes(authLogoSize)) && (
                  <TextField
                    size="small"
                    placeholder="e.g. 150"
                    value={authLogoSize}
                    onChange={(e) => setAuthLogoSize(e.target.value)}
                    sx={{ width: 100 }}
                    slotProps={{
                      htmlInput: { style: { fontSize: "14px" } }
                    }}
                  />
                )}
                {(!["Small", "Medium", "Large"].includes(authLogoSize)) && (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>px</Typography>
                )}
              </Box>
            </Box>

            <TextField
              label="Welcome Screen Title"
              placeholder="Welcome to Kollab"
              value={welcomeTitle}
              onChange={(e) => setWelcomeTitle(e.target.value)}
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
              label="Welcome Screen Subtitle (Description)"
              placeholder="A premium block-based document workspace..."
              value={welcomeText}
              onChange={(e) => setWelcomeText(e.target.value)}
              multiline
              rows={4}
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
              label="Legal Disclaimer"
              placeholder="By logging in, you agree to our Terms of Service..."
              value={authLegalDisclaimer}
              onChange={(e) => setAuthLegalDisclaimer(e.target.value)}
              multiline
              rows={3}
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
              label="Login Button Text"
              placeholder="Log In to Workspace"
              value={authLoginButtonText}
              onChange={(e) => setAuthLoginButtonText(e.target.value)}
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

        {section === "integrations" && (
          <Box sx={{ p: { xs: 0, md: 4 }, animation: "fadeIn 0.3s ease" }}>
            <IntegrationsManager scope="system" entityId="" />
          </Box>
        )}
      </Box>
      <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid var(--border-color)", opacity: 0.6, display: { xs: "none", md: "flex" }, flexDirection: "column", alignItems: "center", gap: 0.5 }}>
        <Typography sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>
          Kollab v{import.meta.env.VITE_APP_VERSION || "0.0.0"}
        </Typography>
        <Typography sx={{ fontSize: "11px", fontFamily: "monospace" }}>
          Commit: {import.meta.env.VITE_COMMIT_HASH || "unknown"}
        </Typography>
      </Box>
    </Box>
  );
};
