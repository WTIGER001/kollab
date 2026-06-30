import React from "react";
import { Box, Typography } from "@mui/material";
import { Layers, BookOpen } from "lucide-react";

export const HelpOverview: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 1.5 }}>
        Welcome to Kollab
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 3 }}>
        Kollab is a next-generation collaborative workspace that combines real-time document synchronization, rich interactive formatting macros, session-based version history, and AI-driven workflows. Here is how to get started with the workspace organization:
      </Typography>

      <Typography variant="subtitle2" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mb: 1.5 }}>
        Workspace Structure
      </Typography>
      
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
        <Box sx={{ display: "flex", gap: 2, p: 2, borderRadius: "8px", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)" }}>
          <Box sx={{ p: 1, height: "fit-content", borderRadius: "6px", backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
            <Layers size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px" }}>Teams & Project Workspaces</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, lineHeight: 1.4 }}>
              Documents are organized under parent Teams and Projects. Switch your active workspace using the dropdown menus at the top of the sidebar. Selecting a project loads its document directory hierarchy.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 2, p: 2, borderRadius: "8px", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)" }}>
          <Box sx={{ p: 1, height: "fit-content", borderRadius: "6px", backgroundColor: "rgba(139, 92, 246, 0.1)", color: "var(--primary-color)" }}>
            <BookOpen size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px" }}>Collaborative Documents</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, lineHeight: 1.4 }}>
              Inside a project, you can build documents in a nested hierarchy folder tree. Create folders to group pages or build single documents. Clicking on any file loads it directly in the collaborative editing canvas.
            </Typography>
          </Box>
        </Box>
      </Box>

      <Typography variant="subtitle2" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mb: 1 }}>
        Quick Keyboard Shortcuts
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, borderRadius: "4px", backgroundColor: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border-color)", px: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 500 }}>Global Search</Typography>
          <Typography component="kbd" sx={{ fontSize: "10px", px: 1, py: 0.25, backgroundColor: "var(--panel-color)", border: "1px solid var(--border-color)", borderRadius: 0.5, color: "text.secondary", fontFamily: "monospace" }}>⌘ + P</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, borderRadius: "4px", backgroundColor: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border-color)", px: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 500 }}>Trigger Slash Commands</Typography>
          <Typography component="kbd" sx={{ fontSize: "10px", px: 1, py: 0.25, backgroundColor: "var(--panel-color)", border: "1px solid var(--border-color)", borderRadius: 0.5, color: "text.secondary", fontFamily: "monospace" }}>/</Typography>
        </Box>
      </Box>
    </Box>
  );
};
