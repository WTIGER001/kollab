import React from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Box, Paper, IconButton, Tooltip, Divider, Typography } from "@mui/material";
import { Trash2, Columns2, Columns3, Layout } from "lucide-react";

export const LayoutSectionView: React.FC<NodeViewProps> = ({ 
  node, 
  updateAttributes, 
  deleteNode 
}) => {
  const { layout } = node.attrs;
  const isThreeCol = layout === "threecol";

  const handleSetLayout = (newLayout: string) => {
    updateAttributes({ layout: newLayout });
  };



  return (
    <NodeViewWrapper 
      className={`layout-section-wrapper layout-${layout}`}
      style={{ position: "relative" }}
    >
      {/* Floating Layout Controls Bar */}
      <Paper
        elevation={3}
        className="layout-controls-bar"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          backgroundColor: "rgba(16, 18, 26, 0.95)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 1.5,
          p: 0.5,
          position: "absolute",
          top: -16,
          right: 12,
          zIndex: 10,
        }}
      >
        <Typography 
          variant="caption" 
          sx={{ 
            px: 1, 
            fontWeight: 700, 
            fontSize: "9px", 
            color: "text.disabled",
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}
        >
          Layout
        </Typography>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.75 }} />

        {isThreeCol ? (
          <Tooltip title="Three Equal Columns (33/33/33)" arrow>
            <span>
              <IconButton 
                size="small" 
                disabled
                sx={{ 
                  p: 0.5, 
                  color: "primary.light", 
                  backgroundColor: "rgba(139, 92, 246, 0.15) !important" 
                }}
              >
                <Columns3 size={13} />
              </IconButton>
            </span>
          </Tooltip>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title="Equal Split (50/50)" arrow>
              <IconButton
                size="small"
                onClick={() => handleSetLayout("twocol")}
                sx={{
                  p: 0.5,
                  color: layout === "twocol" ? "primary.light" : "text.secondary",
                  backgroundColor: layout === "twocol" ? "rgba(139, 92, 246, 0.1)" : "transparent",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.05)" }
                }}
              >
                <Columns2 size={13} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Asymmetric Left (70/30)" arrow>
              <IconButton
                size="small"
                onClick={() => handleSetLayout("asymmetric-left")}
                sx={{
                  p: 0.5,
                  color: layout === "asymmetric-left" ? "primary.light" : "text.secondary",
                  backgroundColor: layout === "asymmetric-left" ? "rgba(139, 92, 246, 0.1)" : "transparent",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.05)" }
                }}
              >
                <Layout size={13} style={{ transform: "rotate(0deg)" }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Asymmetric Right (30/70)" arrow>
              <IconButton
                size="small"
                onClick={() => handleSetLayout("asymmetric-right")}
                sx={{
                  p: 0.5,
                  color: layout === "asymmetric-right" ? "primary.light" : "text.secondary",
                  backgroundColor: layout === "asymmetric-right" ? "rgba(139, 92, 246, 0.1)" : "transparent",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.05)" }
                }}
              >
                <Layout size={13} style={{ transform: "scaleX(-1)" }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.75 }} />

        <Tooltip title="Delete Section" arrow>
          <IconButton
            size="small"
            onClick={deleteNode}
            sx={{
              p: 0.5,
              color: "text.secondary",
              "&:hover": { 
                color: "error.main",
                backgroundColor: "rgba(239, 68, 68, 0.1)" 
              }
            }}
          >
            <Trash2 size={13} />
          </IconButton>
        </Tooltip>
      </Paper>

      <NodeViewContent 
        className="layout-columns-container" 
        style={{ display: "flex", gap: "28px", width: "100%" }} 
      />
    </NodeViewWrapper>
  );
};
