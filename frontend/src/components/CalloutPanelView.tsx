import React from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useIsEditable } from "../hooks/useIsEditable";
import { Box, Paper, IconButton, Tooltip, Divider, InputBase, Typography } from "@mui/material";
import { Info, AlertCircle, Lightbulb, AlertTriangle, Trash2, Check, FileText } from "lucide-react";

export const CalloutPanelView: React.FC<NodeViewProps> = ({ node, deleteNode, updateAttributes, editor }) => {
  const { type = "info" } = node.attrs;

  const getTheme = () => {
    switch (type) {
      case "note":
        return {
          bg: "rgba(245, 158, 11, 0.04)",
          border: "rgba(245, 158, 11, 0.25)",
          color: "#f59e0b",
          icon: <FileText size={18} />,
        };
      case "tip":
        return {
          bg: "rgba(16, 185, 129, 0.04)",
          border: "rgba(16, 185, 129, 0.25)",
          color: "#10b981",
          icon: <Lightbulb size={18} />,
        };
      case "warning":
        return {
          bg: "rgba(245, 158, 11, 0.04)",
          border: "rgba(245, 158, 11, 0.25)",
          color: "#f59e0b",
          icon: <AlertTriangle size={18} />,
        };
      case "error":
        return {
          bg: "rgba(239, 68, 68, 0.04)",
          border: "rgba(239, 68, 68, 0.25)",
          color: "#ef4444",
          icon: <AlertCircle size={18} />,
        };
      case "check":
        return {
          bg: "rgba(16, 185, 129, 0.04)",
          border: "rgba(16, 185, 129, 0.25)",
          color: "#10b981",
          icon: <Check size={18} />,
        };
      case "info":
      default:
        return {
          bg: "rgba(59, 130, 246, 0.04)",
          border: "rgba(59, 130, 246, 0.25)",
          color: "#3b82f6",
          icon: <Info size={18} />,
        };
    }
  };

  const theme = getTheme();
  const isEditable = useIsEditable(editor);

  return (
    <NodeViewWrapper className="callout-panel-node">
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          gap: 2,
          p: 2,
          my: 0.5,
          backgroundColor: theme.bg,
          border: `1px solid ${theme.border}`,
          borderLeft: `4px solid ${theme.color}`,
          borderRadius: "8px",
          position: "relative",
          transition: "all 0.2s ease",
          "& .callout-actions": {
            opacity: 0,
            transition: "opacity 0.2s ease, transform 0.2s ease",
            transform: "translateY(2px)",
            pointerEvents: "none",
          },
          "&:hover .callout-actions": {
            opacity: 1,
            transform: "translateY(0)",
            pointerEvents: "auto",
          },
        }}
      >
        {/* Left Side Icon */}
        <Box sx={{ color: theme.color, display: "flex", alignItems: "flex-start", pt: 0.25, userSelect: "none" }}>
          {theme.icon}
        </Box>

        {/* Right Side Content Container */}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Editable Title Area */}
          {isEditable ? (
            <InputBase
              placeholder="Title..."
              value={node.attrs.title || ""}
              onChange={(e) => updateAttributes({ title: e.target.value })}
              fullWidth
              sx={{
                fontWeight: 700,
                fontSize: "14px",
                color: theme.color,
                fontFamily: '"Outfit", sans-serif',
                mb: 0.5,
                "& input": { p: 0 },
                "& input::placeholder": {
                  color: "text.disabled",
                  opacity: 0.5,
                  fontWeight: 500
                }
              }}
            />
          ) : (
            node.attrs.title && (
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 700, 
                  fontSize: "14px", 
                  color: theme.color, 
                  fontFamily: '"Outfit", sans-serif',
                  mb: 0.5 
                }}
              >
                {node.attrs.title}
              </Typography>
            )
          )}

          {/* Content Area - editable by user */}
          <Box sx={{ minWidth: 0, color: "text.primary" }}>
            <NodeViewContent />
          </Box>
        </Box>

        {/* Floating actions toolbar */}
        {isEditable && (
          <Box
            className="callout-actions"
            sx={{
              position: "absolute",
              top: 6,
              right: 6,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              backgroundColor: "var(--panel-color)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              p: 0.25,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              zIndex: 5,
            }}
          >
            <Tooltip title="Info" arrow>
              <IconButton
                size="small"
                onClick={() => updateAttributes({ type: "info" })}
                sx={{
                  p: 0.5,
                  color: type === "info" ? "#3b82f6" : "text.disabled",
                  backgroundColor: type === "info" ? "rgba(59, 130, 246, 0.08)" : "transparent",
                  "&:hover": { color: "#3b82f6", backgroundColor: "rgba(59, 130, 246, 0.08)" },
                }}
              >
                <Info size={12} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Warning" arrow>
              <IconButton
                size="small"
                onClick={() => updateAttributes({ type: "warning" })}
                sx={{
                  p: 0.5,
                  color: type === "warning" ? "#f59e0b" : "text.disabled",
                  backgroundColor: type === "warning" ? "rgba(245, 158, 11, 0.08)" : "transparent",
                  "&:hover": { color: "#f59e0b", backgroundColor: "rgba(245, 158, 11, 0.08)" },
                }}
              >
                <AlertTriangle size={12} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Error" arrow>
              <IconButton
                size="small"
                onClick={() => updateAttributes({ type: "error" })}
                sx={{
                  p: 0.5,
                  color: type === "error" ? "#ef4444" : "text.disabled",
                  backgroundColor: type === "error" ? "rgba(239, 68, 68, 0.08)" : "transparent",
                  "&:hover": { color: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.08)" },
                }}
              >
                <AlertCircle size={12} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Check" arrow>
              <IconButton
                size="small"
                onClick={() => updateAttributes({ type: "check" })}
                sx={{
                  p: 0.5,
                  color: type === "check" ? "#10b981" : "text.disabled",
                  backgroundColor: type === "check" ? "rgba(16, 185, 129, 0.08)" : "transparent",
                  "&:hover": { color: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.08)" },
                }}
              >
                <Check size={12} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Note" arrow>
              <IconButton
                size="small"
                onClick={() => updateAttributes({ type: "note" })}
                sx={{
                  p: 0.5,
                  color: type === "note" ? "#f59e0b" : "text.disabled",
                  backgroundColor: type === "note" ? "rgba(245, 158, 11, 0.08)" : "transparent",
                  "&:hover": { color: "#f59e0b", backgroundColor: "rgba(245, 158, 11, 0.08)" },
                }}
              >
                <FileText size={12} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Tip" arrow>
              <IconButton
                size="small"
                onClick={() => updateAttributes({ type: "tip" })}
                sx={{
                  p: 0.5,
                  color: type === "tip" ? "#10b981" : "text.disabled",
                  backgroundColor: type === "tip" ? "rgba(16, 185, 129, 0.08)" : "transparent",
                  "&:hover": { color: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.08)" },
                }}
              >
                <Lightbulb size={12} />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.5 }} />
            <Tooltip title="Delete Panel" arrow>
              <IconButton
                size="small"
                onClick={deleteNode}
                sx={{
                  p: 0.5,
                  color: "text.disabled",
                  "&:hover": { color: "error.main", backgroundColor: "rgba(239, 68, 68, 0.08)" },
                }}
              >
                <Trash2 size={12} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Paper>
    </NodeViewWrapper>
  );
};
