import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Tabs,
  Tab,
  Divider
} from "@mui/material";
import { Search, Globe, FileText } from "lucide-react";
import { searchDocuments } from "../../services/api";
import type { Document } from "../../services/api";

interface InsertLinkDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (url: string, text: string) => void;
  initialUrl?: string;
  initialText?: string;
  projectId: string | null;
  teams?: any[];
  projects?: any[];
}

export const InsertLinkDialog: React.FC<InsertLinkDialogProps> = ({
  open,
  onClose,
  onSubmit,
  initialUrl = "",
  initialText = "",
  projectId,
  teams = [],
  projects = [],
}) => {
  const [tab, setTab] = useState(0); // 0 = Search, 1 = Web Link
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Document[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setText(initialText);
      // Auto-detect if it's a web link initially
      if (initialUrl && (initialUrl.startsWith("http://") || initialUrl.startsWith("https://"))) {
        setTab(1);
      } else {
        setTab(0);
      }
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open, initialUrl, initialText]);

  useEffect(() => {
    if (tab !== 0) return;
    
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounce = setTimeout(() => {
      searchDocuments(projectId || "", searchQuery, "keyword")
        .then(results => {
          setSearchResults(results);
          setIsSearching(false);
        })
        .catch(err => {
          console.error("Search failed:", err);
          setIsSearching(false);
        });
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, tab, projectId]);

  const handleSubmit = () => {
    onSubmit(url, text);
    onClose();
  };

  const handleSelectDocument = (doc: any) => {
    // Note: since doc is returned from search API, we cast to any since it might contain teamId which isn't in api.ts Document yet
    const teamId = doc.teamId || "none";
    const projId = doc.projectId || "none";
    
    const team = teams.find(t => t.id === teamId);
    const proj = projects.find(p => p.id === projId);
    
    const tAbbr = team?.abbreviation || teamId;
    const pAbbr = proj?.abbreviation || projId;
    
    const docUrl = `/teams/${tAbbr}/p/${pAbbr}/docs/${doc.id}`;
    setUrl(docUrl);
    if (!text) {
      setText(doc.title);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: {
      sx: {
        height: 500,
        bgcolor: "var(--panel-color)",
        backgroundImage: "none",
        color: "var(--text-primary)",
        border: "var(--border-width, 1px) var(--border-style, solid) var(--border-color)",
        borderRadius: "var(--border-radius-card, 8px)"
      }
    } }}>
      <DialogTitle sx={{ p: 2, borderBottom: "1px solid var(--border-color)" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>
          Insert Link
        </Typography>
      </DialogTitle>
      
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <Box sx={{ width: 200, borderRight: "1px solid var(--border-color)", bgcolor: "var(--glass-bg)" }}>
          <Tabs
            orientation="vertical"
            value={tab}
            onChange={(_, val) => setTab(val)}
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                minHeight: 48,
                px: 3,
                fontWeight: 600,
                color: "text.secondary",
                "&.Mui-selected": {
                  color: "primary.main",
                  bgcolor: "action.selected"
                }
              }
            }}
          >
            <Tab icon={<Search size={16} style={{ marginRight: 8 }} />} iconPosition="start" label="Search" />
            <Tab icon={<Globe size={16} style={{ marginRight: 8 }} />} iconPosition="start" label="Web Link" />
          </Tabs>
        </Box>

        {/* Content Area */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 3, gap: 3, overflowY: "auto" }}>
          
          {tab === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", flex: 1, gap: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search for internal pages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              
              <Box sx={{ flex: 1, border: "1px solid var(--border-color)", borderRadius: 1, overflowY: "auto", minHeight: 200 }}>
                {isSearching ? (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : searchResults.length > 0 ? (
                  <List disablePadding>
                    {searchResults.map(doc => {
                      const isSelected = url.includes(doc.id);
                      return (
                        <ListItemButton 
                          key={doc.id} 
                          selected={isSelected}
                          onClick={() => handleSelectDocument(doc)}
                          sx={{ 
                            borderBottom: "1px solid var(--border-color)",
                            "&.Mui-selected": {
                              bgcolor: "color-mix(in srgb, var(--primary-color) 15%, transparent)"
                            }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <FileText size={18} color={isSelected ? "var(--primary-color)" : "inherit"} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={doc.title} 
                            secondary={`in ${doc.projectId ? 'Project' : 'Team'}`} slotProps={{ primary: { sx: { fontWeight: 600, fontSize: "14px", color: isSelected ? "var(--primary-color)" : "inherit" } }, secondary: { sx: { fontSize: "12px" } } }}
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                ) : searchQuery ? (
                  <Typography sx={{ p: 4, textAlign: "center", color: "text.disabled", fontSize: "14px" }}>
                    No pages found for "{searchQuery}"
                  </Typography>
                ) : (
                  <Typography sx={{ p: 4, textAlign: "center", color: "text.disabled", fontSize: "14px" }}>
                    Type to search for internal documents.
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Destination URL</Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="https://example.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </Box>
          )}

          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Link Text to Display</Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Display text"
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </Box>
        </Box>
      </Box>

      <DialogActions sx={{ p: 2, borderTop: "1px solid var(--border-color)", bgcolor: "var(--glass-bg)" }}>
        <Button onClick={onClose} sx={{ color: "text.secondary", textTransform: "none", fontWeight: 600 }}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={!url.trim()}
          sx={{ 
            textTransform: "none", 
            fontWeight: 700, 
            bgcolor: "var(--primary-color)", 
            color: "#fff",
            "&:hover": { bgcolor: "var(--primary-dark)" }
          }}
        >
          Insert
        </Button>
      </DialogActions>
    </Dialog>
  );
};
