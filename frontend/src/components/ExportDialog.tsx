import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Box,
  Typography,
  CircularProgress,
  Alert
} from "@mui/material";
import { FileDown, FileText, Globe, Cpu, FileSignature } from "lucide-react";
import { downloadDocumentExport } from "../services/api";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  hasChildren?: boolean;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  documentId,
  documentTitle,
  hasChildren = true
}) => {
  const [format, setFormat] = useState<string>("pdf");
  const [hierarchy, setHierarchy] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      await downloadDocumentExport(documentId, format, hierarchy, documentTitle);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Export operation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          border: "1px solid var(--border-color, #e5e7eb)",
          backgroundColor: "var(--panel-color, #ffffff)",
          color: "var(--text-color, #1f2937)",
          p: 1
        }
      }}
    >
      <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: "18px", pb: 1 }}>
        Export Document
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: "12px", borderRadius: 2 }}>
            {error}
          </Alert>
        )}
        
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2, fontSize: "13px" }}>
          Choose your desired format and options to download <strong>{documentTitle}</strong>.
        </Typography>

        <RadioGroup value={format} onChange={(e) => setFormat(e.target.value)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, my: 1 }}>
            
            {/* PDF format */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: format === "pdf" ? "primary.main" : "var(--border-color, #e5e7eb)",
                backgroundColor: format === "pdf" ? "rgba(37, 99, 235, 0.05)" : "transparent",
                transition: "all 0.2s"
              }}
            >
              <Radio value="pdf" sx={{ p: 0, mr: 1.5 }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
                <FileSignature size={18} style={{ color: "#ef4444" }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px" }}>PDF Document (.pdf)</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Pixel-perfect offline format with full layout</Typography>
                </Box>
              </Box>
            </Box>

            {/* Word DOCX format */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: format === "word" ? "primary.main" : "var(--border-color, #e5e7eb)",
                backgroundColor: format === "word" ? "rgba(37, 99, 235, 0.05)" : "transparent",
                transition: "all 0.2s"
              }}
            >
              <Radio value="word" sx={{ p: 0, mr: 1.5 }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
                <FileText size={18} style={{ color: "#2563eb" }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px" }}>Microsoft Word (.docx)</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Editable document compatible with MS Word</Typography>
                </Box>
              </Box>
            </Box>

            {/* HTML format */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: format === "html" ? "primary.main" : "var(--border-color, #e5e7eb)",
                backgroundColor: format === "html" ? "rgba(37, 99, 235, 0.05)" : "transparent",
                transition: "all 0.2s"
              }}
            >
              <Radio value="html" sx={{ p: 0, mr: 1.5 }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
                <Globe size={18} style={{ color: "#10b981" }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px" }}>Web Page (.html / .zip)</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Self-contained HTML or zipped directory tree</Typography>
                </Box>
              </Box>
            </Box>

            {/* JSON format */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: format === "json" ? "primary.main" : "var(--border-color, #e5e7eb)",
                backgroundColor: format === "json" ? "rgba(37, 99, 235, 0.05)" : "transparent",
                transition: "all 0.2s"
              }}
            >
              <Radio value="json" sx={{ p: 0, mr: 1.5 }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
                <Cpu size={18} style={{ color: "#8b5cf6" }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px" }}>Portable Data (.json)</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Export page tree structure for migrations</Typography>
                </Box>
              </Box>
            </Box>

          </Box>
        </RadioGroup>

        {hasChildren && (
          <Box sx={{ mt: 2, borderTop: "1px solid var(--border-color, #e5e7eb)", pt: 1.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={hierarchy}
                  onChange={(e) => setHierarchy(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "13px" }}>
                    Export page hierarchy
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                    Recursively exports all subpages and folders nested under this page
                  </Typography>
                </Box>
              }
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} size="small" sx={{ fontFamily: '"Outfit", sans-serif', textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          disabled={loading}
          variant="contained"
          size="small"
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <FileDown size={14} />}
          sx={{
            fontFamily: '"Outfit", sans-serif',
            textTransform: "none",
            boxShadow: "none",
            "&:hover": { boxShadow: "none" }
          }}
        >
          {loading ? "Exporting..." : "Export"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
