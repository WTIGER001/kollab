import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, InputBase } from "@mui/material";
import { Sparkles } from "lucide-react";

const dialogPaper = {
  "& .MuiDialog-paper": {
    backgroundColor: "var(--panel-color)",
    backgroundImage: "none",
    border: "1px solid var(--border-color)",
    borderRadius: "12px",
    color: "var(--text-primary)",
    p: 1,
  },
};

export const CheckpointDialog = ({
  open,
  description,
  saving,
  generating,
  onDescription,
  onClose,
  onSkip,
  onSave,
  onGenerate,
}: {
  open: boolean;
  description: string;
  saving: boolean;
  generating: boolean;
  onDescription: (value: string) => void;
  onClose: () => void;
  onSkip: () => void;
  onSave: () => void;
  onGenerate: () => void;
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth sx={dialogPaper}>
    <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>Save Version Checkpoint</DialogTitle>
    <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <DialogContentText sx={{ color: "var(--text-secondary)", fontSize: "13px", mb: 1 }}>
        Describe your changes to create a named checkpoint in the document version history. This keeps the live page visible. An approved content review is what share links and excerpts use.
      </DialogContentText>
      <InputBase
        autoFocus
        placeholder="Change Description"
        fullWidth
        value={description}
        onChange={(event) => onDescription(event.target.value)}
        disabled={generating}
        sx={{
          fontSize: "13px",
          fontFamily: '"Inter", sans-serif',
          color: "var(--text-primary)",
          backgroundColor: "color-mix(in srgb, var(--text-primary) 8%, transparent)",
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          px: 1.5,
          py: 1,
          mb: 1,
          "&.Mui-focused": {
            borderColor: "var(--primary-color)",
            boxShadow: "0 0 0 2px color-mix(in srgb, var(--primary-color) 15%, transparent)",
          },
        }}
      />
      <Button
        size="small"
        variant="outlined"
        onClick={onGenerate}
        disabled={generating}
        sx={{
          alignSelf: "flex-start",
          fontSize: "11px",
          fontFamily: '"Outfit", sans-serif',
          fontWeight: 600,
          textTransform: "none",
          color: "var(--primary-text-color)",
          borderColor: "color-mix(in srgb, var(--primary-color) 30%, transparent)",
          "&:hover": {
            borderColor: "var(--primary-color)",
            backgroundColor: "color-mix(in srgb, var(--primary-color) 8%, transparent)",
          },
        }}
        startIcon={generating ? <CircularProgress size={12} color="inherit" /> : <Sparkles size={12} />}
      >
        {generating ? "Generating..." : "Auto-generate using AI"}
      </Button>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2, display: "flex", justifyContent: "space-between" }}>
      <Button onClick={onSkip} sx={{ color: "var(--text-secondary)", textTransform: "none", fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: "12px" }}>Skip Checkpoint</Button>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button onClick={onClose} sx={{ color: "var(--text-secondary)", textTransform: "none", fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: "12px" }}>Cancel</Button>
        <Button onClick={onSave} variant="contained" disabled={generating || saving} sx={{ backgroundColor: "var(--primary-color)", color: "var(--primary-contrast)", textTransform: "none", fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: "12px", px: 2 }}>
          {saving ? "Saving..." : "Save checkpoint"}
        </Button>
      </Box>
    </DialogActions>
  </Dialog>
);

export const IdleSessionDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <Dialog open={open} onClose={onClose} sx={dialogPaper}>
    <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>Session Idle Timeout</DialogTitle>
    <DialogContent>
      <DialogContentText sx={{ color: "var(--text-secondary)", fontSize: "14px" }}>
        You have been checked out due to 10 minutes of inactivity. Your edits were saved as a checkpoint.
      </DialogContentText>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose} variant="contained" sx={{ backgroundColor: "var(--primary-color)", color: "var(--primary-contrast)", textTransform: "none", fontFamily: '"Outfit", sans-serif', fontWeight: 600, px: 3 }}>Got it</Button>
    </DialogActions>
  </Dialog>
);
