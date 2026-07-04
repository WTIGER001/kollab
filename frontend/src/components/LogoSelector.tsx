import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardMedia,
  CardActionArea,
  CircularProgress,
  IconButton
} from "@mui/material";
import { Image as ImageIcon, Upload, Library, X } from "lucide-react";
import { fetchLibraryImages, uploadLibraryImage, type LibraryImage } from "../services/api";

interface LogoSelectorProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  scope: "system" | "team" | "project";
  teamId?: string | null;
  projectId?: string | null;
}

export const LogoSelector: React.FC<LogoSelectorProps> = ({
  label = "Logo URL",
  value,
  onChange,
  scope,
  teamId,
  projectId
}) => {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (libraryOpen) {
      loadImages();
    }
  }, [libraryOpen, scope, teamId, projectId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const newImage = await uploadLibraryImage(file, scope, teamId, projectId);
      // Construct URL based on the response format
      onChange(newImage.url);
    } catch (err) {
      console.error("Failed to upload image", err);
      alert(`Failed to upload image: ${err}`);
    }
    e.target.value = "";
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
        {label}
      </Typography>
      
      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        {/* Preview Box */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: 2,
            border: "1px solid var(--border-color)",
            bgcolor: "background.paper",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0
          }}
        >
          {value ? (
            <img src={value} alt="Logo preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <ImageIcon size={32} color="var(--text-disabled)" />
          )}
        </Box>

        {/* Controls */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <TextField
            placeholder="https://example.com/logo.png"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            fullWidth
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "var(--border-color)" },
                "&:hover fieldset": { borderColor: "primary.main" }
              }
            }}
          />
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              component="label"
              variant="outlined"
              size="small"
              startIcon={<Upload size={16} />}
              sx={{ textTransform: "none", borderColor: "var(--border-color)", color: "text.primary" }}
            >
              Upload
              <input type="file" hidden accept="image/*" onChange={handleUpload} />
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Library size={16} />}
              onClick={() => setLibraryOpen(true)}
              sx={{ textTransform: "none", borderColor: "var(--border-color)", color: "text.primary" }}
            >
              Browse Library
            </Button>
            {value && (
              <IconButton size="small" onClick={() => onChange("")} sx={{ ml: "auto" }}>
                <X size={18} />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>

      {/* Library Dialog */}
      <Dialog open={libraryOpen} onClose={() => setLibraryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "text.primary" }}>
          Select from Image Library
          <IconButton onClick={() => setLibraryOpen(false)} size="small">
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ minHeight: 400 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : images.length === 0 ? (
            <Box sx={{ textAlign: "center", p: 4, color: "text.secondary" }}>
              <ImageIcon size={48} style={{ opacity: 0.5, marginBottom: 16 }} />
              <Typography>No images found in the library for this scope.</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {images.map((img) => (
                <Grid item xs={6} sm={4} md={3} key={img.id}>
                  <Card 
                    sx={{ 
                      borderRadius: 2, 
                      border: "1px solid var(--border-color)",
                      bgcolor: "transparent"
                    }}
                  >
                    <CardActionArea 
                      onClick={() => {
                        onChange(img.url);
                        setLibraryOpen(false);
                      }}
                    >
                      <CardMedia
                        component="img"
                        height="120"
                        image={img.url}
                        alt={img.displayName}
                        sx={{ objectFit: "contain", p: 1, bgcolor: "background.paper" }}
                      />
                      <Box sx={{ p: 1 }}>
                        <Typography variant="caption" noWrap display="block" color="text.primary">
                          {img.displayName}
                        </Typography>
                      </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLibraryOpen(false)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
