import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
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
  Tooltip, 
  IconButton, 
  CircularProgress,
  TextField,
  ToggleButton,
  ToggleButtonGroup
} from "@mui/material";
import { Clock, ExternalLink, ArrowUpDown, Calendar, Search } from "lucide-react";
import { fetchRecentDocuments } from "../services/api";
import type { Document, Team, Project } from "../services/api";

interface RecentPagesViewProps {
  onNavigate: (documentId: string, teamId: string, projectId: string | null) => void;
  teams: Team[];
  projects: Project[];
}

type SortType = "accessed" | "created" | "az" | "parent";
type ActivityType = "both" | "views" | "edits";

export const RecentPagesView: React.FC<RecentPagesViewProps> = ({
  onNavigate,
  teams,
  projects
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>("accessed");
  const [activityFilter, setActivityFilter] = useState<ActivityType>("both");
  const [searchQuery, setSearchQuery] = useState("");

  const loadRecent = async () => {
    setLoading(true);
    try {
      const data = await fetchRecentDocuments(activityFilter);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch recent documents:", err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecent();
  }, [activityFilter]);

  const handleRowClick = (doc: Document) => {
    const teamArg = doc.teamId.startsWith("personal_") || doc.teamId === "personal" ? "personal" : doc.teamId;
    const projectArg = doc.projectId || null;
    onNavigate(doc.id, teamArg, projectArg);
  };

  const getSpaceDetails = (teamId: string, projectId: string) => {
    if (teamId.startsWith("personal_") || teamId === "personal") {
      return { name: "Personal Space", type: "personal" };
    }
    if (projectId) {
      const proj = projects.find(p => p.id === projectId);
      return { name: proj ? proj.name : "Project Space", type: "project" };
    }
    const t = teams.find(team => team.id === teamId);
    return { name: t ? t.name : "Team Space", type: "team" };
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

  const getFilteredAndSortedDocuments = () => {
    let filtered = [...documents];

    // Filter by text search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => {
        const titleMatch = doc.title.toLowerCase().includes(query);
        const spaceInfo = getSpaceDetails(doc.teamId, doc.projectId);
        const spaceMatch = spaceInfo.name.toLowerCase().includes(query) || spaceInfo.type.toLowerCase().includes(query);
        return titleMatch || spaceMatch;
      });
    }

    // Sort documents
    switch (sortBy) {
      case "accessed":
        // Sorting by updatedAt (last activity view/edit)
        return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      case "created":
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case "az":
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
      case "parent":
        return filtered.sort((a, b) => {
          const spaceA = getSpaceDetails(a.teamId, a.projectId).name;
          const spaceB = getSpaceDetails(b.teamId, b.projectId).name;
          const spaceCompare = spaceA.localeCompare(spaceB);
          if (spaceCompare !== 0) return spaceCompare;
          return a.title.localeCompare(b.title);
        });
      default:
        return filtered;
    }
  };

  const displayList = getFilteredAndSortedDocuments();

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
      
      {/* Header and Controls Row */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ p: 0.75, borderRadius: 1.5, backgroundColor: "color-mix(in srgb, var(--primary-color) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)", display: "flex" }}>
            <Clock size={16} className="text-primary" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"Outfit", sans-serif', color: "text.primary" }}>
            Recent Pages
          </Typography>
        </Box>

        {/* Filter controls and Sorting */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          {/* Search bar */}
          <TextField
            placeholder="Filter by title or space..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search size={14} style={{ marginRight: 8, color: "var(--text-disabled)" }} />
            }}
            sx={{
              width: 220,
              "& .MuiOutlinedInput-root": {
                borderRadius: "6px",
                fontSize: "12px",
                fontFamily: '"Outfit", sans-serif',
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--border-color)"
                }
              }
            }}
          />

          {/* Activity Toggle */}
          <ToggleButtonGroup
            value={activityFilter}
            exclusive
            onChange={(_, val) => val && setActivityFilter(val)}
            size="small"
            sx={{
              bgcolor: "transparent",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              height: 40,
              "& .MuiToggleButton-root": {
                border: "none",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "none",
                fontFamily: '"Outfit", sans-serif',
                px: 1.5,
                color: "text.secondary",
                "&.Mui-selected": {
                  color: "primary.main",
                  bgcolor: "color-mix(in srgb, var(--primary-color) 8%, transparent)",
                  "&:hover": {
                    bgcolor: "color-mix(in srgb, var(--primary-color) 12%, transparent)"
                  }
                }
              }
            }}
          >
            <ToggleButton value="both">Both</ToggleButton>
            <ToggleButton value="views">Views</ToggleButton>
            <ToggleButton value="edits">Edits</ToggleButton>
          </ToggleButtonGroup>

          {/* Sorting */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="sort-recent-label" sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Sort By</InputLabel>
            <Select
              labelId="sort-recent-label"
              id="sort-recent"
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value as SortType)}
              sx={{
                fontSize: "12px",
                fontFamily: '"Outfit", sans-serif',
                borderRadius: "6px",
                height: 40,
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
                  <Calendar size={12} /> Last Activity
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
          ) : displayList.length === 0 ? (
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8, color: "text.disabled", textAlign: "center" }}>
              <Clock size={48} style={{ strokeWidth: 1.5, color: "var(--text-disabled)", marginBottom: 16 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", mb: 1, fontFamily: '"Outfit", sans-serif' }}>
                No Recent Activity
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 320, lineHeight: 1.6 }}>
                Documents you view or edit will appear here automatically.
              </Typography>
            </Box>
          ) : (
            <TableContainer component="div" sx={{ backgroundColor: "transparent", border: "1px solid var(--border-color)", borderRadius: 2, boxShadow: "none", overflowY: "auto", flex: 1 }} className="scrollbar-thin">
              <Table stickyHeader size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "background.default", color: "text.secondary", borderBottom: "1px solid var(--border-color)", fontWeight: 700, fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Page Title</TableCell>
                    <TableCell sx={{ bgcolor: "background.default", color: "text.secondary", borderBottom: "1px solid var(--border-color)", fontWeight: 700, fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Workspace</TableCell>
                    <TableCell sx={{ bgcolor: "background.default", color: "text.secondary", borderBottom: "1px solid var(--border-color)", fontWeight: 700, fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Last Activity</TableCell>
                    <TableCell align="right" sx={{ bgcolor: "background.default", color: "text.secondary", borderBottom: "1px solid var(--border-color)", fontWeight: 700, fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayList.map((doc) => {
                    const spaceInfo = getSpaceDetails(doc.teamId, doc.projectId);
                    return (
                      <TableRow
                        key={doc.id}
                        onClick={() => handleRowClick(doc)}
                        sx={{
                          cursor: "pointer",
                          "&:hover": { backgroundColor: "color-mix(in srgb, var(--text-primary) 4%, transparent)" },
                          "& td": { borderBottom: "1px solid var(--border-color)" }
                        }}
                      >
                        {/* Title */}
                        <TableCell>
                          <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "text.primary", fontFamily: '"Outfit", sans-serif' }}>
                            {doc.title}
                          </Typography>
                        </TableCell>
                        {/* Workspace space context */}
                        <TableCell>
                          <Typography sx={{ fontSize: "13px", color: "text.secondary", fontFamily: '"Outfit", sans-serif', textTransform: "capitalize" }}>
                            {spaceInfo.name} ({spaceInfo.type})
                          </Typography>
                        </TableCell>
                        {/* Last Activity Time */}
                        <TableCell>
                          <Typography sx={{ fontSize: "13px", color: "text.secondary", fontFamily: '"Outfit", sans-serif' }}>
                            {formatDate(doc.updatedAt)}
                          </Typography>
                        </TableCell>
                        {/* Actions */}
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Open Page" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleRowClick(doc)}
                              sx={{ color: "primary.main", "&:hover": { backgroundColor: "color-mix(in srgb, var(--primary-color) 8%, transparent)" } }}
                            >
                              <ExternalLink size={16} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>
    </Box>
  );
};
