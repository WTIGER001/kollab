import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CircularProgress, 
  Tooltip, 
  Button, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  IconButton,
  Chip,
  Grid,
  Divider
} from "@mui/material";
import { Plus, Edit2, Trash2, Tag, BookOpen, Layers } from "lucide-react";
import { fetchTags, createTag, updateTag, deleteTag } from "../services/api";
import type { Tag as TagType } from "../services/api";

const PRESET_COLORS = [
  { value: "#8b5cf6", name: "Purple" },
  { value: "#3b82f6", name: "Blue" },
  { value: "#10b981", name: "Green" },
  { value: "#ef4444", name: "Red" },
  { value: "#f97316", name: "Orange" },
  { value: "#6b7280", name: "Gray" }
];

export const TagsManager: React.FC = () => {
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedTag, setSelectedTag] = useState<TagType | null>(null);

  // Form states
  const [tagName, setTagName] = useState("");
  const [tagDesc, setTagDesc] = useState("");
  const [tagColor, setTagColor] = useState(PRESET_COLORS[0].value);
  const [formError, setFormError] = useState("");

  // Delete confirm state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<TagType | null>(null);

  const loadTags = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchTags();
      setTags(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to fetch tags:", err);
      setError(err.message || "Failed to load tags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  const handleOpenCreate = () => {
    setDialogMode("create");
    setSelectedTag(null);
    setTagName("");
    setTagDesc("");
    setTagColor(PRESET_COLORS[0].value);
    setFormError("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (tag: TagType) => {
    setDialogMode("edit");
    setSelectedTag(tag);
    setTagName(tag.name);
    setTagDesc(tag.description || "");
    setTagColor(tag.color || PRESET_COLORS[0].value);
    setFormError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFormError("");
    const cleanName = tagName.trim();
    if (!cleanName) {
      setFormError("Tag name is required");
      return;
    }

    try {
      if (dialogMode === "create") {
        await createTag(cleanName, tagDesc.trim(), tagColor);
      } else if (dialogMode === "edit" && selectedTag) {
        await updateTag(selectedTag.id, cleanName, tagDesc.trim(), tagColor);
      }
      setDialogOpen(false);
      loadTags();
    } catch (err: any) {
      console.error("Failed to save tag:", err);
      setFormError(err.message || "Failed to save tag. Please make sure the name is unique.");
    }
  };

  const handleOpenDeleteConfirm = (tag: TagType) => {
    setTagToDelete(tag);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!tagToDelete) return;
    try {
      await deleteTag(tagToDelete.id);
      setDeleteConfirmOpen(false);
      setTagToDelete(null);
      loadTags();
    } catch (err: any) {
      console.error("Failed to delete tag:", err);
      setError(err.message || "Failed to delete tag");
    }
  };

  return (
    <Box sx={{ width: "100%", py: 1 }}>
      {/* Subheader info & Actions */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700, 
              fontFamily: '"Outfit", sans-serif', 
              color: "var(--text-primary)",
              fontSize: "16px"
            }}
          >
            Workspace Tags
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: "text.secondary", 
              fontFamily: '"Outfit", sans-serif',
              fontSize: "12px"
            }}
          >
            Configure globally accessible tags/labels for workspace pages.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          onClick={handleOpenCreate}
          startIcon={<Plus size={14} />}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontFamily: '"Outfit", sans-serif',
            fontSize: "12px",
            backgroundColor: "var(--primary-color)",
            color: "#ffffff",
            borderRadius: "6px",
            boxShadow: "none",
            "&:hover": {
              backgroundColor: "var(--primary-dark)",
              boxShadow: "none",
            }
          }}
        >
          Add Tag
        </Button>
      </Box>

      {/* Main Body */}
      {loading && tags.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={28} sx={{ color: "var(--primary-color)" }} />
        </Box>
      ) : error ? (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="body2" color="error" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>
            {error}
          </Typography>
        </Box>
      ) : tags.length === 0 ? (
        <Box 
          sx={{ 
            p: 5, 
            textAlign: "center", 
            border: "1.5px dashed var(--border-color)", 
            borderRadius: "8px", 
            backgroundColor: "rgba(255, 255, 255, 0.01)" 
          }}
        >
          <Tag size={32} style={{ margin: "0 auto 12px", color: "var(--text-secondary)", opacity: 0.4 }} />
          <Typography variant="subtitle2" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 0.5, color: "var(--text-primary)" }}>
            No tags found
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: '"Outfit", sans-serif', color: "text.secondary", mb: 2, display: "block" }}>
            Get started by adding a new tag.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={handleOpenCreate}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontFamily: '"Outfit", sans-serif',
              fontSize: "11px",
              borderColor: "var(--primary-color)",
              color: "var(--primary-color)",
              "&:hover": {
                borderColor: "var(--primary-dark)",
                backgroundColor: "rgba(139, 92, 246, 0.04)"
              }
            }}
          >
            Create first tag
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {tags.map((tag) => (
            <Grid item xs={12} sm={6} md={4} key={tag.id}>
              <Card 
                sx={{ 
                  height: "100%", 
                  display: "flex", 
                  flexDirection: "column",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  bgcolor: "var(--paper-color)",
                  backgroundImage: "none",
                  boxShadow: "none",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: "var(--shadow-premium)",
                    borderColor: "rgba(139, 92, 246, 0.12)"
                  }
                }}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 }, flex: 1, display: "flex", flexDirection: "column" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                    <Chip
                      label={tag.name}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: "11px",
                        fontFamily: '"Outfit", sans-serif',
                        backgroundColor: `${tag.color}12`,
                        color: tag.color,
                        border: "1px solid",
                        borderColor: `${tag.color}25`,
                        borderRadius: "4px",
                        textTransform: "lowercase",
                        height: 20
                      }}
                    />
                    <Box sx={{ display: "flex", gap: 0.25 }}>
                      <Tooltip title="Edit Tag" arrow>
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenEdit(tag)}
                          sx={{ 
                            p: 0.5,
                            color: "text.secondary",
                            "&:hover": { color: "var(--primary-color)", bgcolor: "rgba(139, 92, 246, 0.05)" }
                          }}
                        >
                          <Edit2 size={12} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Tag" arrow>
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenDeleteConfirm(tag)}
                          sx={{ 
                            p: 0.5,
                            color: "text.secondary",
                            "&:hover": { color: "error.main", bgcolor: "rgba(239, 68, 68, 0.05)" }
                          }}
                        >
                          <Trash2 size={12} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  {/* Description */}
                  <Box sx={{ display: "flex", gap: 0.75, mb: 1.5, flex: 1 }}>
                    <BookOpen size={13} style={{ color: "var(--text-secondary)", opacity: 0.4, flexShrink: 0, marginTop: 2 }} />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: tag.description ? "text.primary" : "text.disabled",
                        fontFamily: '"Outfit", sans-serif',
                        fontSize: "12px",
                        lineHeight: 1.35,
                        fontStyle: tag.description ? "normal" : "italic"
                      }}
                    >
                      {tag.description || "No definition provided."}
                    </Typography>
                  </Box>

                  {/* Page count */}
                  <Divider sx={{ my: 1, borderColor: "var(--border-color)", opacity: 0.4 }} />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Layers size={12} style={{ color: "var(--text-secondary)", opacity: 0.4 }} />
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontFamily: '"Outfit", sans-serif', 
                        color: "text.secondary",
                        fontSize: "10.5px",
                        fontWeight: 500
                      }}
                    >
                      Used on {tag.pageCount || 0} page{tag.pageCount === 1 ? "" : "s"}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create / Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "var(--panel-color)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            backgroundImage: "none",
            maxWidth: "400px",
            width: "100%"
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, color: "var(--text-primary)", fontSize: "16px", pb: 1 }}>
          {dialogMode === "create" ? "Add Tag" : "Edit Tag"}
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
            <TextField
              label="Tag Name"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="e.g. engineering"
              size="small"
              fullWidth
              InputLabelProps={{ style: { fontFamily: '"Outfit", sans-serif', fontSize: "13px" } }}
              inputProps={{ style: { fontFamily: '"Outfit", sans-serif', fontSize: "13px" } }}
            />
            <TextField
              label="Description / Definition"
              value={tagDesc}
              onChange={(e) => setTagDesc(e.target.value)}
              placeholder="Enter tag description..."
              size="small"
              multiline
              rows={2}
              fullWidth
              InputLabelProps={{ style: { fontFamily: '"Outfit", sans-serif', fontSize: "13px" } }}
              inputProps={{ style: { fontFamily: '"Outfit", sans-serif', fontSize: "13px" } }}
            />

            {/* Colors picker */}
            <Box>
              <Typography 
                variant="caption" 
                sx={{ 
                  fontFamily: '"Outfit", sans-serif', 
                  color: "text.secondary", 
                  mb: 1, 
                  display: "block",
                  fontWeight: 600
                }}
              >
                Color Theme
              </Typography>
              <Box sx={{ display: "flex", gap: 1.25 }}>
                {PRESET_COLORS.map((color) => (
                  <IconButton
                    key={color.value}
                    onClick={() => setTagColor(color.value)}
                    sx={{
                      width: 22,
                      height: 22,
                      backgroundColor: color.value,
                      border: tagColor === color.value ? "2px solid #ffffff" : "2px solid transparent",
                      boxShadow: tagColor === color.value ? "0 0 0 2px var(--primary-color)" : "none",
                      "&:hover": {
                        backgroundColor: color.value,
                        opacity: 0.8
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>

            {formError && (
              <Typography variant="caption" sx={{ color: "error.main", fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>
                {formError}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button 
            onClick={() => setDialogOpen(false)}
            sx={{ 
              textTransform: "none", 
              fontFamily: '"Outfit", sans-serif', 
              fontSize: "12.5px", 
              fontWeight: 600,
              color: "text.secondary"
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            variant="contained"
            sx={{ 
              textTransform: "none", 
              fontFamily: '"Outfit", sans-serif', 
              fontSize: "12.5px", 
              fontWeight: 600,
              backgroundColor: "var(--primary-color)",
              color: "#ffffff",
              boxShadow: "none",
              "&:hover": {
                backgroundColor: "var(--primary-dark)",
                boxShadow: "none"
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "var(--panel-color)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            backgroundImage: "none",
            maxWidth: "350px",
            width: "100%"
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, color: "var(--text-primary)", fontSize: "16px", pb: 1 }}>
          Delete Tag?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontFamily: '"Outfit", sans-serif', color: "text.secondary", fontSize: "13px", lineHeight: 1.4 }}>
            Are you sure you want to delete the tag <strong>{tagToDelete?.name}</strong>? This will remove it from all documents. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)}
            sx={{ 
              textTransform: "none", 
              fontFamily: '"Outfit", sans-serif', 
              fontSize: "12.5px", 
              fontWeight: 600,
              color: "text.secondary"
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDelete}
            variant="contained"
            color="error"
            sx={{ 
              textTransform: "none", 
              fontFamily: '"Outfit", sans-serif', 
              fontSize: "12.5px", 
              fontWeight: 600,
              boxShadow: "none",
              "&:hover": {
                boxShadow: "none"
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
