import React, { useState, useEffect } from "react";
import {
  Box,
  Tabs,
  Tab,
  TextField,
  Button,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  Divider
} from "@mui/material";
import { Sparkles, ArrowLeft } from "lucide-react";
import type { ColorScheme, WorkspaceTheme, SystemSettings } from "../services/api";
import { API_BASE_URL, downloadBackup, downloadSyncExport, restoreBackup, importSyncPackage } from "../services/api";

interface ServerSettingsPageProps {
  currentTheme: WorkspaceTheme | null;
  onSave: (name: string, logoUrl: string, lightMode: ColorScheme, darkMode: ColorScheme) => void;
  systemSettings: SystemSettings | null;
  onSaveSettings: (settings: SystemSettings) => Promise<void>;
  onBack: () => void;
}

export const ServerSettingsPage: React.FC<ServerSettingsPageProps> = ({
  currentTheme,
  onSave,
  systemSettings,
  onSaveSettings,
  onBack
}) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  
  // Audit settings states
  const [policy, setPolicy] = useState("forever");
  const [customDays, setCustomDays] = useState(30);
  const [destination, setDestination] = useState("postgres");
  const [trashPolicy, setTrashPolicy] = useState("forever");
  const [trashCustomDays, setTrashCustomDays] = useState(30);

  // New settings states
  const [welcomeTitle, setWelcomeTitle] = useState("Welcome to Arkollab");
  const [welcomeText, setWelcomeText] = useState("A premium block-based document workspace. Connect with Logto Single-Sign-On (SSO) to synchronize your team workspaces.");
  const [aiRateLimit, setAiRateLimit] = useState(10);
  const [asposeEnabled, setAsposeEnabled] = useState(true);
  const [asposeLicense, setAsposeLicense] = useState("");

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
      setWelcomeTitle(systemSettings.welcomeTitle || "Welcome to Arkollab");
      setWelcomeText(systemSettings.welcomeText || "A premium block-based document workspace. Connect with Logto Single-Sign-On (SSO) to synchronize your team workspaces.");
      setAiRateLimit(systemSettings.aiRateLimit || 10);
      setAsposeEnabled(systemSettings.asposeEnabled !== false);
      setAsposeLicense(systemSettings.asposeLicense || "");
    }
  }, [currentTheme, systemSettings]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleSave = async () => {
    onSave(name, logoUrl, lightColors, darkColors);
    await onSaveSettings({
      auditRetentionPolicy: policy,
      auditRetentionCustomDays: customDays,
      auditLogDestination: destination,
      trashRetentionPolicy: trashPolicy,
      trashRetentionCustomDays: trashCustomDays,
      welcomeTitle: welcomeTitle,
      welcomeText: welcomeText,
      aiRateLimit: aiRateLimit,
      asposeEnabled: asposeEnabled,
      asposeLicense: asposeLicense
    });
    onBack();
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
    <Box sx={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }}>
      {/* Header Panel */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 4, py: 3, borderBottom: "1px solid var(--border-color)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={onBack} sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
            <ArrowLeft size={20} />
          </IconButton>
          <Box sx={{ p: 0.75, borderRadius: 1.5, backgroundColor: "color-mix(in srgb, var(--primary-color) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)", display: "flex" }}>
            <Sparkles size={16} style={{ color: "var(--accent-purple)" }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"Outfit", sans-serif', letterSpacing: "-0.02em" }}>
            Server Settings
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            onClick={onBack}
            sx={{
              color: "text.secondary",
              fontSize: "13px",
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
              fontSize: "13px",
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
        </Box>
      </Box>

      {/* Tabs Container */}
      <Box sx={{ borderBottom: "1px solid var(--border-color)", px: 4, bgcolor: "background.paper" }}>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          sx={{
            "& .MuiTab-root": {
              color: "text.disabled",
              fontSize: "13.5px",
              fontWeight: 600,
              textTransform: "none",
              py: 2.25,
              minWidth: 100,
              "&.Mui-selected": { color: "primary.light" }
            },
            "& .MuiTabs-indicator": { backgroundColor: "primary.light" }
          }}
        >
          <Tab label="General Settings" />
          <Tab label="Light Palette Editor" />
          <Tab label="Dark Palette Editor" />
          <Tab label="Audit & Retention" />
          <Tab label="Aspose & Previews" />
          <Tab label="Backups & Air-Gap Sync" />
        </Tabs>
      </Box>

      {/* Main Tab Content Panel */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 5, maxWidth: "1000px", width: "100%" }}>
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

            <TextField
              label="Welcome Screen Title"
              placeholder="Welcome to Arkollab"
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
              label="Welcome Screen Description"
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
          </Box>
        )}

        {tabIndex === 1 && (
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: "text.primary" }}>
                Theme Primary Colors
              </Typography>
              {renderColorInput("Primary Theme Highlight", "primary", lightColors, setLightColors)}
              {renderColorInput("Secondary Theme Color", "secondary", lightColors, setLightColors)}
              {renderColorInput("Brand Accent Callout", "accent", lightColors, setLightColors)}
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: "text.primary" }}>
                Surface & Typography
              </Typography>
              {renderColorInput("Body Background Canvas", "background", lightColors, setLightColors)}
              {renderColorInput("Paper Component Background", "paper", lightColors, setLightColors)}
              {renderColorInput("Primary Text Font Color", "textPrimary", lightColors, setLightColors)}
              {renderColorInput("Secondary Label Font Color", "textSecondary", lightColors, setLightColors)}
              {renderColorInput("Border Grid lines Color", "border", lightColors, setLightColors)}
            </Box>
          </Box>
        )}

        {tabIndex === 2 && (
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: "text.primary" }}>
                Theme Primary Colors
              </Typography>
              {renderColorInput("Primary Theme Highlight", "primary", darkColors, setDarkColors)}
              {renderColorInput("Secondary Theme Color", "secondary", darkColors, setDarkColors)}
              {renderColorInput("Brand Accent Callout", "accent", darkColors, setDarkColors)}
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: "text.primary" }}>
                Surface & Typography
              </Typography>
              {renderColorInput("Body Background Canvas", "background", darkColors, setDarkColors)}
              {renderColorInput("Paper Component Background", "paper", darkColors, setDarkColors)}
              {renderColorInput("Primary Text Font Color", "textPrimary", darkColors, setDarkColors)}
              {renderColorInput("Secondary Label Font Color", "textSecondary", darkColors, setDarkColors)}
              {renderColorInput("Border Grid lines Color", "border", darkColors, setDarkColors)}
            </Box>
          </Box>
        )}

        {tabIndex === 3 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Audit Log Panel */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "text.primary" }}>
                Audit Log Retention Policy
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                Configure how long page viewing and modification history is archived. High-security compliance environments should use the "forever" setting.
              </Typography>

              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
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

              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
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

        {tabIndex === 4 && (
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

        {tabIndex === 5 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "text.primary" }}>
                On-Demand Database & File Backups
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2.5 }}>
                Export the entire Kollab server state (including database seed JSON and all uploaded attachment media) as a single portable ZIP archive, or restore a previously saved backup file.
              </Typography>

              <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
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
                      formData.append("backup", file);
                      try {
                        const data = await restoreBackup(formData);
                        alert(data.message || "Backup restored successfully!");
                      } catch (err) {
                        alert("Restore failed. Check backup ZIP formatting.");
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

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "text.primary" }}>
                Diff-Based Air-Gap Sync
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2.5 }}>
                Generate an incremental update package containing only database rows and file uploads modified since a specific operation ID, suitable for transfer to an air-gapped target server.
              </Typography>

              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <TextField
                  id="sync-since-id"
                  label="Since Operation ID"
                  size="small"
                  defaultValue="0"
                  type="number"
                  sx={{ width: 150 }}
                />
                <Button
                  variant="contained"
                  onClick={async () => {
                    const idVal = (document.getElementById("sync-since-id") as HTMLInputElement)?.value || "0";
                    try {
                      const blob = await downloadSyncExport(idVal);
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `kollab_sync_since_${idVal}_${new Date().toISOString().slice(0, 10)}.zip`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error("Sync export failed:", err);
                      alert("Sync export failed: " + (err instanceof Error ? err.message : String(err)));
                    }
                  }}
                  sx={{ textTransform: "none", bgcolor: "var(--primary-color)", color: "#fff", "&:hover": { bgcolor: "var(--primary-dark)" } }}
                >
                  Export Sync ZIP
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
                      formData.append("sync", file);
                      try {
                        const data = await importSyncPackage(formData);
                        alert(data.message || "Sync ZIP imported successfully!");
                      } catch (err) {
                        alert("Sync import failed.");
                      }
                    };
                    input.click();
                  }}
                  sx={{ textTransform: "none" }}
                >
                  Import Sync ZIP
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};
