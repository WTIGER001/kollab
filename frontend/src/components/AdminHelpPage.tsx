import React from "react";
import { Box, Typography, Button, IconButton, Toolbar, AppBar } from "@mui/material";
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
      bgcolor: "background.default",
      overflow: "hidden"
    }}>
      {/* Header Toolbar */}
      <AppBar position="static" sx={{ bgcolor: "var(--panel-color)", borderBottom: "1px solid var(--border-color)", boxShadow: "none" }}>
        <Toolbar sx={{ minHeight: 48, px: 2, display: "flex", alignItems: "center" }}>
          <IconButton size="small" onClick={onBack} sx={{ mr: 2, color: "text.primary", "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" } }}>
            <ArrowLeft size={18} />
          </IconButton>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box sx={{
              backgroundColor: "rgba(139, 92, 246, 0.1)",
              border: "1px solid rgba(139, 92, 246, 0.2)",
              p: 0.75,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <BookOpen size={16} style={{ color: "var(--primary-color)" }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: "text.primary" }}>
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
