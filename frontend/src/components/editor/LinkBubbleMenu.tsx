import React, { useEffect, useState } from "react";
import { Paper, Box, IconButton, Tooltip, Typography, Link as MuiLink } from "@mui/material";
import { Edit2, Unlink, ExternalLink } from "lucide-react";

interface LinkBubbleMenuProps {
  editor: any;
  onEditLink: () => void;
}

export const LinkBubbleMenu: React.FC<LinkBubbleMenuProps> = ({ editor, onEditLink }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!editor) return;

    const updatePosition = () => {
      if (!editor.isActive("link")) {
        setPosition(null);
        return;
      }

      const { selection } = editor.state;
      const { $from } = selection;

      try {
        const dom = editor.view.domAtPos($from.pos);
        const linkElement = dom.node.nodeType === Node.ELEMENT_NODE
          ? (dom.node as HTMLElement).closest("a")
          : dom.node.parentElement?.closest("a");

        if (linkElement) {
          const rect = linkElement.getBoundingClientRect();
          const toolbarHeight = 42;
          let top = rect.top - toolbarHeight - 8;

          if (top < 10) {
            top = rect.bottom + 8;
          }

          const left = rect.left + rect.width / 2 - 125;

          setPosition({
            top: Math.max(10, top),
            left: Math.max(10, left),
          });
        } else {
          setPosition(null);
        }
      } catch (e) {
        setPosition(null);
      }
    };

    editor.on("selectionUpdate", updatePosition);
    editor.on("update", updatePosition);
    window.addEventListener("scroll", updatePosition);

    updatePosition();

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("update", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [editor]);

  if (!position) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 1300,
        display: "flex",
        alignItems: "center",
        gap: 1,
        bgcolor: "var(--panel-color)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--border-radius-card)",
        p: 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", px: 1, maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis" }}>
        <MuiLink 
          href={editor.getAttributes("link").href} 
          target="_blank" 
          rel="noopener noreferrer"
          sx={{ 
            fontSize: "13px", 
            fontFamily: '"Outfit", sans-serif',
            color: "primary.main",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" }
          }}
        >
          <ExternalLink size={14} />
          <Typography noWrap variant="caption" sx={{ fontWeight: 600 }}>
            {editor.getAttributes("link").href}
          </Typography>
        </MuiLink>
      </Box>

      <Box sx={{ width: "1px", height: 24, bgcolor: "var(--border-color)", mx: 0.5 }} />

      <Tooltip title="Edit Link">
        <IconButton
          size="small"
          onClick={onEditLink}
          sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
        >
          <Edit2 size={16} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Remove Link">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().unsetLink().run()}
          sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
        >
          <Unlink size={16} />
        </IconButton>
      </Tooltip>
    </Paper>
  );
};
