import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  IconButton,
  CircularProgress
} from "@mui/material";
import { Star, ExternalLink, ArrowUpDown, Calendar, FolderHeart } from "lucide-react";
import { fetchFavorites, removeFavorite } from "../services/api";
import type { Favorite } from "../services/api";

interface FavoritesViewProps {
  onNavigate: (documentId: string, teamId: string, projectId: string | null) => void;
  onUnfavoriteActive?: (documentId: string) => void;
}

type SortType = "accessed" | "created" | "az" | "parent";

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  onNavigate,
  onUnfavoriteActive
}) => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>("accessed");

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const data = await fetchFavorites();
      setFavorites(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch favorites:", err);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleUnfavorite = async (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeFavorite(documentId);
      setFavorites(prev => (Array.isArray(prev) ? prev : []).filter(f => f.documentId !== documentId));
      if (onUnfavoriteActive) {
        onUnfavoriteActive(documentId);
      }
    } catch (err) {
      console.error("Failed to unfavorite page:", err);
    }
  };

  const handleRowClick = (fav: Favorite) => {
    const teamArg = fav.spaceType === "personal" ? "personal" : (fav.teamId || fav.spaceName);
    const projectArg = fav.spaceType === "project" ? (fav.projectId || null) : null;
    onNavigate(fav.documentId, teamArg, projectArg);
  };

  const getSortedFavorites = () => {
    const listToUse = Array.isArray(favorites) ? favorites : [];
    const sorted = [...listToUse];
    switch (sortBy) {
      case "accessed":
        return sorted.sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime());
      case "created":
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case "az":
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case "parent":
        return sorted.sort((a, b) => {
          const spaceCompare = a.spaceName.localeCompare(b.spaceName);
          if (spaceCompare !== 0) return spaceCompare;
          return a.title.localeCompare(b.title);
        });
      default:
        return sorted;
    }
  };

  const formatDate = (dateString: string) => {
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

  const sortedList = getSortedFavorites();

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
      
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ p: 0.75, borderRadius: 1.5, backgroundColor: "color-mix(in srgb, #fbbf24 12%, transparent)", border: "1px solid color-mix(in srgb, #fbbf24 25%, transparent)", display: "flex" }}>
            <FolderHeart size={16} style={{ color: "#fbbf24" }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"Outfit", sans-serif', color: "text.primary" }}>
            Favorite Pages
          </Typography>
        </Box>

        {/* Sorting Controls */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="sort-favorites-label" sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Sort By</InputLabel>
          <Select
            labelId="sort-favorites-label"
            id="sort-favorites"
            value={sortBy}
            label="Sort By"
            onChange={(e) => setSortBy(e.target.value as SortType)}
            sx={{
              fontSize: "12px",
              fontFamily: '"Outfit", sans-serif',
              borderRadius: "6px",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--border-color)",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "primary.main",
              }
            }}
          >
            <MenuItem value="accessed" sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Calendar size={12} /> Date Accessed
              </Box>
            </MenuItem>
            <MenuItem value="created" sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Calendar size={12} /> Date Created
              </Box>
            </MenuItem>
            <MenuItem value="az" sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ArrowUpDown size={12} /> A-Z Order
              </Box>
            </MenuItem>
            <MenuItem value="parent" sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ArrowUpDown size={12} /> Space / Parent
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ 
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 300
      }}>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
          {loading ? (
            <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CircularProgress size={32} />
            </Box>
          ) : sortedList.length === 0 ? (
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8, color: "text.disabled", textAlign: "center" }}>
              <Star size={48} style={{ strokeWidth: 1.5, color: "var(--text-disabled)", marginBottom: 16 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", mb: 1, fontFamily: '"Outfit", sans-serif' }}>
                No Favorites Yet
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 320, lineHeight: 1.6 }}>
                Click the star icon in the page header while editing or viewing a document to bookmark it here.
              </Typography>
            </Box>
          ) : (
            <TableContainer component="div" sx={{ backgroundColor: "transparent", border: "1px solid var(--border-color)", borderRadius: 2, boxShadow: "none", overflowY: "auto", flex: 1 }} className="scrollbar-thin">
              <Table stickyHeader size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "background.default", color: "text.secondary", borderBottom: "1px solid var(--border-color)", fontWeight: 700, fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Page Title</TableCell>
                    <TableCell sx={{ bgcolor: "background.default", color: "text.secondary", borderBottom: "1px solid var(--border-color)", fontWeight: 700, fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Workspace</TableCell>
                    <TableCell sx={{ bgcolor: "background.default", color: "text.secondary", borderBottom: "1px solid var(--border-color)", fontWeight: 700, fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Last Accessed</TableCell>
                    <TableCell align="right" sx={{ bgcolor: "background.default", color: "text.secondary", borderBottom: "1px solid var(--border-color)", fontWeight: 700, fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedList.map((fav) => (
                    <TableRow
                      key={fav.documentId}
                      onClick={() => handleRowClick(fav)}
                      sx={{
                        cursor: "pointer",
                        "&:hover": { backgroundColor: "color-mix(in srgb, var(--text-primary) 4%, transparent)" },
                        "& td": { borderBottom: "1px solid var(--border-color)" }
                      }}
                    >
                      {/* Title */}
                      <TableCell>
                        <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "text.primary", fontFamily: '"Outfit", sans-serif' }}>
                          {fav.title}
                        </Typography>
                      </TableCell>
                      {/* Workspace space context */}
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography sx={{ fontSize: "13px", color: "text.secondary", fontFamily: '"Outfit", sans-serif', textTransform: "capitalize" }}>
                            {fav.spaceName} ({fav.spaceType})
                          </Typography>
                        </Box>
                      </TableCell>
                      {/* Last Accessed */}
                      <TableCell>
                        <Typography sx={{ fontSize: "13px", color: "text.secondary", fontFamily: '"Outfit", sans-serif' }}>
                          {formatDate(fav.lastAccessedAt)}
                        </Typography>
                      </TableCell>
                      {/* Actions */}
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                          <Tooltip title="Remove Favorite" arrow>
                            <IconButton
                              size="small"
                              onClick={(e) => handleUnfavorite(fav.documentId, e)}
                              sx={{ color: "#fbbf24", "&:hover": { color: "text.secondary", backgroundColor: "color-mix(in srgb, var(--text-primary) 6%, transparent)" } }}
                            >
                              <Star size={16} fill="#fbbf24" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Open Page" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleRowClick(fav)}
                              sx={{ color: "primary.main", "&:hover": { backgroundColor: "color-mix(in srgb, var(--primary-color) 8%, transparent)" } }}
                            >
                              <ExternalLink size={16} />
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
    </Box>
  );
};
