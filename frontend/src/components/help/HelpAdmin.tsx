import React from "react";
import { Box, Typography } from "@mui/material";
import { Settings, Shield, HardDrive, RefreshCw } from "lucide-react";

export const HelpAdmin: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 1.5 }}>
        Server Administration & Air-Gap Sync
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 3 }}>
        Server Settings can be managed by system administrators. Navigate to the dedicated settings page at <code>/_admin/settings</code> (or from the profile menu top-right corner) to access global configuration, branding, backups, and air-gap synchronization tools.
      </Typography>

      <Typography variant="subtitle2" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mb: 1.5 }}>
        Administration Controls & Features
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
        {/* Branding & Policies */}
        <Box sx={{ display: "flex", gap: 2, p: 2, borderRadius: "8px", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)" }}>
          <Box sx={{ p: 1, height: "fit-content", borderRadius: "6px", backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
            <Settings size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px" }}>Custom Branding & AI Controls</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, lineHeight: 1.4 }}>
              Change the global workspace name, logo image URL, and define welcome texts rendered on the landing screen. Configure system-wide AI rate limits to manage usage and specify LibreOffice/Aspose configurations for document preview engines.
            </Typography>
          </Box>
        </Box>

        {/* Audit & Retention */}
        <Box sx={{ display: "flex", gap: 2, p: 2, borderRadius: "8px", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)" }}>
          <Box sx={{ p: 1, height: "fit-content", borderRadius: "6px", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
            <Shield size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px" }}>Audit Logs & Trash Retention</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, lineHeight: 1.4 }}>
              Kollab tracks all document modifications, view events, and permission grants. Configure automated database retention policies (e.g. 30 days, 90 days, 1 year, or forever) for system audit trails and trash folders.
            </Typography>
          </Box>
        </Box>

        {/* Database Backups */}
        <Box sx={{ display: "flex", gap: 2, p: 2, borderRadius: "8px", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)" }}>
          <Box sx={{ p: 1, height: "fit-content", borderRadius: "6px", backgroundColor: "rgba(139, 92, 246, 0.1)", color: "var(--primary-color)" }}>
            <HardDrive size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px" }}>Database Backups & Restore</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, lineHeight: 1.4 }}>
              Export the entire Kollab server state—including database tables, settings, user preferences, and uploaded files/previews—as a single portable ZIP archive. Restoring a backup completely updates the target server state.
            </Typography>
          </Box>
        </Box>

        {/* Air-Gap Sync */}
        <Box sx={{ display: "flex", gap: 2, p: 2, borderRadius: "8px", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)" }}>
          <Box sx={{ p: 1, height: "fit-content", borderRadius: "6px", backgroundColor: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>
            <RefreshCw size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px" }}>Diff-Based Sync (Air-Gapped Sync)</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, lineHeight: 1.4 }}>
              Synchronize an off-grid or air-gapped Kollab deployment. Generate an incremental update package containing only database rows and uploads modified since a specific operation ID. Import the package on the air-gapped server to apply all updates.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
