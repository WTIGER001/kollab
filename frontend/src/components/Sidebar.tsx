import React, { useState } from "react";
import { 
  Box, 
  List, 
  ListItemButton, 
  ListItemText, 
  ListItemIcon,
  IconButton, 
  Typography, 
  Tooltip,
  Collapse
} from "@mui/material";
import { 
  Search, 
  Settings, 
  Sparkles, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Folder, 
  FileText, 
  Trash2,
  Cpu,
  Layers,
  Users,
  Briefcase,
  LogOut,
  Sun,
  Moon
} from "lucide-react";
import type { Team, Project } from "../services/api";

export interface DocumentItem {
  id: string;
  title: string;
  isFolder: boolean;
  content?: string;
  children?: DocumentItem[];
}

interface SidebarProps {
  documents: DocumentItem[];
  activeDocId: string | null;
  onSelectDoc: (id: string) => void;
  onAddDoc: (parentId?: string) => void;
  onDeleteDoc: (id: string) => void;
  
  // OIDC & Workspace Hierarchy
  teams: Team[];
  projects: Project[];
  selectedTeamId: string | null;
  selectedProjectId: string | null;
  onSelectTeam: (id: string) => void;
  onSelectProject: (id: string) => void;
  username: string;
  onLogout: () => void;

  // Theme Settings
  themeMode: "light" | "dark";
  onToggleThemeMode: () => void;
  onOpenSettings: () => void;

  // Search
  onOpenSearch: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  activeDocId,
  onSelectDoc,
  onAddDoc,
  onDeleteDoc,
  teams,
  projects,
  selectedTeamId,
  selectedProjectId,
  onSelectTeam,
  onSelectProject,
  username,
  onLogout,
  themeMode,
  onToggleThemeMode,
  onOpenSettings,
  onOpenSearch
}) => {
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({
    "1": true,
    "2": true,
  });

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDocs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderDocTree = (items: DocumentItem[], depth = 0) => {
    return items.map(doc => {
      const isExpanded = !!expandedDocs[doc.id];
      const isActive = activeDocId === doc.id;

      return (
        <React.Fragment key={doc.id}>
          <ListItemButton
            onClick={() => {
              if (doc.isFolder) {
                setExpandedDocs(prev => ({ ...prev, [doc.id]: !prev[doc.id] }));
              } else {
                onSelectDoc(doc.id);
              }
            }}
            sx={{
              pl: depth * 2 + 2,
              pr: 2,
              py: 0.75,
              mx: 1,
              my: 0.25,
              borderRadius: "6px",
              color: isActive ? "var(--primary-color)" : "text.secondary",
              backgroundColor: isActive ? "color-mix(in srgb, var(--primary-color) 12%, transparent)" : "transparent",
              border: isActive ? "1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)" : "1px solid transparent",
              "& .action-btn": { opacity: 0 },
              "&:hover": {
                color: isActive ? "var(--primary-color)" : "text.primary",
                backgroundColor: isActive 
                  ? "color-mix(in srgb, var(--primary-color) 18%, transparent)" 
                  : "color-mix(in srgb, var(--text-primary) 4%, transparent)",
                "& .action-btn": { opacity: 1 },
              },
              transition: "all 0.15s ease",
            }}
          >
            <ListItemIcon sx={{ minWidth: 28, color: "inherit" }}>
              {doc.isFolder ? (
                <Box 
                  onClick={(e) => toggleExpand(doc.id, e)} 
                  sx={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    p: 0.5,
                    borderRadius: 1,
                    mr: 0.5,
                    color: "text.disabled",
                    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.05)", color: "text.primary" }
                  }}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </Box>
              ) : (
                <Box sx={{ width: 14 }} />
              )}
              {doc.isFolder ? (
                <Folder size={15} style={{ color: isActive ? "var(--accent-purple)" : "var(--accent-blue)" }} />
              ) : (
                <FileText size={15} style={{ color: isActive ? "var(--accent-purple)" : "var(--text-muted)" }} />
              )}
            </ListItemIcon>
            
            <ListItemText 
              primary={
                <Typography 
                  noWrap 
                  sx={{ 
                    fontSize: "13.5px", 
                    fontWeight: isActive ? 600 : 500,
                    fontFamily: '"Outfit", sans-serif'
                  }}
                >
                  {doc.title}
                </Typography>
              }
            />

            {/* Hover Actions */}
            <Box className="action-btn" sx={{ display: "flex", alignItems: "center", gap: 0.25, transition: "all 0.15s ease" }}>
              {doc.isFolder && (
                <Tooltip title="Add sub-page" placement="top" arrow>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddDoc(doc.id);
                    }}
                    sx={{ p: 0.5, color: "text.secondary", "&:hover": { color: "primary.main" } }}
                  >
                    <Plus size={13} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Delete" placement="top" arrow>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDoc(doc.id);
                  }}
                  sx={{ p: 0.5, color: "text.secondary", "&:hover": { color: "error.main" } }}
                >
                  <Trash2 size={13} />
                </IconButton>
              </Tooltip>
            </Box>
          </ListItemButton>

          {doc.isFolder && doc.children && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ mt: 0.25 }}>
                {renderDocTree(doc.children, depth + 1)}
              </List>
            </Collapse>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <Box 
      component="aside"
      className="glass-sidebar"
      sx={{
        width: 260,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Brand Header */}
      <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ 
            backgroundColor: "rgba(139, 92, 246, 0.1)", 
            border: "1px solid rgba(139, 92, 246, 0.2)",
            p: 1, 
            borderRadius: 2, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center" 
          }}>
            <Layers size={16} style={{ color: "var(--accent-purple)" }} />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: "-0.01em", color: "text.primary" }}>
            Brand Workspace
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, backgroundColor: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.15)", px: 1, py: 0.25, borderRadius: 5 }}>
          <Sparkles size={10} style={{ color: "var(--accent-purple)" }} className="pulse-animation" />
          <Typography variant="caption" sx={{ fontSize: "9px", fontWeight: 700, color: "primary.light" }}>
            AI
          </Typography>
        </Box>
      </Box>

      {/* Team & Project Switchers */}
      <Box sx={{ px: 2, pt: 1.5, pb: 0.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
        {/* Team Dropdown */}
        <Box>
          <Typography variant="caption" sx={{ fontSize: "9px", fontWeight: 700, color: "text.disabled", textTransform: "uppercase", display: "block", mb: 0.5, letterSpacing: "0.05em" }}>
            Active Team
          </Typography>
          <Box sx={{ position: "relative" }}>
            <select
              value={selectedTeamId || ""}
              onChange={(e) => onSelectTeam(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 30px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-primary)",
                backgroundColor: "var(--bg-color)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                outline: "none",
                cursor: "pointer",
                appearance: "none",
                fontFamily: '"Outfit", sans-serif'
              }}
            >
              <option value="" disabled style={{ backgroundColor: "var(--panel-color)", color: "var(--text-primary)" }}>Select Team...</option>
              {teams.map(t => (
                <option key={t.id} value={t.id} style={{ backgroundColor: "var(--panel-color)", color: "var(--text-primary)" }}>{t.name}</option>
              ))}
            </select>
            <Box sx={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none", color: "var(--accent-blue)" }}>
              <Users size={12} />
            </Box>
            <Box sx={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none", color: "text.disabled" }}>
              <ChevronDown size={12} />
            </Box>
          </Box>
        </Box>

        {/* Project Dropdown */}
        <Box>
          <Typography variant="caption" sx={{ fontSize: "9px", fontWeight: 700, color: "text.disabled", textTransform: "uppercase", display: "block", mb: 0.5, letterSpacing: "0.05em" }}>
            Active Project
          </Typography>
          <Box sx={{ position: "relative" }}>
            <select
              value={selectedProjectId || ""}
              onChange={(e) => onSelectProject(e.target.value)}
              disabled={!selectedTeamId}
              style={{
                width: "100%",
                padding: "8px 12px 8px 30px",
                fontSize: "12px",
                fontWeight: 600,
                color: selectedTeamId ? "var(--text-primary)" : "var(--text-secondary)",
                backgroundColor: "var(--bg-color)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                outline: "none",
                cursor: selectedTeamId ? "pointer" : "not-allowed",
                appearance: "none",
                fontFamily: '"Outfit", sans-serif',
                opacity: selectedTeamId ? 1 : 0.6
              }}
            >
              <option value="" disabled style={{ backgroundColor: "var(--panel-color)", color: "var(--text-primary)" }}>Select Project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id} style={{ backgroundColor: "var(--panel-color)", color: "var(--text-primary)" }}>{p.name}</option>
              ))}
            </select>
            <Box sx={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none", color: "var(--accent-purple)" }}>
              <Briefcase size={12} />
            </Box>
            <Box sx={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none", color: "text.disabled" }}>
              <ChevronDown size={12} />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Global Actions (Search Box) */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
        <Box 
          onClick={onOpenSearch}
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 1, 
            px: 1.5, 
            py: 0.75, 
            borderRadius: 2, 
            backgroundColor: "var(--bg-color)", 
            border: "1px solid var(--border-color)",
            color: "text.secondary",
            "&:hover": {
              borderColor: "primary.main",
              boxShadow: "0 0 0 2px rgba(139, 92, 246, 0.15)",
            },
            transition: "all 0.15s ease",
            cursor: "pointer",
            userSelect: "none"
          }}
        >
          <Search size={13} style={{ color: "var(--text-muted)" }} />
          <Typography 
            sx={{ 
              fontSize: "11px", 
              color: "text.disabled",
              flex: 1,
            }}
          >
            Search document...
          </Typography>
          <Box component="kbd" sx={{ 
            fontSize: "9px", 
            px: 1, 
            py: 0.25, 
            backgroundColor: "var(--panel-color)", 
            border: "1px solid var(--border-color)",
            borderRadius: 0.5, 
            color: "text.disabled",
            fontFamily: "monospace"
          }}>
            ⌘P
          </Box>
        </Box>
      </Box>

      {/* Workspaces Section Header */}
      <Box sx={{ px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em", color: "text.disabled", textTransform: "uppercase" }}>
          Documents
        </Typography>
        <Tooltip title="Create new document" placement="top" arrow>
          <IconButton
            size="small"
            disabled={!selectedProjectId}
            onClick={() => onAddDoc()}
            sx={{ color: "text.disabled", "&:hover": { color: "text.primary" } }}
          >
            <Plus size={14} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* List container */}
      <Box sx={{ flex: 1, overflowY: "auto", py: 1 }} className="scrollbar-thin">
        <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
          {!selectedProjectId ? (
            <Typography variant="caption" sx={{ px: 3, py: 4, display: "block", textAlign: "center", color: "text.disabled" }}>
              Please select a project to load pages.
            </Typography>
          ) : documents.length > 0 ? (
            renderDocTree(documents)
          ) : (
            <Typography variant="caption" sx={{ px: 3, py: 4, display: "block", textAlign: "center", color: "text.disabled" }}>
              No documents. Click '+' to start.
            </Typography>
          )}
        </List>
      </Box>

      {/* Footer controls & User profile */}
      <Box sx={{ p: 2, borderTop: "1px solid var(--border-color)", backgroundColor: "color-mix(in srgb, var(--text-primary) 3%, transparent)", display: "flex", flexDirection: "column", gap: 1 }}>
        {/* User profile details */}
        <Box sx={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          p: 1, 
          borderRadius: 1.5,
          backgroundColor: "var(--bg-color)",
          border: "1px solid var(--border-color)"
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, overflow: "hidden" }}>
            <Box sx={{ 
              width: 24, 
              height: 24, 
              borderRadius: "50%", 
              bgcolor: "primary.main", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              flexShrink: 0
            }}>
              <Typography sx={{ fontSize: "10px", fontWeight: 700, color: "primary.contrastText" }}>
                {username.slice(0, 2).toUpperCase()}
              </Typography>
            </Box>
            <Typography noWrap sx={{ fontSize: "11.5px", fontWeight: 600, color: "text.primary", fontFamily: '"Outfit", sans-serif' }}>
              {username}
            </Typography>
          </Box>
          <Tooltip title="Log out" placement="top" arrow>
            <IconButton 
              size="small" 
              onClick={onLogout}
              sx={{ color: "text.disabled", "&:hover": { color: "error.main", backgroundColor: "rgba(239, 68, 68, 0.05)" } }}
            >
              <LogOut size={13} />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          p: 1, 
          borderRadius: 1.5,
          cursor: "pointer", 
          "&:hover": { backgroundColor: "color-mix(in srgb, var(--text-primary) 5%, transparent)" },
          transition: "all 0.15s ease"
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Cpu size={14} style={{ color: "var(--accent-purple)" }} />
            <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "text.secondary" }}>
              Ollama Server
            </Typography>
          </Box>
          <Box sx={{ display: "flex", position: "relative", width: 8, height: 8 }}>
            <Box component="span" className="ping-animation" sx={{ position: "absolute", height: "100%", width: "100%", borderRadius: "50%", backgroundColor: "#10b981", opacity: 0.75 }} />
            <Box component="span" sx={{ position: "relative", height: 8, width: 8, borderRadius: "50%", backgroundColor: "#10b981" }} />
          </Box>
        </Box>

        <Box 
          onClick={onToggleThemeMode}
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between",
            p: 1, 
            borderRadius: 1.5,
            cursor: "pointer", 
            "&:hover": { backgroundColor: "color-mix(in srgb, var(--text-primary) 5%, transparent)" },
            transition: "all 0.15s ease",
            color: "text.secondary"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {themeMode === "light" ? <Moon size={14} /> : <Sun size={14} />}
            <Typography sx={{ fontSize: "11px", fontWeight: 600 }}>
              {themeMode === "light" ? "Dark Mode" : "Light Mode"}
            </Typography>
          </Box>
        </Box>

        <Box 
          onClick={onOpenSettings}
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 1, 
            p: 1, 
            borderRadius: 1.5,
            cursor: "pointer", 
            "&:hover": { backgroundColor: "color-mix(in srgb, var(--text-primary) 5%, transparent)" },
            transition: "all 0.15s ease",
            color: "text.secondary"
          }}
        >
          <Settings size={14} />
          <Typography sx={{ fontSize: "11px", fontWeight: 600 }}>
            Workspace settings
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
