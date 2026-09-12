import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  IconButton
} from "@mui/material";
import { X, Link as LinkIcon, CheckCircle, AlertCircle } from "lucide-react";
import { checkSlug, updateDocument } from "../services/api";
import type { Document } from "../services/api";

interface PageSettingsModalProps {
  open: boolean;
  onClose: () => void;
  document: Document;
  onUpdate: (doc: Document) => void;
  showToast: (msg: string, sev: "success" | "error" | "info" | "warning") => void;
}

export const PageSettingsModal: React.FC<PageSettingsModalProps> = ({
  open,
  onClose,
  document,
  onUpdate,
  showToast,
}) => {
  const [slug, setSlug] = useState(document.slug || "");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSlug(document.slug || "");
      setAvailable(null);
    }
  }, [open, document.slug]);

  // Debounced check for slug availability
  useEffect(() => {
    if (!open) return;
    if (slug === document.slug || slug.trim() === "") {
      setAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await checkSlug(slug, document.id);
        setAvailable(res.available);
      } catch (err) {
        console.error("Failed to check slug", err);
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug, document.id, document.slug, open]);

  const handleSave = async () => {
    if (slug !== document.slug && available === false) {
      showToast("Custom URL slug is not available.", "error");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateDocument(
        document.id,
        document.title,
        document.content,
        "Updated Page Settings",
        slug
      );
      onUpdate(updated);
      showToast("Page settings updated.", "success");
      onClose();
    } catch (err: any) {
      showToast(err.message || "Failed to update page settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: {
      sx: {
        bgcolor: "var(--bg-color)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-color)",
        backgroundImage: "none",
        boxShadow: "var(--shadow-elevation)"
      }
    } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>Page Settings</Typography>
        <IconButton onClick={onClose} sx={{ color: "var(--text-secondary)" }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers sx={{ borderColor: "var(--border-color)" }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ color: "var(--text-secondary)", mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinkIcon size={16} />
            Page URL Slug
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            placeholder="custom-page-name"
            helperText={
              checking ? "Checking availability..." :
              available === true ? (
                <span style={{ color: "#4caf50", display: "flex", alignItems: "center", gap: "4px" }}>
                  <CheckCircle size={14} /> Available
                </span>
              ) : available === false ? (
                <span style={{ color: "#f44336", display: "flex", alignItems: "center", gap: "4px" }}>
                  <AlertCircle size={14} /> Not available
                </span>
              ) : "Custom alias for linking to this document."
            }
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "var(--panel-color)",
                color: "var(--text-primary)",
                "& fieldset": { borderColor: "var(--border-color)" },
                "&:hover fieldset": { borderColor: "var(--accent-color)" },
                "&.Mui-focused fieldset": { borderColor: "var(--primary-color)" },
              },
              "& .MuiFormHelperText-root": {
                color: "var(--text-secondary)"
              }
            }} slotProps={{ input: {
              startAdornment: <Typography sx={{ color: "var(--text-secondary)", mr: 1, userSelect: "none" }}>/</Typography>
            } }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={onClose} 
          sx={{ color: "var(--text-secondary)" }}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={saving || (slug !== document.slug && available === false)}
          sx={{
            bgcolor: "var(--primary-color)",
            color: "#fff",
            "&:hover": { bgcolor: "var(--primary-color)", filter: "brightness(0.9)" }
          }}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
