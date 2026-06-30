import React from "react";
import { Box, Typography } from "@mui/material";

export const HelpModes: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 1.5 }}>
        Editing Modes & Collaboration
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 3 }}>
        Kollab operates in two main modes to safeguard changes and enable efficient collaboration. Use the **Edit** button in the canvas header toolbar to switch modes.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mb: 4 }}>
        <Box sx={{ borderLeft: "3px solid var(--accent-blue)", pl: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Read-Only Mode (Default)</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
            Prevents accidental typing while viewing articles. All interactive macros (Inline Dates, Status Pickers, Details summary) are disabled and display clean read-only layouts.
          </Typography>
        </Box>

        <Box sx={{ borderLeft: "3px solid var(--primary-color)", pl: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Edit Mode</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
            Enables typing, slash command menus, block formatting tools, and customizable configuration popovers. Entering edit mode unlocks full co-authoring capability.
          </Typography>
        </Box>

        <Box sx={{ borderLeft: "3px solid #10b981", pl: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Real-time Co-Authoring & Cursors</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
            Multiple users can edit the same document concurrently. Collaboration is driven by Yjs CRDTs, synchronizing edits character-by-character. Active author cursor positions and name tags display dynamically on screen.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
