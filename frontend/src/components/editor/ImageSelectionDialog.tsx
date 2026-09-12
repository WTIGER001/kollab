import { authenticatedMediaUrl } from "../../services/api";
import { getAttachmentUrl } from "../../services/api";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  TextField,
  CircularProgress,
  Grid,
  Card,
  CardMedia,
  CardActionArea,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Upload, Paperclip, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import {
  uploadAttachment,
  fetchLibraryImages,
} from "../../services/api";
import type { Attachment, LibraryImage } from "../../services/api";

interface ImageSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (imageData: { src: string; imageId?: string; originalWidth?: number; originalHeight?: number }) => void;
  activeDocId: string | null;
  attachments: Attachment[];
  selectedTeamId?: string | null;
  selectedProjectId?: string | null;
}

export const ImageSelectionDialog: React.FC<ImageSelectionDialogProps> = ({
  open,
  onClose,
  onSelect,
  activeDocId,
  attachments,
  selectedTeamId,
  selectedProjectId,
}) => {
  const [tabIndex, setTabIndex] = useState(0);

  // Upload Tab State
  const [uploading, setUploading] = useState(false);

  // Library Tab State
  const [libraryScope, setLibraryScope] = useState<"global" | "team" | "project" | "personal">("global");
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  // URL Tab State
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState(false);

  const imageAttachments = attachments.filter((a) => a.mimeType.startsWith("image/"));

  useEffect(() => {
    if (open && tabIndex === 2) {
      loadLibraryImages(libraryScope);
    }
  }, [open, tabIndex, libraryScope]);

  const loadLibraryImages = async (scope: "global" | "team" | "project" | "personal") => {
    setLibraryLoading(true);
    try {
      const data = await fetchLibraryImages(
        scope,
        scope === "team" ? selectedTeamId : undefined,
        scope === "project" ? selectedProjectId : undefined
      );
      setLibraryImages(data);
    } catch (err) {
      console.error("Failed to fetch library images", err);
    } finally {
      setLibraryLoading(false);
    }
  };

  const handleUploadClick = () => {
    if (!activeDocId) {
      alert("Please save the document once before uploading images.");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
        const att = await uploadAttachment(activeDocId, file);
        onSelect({
          src: getAttachmentUrl(att.id),
        });
      } catch (err) {
        console.error("Failed to upload attachment:", err);
        alert("Failed to upload image. Please try again.");
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleSelectAttachment = (att: Attachment) => {
    onSelect({
      src: getAttachmentUrl(att.id),
    });
  };

  const handleSelectLibraryImage = (img: LibraryImage) => {
    onSelect({
      src: img.url,
      imageId: img.id,
    });
  };

  const handleInsertUrl = () => {
    if (urlInput.trim()) {
      onSelect({ src: urlInput.trim() });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Insert Image</DialogTitle>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} variant="fullWidth">
          <Tab icon={<Upload size={16} />} iconPosition="start" label="Upload" />
          <Tab icon={<Paperclip size={16} />} iconPosition="start" label="Attachments" />
          <Tab icon={<ImageIcon size={16} />} iconPosition="start" label="Library" />
          <Tab icon={<LinkIcon size={16} />} iconPosition="start" label="URL" />
        </Tabs>
      </Box>

      <DialogContent sx={{ minHeight: 300, display: "flex", flexDirection: "column" }}>
        {/* Upload Tab */}
        {tabIndex === 0 && (
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Button
              variant="contained"
              size="large"
              startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <Upload />}
              onClick={handleUploadClick}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Select File"}
            </Button>
          </Box>
        )}

        {/* Attachments Tab */}
        {tabIndex === 1 && (
          <Box sx={{ flexGrow: 1 }}>
            {imageAttachments.length === 0 ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                <Typography color="text.secondary">No image attachments on this page.</Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {imageAttachments.map((att) => (
                  <Grid key={att.id} sx={{ minWidth: 0 }} size={{ xs: 4 }}>
                    <Card variant="outlined">
                      <CardActionArea onClick={() => handleSelectAttachment(att)}>
                        <CardMedia component="img" height="100" image={authenticatedMediaUrl(getAttachmentUrl(att.id))} sx={{ objectFit: "cover" }} />
                        <Box sx={{ p: 1 }}>
                          <Typography variant="caption" noWrap component="div" title={att.filename}>
                            {att.filename}
                          </Typography>
                        </Box>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* Library Tab */}
        {tabIndex === 2 && (
          <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
            <FormControl size="small" sx={{ mb: 2 }}>
              <InputLabel>Library Scope</InputLabel>
              <Select
                value={libraryScope}
                label="Library Scope"
                onChange={(e) => setLibraryScope(e.target.value as any)}
              >
                <MenuItem value="global">Global</MenuItem>
                <MenuItem value="team" disabled={!selectedTeamId}>
                  Team
                </MenuItem>
                <MenuItem value="project" disabled={!selectedProjectId}>
                  Project
                </MenuItem>
                <MenuItem value="personal">Personal</MenuItem>
              </Select>
            </FormControl>

            {libraryLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : libraryImages.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No images found in {libraryScope} library.
              </Typography>
            ) : (
              <Grid container spacing={2} sx={{ overflowY: "auto", flexGrow: 1 }}>
                {libraryImages.map((img) => (
                  <Grid key={img.id} sx={{ minWidth: 0 }} size={{ xs: 4 }}>
                    <Card variant="outlined">
                      <CardActionArea onClick={() => handleSelectLibraryImage(img)}>
                        <CardMedia
                          component="img"
                          height="100"
                          image={authenticatedMediaUrl(img.url)}
                          sx={{ objectFit: "cover" }}
                        />
                        <Box sx={{ p: 1 }}>
                          <Typography variant="caption" noWrap component="div" title={img.displayName}>
                            {img.displayName}
                          </Typography>
                        </Box>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* URL Tab */}
        {tabIndex === 3 && (
          <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", pt: 2 }}>
            <TextField
              label="Image URL"
              fullWidth
              variant="outlined"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setUrlError(false);
              }}
              placeholder="https://example.com/image.png"
            />
            {urlInput.trim() && !urlError && (
              <Box sx={{ mt: 3, flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center", bgcolor: "#f5f5f5", borderRadius: 2, overflow: "hidden", minHeight: 150 }}>
                <img
                  src={authenticatedMediaUrl(urlInput.trim())}
                  alt="URL Preview"
                  style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "contain" }}
                  onError={() => setUrlError(true)}
                />
              </Box>
            )}
            {urlInput.trim() && urlError && (
              <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                Failed to load image preview. Ensure the URL points directly to an image.
              </Typography>
            )}
            <Button
              variant="contained"
              sx={{ mt: "auto", alignSelf: "flex-end" }}
              disabled={!urlInput.trim() || urlError}
              onClick={handleInsertUrl}
            >
              Insert URL
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
