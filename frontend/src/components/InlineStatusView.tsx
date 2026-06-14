import React, { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Box, Chip, Popover, TextField, IconButton, Tooltip } from "@mui/material";
import { Trash2 } from "lucide-react";

export const InlineStatusView: React.FC<NodeViewProps> = ({ node, deleteNode, updateAttributes }) => {
  const { text = "TODO", color = "blue" } = node.attrs;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [inputText, setInputText] = useState(text);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setInputText(text); // Reset input to current text
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const getColors = () => {
    switch (color) {
      case "yellow":
        return { bg: "rgba(245, 158, 11, 0.12)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" };
      case "green":
        return { bg: "rgba(16, 185, 129, 0.12)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" };
      case "red":
        return { bg: "rgba(239, 68, 68, 0.12)", text: "#ef4444", border: "rgba(239, 68, 68, 0.3)" };
      case "gray":
        return { bg: "rgba(148, 163, 184, 0.12)", text: "#94a3b8", border: "rgba(148, 163, 184, 0.3)" };
      case "blue":
      default:
        return { bg: "rgba(59, 130, 246, 0.12)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" };
    }
  };

  const style = getColors();

  const colorOptions = [
    { name: "blue", hex: "#3b82f6" },
    { name: "yellow", hex: "#f59e0b" },
    { name: "green", hex: "#10b981" },
    { name: "red", hex: "#ef4444" },
    { name: "gray", hex: "#94a3b8" },
  ];

  return (
    <NodeViewWrapper style={{ display: "inline-block", verticalAlign: "middle", margin: "0 4px", userSelect: "none" }}>
      <Chip
        label={text.toUpperCase()}
        onClick={handleClick}
        sx={{
          height: 20,
          fontSize: "10px",
          fontWeight: 700,
          fontFamily: '"Outfit", sans-serif',
          color: style.text,
          backgroundColor: style.bg,
          border: `1px solid ${style.border}`,
          borderRadius: "4px",
          cursor: "pointer",
          transition: "all 0.15s ease",
          "&:hover": {
            opacity: 0.85,
            boxShadow: `0 0 0 1px ${style.text}`,
          },
        }}
      />

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        slotProps={{
          paper: {
            className: "glass-card",
            sx: {
              p: 1.5,
              mt: 0.75,
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--panel-color)",
              color: "text.primary",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
              width: 200,
            },
          },
        }}
      >
        {/* Text Input */}
        <TextField
          size="small"
          value={inputText}
          placeholder="Status label..."
          onChange={(e) => {
            const val = e.target.value.slice(0, 16); // Limit to 16 chars
            setInputText(val);
            updateAttributes({ text: val });
          }}
          autoFocus
          sx={{
            "& .MuiOutlinedInput-root": {
              fontSize: "11px",
              height: 28,
              backgroundColor: "rgba(0, 0, 0, 0.15)",
              color: "text.primary",
              borderRadius: "4px",
              "& fieldset": { borderColor: "var(--border-color)" },
              "&.Mui-focused fieldset": { borderColor: "var(--primary-color)" },
            },
            "& input": { p: "6px 8px" },
          }}
        />

        {/* Color Palette Grid */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", gap: 0.75 }}>
            {colorOptions.map((opt) => (
              <Box
                key={opt.name}
                onClick={() => updateAttributes({ color: opt.name })}
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  backgroundColor: opt.hex,
                  cursor: "pointer",
                  border: color === opt.name ? "2px solid #ffffff" : "2px solid transparent",
                  boxShadow: color === opt.name ? "0 0 0 1.5px var(--primary-color)" : "none",
                  transition: "all 0.15s ease",
                  "&:hover": { transform: "scale(1.2)" },
                }}
              />
            ))}
          </Box>

          {/* Delete Button */}
          <Tooltip title="Delete status" arrow>
            <IconButton
              size="small"
              onClick={() => {
                deleteNode();
                handleClose();
              }}
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
      </Popover>
    </NodeViewWrapper>
  );
};
