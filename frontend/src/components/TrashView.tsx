import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Tooltip, 
  IconButton, 
  CircularProgress 
} from "@mui/material";
import { RotateCcw, Trash2, ArrowLeft, Calendar, FileText } from "lucide-react";
import { fetchTrash } from "../services/api";
import type { Document } from "../services/api";

interface TrashViewProps {
  teamId: string | null;
  projectId: string | null;
  onRestore: (id: string) => Promise<void>;
  onDeletePermanently: (id: string) => Promise<void>;
  navigateTo: (
    team: string | null,
    project: string | null,
    page: string | null,
    isSettings?: boolean,
    isTeamSettings?: boolean
  ) => void;
}

export const TrashView: React.FC<TrashViewProps> = ({
  teamId,
  projectId,
  onRestore,
  onDeletePermanently,
  navigateTo
}) => {
  const [trashDocs, setTrashDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTrash = async () => {
    if (!teamId && !projectId) return;
    setLoading(true);
    try {
      const docs = await fetchTrash(projectId, teamId);
      setTrashDocs(docs || []);
    } catch (err) {
      console.error("Failed to load trash:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, [teamId, projectId]);

  const handleRestore = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onRestore(id);
      setTrashDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Restore failed:", err);
    }
  };

  const handleDeletePermanently = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to permanently delete this page? This action cannot be undone and will delete all sub-pages as well.")) {
      try {
        await onDeletePermanently(id);
        setTrashDocs((prev) => prev.filter((d) => d.id !== id));
      } catch (err) {
        console.error("Permanent delete failed:", err);
      }
    }
  };

  const handleBack = () => {
    const cleanTeamId = teamId && teamId.startsWith("personal_") ? "personal" : teamId;
    navigateTo(cleanTeamId, projectId, null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Box sx={{ 
      flex: 1, 
      height: "100%", 
      overflowY: "auto", 
      bgcolor: "background.default",
      px: { xs: 2, sm: 3, md: 4 },
      py: 3,
      display: "flex",
      flexDirection: "column",
      gap: 3
    }} className="scrollbar-thin">
      
      {/* Header with Back Button */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton 
          onClick={handleBack}
          size="small"
          sx={{ 
            color: "text.secondary", 
            border: "1px solid var(--border-color)", 
            borderRadius: 1.5,
            "&:hover": {
              color: "text.primary",
              backgroundColor: "rgba(255, 255, 255, 0.04)"
            }
          }}
        >
          <ArrowLeft size={16} />
        </IconButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ 
            p: 0.75, 
            borderRadius: 1.5, 
            backgroundColor: "color-mix(in srgb, var(--primary-color) 12%, transparent)", 
            border: "1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)", 
            display: "flex" 
          }}>
            <Trash2 size={16} style={{ color: "var(--primary-color)" }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"Outfit", sans-serif', color: "text.primary" }}>
            Trash Bin
          </Typography>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ 
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 300
      }}>
        {loading ? (
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={32} />
          </Box>
        ) : trashDocs.length === 0 ? (
          <Box sx={{ 
            flex: 1, 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center", 
            py: 8, 
            color: "text.disabled", 
            textAlign: "center" 
          }}>
            <Trash2 size={48} style={{ strokeWidth: 1.5, color: "var(--text-disabled)", marginBottom: 16 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", mb: 1, fontFamily: '"Outfit", sans-serif' }}>
              Trash is Empty
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 320, lineHeight: 1.6 }}>
              Pages you delete in this space will show up here. You can restore them or delete them permanently.
            </Typography>
          </Box>
        ) : (
          <TableContainer component="div" sx={{ 
            backgroundColor: "transparent", 
            border: "1px solid var(--border-color)", 
            borderRadius: 2, 
            boxShadow: "none", 
            overflowY: "auto", 
            flex: 1 
          }} className="scrollbar-thin">
            <Table stickyHeader size="medium">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: "background.default", color: "text.secondary", borderBottom: "1px solid var(--border-color)", fontWeight: 700, fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Page Title</TableCell>
                  <TableCell sx={{ bgcolor: "background.default", color: "text.secondary", borderBottom: "1px solid var(--border-color)", fontWeight: 700, fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Deleted Date</TableCell>
                  <TableCell align="right" sx={{ bgcolor: "background.default", color: "text.secondary", borderBottom: "1px solid var(--border-color)", fontWeight: 700, fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trashDocs.map((doc) => (
                  <TableRow
                    key={doc.id}
                    sx={{
                      "&:hover": { backgroundColor: "color-mix(in srgb, var(--text-primary) 2%, transparent)" },
                      "& td": { borderBottom: "1px solid var(--border-color)" }
                    }}
                  >
                    {/* Title */}
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <FileText size={16} style={{ color: "var(--text-secondary)", opacity: 0.8 }} />
                        <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "text.primary", fontFamily: '"Outfit", sans-serif' }}>
                          {doc.title}
                        </Typography>
                      </Box>
                    </TableCell>
                    {/* Deleted At */}
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Calendar size={14} style={{ color: "var(--text-secondary)", opacity: 0.6 }} />
                        <Typography sx={{ fontSize: "13px", color: "text.secondary", fontFamily: '"Outfit", sans-serif' }}>
                          {formatDate(doc.deletedAt)}
                        </Typography>
                      </Box>
                    </TableCell>
                    {/* Actions */}
                    <TableCell align="right">
                      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                        <Tooltip title="Restore page" arrow>
                          <IconButton
                            size="small"
                            onClick={(e) => handleRestore(doc.id, e)}
                            sx={{ 
                              color: "var(--primary-color, #8b5cf6)", 
                              "&:hover": { backgroundColor: "color-mix(in srgb, var(--primary-color) 8%, transparent)" } 
                            }}
                          >
                            <RotateCcw size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete permanently" arrow>
                          <IconButton
                            size="small"
                            onClick={(e) => handleDeletePermanently(doc.id, e)}
                            sx={{ 
                              color: "error.main", 
                              "&:hover": { 
                                color: "error.light",
                                backgroundColor: "color-mix(in srgb, var(--red-color, #ef4444) 8%, transparent)" 
                              } 
                            }}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};
