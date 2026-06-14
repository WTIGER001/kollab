import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  Divider,
} from "@mui/material";

interface TableCreatorDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rows: number, cols: number, withHeaderRow: boolean) => void;
}

export const TableCreatorDialog: React.FC<TableCreatorDialogProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [rows, setRows] = useState<number>(3);
  const [cols, setCols] = useState<number>(3);
  const [withHeaderRow, setWithHeaderRow] = useState<boolean>(true);

  // Visual grid picker hover states (1-indexed, 0 means no hover)
  const [hoveredRows, setHoveredRows] = useState<number>(0);
  const [hoveredCols, setHoveredCols] = useState<number>(0);

  const GRID_SIZE = 8;

  const handleGridCellHover = (rIndex: number, cIndex: number) => {
    setHoveredRows(rIndex + 1);
    setHoveredCols(cIndex + 1);
  };

  const handleGridCellClick = (rIndex: number, cIndex: number) => {
    onSubmit(rIndex + 1, cIndex + 1, withHeaderRow);
    onClose();
  };

  const handleSubmitManual = () => {
    onSubmit(rows, cols, withHeaderRow);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            backgroundColor: "rgba(16, 18, 26, 0.95)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 3,
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
            color: "text.primary",
            maxWidth: 480,
            width: "100%",
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, fontFamily: '"Outfit", sans-serif', fontWeight: 700 }}>
        Insert Table
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 3, mt: 1 }}>
          {/* Visual Grid Picker */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <Typography variant="caption" sx={{ color: "text.disabled", mb: 1.5, fontWeight: 600 }}>
              Drag to select grid
            </Typography>
            
            <Box
              onMouseLeave={() => {
                setHoveredRows(0);
                setHoveredCols(0);
              }}
              sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                gap: "4px",
                p: 1.5,
                borderRadius: 2,
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.04)",
              }}
            >
              {Array.from({ length: GRID_SIZE }).map((_, rIdx) =>
                Array.from({ length: GRID_SIZE }).map((_, cIdx) => {
                  const isHovered = rIdx < hoveredRows && cIdx < hoveredCols;
                  return (
                    <Box
                      key={`${rIdx}-${cIdx}`}
                      onMouseEnter={() => handleGridCellHover(rIdx, cIdx)}
                      onClick={() => handleGridCellClick(rIdx, cIdx)}
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: "3px",
                        cursor: "pointer",
                        border: "1px solid",
                        borderColor: isHovered ? "rgba(139, 92, 246, 0.5)" : "rgba(255, 255, 255, 0.06)",
                        backgroundColor: isHovered
                          ? "rgba(139, 92, 246, 0.45)"
                          : "rgba(255, 255, 255, 0.04)",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          transform: "scale(1.1)",
                        },
                      }}
                    />
                  );
                })
              )}
            </Box>

            <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 700, color: "primary.light" }}>
              {hoveredRows > 0 ? `${hoveredCols} × ${hoveredRows}` : `${cols} × ${rows}`} Table
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />

          {/* Manual Input Fields */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, justifyContent: "center" }}>
            <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>
              Or configure manually
            </Typography>
            
            <TextField
              label="Columns"
              type="number"
              size="small"
              value={cols}
              onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
              slotProps={{ htmlInput: { min: 1 } }}
              sx={{
                "& label": { color: "text.secondary" },
                "& label.Mui-focused": { color: "primary.light" },
                "& .MuiOutlinedInput-root": {
                  color: "text.primary",
                  backgroundColor: "rgba(0,0,0,0.15)",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.08)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.15)" },
                  "&.Mui-focused fieldset": { borderColor: "primary.light" },
                },
              }}
            />

            <TextField
              label="Rows"
              type="number"
              size="small"
              value={rows}
              onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
              slotProps={{ htmlInput: { min: 1 } }}
              sx={{
                "& label": { color: "text.secondary" },
                "& label.Mui-focused": { color: "primary.light" },
                "& .MuiOutlinedInput-root": {
                  color: "text.primary",
                  backgroundColor: "rgba(0,0,0,0.15)",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.08)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.15)" },
                  "&.Mui-focused fieldset": { borderColor: "primary.light" },
                },
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={withHeaderRow}
                  onChange={(e) => setWithHeaderRow(e.target.checked)}
                  sx={{
                    color: "rgba(255, 255, 255, 0.3)",
                    "&.Mui-checked": { color: "primary.light" },
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Header Row
                </Typography>
              }
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            color: "text.secondary",
            textTransform: "none",
            "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.05)" },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmitManual}
          sx={{
            backgroundColor: "var(--accent-purple)",
            color: "#ffffff",
            textTransform: "none",
            fontWeight: 600,
            boxShadow: "0 4px 14px rgba(139, 92, 246, 0.3)",
            "&:hover": {
              backgroundColor: "rgba(139, 92, 246, 0.9)",
              boxShadow: "0 6px 20px rgba(139, 92, 246, 0.4)",
            },
          }}
        >
          Insert Table
        </Button>
      </DialogActions>
    </Dialog>
  );
};
