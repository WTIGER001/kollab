import React, { useEffect, useState } from "react";
import { Paper, Box, IconButton, Tooltip, Divider, Menu, MenuItem, ListItemIcon, ListItemText, Typography } from "@mui/material";
import {
  Trash2,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Heading,
  LayoutGrid,
} from "lucide-react";
import { TableMap } from "@tiptap/pm/tables";

interface TableBubbleToolbarProps {
  editor: any;
}

export const TableBubbleToolbar: React.FC<TableBubbleToolbarProps> = ({ editor }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Row and Column menu anchors
  const [rowMenuAnchor, setRowMenuAnchor] = useState<null | HTMLElement>(null);
  const [colMenuAnchor, setColMenuAnchor] = useState<null | HTMLElement>(null);

  const updatePosition = () => {
    if (!editor || !editor.isActive("table")) {
      setPosition(null);
      return;
    }

    const { selection } = editor.state;
    const { $from } = selection;

    try {
      const dom = editor.view.domAtPos($from.pos);
      const domCell = dom.node.nodeType === Node.ELEMENT_NODE
        ? (dom.node as HTMLElement).closest("td, th")
        : dom.node.parentElement?.closest("td, th");

      if (domCell) {
        const rect = domCell.getBoundingClientRect();
        const toolbarHeight = 42; // Estimated height of our paper
        let top = rect.top - toolbarHeight - 8;

        // If not enough space above, position it below the cell
        if (top < 10) {
          top = rect.bottom + 8;
        }

        // Center horizontally
        const left = rect.left + rect.width / 2 - 180; // half of toolbar width

        setPosition({
          top: Math.max(10, top + window.scrollY),
          left: Math.max(10, left + window.scrollX),
        });
      } else {
        setPosition(null);
      }
    } catch (e) {
      console.error("Error updating table toolbar position", e);
      setPosition(null);
    }
  };

  useEffect(() => {
    if (!editor) return;

    updatePosition();

    // Subscribe to editor events to recalculate position
    editor.on("selectionUpdate", updatePosition);
    editor.on("update", updatePosition);
    
    // Subscribe to window events
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("update", updatePosition);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [editor]);

  if (!position) return null;

  // Custom column alignment handler using TableMap
  const handleAlignColumn = (alignment: "left" | "center" | "right") => {
    const { state, dispatch } = editor.view;
    const { selection } = state;

    let tableNode: any = null;
    let tablePos = -1;

    state.doc.nodesBetween(selection.from, selection.to, (node: any, pos: number) => {
      if (node.type.name === "table") {
        tableNode = node;
        tablePos = pos;
        return false;
      }
    });

    if (!tableNode || tablePos === -1) return;

    let activeCellPos = -1;
    state.doc.nodesBetween(selection.from, selection.to, (node: any, pos: number) => {
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        activeCellPos = pos;
        return false;
      }
    });

    if (activeCellPos === -1) return;

    const map = TableMap.get(tableNode);
    const relativeCellPos = activeCellPos - tablePos - 1;

    let activeCellIndex = -1;
    for (let i = 0; i < map.map.length; i++) {
      if (map.map[i] === relativeCellPos) {
        activeCellIndex = i;
        break;
      }
    }

    if (activeCellIndex === -1) return;
    const colIndex = activeCellIndex % map.width;

    let tr = state.tr;
    const updatedCells = new Set<number>();

    for (let row = 0; row < map.height; row++) {
      const cellPos = map.map[row * map.width + colIndex];
      if (updatedCells.has(cellPos)) continue;
      updatedCells.add(cellPos);

      const absoluteCellPos = tablePos + 1 + cellPos;
      const cellNode = tr.doc.nodeAt(absoluteCellPos);
      if (cellNode) {
        tr = tr.setNodeAttribute(absoluteCellPos, "alignment", alignment);
      }
    }

    if (dispatch) {
      dispatch(tr);
      editor.commands.focus();
    }
  };

  return (
    <Paper
      elevation={6}
      sx={{
        position: "absolute",
        top: position.top,
        left: position.left,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        p: 0.5,
        backgroundColor: "rgba(16, 18, 26, 0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 2,
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* Row Operations */}
      <Tooltip title="Row Operations" arrow>
        <IconButton
          size="small"
          onClick={(e) => setRowMenuAnchor(e.currentTarget)}
          sx={{ color: "text.secondary", "&:hover": { color: "primary.light" } }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <span style={{ fontSize: "10px", fontWeight: 700, paddingLeft: "4px" }}>Row</span>
            <Plus size={11} />
          </Box>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={rowMenuAnchor}
        open={Boolean(rowMenuAnchor)}
        onClose={() => setRowMenuAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: "rgba(20, 22, 33, 0.98)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "text.primary",
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            editor.chain().focus().addRowBefore().run();
            setRowMenuAnchor(null);
          }}
        >
          <ListItemIcon sx={{ color: "text.secondary" }}><ArrowUp size={14} /></ListItemIcon>
          <ListItemText primary={<Typography variant="body2">Insert Row Above</Typography>} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            editor.chain().focus().addRowAfter().run();
            setRowMenuAnchor(null);
          }}
        >
          <ListItemIcon sx={{ color: "text.secondary" }}><ArrowDown size={14} /></ListItemIcon>
          <ListItemText primary={<Typography variant="body2">Insert Row Below</Typography>} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            editor.chain().focus().deleteRow().run();
            setRowMenuAnchor(null);
          }}
          sx={{ color: "error.light" }}
        >
          <ListItemIcon sx={{ color: "error.light" }}><Trash2 size={14} /></ListItemIcon>
          <ListItemText primary={<Typography variant="body2">Delete Row</Typography>} />
        </MenuItem>
      </Menu>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      {/* Column Operations */}
      <Tooltip title="Column Operations" arrow>
        <IconButton
          size="small"
          onClick={(e) => setColMenuAnchor(e.currentTarget)}
          sx={{ color: "text.secondary", "&:hover": { color: "primary.light" } }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <span style={{ fontSize: "10px", fontWeight: 700, paddingLeft: "4px" }}>Col</span>
            <Plus size={11} />
          </Box>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={colMenuAnchor}
        open={Boolean(colMenuAnchor)}
        onClose={() => setColMenuAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: "rgba(20, 22, 33, 0.98)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "text.primary",
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            editor.chain().focus().addColumnBefore().run();
            setColMenuAnchor(null);
          }}
        >
          <ListItemIcon sx={{ color: "text.secondary" }}><ArrowLeft size={14} /></ListItemIcon>
          <ListItemText primary={<Typography variant="body2">Insert Column Left</Typography>} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            editor.chain().focus().addColumnAfter().run();
            setColMenuAnchor(null);
          }}
        >
          <ListItemIcon sx={{ color: "text.secondary" }}><ArrowRight size={14} /></ListItemIcon>
          <ListItemText primary={<Typography variant="body2">Insert Column Right</Typography>} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            editor.chain().focus().deleteColumn().run();
            setColMenuAnchor(null);
          }}
          sx={{ color: "error.light" }}
        >
          <ListItemIcon sx={{ color: "error.light" }}><Trash2 size={14} /></ListItemIcon>
          <ListItemText primary={<Typography variant="body2">Delete Column</Typography>} />
        </MenuItem>
      </Menu>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      {/* Alignment Controls */}
      <Tooltip title="Align Column Left" arrow>
        <IconButton
          size="small"
          onClick={() => handleAlignColumn("left")}
          sx={{ color: "text.secondary", "&:hover": { color: "primary.light" } }}
        >
          <AlignLeft size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Align Column Center" arrow>
        <IconButton
          size="small"
          onClick={() => handleAlignColumn("center")}
          sx={{ color: "text.secondary", "&:hover": { color: "primary.light" } }}
        >
          <AlignCenter size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Align Column Right" arrow>
        <IconButton
          size="small"
          onClick={() => handleAlignColumn("right")}
          sx={{ color: "text.secondary", "&:hover": { color: "primary.light" } }}
        >
          <AlignRight size={14} />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      {/* Header Cell Toggles */}
      <Tooltip title="Toggle Header Row" arrow>
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          sx={{ color: "text.secondary", "&:hover": { color: "primary.light" } }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
            <Heading size={12} />
            <span style={{ fontSize: "7px", fontWeight: 700 }}>Row</span>
          </Box>
        </IconButton>
      </Tooltip>
      <Tooltip title="Toggle Header Column" arrow>
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
          sx={{ color: "text.secondary", "&:hover": { color: "primary.light" } }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
            <Heading size={12} />
            <span style={{ fontSize: "7px", fontWeight: 700 }}>Col</span>
          </Box>
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      {/* Delete Table */}
      <Tooltip title="Delete Table" arrow>
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().deleteTable().run()}
          sx={{
            color: "text.secondary",
            "&:hover": { color: "error.main", backgroundColor: "rgba(239, 68, 68, 0.1)" },
          }}
        >
          <LayoutGrid size={14} style={{ color: "rgba(239, 68, 68, 0.8)" }} />
        </IconButton>
      </Tooltip>
    </Paper>
  );
};
