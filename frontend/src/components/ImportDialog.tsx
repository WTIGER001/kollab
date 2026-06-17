import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert
} from "@mui/material";
import { Upload, FileUp, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";
import { importDocumentHierarchy } from "../services/api";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  teamId: string;
  projectId: string | null;
  parentId: string | null;
  onImportSuccess: (newDocId: string) => void;
}

interface TreePreview {
  title: string;
  totalPages: number;
  maxDepth: number;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onClose,
  teamId,
  projectId,
  parentId,
  onImportSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [treeData, setTreeData] = useState<any>(null);
  const [preview, setPreview] = useState<TreePreview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateTreeInfo = (node: any, depth: number): { count: number; depth: number } => {
    if (!node) return { count: 0, depth: 0 };
    let count = 1;
    let maxChildDepth = 0;
    
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        const info = calculateTreeInfo(child, depth + 1);
        count += info.count;
        if (info.depth > maxChildDepth) {
          maxChildDepth = info.depth;
        }
      }
    }
    
    return { count, depth: maxChildDepth + 1 };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    if (selectedFile.type !== "application/json" && !selectedFile.name.endsWith(".json")) {
      setError("Please select a valid JSON (.json) file exported from Arkollab.");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setTreeData(null);
    setPreview(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.title || parsed.content === undefined) {
          throw new Error("Invalid document structure. Title and content fields are required.");
        }
        
        const treeInfo = calculateTreeInfo(parsed, 1);
        setTreeData(parsed);
        setPreview({
          title: parsed.title,
          totalPages: treeInfo.count,
          maxDepth: treeInfo.depth
        });
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to parse JSON file structure. Make sure it is a valid export file.");
        setFile(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleImport = async () => {
    if (!treeData) return;
    setLoading(true);
    setError(null);
    try {
      const result = await importDocumentHierarchy(teamId, projectId, parentId, treeData);
      if (result && result.id) {
        onImportSuccess(result.id);
        onClose();
        // Reset states
        setFile(null);
        setTreeData(null);
        setPreview(null);
      } else {
        throw new Error("Import failed to return document details.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Import operation failed.");
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
        Import Page Hierarchy
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: "12px", borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2, fontSize: "13px" }}>
          Upload a <strong>JSON (.json)</strong> exported hierarchy file to recreate page structures in this workspace.
        </Typography>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
          accept=".json"
        />

        <Box
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: "2px dashed",
            borderColor: dragOver ? "primary.main" : "var(--border-color, #e5e7eb)",
            borderRadius: 3,
            p: 3,
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: dragOver ? "rgba(37, 99, 235, 0.05)" : "transparent",
            "&:hover": {
              borderColor: "primary.main",
              backgroundColor: "rgba(37, 99, 235, 0.02)"
            },
            transition: "all 0.2s"
          }}
        >
          <Upload size={32} style={{ color: "var(--text-secondary, #6b7280)", marginBottom: "8px" }} />
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "13px", mb: 0.5 }}>
            {file ? file.name : "Drag & Drop JSON file here"}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
            {file ? "Click to change file" : "or click to browse from explorer"}
          </Typography>
        </Box>

        {preview && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 2,
              backgroundColor: "rgba(16, 185, 129, 0.05)",
              border: "1px solid rgba(16, 185, 129, 0.2)"
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <CheckCircle2 size={16} style={{ color: "#10b981" }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px" }}>
                Ready to Import
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, pl: 1 }}>
              <Typography variant="caption" sx={{ display: "block", color: "text.primary" }}>
                <strong>Root Document:</strong> {preview.title}
              </Typography>
              <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                <strong>Total Pages:</strong> {preview.totalPages}
              </Typography>
              <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                <strong>Hierarchy Depth:</strong> {preview.maxDepth} levels
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} size="small" sx={{ fontFamily: '"Outfit", sans-serif', textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={loading || !treeData}
          variant="contained"
          size="small"
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <FileUp size={14} />}
          sx={{
            fontFamily: '"Outfit", sans-serif',
            textTransform: "none",
            boxShadow: "none",
            "&:hover": { boxShadow: "none" }
          }}
        >
          {loading ? "Importing..." : "Confirm Import"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
