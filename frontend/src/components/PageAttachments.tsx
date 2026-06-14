import React, { useState } from "react";
import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  CircularProgress, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Divider,
  Tooltip
} from "@mui/material";
import { 
  Paperclip, 
  ChevronDown, 
  ChevronRight, 
  Download, 
  Eye, 
  Trash2, 
  FileUp, 
  Loader2, 
  File, 
  FileText, 
  Image as ImageIcon, 
  BookOpen 
} from "lucide-react";
import { 
  uploadAttachment, 
  deleteAttachment 
} from "../services/api";
import type { Attachment } from "../services/api";

interface PageAttachmentsProps {
  docId: string;
  authToken: string | null;
  isEditable?: boolean;
  attachments: Attachment[];
  onRefresh: () => Promise<void>;
  loading?: boolean;
}

export const PageAttachments: React.FC<PageAttachmentsProps> = ({
  docId,
  authToken,
  isEditable = false,
  attachments,
  onRefresh,
  loading = false
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  
  // Preview dialog states
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const handleUploadFiles = async (files: FileList) => {
    if (!isEditable || files.length === 0 || uploading) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadAttachment(docId, files[i]);
      }
      await onRefresh();
    } catch (err) {
      console.error("Failed to upload attachment:", err);
      alert("Failed to upload attachment. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isEditable) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (isEditable && e.dataTransfer.files) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await handleUploadFiles(e.target.files);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteAttachment(deleteTarget.id);
      await onRefresh();
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete attachment:", err);
      alert("Failed to delete attachment.");
    } finally {
      setDeleting(false);
    }
  };

  const openPreview = async (attachment: Attachment) => {
    setPreviewAttachment(attachment);
    setPreviewContent(null);

    const isText = 
      attachment.mimeType.startsWith("text/") || 
      attachment.mimeType === "application/json" ||
      attachment.mimeType === "application/javascript" ||
      attachment.filename.endsWith(".md") ||
      attachment.filename.endsWith(".json") ||
      attachment.filename.endsWith(".log") ||
      attachment.filename.endsWith(".txt") ||
      attachment.filename.endsWith(".csv");

    if (isText) {
      setPreviewLoading(true);
      try {
        const downloadUrl = `http://localhost:8080/api/attachments/${attachment.id}`;
        const headers: HeadersInit = {};
        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`;
        }
        const res = await fetch(downloadUrl, { headers });
        if (res.ok) {
          const text = await res.text();
          setPreviewContent(text);
        } else {
          setPreviewContent("Failed to load text preview content.");
        }
      } catch (err) {
        console.error("Error fetching text preview:", err);
        setPreviewContent("Error loading text preview.");
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const closePreview = () => {
    setPreviewAttachment(null);
    setPreviewContent(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string, filename: string) => {
    const mt = mimeType.toLowerCase();
    const fn = filename.toLowerCase();
    if (mt.startsWith("image/")) {
      return <ImageIcon size={18} style={{ color: "#10b981" }} />; // Emerald
    }
    if (mt === "application/pdf") {
      return <BookOpen size={18} style={{ color: "#ef4444" }} />; // Red
    }
    if (
      mt.startsWith("text/") || 
      fn.endsWith(".txt") || 
      fn.endsWith(".md") || 
      fn.endsWith(".json")
    ) {
      return <FileText size={18} style={{ color: "#3b82f6" }} />; // Blue
    }
    return <File size={18} style={{ color: "#9ca3af" }} />; // Gray
  };

  return (
    <Box sx={{ mt: 4, mb: 2 }}>
      {/* Header Panel */}
      <Box 
        onClick={() => setIsExpanded(!isExpanded)}
        sx={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          cursor: "pointer",
          py: 1.5,
          userSelect: "none",
          "&:hover": {
            opacity: 0.85
          }
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Paperclip size={18} style={{ color: "var(--primary-color, #8b5cf6)" }} />
          <Typography 
            variant="h6" 
            sx={{ 
              fontSize: "16px", 
              fontWeight: 700, 
              color: "text.primary",
              fontFamily: '"Outfit", sans-serif'
            }}
          >
            Attachments {attachments.length > 0 ? `(${attachments.length})` : ""}
          </Typography>
        </Box>
        {isExpanded ? (
          <ChevronDown size={18} style={{ color: "var(--text-secondary)" }} />
        ) : (
          <ChevronRight size={18} style={{ color: "var(--text-secondary)" }} />
        )}
      </Box>

      <Divider sx={{ mb: 2, borderColor: "var(--border-color)" }} />

      {isExpanded && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Attachments List */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={24} sx={{ color: "var(--primary-color)" }} />
            </Box>
          ) : attachments.length === 0 ? (
            <Typography 
              variant="body2" 
              sx={{ 
                color: "text.secondary", 
                py: 2, 
                fontStyle: "italic",
                fontSize: "13px",
                fontFamily: '"Outfit", sans-serif'
              }}
            >
              No attachments yet.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {attachments.map(att => (
                <Box 
                  key={att.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-color)",
                    transition: "all 0.2s",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      borderColor: "rgba(255, 255, 255, 0.15)"
                    }
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1 }}>
                    {getFileIcon(att.mimeType, att.filename)}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography 
                        variant="body2" 
                        noWrap
                        sx={{ 
                          fontWeight: 600, 
                          color: "text.primary", 
                          fontSize: "13px",
                          fontFamily: '"Outfit", sans-serif'
                        }}
                      >
                        {att.filename}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: "text.secondary", 
                          fontSize: "11px",
                          fontFamily: '"Outfit", sans-serif'
                        }}
                      >
                        {formatFileSize(att.fileSize)} • Uploaded on {new Date(att.uploadedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {/* View/Preview Option */}
                    {(att.mimeType.startsWith("image/") || 
                      att.mimeType === "application/pdf" || 
                      att.mimeType.startsWith("text/") || 
                      att.filename.endsWith(".md") || 
                      att.filename.endsWith(".json")) && (
                      <Tooltip title="Preview Inline">
                        <IconButton 
                          size="small" 
                          onClick={() => openPreview(att)}
                          sx={{ color: "text.secondary", "&:hover": { color: "primary.light" } }}
                        >
                          <Eye size={16} />
                        </IconButton>
                      </Tooltip>
                    )}

                    {/* Download Link */}
                    <Tooltip title="Download">
                      <IconButton 
                        size="small" 
                        component="a"
                        href={`http://localhost:8080/api/attachments/${att.id}`}
                        download={att.filename}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: "text.secondary", "&:hover": { color: "primary.light" } }}
                      >
                        <Download size={16} />
                      </IconButton>
                    </Tooltip>

                    {/* Delete Option */}
                    {isEditable && (
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small" 
                          onClick={() => setDeleteTarget(att)}
                          sx={{ color: "text.secondary", "&:hover": { color: "error.light" } }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* Upload Drag & Drop Zone */}
          {isEditable && (
            <Box
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                border: "2px dashed",
                borderColor: isDragActive 
                  ? "var(--primary-color, #8b5cf6)" 
                  : "rgba(255, 255, 255, 0.1)",
                borderRadius: 3,
                p: 3,
                textAlign: "center",
                cursor: "pointer",
                backgroundColor: isDragActive 
                  ? "rgba(139, 92, 246, 0.05)" 
                  : "rgba(0, 0, 0, 0.1)",
                transition: "all 0.2s ease",
                position: "relative",
                "&:hover": {
                  borderColor: "var(--primary-color, #8b5cf6)",
                  backgroundColor: "rgba(139, 92, 246, 0.02)"
                }
              }}
              component="label"
            >
              <input 
                type="file" 
                multiple 
                style={{ display: "none" }} 
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {uploading ? (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={24} sx={{ color: "var(--primary-color)" }} />
                  <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "13px", fontWeight: 600 }}>
                    Uploading attachments...
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  <FileUp size={24} style={{ color: "var(--primary-color, #8b5cf6)" }} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: "text.primary", 
                      fontSize: "13px", 
                      fontWeight: 600,
                      fontFamily: '"Outfit", sans-serif'
                    }}
                  >
                    Drag & drop files here, or click to browse
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: "text.secondary", 
                      fontSize: "11px",
                      fontFamily: '"Outfit", sans-serif'
                    }}
                  >
                    Supports documents, images, PDFs, logs
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: "rgba(16, 18, 26, 0.95)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 3,
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
              color: "text.primary",
              maxWidth: 400,
              width: "100%",
            }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, fontFamily: '"Outfit", sans-serif', fontWeight: 700 }}>
          Delete Attachment
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "14px" }}>
            Are you sure you want to delete <strong>{deleteTarget?.filename}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            sx={{
              color: "text.secondary",
              textTransform: "none",
              fontFamily: '"Outfit", sans-serif',
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.05)" }
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
            sx={{
              backgroundColor: "error.main",
              color: "#ffffff",
              textTransform: "none",
              fontWeight: 600,
              fontFamily: '"Outfit", sans-serif',
              "&:hover": {
                backgroundColor: "error.dark",
              }
            }}
          >
            {deleting ? <Loader2 className="animate-spin" size={16} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Inline Preview Dialog */}
      <Dialog
        open={previewAttachment !== null}
        onClose={closePreview}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              backgroundColor: "rgba(16, 18, 26, 0.95)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 3,
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
              color: "text.primary",
              height: "85vh",
              display: "flex",
              flexDirection: "column"
            }
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          fontFamily: '"Outfit", sans-serif', 
          fontWeight: 700,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', fontSize: "16px" }}>
            Preview: {previewAttachment?.filename}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ flex: 1, p: 0, borderColor: "rgba(255,255,255,0.06)", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
          {previewAttachment && (
            <Box sx={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
              {previewAttachment.mimeType.startsWith("image/") ? (
                <Box 
                  component="img"
                  src={`http://localhost:8080/api/attachments/${previewAttachment.id}`}
                  alt={previewAttachment.filename}
                  sx={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    p: 1
                  }}
                />
              ) : previewAttachment.mimeType === "application/pdf" ? (
                <Box 
                  component="iframe"
                  src={`http://localhost:8080/api/attachments/${previewAttachment.id}`}
                  title={previewAttachment.filename}
                  sx={{
                    width: "100%",
                    height: "100%",
                    border: "none"
                  }}
                />
              ) : previewLoading ? (
                <CircularProgress size={32} sx={{ color: "var(--primary-color)" }} />
              ) : previewContent !== null ? (
                <Box
                  component="pre"
                  sx={{
                    width: "100%",
                    height: "100%",
                    p: 3,
                    m: 0,
                    fontSize: "13px",
                    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    color: "text.primary",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all"
                  }}
                >
                  {previewContent}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Unable to load preview.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={closePreview}
            sx={{
              color: "text.secondary",
              textTransform: "none",
              fontFamily: '"Outfit", sans-serif',
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.05)" }
            }}
          >
            Close
          </Button>
          {previewAttachment && (
            <Button
              variant="contained"
              component="a"
              href={`http://localhost:8080/api/attachments/${previewAttachment.id}`}
              download={previewAttachment.filename}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                backgroundColor: "var(--primary-color, #8b5cf6)",
                color: "#ffffff",
                textTransform: "none",
                fontWeight: 600,
                fontFamily: '"Outfit", sans-serif',
                "&:hover": {
                  backgroundColor: "var(--primary-dark)",
                }
              }}
            >
              Download File
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
