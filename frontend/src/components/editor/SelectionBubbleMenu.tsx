import React, { useEffect, useState } from "react";
import { Paper, IconButton, Tooltip } from "@mui/material";
import { MessageSquarePlus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface SelectionBubbleMenuProps {
  editor: any;
  onAddComment: (commentId: string) => void;
}

export const SelectionBubbleMenu: React.FC<SelectionBubbleMenuProps> = ({ editor, onAddComment }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!editor) return;

    const updatePosition = () => {
      // Don't show if there's no selection, or if it's a node selection (like an image), or if it's a link
      if (editor.state.selection.empty || editor.isActive("image") || editor.isActive("link")) {
        setPosition(null);
        return;
      }

      const { view } = editor;
      const { selection } = view.state;
      
      try {
        const start = view.coordsAtPos(selection.from);
        const end = view.coordsAtPos(selection.to);
        
        const toolbarHeight = 42;
        let top = start.top - toolbarHeight - 8;

        if (top < 10) {
          top = end.bottom + 8;
        }

        const left = Math.max((start.left + end.left) / 2 - 25, 10);

        setPosition({
          top: Math.max(10, top),
          left: Math.max(10, left),
        });
      } catch (e) {
        setPosition(null);
      }
    };

    editor.on("selectionUpdate", updatePosition);
    editor.on("update", updatePosition);
    window.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);

    updatePosition();

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("update", updatePosition);
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [editor]);

  if (!position) return null;

  const handleAddComment = () => {
    const commentId = uuidv4();
    editor.chain().focus().setComment(commentId).run();
    onAddComment(commentId);
  };

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
        bgcolor: "var(--panel-color)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--border-radius-card)",
        p: 0.5,
      }}
    >
      <Tooltip title="Add Comment">
        <IconButton
          size="small"
          onClick={handleAddComment}
          sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
        >
          <MessageSquarePlus size={18} />
        </IconButton>
      </Tooltip>
    </Paper>
  );
};
