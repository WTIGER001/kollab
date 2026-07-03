import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Grid,
  IconButton,
  Button,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton
} from "@mui/material";
import { Upload, Trash2, Edit2, Check, X, LayoutGrid, Square } from "lucide-react";
import { useParams } from "react-router-dom";
import { fetchLibraryImages, uploadLibraryImage, updateLibraryImageName, deleteLibraryImage } from "../services/api";
import type { LibraryImage } from "../services/api";

interface ImageLibraryViewProps {
  scope: "system" | "team" | "project" | "personal";
}

export const ImageLibraryView: React.FC<ImageLibraryViewProps> = ({ scope }) => {
  const { teamId, projectId } = useParams();
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [gridSize, setGridSize] = useState<"small" | "large">("large");
  const [lightboxImage, setLightboxImage] = useState<LibraryImage | null>(null);

  useEffect(() => {
    loadImages();
  }, [scope, teamId, projectId]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const data = await fetchLibraryImages(scope, teamId, projectId);
      setImages(data || []);
    } catch (err) {
      console.error("Failed to load library images", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      // NOTE: This will throw until the backend is implemented
      const newImage = await uploadLibraryImage(file, scope, teamId, projectId);
      setImages([newImage, ...images]);
    } catch (err) {
      console.error("Failed to upload image", err);
      alert(`Failed to upload image: ${err}`);
    }
    // Reset file input
    e.target.value = "";
  };

  const handleStartEdit = (img: LibraryImage) => {
    setEditingId(img.id);
    setEditName(img.displayName);
  };

  const handleSaveEdit = async (img: LibraryImage) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      // NOTE: This will throw until backend is implemented
      const updated = await updateLibraryImageName(img.id, editName);
      setImages(images.map((i) => (i.id === img.id ? updated : i)));
    } catch (err) {
      console.error("Failed to update name", err);
      alert(`Failed to update name: ${err}`);
    } finally {
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this image? It will break anywhere it is currently used.")) {
      try {
        await deleteLibraryImage(id);
        setImages(images.filter((i) => i.id !== id));
      } catch (err) {
        console.error("Failed to delete image", err);
        alert(`Failed to delete image: ${err}`);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const getScopeTitle = () => {
    switch (scope) {
      case "system": return "System Global Image Library";
      case "team": return "Team Image Library";
      case "project": return "Project Image Library";
      case "personal": return "Personal Image Library";
      default: return "Image Library";
    }
  };

  return (
    <Box sx={{ p: 4, width: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 4, width: "100%" }}>
        <Typography variant="h4" fontWeight="bold" sx={{ textAlign: "left" }}>
          {getScopeTitle()}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <ToggleButtonGroup
            value={gridSize}
            exclusive
            onChange={(e, newVal) => {
              if (newVal !== null) setGridSize(newVal);
            }}
            size="small"
            aria-label="grid size"
          >
            <ToggleButton value="small" aria-label="small cards">
              <LayoutGrid size={18} />
            </ToggleButton>
            <ToggleButton value="large" aria-label="large cards">
              <Square size={18} />
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            component="label"
            startIcon={<Upload size={18} />}
            sx={{ borderRadius: "8px", textTransform: "none" }}
          >
            Upload Image
            <input type="file" hidden accept="image/*" onChange={handleUpload} />
          </Button>
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : images.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 8, p: 6, border: '1px dashed #ccc', borderRadius: '12px', bgcolor: 'background.paper' }}>
          <Typography variant="h6" color="text.secondary" mb={2}>
            No images in this library yet.
          </Typography>
          <Typography color="text.secondary">
            Upload an image to get started. Images added here can be used in Hero banners and documents.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, alignItems: "stretch" }}>
          {images.map((img) => (
            <Card 
              key={img.id}
              sx={{ 
                width: gridSize === "large" ? 300 : 150, 
                display: "grid", 
                gridTemplateRows: "auto 1fr", 
                borderRadius: "12px", 
                boxShadow: 1 
              }}
            >
              <Box sx={{ width: "100%", height: gridSize === "large" ? 300 : 150, bgcolor: "#f5f5f5" }}>
                <CardMedia
                  component="img"
                  image={img.url}
                  alt={img.displayName}
                  onClick={() => setLightboxImage(img)}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    p: 1,
                    cursor: "pointer"
                  }}
                />
              </Box>
              <CardContent sx={{ minWidth: 0, p: gridSize === "large" ? 2 : 1, "&:last-child": { pb: gridSize === "large" ? 2 : 1 } }}>
                {editingId === img.id ? (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, width: "100%" }}>
                      <TextField
                        size="small"
                        fullWidth
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(img);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <IconButton size="small" color="success" onClick={() => handleSaveEdit(img)}>
                        <Check size={16} />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setEditingId(null)}>
                        <X size={16} />
                      </IconButton>
                    </Stack>
                  ) : (
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ minWidth: 0, width: "100%" }}>
                      <Box sx={{ overflow: "hidden", minWidth: 0, flexGrow: 1 }}>
                        <Typography variant="subtitle1" fontWeight="600" noWrap title={img.displayName} mb={0.5}>
                          {img.displayName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" component="div" mb={0.5} noWrap>
                          {gridSize === "large" ? "Size: " : ""}{formatSize(img.sizeBytes)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" component="div" mb={0.5} noWrap title={img.mimeType}>
                          {gridSize === "large" ? "Type: " : ""}{img.mimeType}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" component="div" noWrap title={img.uploaderName || img.uploadedBy}>
                          {gridSize === "large" ? "Uploaded by: " : ""}{img.uploaderName || img.uploadedBy}
                        </Typography>
                      </Box>
                      <Stack direction="column" spacing={0.5} flexShrink={0}>
                        <Tooltip title="Rename">
                          <IconButton size="small" onClick={() => handleStartEdit(img)}>
                            <Edit2 size={14} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(img.id)}>
                            <Trash2 size={14} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  )}
                </CardContent>
              </Card>
          ))}
        </Box>
      )}

      {/* Lightbox Dialog */}
      <Dialog
        open={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "transparent",
            boxShadow: "none",
            backgroundImage: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }
        }}
      >
        <Box sx={{ position: "relative", width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
          {lightboxImage && (
            <img
              src={lightboxImage.url}
              alt={lightboxImage.displayName}
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "8px",
                backgroundColor: "rgba(0,0,0,0.8)"
              }}
              onClick={() => setLightboxImage(null)}
            />
          )}
        </Box>
      </Dialog>
    </Box>
  );
};
