import React, { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Chip, Popover, IconButton, Tooltip } from "@mui/material";
import { Calendar, Trash2 } from "lucide-react";

export const InlineDateView: React.FC<NodeViewProps> = ({ node, deleteNode, updateAttributes }) => {
  const { date } = node.attrs;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  // Format date in a user-friendly format, e.g. "Jun 14, 2026"
  const getFriendlyDate = () => {
    if (!date) return "Select Date";
    try {
      const parts = date.split("-");
      if (parts.length === 3) {
        // Parse date in local time to avoid timezone offset shifts
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      return date;
    } catch {
      return date;
    }
  };

  return (
    <NodeViewWrapper style={{ display: "inline-block", verticalAlign: "middle", margin: "0 4px", userSelect: "none" }}>
      <Chip
        icon={<Calendar size={12} style={{ color: "var(--primary-color)" }} />}
        label={getFriendlyDate()}
        onClick={handleClick}
        sx={{
          height: 20,
          fontSize: "10px",
          fontWeight: 600,
          fontFamily: '"Outfit", sans-serif',
          color: "var(--primary-color)",
          backgroundColor: "rgba(139, 92, 246, 0.08)", // Primary HSL alpha
          border: "1px solid rgba(139, 92, 246, 0.25)",
          borderRadius: "4px",
          cursor: "pointer",
          transition: "all 0.15s ease",
          "& .MuiChip-icon": { marginLeft: "6px", marginRight: "-2px" },
          "&:hover": {
            opacity: 0.85,
            boxShadow: "0 0 0 1px var(--primary-color)",
            backgroundColor: "rgba(139, 92, 246, 0.12)",
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
              alignItems: "center",
              gap: 1.5,
            },
          },
        }}
      >
        {/* Date HTML5 Input */}
        <input
          type="date"
          value={date}
          onChange={(e) => {
            updateAttributes({ date: e.target.value });
          }}
          style={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: "12px",
            border: "1px solid var(--border-color)",
            backgroundColor: "rgba(0, 0, 0, 0.15)",
            color: "var(--text-primary)",
            padding: "4px 8px",
            borderRadius: "4px",
            outline: "none",
            colorScheme: "dark", // ensures native calendar dropdown respects dark themes
          }}
        />

        {/* Delete button */}
        <Tooltip title="Delete date" arrow>
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
      </Popover>
    </NodeViewWrapper>
  );
};
