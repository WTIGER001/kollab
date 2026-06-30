import React from "react";
import { Box, Typography } from "@mui/material";

export const HelpAnalytics: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 1.5 }}>
        Live Page Analytics
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 3 }}>
        Understand reader engagement on your pages. Click the **Page Analytics** icon in the canvas header toolbar to open the glassmorphism metrics dashboard:
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mb: 4 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2, textAlign: "center" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "11px", textTransform: "uppercase" }}>Total Page Views</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, my: 1, fontFamily: '"Outfit", sans-serif' }}>84</Typography>
            <Typography variant="caption" sx={{ color: "#10b981", fontWeight: 600 }}>+12% vs last week</Typography>
          </Box>
          <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2, textAlign: "center" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "11px", textTransform: "uppercase" }}>Unique Visitors</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, my: 1, fontFamily: '"Outfit", sans-serif' }}>29</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>This week</Typography>
          </Box>
        </Box>

        <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>7-Day View Sparkline</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2, lineHeight: 1.4 }}>
            The analytics panel renders a dynamic, SVG-based sparkline graph reflecting historical page view volumes over the past 7 days.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
