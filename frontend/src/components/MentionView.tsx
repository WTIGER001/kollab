import React from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Chip, Tooltip } from "@mui/material";
import { AtSign } from "lucide-react";

export const MentionView: React.FC<NodeViewProps> = ({ node }) => {
  const { username = "" } = node.attrs;

  return (
    <NodeViewWrapper
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        margin: "0 3px",
        userSelect: "none",
      }}
    >
      <Tooltip title={`Team Member: @${username}`} arrow>
        <Chip
          icon={<AtSign size={11} style={{ marginLeft: 6, color: "inherit" }} />}
          label={username}
          sx={{
            height: 20,
            fontSize: "12px",
            fontWeight: 600,
            fontFamily: '"Outfit", sans-serif',
            color: "var(--primary-color, #8b5cf6)",
            backgroundColor: "rgba(139, 92, 246, 0.12)",
            border: "1px solid rgba(139, 92, 246, 0.25)",
            borderRadius: "4px",
            cursor: "default",
            transition: "all 0.15s ease",
            "& .MuiChip-label": {
              paddingLeft: "4px",
              paddingRight: "6px",
            },
            "&:hover": {
              backgroundColor: "rgba(139, 92, 246, 0.18)",
              borderColor: "rgba(139, 92, 246, 0.4)",
            },
          }}
        />
      </Tooltip>
    </NodeViewWrapper>
  );
};
