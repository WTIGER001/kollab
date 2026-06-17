import React, { useState, useEffect } from "react";
import { Box, Chip, Tooltip, IconButton, Popover, TextField, Button, Typography } from "@mui/material";
import { Plus, Tag } from "lucide-react";
import { fetchTags, fetchDocumentTags, addTagToDocument, removeTagFromDocument, createTag } from "../services/api";
import type { Tag as TagType } from "../services/api";

interface DocumentTagsProps {
  docId: string;
  readOnly?: boolean;
}

export const DocumentTags: React.FC<DocumentTagsProps> = ({ docId, readOnly = false }) => {
  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [docTags, setDocTags] = useState<TagType[]>([]);
  const [tagAnchorEl, setTagAnchorEl] = useState<null | HTMLElement>(null);
  const [tagSearch, setTagSearch] = useState("");

  const loadDocTags = () => {
    if (!docId) {
      setDocTags([]);
      return;
    }
    fetchDocumentTags(docId)
      .then(data => setDocTags(Array.isArray(data) ? data : []))
      .catch(err => console.error("Failed to load document tags:", err));
  };

  const loadAllTags = () => {
    fetchTags()
      .then(data => setAllTags(Array.isArray(data) ? data : []))
      .catch(err => console.error("Failed to load tags list:", err));
  };

  useEffect(() => {
    loadDocTags();
    loadAllTags();
  }, [docId]);

  const handleAddTag = async (tag: TagType) => {
    if (!docId || readOnly) return;
    try {
      await addTagToDocument(docId, tag.id);
      loadDocTags();
    } catch (err) {
      console.error("Failed to add tag to page:", err);
    }
  };

  const handleCreateAndAddTag = async () => {
    if (!docId || !tagSearch.trim() || readOnly) return;
    const cleanSearch = tagSearch.trim().toLowerCase();
    
    // Check if tag already exists globally
    const existing = allTags.find(t => t.name.toLowerCase() === cleanSearch);
    try {
      if (existing) {
        await addTagToDocument(docId, existing.id);
      } else {
        const newTag = await createTag(cleanSearch, "", "#8b5cf6");
        await addTagToDocument(docId, newTag.id);
      }
      setTagSearch("");
      setTagAnchorEl(null);
      loadDocTags();
      loadAllTags();
    } catch (err) {
      console.error("Failed to create and add tag:", err);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!docId || readOnly) return;
    try {
      await removeTagFromDocument(docId, tagId);
      loadDocTags();
    } catch (err) {
      console.error("Failed to remove tag from page:", err);
    }
  };

  return (
    <Box 
      sx={{ 
        px: { xs: 2, sm: 3, md: 4 }, 
        py: 2.5,
        borderTop: "1px solid var(--border-color)",
        borderColor: "rgba(255, 255, 255, 0.04)",
        display: "flex",
        flexDirection: "column",
        gap: 1.5
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Tag size={14} style={{ color: "var(--primary-color)" }} />
        <Typography 
          variant="subtitle2" 
          sx={{ 
            fontFamily: '"Outfit", sans-serif', 
            fontWeight: 700, 
            fontSize: "12.5px",
            color: "var(--text-primary)" 
          }}
        >
          Page Tags
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        {docTags.length === 0 && (
          <Typography 
            variant="body2" 
            sx={{ 
              color: "text.disabled", 
              fontFamily: '"Outfit", sans-serif', 
              fontSize: "12.5px",
              fontStyle: "italic" 
            }}
          >
            No tags attached.
          </Typography>
        )}
        
        {docTags.map(tag => (
          <Chip
            key={tag.id}
            label={tag.name}
            size="small"
            onDelete={readOnly ? undefined : () => handleRemoveTag(tag.id)}
            sx={{
              fontWeight: 600,
              fontSize: "11px",
              fontFamily: '"Outfit", sans-serif',
              backgroundColor: `${tag.color}15`,
              color: tag.color,
              border: "1px solid",
              borderColor: `${tag.color}35`,
              borderRadius: "4px",
              height: 22,
              textTransform: "lowercase",
              "& .MuiChip-deleteIcon": {
                color: tag.color,
                opacity: 0.6,
                fontSize: "13px",
                "&:hover": {
                  opacity: 1,
                  color: tag.color
                }
              }
            }}
          />
        ))}

        {!readOnly && (
          <>
            <Tooltip title="Add Tag" arrow>
              <IconButton
                size="small"
                onClick={(e) => {
                  setTagAnchorEl(e.currentTarget);
                  setTagSearch("");
                }}
                sx={{
                  width: 22,
                  height: 22,
                  p: 0,
                  color: "text.secondary",
                  border: "1.5px dashed var(--border-color)",
                  borderRadius: "4px",
                  "&:hover": {
                    borderColor: "var(--primary-color)",
                    color: "var(--primary-color)",
                    backgroundColor: "rgba(139, 92, 246, 0.05)"
                  }
                }}
              >
                <Plus size={13} />
              </IconButton>
            </Tooltip>

            {/* Tag Selection Popover */}
            <Popover
              open={Boolean(tagAnchorEl)}
              anchorEl={tagAnchorEl}
              onClose={() => setTagAnchorEl(null)}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
              slotProps={{
                paper: {
                  sx: {
                    width: 220,
                    p: 1.5,
                    backgroundColor: "var(--panel-color)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--shadow-premium)",
                    backgroundImage: "none",
                    borderRadius: "8px",
                    mt: 0.5
                  }
                }
              }}
            >
              <TextField
                placeholder="Search or create tag..."
                size="small"
                fullWidth
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                autoFocus
                sx={{
                  mb: 1,
                  "& .MuiInputBase-root": {
                    fontSize: "12px",
                    fontFamily: '"Outfit", sans-serif',
                  }
                }}
              />
              <Box sx={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0.5 }}>
                {(() => {
                  const filtered = allTags.filter(
                    tag => tag.name.toLowerCase().includes(tagSearch.toLowerCase()) && 
                           !docTags.some(dt => dt.id === tag.id)
                  );

                  if (filtered.length === 0) {
                    if (tagSearch.trim() !== "") {
                      return (
                        <Button
                          size="small"
                          fullWidth
                          onClick={handleCreateAndAddTag}
                          sx={{
                            textTransform: "none",
                            justifyContent: "flex-start",
                            fontSize: "11.5px",
                            fontFamily: '"Outfit", sans-serif',
                            color: "var(--primary-color)"
                          }}
                        >
                          Create "{tagSearch.trim().toLowerCase()}"
                        </Button>
                      );
                    }
                    return (
                      <Typography variant="caption" sx={{ color: "text.disabled", display: "block", p: 1, textAlign: "center", fontStyle: "italic" }}>
                        No tags available
                      </Typography>
                    );
                  }

                  return filtered.map(tag => (
                    <Box
                      key={tag.id}
                      onClick={() => {
                        handleAddTag(tag);
                        setTagAnchorEl(null);
                      }}
                      sx={{
                        p: "6px 8px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        "&:hover": {
                          backgroundColor: "rgba(139, 92, 246, 0.08)"
                        }
                      }}
                    >
                      <Chip
                        label={tag.name}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "10.5px",
                          fontWeight: 600,
                          backgroundColor: `${tag.color}15`,
                          color: tag.color,
                          border: "1px solid",
                          borderColor: `${tag.color}30`,
                          borderRadius: "3px",
                          textTransform: "lowercase",
                          cursor: "pointer"
                        }}
                      />
                    </Box>
                  ));
                })()}
              </Box>
            </Popover>
          </>
        )}
      </Box>
    </Box>
  );
};
