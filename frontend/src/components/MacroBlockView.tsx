import React from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Box, Paper, Typography, IconButton, Chip } from "@mui/material";
import { Settings, Trash2, Cpu, BarChart2, Smile } from "lucide-react";

export const MacroBlockView: React.FC<NodeViewProps> = ({ node, deleteNode, updateAttributes }) => {
  const { type = "status-badge", config = {} } = node.attrs;

  const handleStatusChange = () => {
    const statuses = ["Active", "In Progress", "Blocked", "Done"];
    const currentIdx = statuses.indexOf(config.status || "Active");
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];
    updateAttributes({
      config: { ...config, status: nextStatus }
    });
  };

  const getMacroIcon = () => {
    switch (type) {
      case "status-badge":
        return <Smile size={14} color="#34d399" />;
      case "chart-analytics":
        return <BarChart2 size={14} color="#c084fc" />;
      default:
        return <Cpu size={14} color="#60a5fa" />;
    }
  };

  return (
    <NodeViewWrapper className="macro-block-wrapper" style={{ marginTop: "1rem", marginBottom: "1rem" }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          backgroundColor: "rgba(22, 25, 36, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.04)",
          borderRadius: 2.5,
          position: "relative",
          userSelect: "none",
          transition: "all 0.2s ease",
          "&:hover": {
            borderColor: "rgba(139, 92, 246, 0.2)",
            backgroundColor: "rgba(22, 25, 36, 0.6)",
          }
        }}
      >
        {/* Macro Header Panel */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, pb: 1, borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ display: "flex", color: "primary.light" }}>
              {getMacroIcon()}
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.04em", color: "text.secondary", textTransform: "uppercase" }}>
              UI Macro: {type.replace("-", " ")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton size="small" sx={{ p: 0.5, color: "text.disabled", "&:hover": { color: "text.primary" } }}>
              <Settings size={13} />
            </IconButton>
            <IconButton size="small" onClick={deleteNode} sx={{ p: 0.5, color: "text.disabled", "&:hover": { color: "error.main" } }}>
              <Trash2 size={13} />
            </IconButton>
          </Box>
        </Box>

        {/* Macro Render Viewport */}
        <Box sx={{ py: 0.5 }}>
          {type === "status-badge" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "13px" }}>
                Task Status:
              </Typography>
              <Chip 
                label={config.status || "Active"} 
                onClick={handleStatusChange}
                color={
                  config.status === "Done" ? "success" : 
                  config.status === "Blocked" ? "error" : 
                  config.status === "In Progress" ? "warning" : "default"
                }
                size="small"
                sx={{ 
                  fontWeight: 600, 
                  fontSize: "11px",
                  cursor: "pointer",
                  "&:hover": { opacity: 0.8 }
                }}
              />
              <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px" }}>
                (Click to toggle status)
              </Typography>
            </Box>
          )}

          {type === "chart-analytics" && (
            <Box sx={{ py: 1, textAlign: "center", color: "text.disabled", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: 1.5 }}>
              <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic", mb: 0.5, fontSize: "13px" }}>
                Analytics Chart Placeholder
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "10px" }}>
                Linked to Table ID: {config.tableId || "Not connected"}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </NodeViewWrapper>
  );
};
