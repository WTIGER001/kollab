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
          border: "1px dashed rgba(139, 92, 246, 0.4)", // violet-dashed border
          borderRadius: "6px",
          p: 1.5,
          my: 1.5,
          position: "relative",
          backgroundColor: "rgba(139, 92, 246, 0.02)",
          "&::before": {
            content: '"Excerpt Area"',
            position: "absolute",
            top: -9,
            left: 10,
            fontSize: "9px",
            fontWeight: 700,
            backgroundColor: "var(--bg-color, #0a0b10)",
            color: "var(--accent-purple, #8b5cf6)",
            px: 0.75,
            borderRadius: "4px",
            border: "1px solid rgba(139, 92, 246, 0.2)",
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
