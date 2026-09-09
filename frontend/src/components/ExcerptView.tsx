import React from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useIsEditable } from "../hooks/useIsEditable";
import { Box } from "@mui/material";

export const ExcerptView: React.FC<NodeViewProps> = ({ editor }) => {
  const isEditable = useIsEditable(editor);

  if (!isEditable) {
    return (
      <NodeViewWrapper className="excerpt-node-view">
        <Box sx={{ my: 1 }}>
          <NodeViewContent />
        </Box>
      </NodeViewWrapper>
    );
  }

  // Edit mode: show subtle dashed border and indicator label
  return (
    <NodeViewWrapper className="excerpt-node-view-edit">
      <Box 
        sx={{
          border: "var(--border-width) var(--border-style) var(--border-color)",
          borderRadius: "var(--border-radius-card)",
          p: 1.5,
          my: 1.5,
          position: "relative",
          backgroundColor: "var(--glass-bg)",
          "&::before": {
            content: '"Excerpt Area"',
            position: "absolute",
            top: -9,
            left: 10,
            fontSize: "9px",
            fontWeight: 700,
            backgroundColor: "var(--bg-color)",
            color: "var(--primary-color)",
            px: 0.75,
            borderRadius: "var(--border-radius-button)",
            border: "var(--border-width) var(--border-style) var(--border-color)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }
        }}
      >
        <Box sx={{ mt: 0.5 }}>
          <NodeViewContent />
        </Box>
      </Box>
    </NodeViewWrapper>
  );
};
