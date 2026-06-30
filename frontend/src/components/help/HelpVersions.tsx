import React from "react";
import { Box, Typography } from "@mui/material";
import { Clock, Sparkles, Info } from "lucide-react";

export const HelpVersions: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 1.5 }}>
        Version Control & AI Summaries
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 3 }}>
        Kollab maintains a comprehensive historical record of edits without cluttering your workspace. Click the **History/Clock icon** in the canvas header toolbar to open the drawer:
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mb: 2 }}>
        {/* Auto saves */}
        <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Clock size={15} style={{ color: "var(--text-muted)" }} />
            Session-based Auto-saves
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
            Edits are rate-limited and grouped under a single `"Auto-saved snapshot"` per session. This prevents skipping version numbers and reduces timeline bloat.
          </Typography>
        </Box>

        {/* Checkpoints Done */}
        <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Sparkles size={15} style={{ color: "var(--primary-color)" }} />
            AI Checkpoint Descriptions
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
            When clicking **Done** to exit edit mode, you can type a custom checkpoint description or click **Auto-generate using AI** to have Google Gemini or OpenAI automatically summarize your modifications.
          </Typography>
        </Box>

        {/* Timeouts */}
        <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Info size={15} style={{ color: "#f59e0b" }} />
            10-Minute Idle Checkouts
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
            If you leave the tab inactive, the system autogenerates a description, appends `(Idle Timeout)`, saves your final session snapshot, and checks you out to let others edit.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
