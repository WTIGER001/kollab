import React from "react";
import { Box, Typography, IconButton, Toolbar, AppBar } from "@mui/material";
import { ArrowLeft, BookOpen } from "lucide-react";
import { HelpAdmin } from "./help/HelpAdmin";

interface AdminHelpPageProps {
  onBack: () => void;
}

export const AdminHelpPage: React.FC<AdminHelpPageProps> = ({ onBack }) => {
  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
      bgcolor: "var(--bg-color)",
      overflow: "hidden"
    }}>
      {/* Header Toolbar */}
      <AppBar position="static" sx={{ bgcolor: "var(--panel-color)", borderBottom: "1px solid var(--border-color)", boxShadow: "none" }}>
        <Toolbar sx={{ minHeight: 48, px: 2, display: "flex", alignItems: "center" }}>
          <IconButton size="small" onClick={onBack} sx={{ mr: 2, color: "var(--text-primary)", "&:hover": { bgcolor: "var(--glass-bg)" } }}>
            <ArrowLeft size={18} />
          </IconButton>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box sx={{
              backgroundColor: "var(--glass-bg)",
              border: "var(--border-width) solid var(--glass-border)",
              p: 0.75,
              borderRadius: "var(--border-radius-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <BookOpen size={16} style={{ color: "var(--primary-color)" }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: "var(--text-primary)" }}>
              Server Admin Guide
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Content Container */}
      <Box sx={{
        flex: 1,
        overflowY: "auto",
        p: { xs: 3, sm: 5 },
        maxWidth: 800,
        width: "100%",
        mx: "auto"
      }} className="scrollbar-thin">
        <HelpAdmin />
      </Box>
    </Box>
  );
};
