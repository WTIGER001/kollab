import React, { useState } from "react";
import PostAdd from "@mui/icons-material/PostAdd";
import { 
  Box, 
  List, 
  ListItemButton, 
  ListItemText, 
  ListItemIcon,
  IconButton, 
  Typography, 
  Tooltip,
  Collapse,
  Button,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel
} from "@mui/material";
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Trash2,
  Briefcase,
  MoreHorizontal,
  FileText,
  Settings,
  Users,
  Check,
  User,
  FolderInput,
  X,
  AtSign,
  FileUp
} from "lucide-react";
import type { Team, Project } from "../services/api";
import { ImportDialog } from "./ImportDialog";


export interface RecentSpace {
  id: string;
  type: "team" | "project" | "personal";
  name: string;
  abbreviation?: string;
  teamId?: string;
  teamAbbreviation?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  isFolder?: boolean;
  content?: string;
  children?: DocumentItem[];
  parentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: string;
}

const isDescendant = (draggedId: string, targetId: string, items: DocumentItem[]): boolean => {
  const findItem = (id: string, list: DocumentItem[]): DocumentItem | null => {
    for (const item of list) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findItem(id, item.children);
        if (found) return found;
      }
    }
    return null;
  };

  const draggedItem = findItem(draggedId, items);
  if (!draggedItem || !draggedItem.children) return false;

  const checkChildren = (id: string, children: DocumentItem[]): boolean => {
    for (const child of children) {
      if (child.id === id) return true;
      if (child.children && checkChildren(id, child.children)) return true;
    }
    return false;
  };

  return checkChildren(targetId, draggedItem.children);
};

const getMoveCandidates = (items: DocumentItem[], excludeId: string): { id: string; title: string; depth: number }[] => {
  const candidates: { id: string; title: string; depth: number }[] = [];

  const traverse = (list: DocumentItem[], depth = 0) => {
    for (const item of list) {
      if (item.id === excludeId) {
        continue;
      }
      candidates.push({ id: item.id, title: item.title, depth });
      if (item.children) {
        traverse(item.children, depth + 1);
      }
    }
  };

  traverse(items);
  return candidates;
};

interface MovePageDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  documents: DocumentItem[];
  onConfirm: (id: string, parentId: string | null) => Promise<void>;
}

export const MovePageDialog: React.FC<MovePageDialogProps> = ({
  open,
  onClose,
  documentId,
  documentTitle,
  documents,
  onConfirm
}) => {
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const candidates = getMoveCandidates(documents, documentId);

  const handleMove = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(documentId, selectedParentId === "" ? null : selectedParentId);
      onClose();
    } catch (err) {
      console.error("Move dialog confirm error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700 }}>
        Move "{documentTitle}"
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 3, color: "text.secondary", fontSize: "13px" }}>
          Select the new parent page for this document. Moving it to the "Top Level (Root)" will place it at the base of the space.
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel id="move-parent-select-label" sx={{ fontFamily: '"Outfit", sans-serif' }}>
            New Parent Page
          </InputLabel>
          <Select
            labelId="move-parent-select-label"
            value={selectedParentId}
            label="New Parent Page"
            onChange={(e) => setSelectedParentId(e.target.value as string)}
            sx={{ fontFamily: '"Outfit", sans-serif', fontSize: "13px" }}
          >
            <MenuItem value="" sx={{ fontFamily: '"Outfit", sans-serif', fontSize: "13px", fontWeight: 600 }}>
              📁 Top Level (Root)
            </MenuItem>
            {candidates.map((c) => (
              <MenuItem
                key={c.id}
                value={c.id}
                sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: "13px",
                  pl: c.depth * 2 + 2,
                }}
              >
                {"\u00A0".repeat(c.depth * 2)} 📄 {c.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} size="small" sx={{ fontFamily: '"Outfit", sans-serif', textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          onClick={handleMove}
          variant="contained"
          size="small"
          disabled={isSubmitting}
          sx={{
            fontFamily: '"Outfit", sans-serif',
            textTransform: "none",
            backgroundColor: "var(--primary-color)",
            "&:hover": { backgroundColor: "var(--primary-dark)" },
          }}
        >
          {isSubmitting ? "Moving..." : "Move"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface SidebarProps {
  documents: DocumentItem[];
  activeDocId: string | null;
  onSelectDoc: (id: string) => void;
  onAddDoc: (parentId?: string) => void;
  onDeleteDoc: (id: string) => void;
  onMoveDoc: (id: string, parentId: string | null) => Promise<void>;
  
  // OIDC & Workspace Hierarchy
  teams: Team[];
  projects: Project[];
  selectedTeamId: string | null;
  selectedProjectId: string | null;
  navigateTo: (
    team: string | null,
    project: string | null,
    page: string | null,
    isSettings?: boolean,
    isTeamSettings?: boolean,
    isFavoritesPage?: boolean,
    isRecentsPage?: boolean,
    isAuditPage?: boolean,
    isTrashPage?: boolean,
    isTasksPage?: boolean,
    isMentionsPage?: boolean
  ) => void;
  width?: number;

  recentSpaces: RecentSpace[];
  onOpenCreateSpace: () => void;
  onRestoreDoc: (id: string) => Promise<void>;
  onDeleteDocPermanently: (id: string) => Promise<void>;
  isMobile?: boolean;
  onCloseSidebar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  activeDocId,
  onSelectDoc,
  onAddDoc,
  onDeleteDoc,
  onMoveDoc,
  teams,
  projects,
  selectedTeamId,
  selectedProjectId,
  navigateTo,
  width = 240,
  recentSpaces,
  onOpenCreateSpace,
  onRestoreDoc,
  onDeleteDocPermanently,
  isMobile = false,
  onCloseSidebar
}) => {
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({
    "1": true,
    "2": true,
  });

  const [projectMenuAnchor, setProjectMenuAnchor] = useState<null | HTMLElement>(null);
  const [templateMenuAnchor, setTemplateMenuAnchor] = useState<null | HTMLElement>(null);

  const activeProject = projects.find(p => p.id === selectedProjectId);
  const activeTeam = teams.find(t => t.id === selectedTeamId);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDocs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenProjectMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setProjectMenuAnchor(e.currentTarget);
  };

  const handleCloseProjectMenu = () => {
    setProjectMenuAnchor(null);
  };

  const handleOpenTemplates = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setTemplateMenuAnchor(e.currentTarget);
  };

  const handleCloseTemplates = () => {
    setTemplateMenuAnchor(null);
  };

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [activeMoveDoc, setActiveMoveDoc] = useState<DocumentItem | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    if (isDescendant(draggedId, targetId, documents)) return;
    setDragOverId(targetId);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    setDraggedId(null);
    setDragOverId(null);

    if (!id || id === targetId) return;
    if (targetId && isDescendant(id, targetId, documents)) return;

    await onMoveDoc(id, targetId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const renderDocTree = (items: DocumentItem[], depth = 0) => {
    return items.map(doc => {
      const isExpanded = !!expandedDocs[doc.id];
      const isActive = activeDocId === doc.id;

      return (
        <React.Fragment key={doc.id}>
          <ListItemButton
            onClick={() => {
              onSelectDoc(doc.id);
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, doc.id)}
            onDragOver={(e) => handleDragOver(e, doc.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, doc.id)}
            onDragEnd={handleDragEnd}
            sx={{
              pl: `${depth * 8 + 4}px`,
              pr: 1.5,
              py: 0,
              mx: 1,
              my: 0,
              borderRadius: "4px",
              color: isActive ? "var(--primary-color)" : "text.secondary",
              backgroundColor: dragOverId === doc.id
                ? "rgba(139, 92, 246, 0.15)"
                : isActive 
                  ? "color-mix(in srgb, var(--primary-color) 12%, transparent)" 
                  : "transparent",
              border: dragOverId === doc.id
                ? "1px dashed var(--primary-color)"
                : isActive 
                  ? "1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)" 
                  : "1px solid transparent",
              "& .action-btn": { opacity: 0 },
              "&:hover": {
                color: isActive ? "var(--primary-color)" : "text.primary",
                backgroundColor: isActive 
                  ? "color-mix(in srgb, var(--primary-color) 18%, transparent)" 
                  : "color-mix(in srgb, var(--text-primary) 4%, transparent)",
                "& .action-btn": { opacity: 1 },
              },
              transition: "all 0.15s ease",
              minHeight: 28,
            }}
          >
            <ListItemIcon sx={{ minWidth: "auto", color: "inherit", mr: "4px", display: "flex", alignItems: "center" }}>
              {doc.isFolder ? (
                <Box 
                  onClick={(e) => toggleExpand(doc.id, e)} 
                  sx={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    p: 0,
                    borderRadius: 0.5,
                    color: "text.disabled",
                    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.05)", color: "text.primary" }
                  }}
                >
                  {isExpanded ? <ChevronDown size={12} style={{ flexShrink: 0 }} /> : <ChevronRight size={12} style={{ flexShrink: 0 }} />}
                </Box>
              ) : (
                <Box sx={{ width: 12 }} />
              )}
            </ListItemIcon>
            
            <ListItemText 
              primary={
                <Typography 
                  noWrap 
                  sx={{ 
                    fontSize: "13px", 
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
              <Tooltip title="Add sub-page" placement="top" arrow>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddDoc(doc.id);
                  }}
                  sx={{ p: 0.25, color: "text.secondary", "&:hover": { color: "primary.main" } }}
                >
                  <Plus size={12} />
                </IconButton>
              </Tooltip>
            </Box>
          </ListItemButton>

          {doc.isFolder && doc.children && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ mt: 0 }}>
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
        width: isMobile ? "100%" : width,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        zIndex: isMobile ? 1200 : 10,
        position: isMobile ? "absolute" : "relative",
        left: 0,
        top: 0,
        borderRight: isMobile ? "none" : "1px solid var(--border-color)",
        backgroundColor: "var(--panel-color)",
        backdropFilter: isMobile ? "blur(20px)" : "none",
        boxShadow: isMobile ? "0 8px 32px rgba(0, 0, 0, 0.4)" : "none",
      }}
    >
      {/* Active Project Switcher Header */}
      {selectedProjectId === null && activeTeam ? (
        <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", mb: 2 }}>
          <Box 
            onClick={() => {
              if (activeTeam.id.startsWith("personal_")) {
                navigateTo("personal", null, null);
              } else {
                navigateTo(activeTeam.abbreviation || activeTeam.id, null, null);
              }
            }}
            sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 1, 
              cursor: "pointer",
              flex: 1,
              minWidth: 0,
              "&:hover": { opacity: 0.85 }
            }}
          >
            <Avatar 
              sx={{ 
                width: 24, 
                height: 24, 
                bgcolor: activeTeam.id.startsWith("personal_") ? "secondary.main" : "primary.main", 
                fontSize: "10px", 
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              {activeTeam.id.startsWith("personal_") ? <User size={12} /> : activeTeam.name.slice(0, 2).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography 
                noWrap
                sx={{ 
                  fontSize: "13px", 
                  fontWeight: 700, 
                  color: "text.primary", 
                  fontFamily: '"Outfit", sans-serif',
                  lineHeight: 1.2
                }}
              >
                {activeTeam.name}
              </Typography>
              <Typography 
                variant="caption" 
                noWrap
                sx={{ 
                  fontSize: "9.5px", 
                  color: "text.disabled", 
                  display: "block",
                  fontFamily: '"Outfit", sans-serif',
                  lineHeight: 1.1
                }}
              >
                {activeTeam.id.startsWith("personal_") ? "Personal Space" : "Team Space"}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton 
              size="small" 
              onClick={handleOpenProjectMenu}
              sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
            >
              <MoreHorizontal size={14} />
            </IconButton>
            {isMobile && onCloseSidebar && (
              <IconButton 
                size="small" 
                onClick={onCloseSidebar}
                sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
              >
                <X size={16} />
              </IconButton>
            )}
          </Box>
        </Box>
      ) : activeProject ? (
        <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", mb: 2 }}>
          <Box 
            onClick={() => {
              if (activeTeam && activeProject) {
                const url = `/teams/${activeTeam.abbreviation || activeTeam.id}/${activeProject.abbreviation || activeProject.id}`;
                window.history.pushState({}, "", url);
                window.dispatchEvent(new PopStateEvent("popstate"));
              }
            }}
            sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 1, 
              cursor: "pointer",
              flex: 1,
              minWidth: 0,
              "&:hover": { opacity: 0.85 }
            }}
          >
            <Avatar 
              src={activeProject.logoUrl || undefined}
              sx={{ 
                width: 24, 
                height: 24, 
                bgcolor: "secondary.main", 
                fontSize: "11px", 
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              {activeProject.name.slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography 
                noWrap
                sx={{ 
                  fontSize: "13px", 
                  fontWeight: 700, 
                  color: "text.primary", 
                  fontFamily: '"Outfit", sans-serif',
                  lineHeight: 1.2
                }}
              >
                {activeProject.name}
              </Typography>
              <Typography 
                variant="caption" 
                noWrap
                sx={{ 
                  fontSize: "9.5px", 
                  color: "text.disabled", 
                  display: "block",
                  fontFamily: '"Outfit", sans-serif',
                  lineHeight: 1.1
                }}
              >
                Project Space
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton 
              size="small" 
              onClick={handleOpenProjectMenu}
              sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
            >
              <MoreHorizontal size={14} />
            </IconButton>
            {isMobile && onCloseSidebar && (
              <IconButton 
                size="small" 
                onClick={onCloseSidebar}
                sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
              >
                <X size={16} />
              </IconButton>
            )}
          </Box>
        </Box>
      ) : activeTeam ? (
        <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", mb: 2 }}>
          <Box 
            onClick={() => {
              if (activeTeam.id.startsWith("personal_")) {
                navigateTo("personal", null, null);
              } else {
                navigateTo(activeTeam.abbreviation || activeTeam.id, null, null);
              }
            }}
            sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 1, 
              cursor: "pointer",
              flex: 1,
              minWidth: 0,
              "&:hover": { opacity: 0.85 }
            }}
          >
            <Avatar 
              sx={{ 
                width: 24, 
                height: 24, 
                bgcolor: activeTeam.id.startsWith("personal_") ? "secondary.main" : "primary.main", 
                fontSize: "10px", 
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              {activeTeam.id.startsWith("personal_") ? <User size={12} /> : activeTeam.name.slice(0, 2).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography 
                noWrap
                sx={{ 
                  fontSize: "13px", 
                  fontWeight: 700, 
                  color: "text.primary", 
                  fontFamily: '"Outfit", sans-serif',
                  lineHeight: 1.2
                }}
              >
                {activeTeam.name}
              </Typography>
              <Typography 
                variant="caption" 
                noWrap
                sx={{ 
                  fontSize: "9.5px", 
                  color: "text.disabled", 
                  display: "block",
                  fontFamily: '"Outfit", sans-serif',
                  lineHeight: 1.1
                }}
              >
                {activeTeam.id.startsWith("personal_") ? "Personal Space" : "Team Space"}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton 
              size="small" 
              onClick={handleOpenProjectMenu}
              sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
            >
              <MoreHorizontal size={14} />
            </IconButton>
            {isMobile && onCloseSidebar && (
              <IconButton 
                size="small" 
                onClick={onCloseSidebar}
                sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
              >
                <X size={16} />
              </IconButton>
            )}
          </Box>
        </Box>
      ) : (
        <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", mb: 2 }}>
          <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "text.secondary", fontFamily: '"Outfit", sans-serif' }}>
            Select Project...
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton size="small" onClick={handleOpenProjectMenu} sx={{ color: "text.secondary" }}>
              <MoreHorizontal size={14} />
            </IconButton>
            {isMobile && onCloseSidebar && (
              <IconButton size="small" onClick={onCloseSidebar} sx={{ color: "text.secondary" }}>
                <X size={16} />
              </IconButton>
            )}
          </Box>
        </Box>
      )}

      {/* Switch Project Menu Popover */}
      <Menu
        anchorEl={projectMenuAnchor}
        open={Boolean(projectMenuAnchor)}
        onClose={handleCloseProjectMenu}
        slotProps={{
          paper: {
            sx: {
              width: 250,
              mt: 0.5,
              maxHeight: 400,
            }
          }
        }}
      >
        {/* -- RECENT -- */}
        {recentSpaces.length > 0 && (
          <>
            <Typography variant="caption" sx={{ px: 2, py: 0.75, display: "block", color: "text.disabled", fontWeight: 700, fontSize: "9px", fontFamily: '"Outfit", sans-serif', textTransform: "uppercase" }}>
              RECENT
            </Typography>
            {recentSpaces.map((space) => {
              const isSelected = space.type === "personal" 
                ? (selectedTeamId?.startsWith("personal_") && selectedProjectId === null)
                : space.type === "team"
                ? (selectedTeamId === space.id && selectedProjectId === null)
                : (selectedProjectId === space.id);

              return (
                <MenuItem
                  key={`recent-${space.id}`}
                  selected={isSelected}
                  onClick={() => {
                    if (space.type === "personal") {
                      navigateTo("personal", null, null);
                    } else if (space.type === "team") {
                      navigateTo(space.abbreviation || space.id, null, null);
                    } else {
                      navigateTo(space.teamAbbreviation || space.teamId || null, space.abbreviation || space.id, null);
                    }
                    handleCloseProjectMenu();
                  }}
                  sx={{
                    py: 0.75,
                    px: 2,
                    fontSize: "12px",
                    fontWeight: isSelected ? 600 : 500,
                    fontFamily: '"Outfit", sans-serif',
                    color: isSelected ? "var(--primary-color)" : "text.primary",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {space.type === "personal" ? (
                      <User size={12} style={{ color: isSelected ? "var(--primary-color)" : "inherit" }} />
                    ) : space.type === "team" ? (
                      <Users size={12} style={{ color: isSelected ? "var(--primary-color)" : "inherit" }} />
                    ) : (
                      <Briefcase size={12} style={{ color: isSelected ? "var(--primary-color)" : "inherit" }} />
                    )}
                    <Typography sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif', fontWeight: isSelected ? 600 : 500 }} noWrap>
                      {space.name}
                    </Typography>
                  </Box>
                  {isSelected && <Check size={12} style={{ color: "var(--primary-color)" }} />}
                </MenuItem>
              );
            })}
            <Divider sx={{ my: 0.5 }} />
          </>
        )}

        {/* -- Teams -- */}
        <Typography variant="caption" sx={{ px: 2, py: 0.75, display: "block", color: "text.disabled", fontWeight: 700, fontSize: "9px", fontFamily: '"Outfit", sans-serif', textTransform: "uppercase" }}>
          Teams
        </Typography>
        {teams.filter(t => !t.id.startsWith("personal_")).map((t) => {
          const isTeamActive = selectedTeamId === t.id;
          const isTeamSelected = isTeamActive && selectedProjectId === null;
          const teamProjects = projects.filter(p => p.teamId === t.id);

          return (
            <React.Fragment key={t.id}>
              {/* Team Item */}
              <MenuItem
                selected={isTeamSelected}
                onClick={() => {
                  navigateTo(t.abbreviation || t.id, null, null);
                  handleCloseProjectMenu();
                }}
                sx={{
                  py: 0.75,
                  px: 2,
                  fontSize: "12.5px",
                  fontWeight: isTeamSelected ? 600 : 500,
                  fontFamily: '"Outfit", sans-serif',
                  color: isTeamSelected ? "var(--primary-color)" : "text.primary",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Users size={12} style={{ color: isTeamSelected ? "var(--primary-color)" : "inherit" }} />
                  <Typography sx={{ fontSize: "12.5px", fontFamily: '"Outfit", sans-serif', fontWeight: isTeamSelected ? 700 : 600 }} noWrap>
                    {t.name}
                  </Typography>
                </Box>
                {isTeamSelected && <Check size={12} style={{ color: "var(--primary-color)" }} />}
              </MenuItem>

              {/* Projects under this Team */}
              {teamProjects.map((p) => {
                const isProjectSelected = selectedProjectId === p.id;
                return (
                  <MenuItem
                    key={p.id}
                    selected={isProjectSelected}
                    onClick={() => {
                      navigateTo(t.abbreviation || t.id, p.abbreviation || p.id, null);
                      handleCloseProjectMenu();
                    }}
                    sx={{
                      py: 0.75,
                      pl: 4, // Indent projects under team
                      pr: 2,
                      fontSize: "12px",
                      fontWeight: isProjectSelected ? 600 : 500,
                      fontFamily: '"Outfit", sans-serif',
                      color: isProjectSelected ? "var(--primary-color)" : "text.secondary",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Briefcase size={10} style={{ color: isProjectSelected ? "var(--primary-color)" : "inherit" }} />
                      <Typography sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif', fontWeight: isProjectSelected ? 600 : 500 }} noWrap>
                        {p.name}
                      </Typography>
                    </Box>
                    {isProjectSelected && <Check size={10} style={{ color: "var(--primary-color)" }} />}
                  </MenuItem>
                );
              })}
            </React.Fragment>
          );
        })}
        <Divider sx={{ my: 0.5 }} />

        {/* -- Personal -- */}
        <Typography variant="caption" sx={{ px: 2, py: 0.75, display: "block", color: "text.disabled", fontWeight: 700, fontSize: "9px", fontFamily: '"Outfit", sans-serif', textTransform: "uppercase" }}>
          Personal
        </Typography>
        {(() => {
          const personalTeam = teams.find(t => t.id.startsWith("personal_"));
          const isPersonalSelected = selectedTeamId?.startsWith("personal_") && selectedProjectId === null;
          return (
            <MenuItem
              selected={isPersonalSelected}
              onClick={() => {
                navigateTo("personal", null, null);
                handleCloseProjectMenu();
              }}
              sx={{
                py: 0.75,
                px: 2,
                fontSize: "12.5px",
                fontWeight: isPersonalSelected ? 600 : 500,
                fontFamily: '"Outfit", sans-serif',
                color: isPersonalSelected ? "var(--primary-color)" : "text.primary",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <User size={12} style={{ color: isPersonalSelected ? "var(--primary-color)" : "inherit" }} />
                <Typography sx={{ fontSize: "12.5px", fontFamily: '"Outfit", sans-serif', fontWeight: isPersonalSelected ? 700 : 600 }} noWrap>
                  Personal Space
                </Typography>
              </Box>
              {isPersonalSelected && <Check size={12} style={{ color: "var(--primary-color)" }} />}
            </MenuItem>
          );
        })()}
        <Divider sx={{ my: 0.5 }} />

        {/* Create Team or Project */}
        <MenuItem
          onClick={() => {
            onOpenCreateSpace();
            handleCloseProjectMenu();
          }}
          sx={{
            py: 0.75,
            px: 2,
            fontSize: "12.5px",
            fontFamily: '"Outfit", sans-serif',
            color: "text.primary",
          }}
        >
          <ListItemIcon sx={{ minWidth: 24 }}>
            <Plus size={12} />
          </ListItemIcon>
          <ListItemText primary={<Typography sx={{ fontSize: "12.5px", fontFamily: '"Outfit", sans-serif' }}>Create Team or Project</Typography>} />
        </MenuItem>

        {/* Settings options contextually */}
        {selectedTeamId && !selectedTeamId.startsWith("personal_") && selectedProjectId === null && (
          <MenuItem
            onClick={() => {
              const team = teams.find(t => t.id === selectedTeamId);
              if (team) {
                navigateTo(team.abbreviation || team.id, null, null, false, true);
              }
              handleCloseProjectMenu();
            }}
            sx={{
              py: 0.75,
              px: 2,
              fontSize: "12.5px",
              fontFamily: '"Outfit", sans-serif',
            }}
          >
            <ListItemIcon sx={{ minWidth: 24 }}>
              <Settings size={12} />
            </ListItemIcon>
            <ListItemText primary={<Typography sx={{ fontSize: "12.5px", fontFamily: '"Outfit", sans-serif' }}>Team Settings</Typography>} />
          </MenuItem>
        )}

        {selectedProjectId && (
          <MenuItem
            onClick={() => {
              const team = teams.find(t => t.id === selectedTeamId);
              const proj = projects.find(p => p.id === selectedProjectId);
              if (team && proj) {
                navigateTo(team.abbreviation || team.id, proj.abbreviation || proj.id, null, true);
              }
              handleCloseProjectMenu();
            }}
            sx={{
              py: 0.75,
              px: 2,
              fontSize: "12.5px",
              fontFamily: '"Outfit", sans-serif',
            }}
          >
            <ListItemIcon sx={{ minWidth: 24 }}>
              <Settings size={12} />
            </ListItemIcon>
            <ListItemText primary={<Typography sx={{ fontSize: "12.5px", fontFamily: '"Outfit", sans-serif' }}>Project Settings</Typography>} />
          </MenuItem>
        )}

        {selectedTeamId?.startsWith("personal_") && (
          <MenuItem
            onClick={() => {
              navigateTo("personal", null, null, true);
              handleCloseProjectMenu();
            }}
            sx={{
              py: 0.75,
              px: 2,
              fontSize: "12.5px",
              fontFamily: '"Outfit", sans-serif',
            }}
          >
            <ListItemIcon sx={{ minWidth: 24 }}>
              <Settings size={12} />
            </ListItemIcon>
            <ListItemText primary={<Typography sx={{ fontSize: "12.5px", fontFamily: '"Outfit", sans-serif' }}>Personal Settings</Typography>} />
          </MenuItem>
        )}
      </Menu>

      {/* Split Create Button */}
      <Box 
        sx={{ 
          px: 2, 
          mb: 2,
          display: "flex",
          alignItems: "center",
          gap: 0.5
        }}
      >
        <Button
          variant="text"
          size="small"
          disabled={!selectedTeamId}
          onClick={() => {
            const isDoc = activeDocId && activeDocId !== selectedProjectId && activeDocId !== selectedTeamId;
            onAddDoc(isDoc ? activeDocId : undefined);
          }}
          startIcon={<PostAdd sx={{ fontSize: 16 }} />}
          sx={{ 
            textTransform: "none", 
            fontWeight: 600,
            fontSize: "13px",
            fontFamily: '"Outfit", sans-serif',
            color: "var(--primary-color)",
            p: 0,
            minWidth: "auto",
            justifyContent: "flex-start",
            backgroundColor: "transparent",
            "&:hover": {
              backgroundColor: "transparent",
              textDecoration: "underline",
              color: "var(--accent-purple-hover)",
            },
            "&.Mui-disabled": {
              color: "text.disabled",
              opacity: 0.5,
            }
          }}
        >
          Create page
        </Button>
        <IconButton
          size="small"
          disabled={!selectedTeamId}
          onClick={handleOpenTemplates}
          sx={{ 
            p: 0.25,
            color: "var(--primary-color)",
            backgroundColor: "transparent",
            "&:hover": {
              backgroundColor: "transparent",
              color: "var(--accent-purple-hover)",
            },
            "&.Mui-disabled": {
              color: "text.disabled",
              opacity: 0.5,
            }
          }}
        >
          <ChevronDown size={14} />
        </IconButton>
      </Box>
      <Menu
        anchorEl={templateMenuAnchor}
        open={Boolean(templateMenuAnchor)}
        onClose={handleCloseTemplates}
        slotProps={{
          paper: {
            sx: {
              width: 180,
              mt: 0.5,
            }
          }
        }}
      >
        <MenuItem
          onClick={() => {
            handleCloseTemplates();
            setImportDialogOpen(true);
          }}
          sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}
        >
          <ListItemIcon sx={{ minWidth: 24 }}><FileUp size={12} /></ListItemIcon>
          <ListItemText primary={<Typography sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Import Hierarchy</Typography>} />
        </MenuItem>
        <MenuItem disabled sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>
          <ListItemIcon sx={{ minWidth: 24 }}><FileText size={12} /></ListItemIcon>
          <ListItemText primary={<Typography sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Templates coming soon</Typography>} />
        </MenuItem>
      </Menu>

      {/* Documents Page Tree */}
      <Box sx={{ flex: 1, overflowY: "auto", pb: 2 }} className="scrollbar-thin">
        {draggedId && (
          <Box
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverId("root");
            }}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, null)}
            sx={{
              mx: 2,
              my: 1,
              py: 1,
              border: "1.5px dashed",
              borderColor: dragOverId === "root" ? "primary.main" : "rgba(255, 255, 255, 0.08)",
              borderRadius: "6px",
              backgroundColor: dragOverId === "root" ? "rgba(139, 92, 246, 0.08)" : "transparent",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Typography variant="caption" sx={{ color: dragOverId === "root" ? "primary.light" : "text.secondary", fontWeight: 600, fontSize: "11px" }}>
              Drop here to move to Top Level (Root)
            </Typography>
          </Box>
        )}
        <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {!selectedTeamId ? (
            <Typography variant="caption" sx={{ px: 3, py: 4, display: "block", textAlign: "center", color: "text.disabled", fontFamily: '"Outfit", sans-serif' }}>
              Select a space to load pages.
            </Typography>
          ) : documents.length > 0 ? (
            renderDocTree(documents)
          ) : (
            <Typography variant="caption" sx={{ px: 3, py: 4, display: "block", textAlign: "center", color: "text.disabled", fontFamily: '"Outfit", sans-serif' }}>
              No documents. Click 'Create' to start.
            </Typography>
          )}
        </List>
      </Box>

      {/* Global & Navigation Buttons */}
      <Divider sx={{ borderColor: "var(--border-color)", opacity: 0.5 }} />
      <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
        {/* Trash Button */}
        {selectedTeamId && (
          <ListItemButton
            onClick={() => {
              if (selectedTeamId) {
                const isPersonal = selectedTeamId.startsWith("personal_") || selectedTeamId === "personal";
                const teamArg = isPersonal ? "personal" : (activeTeam?.abbreviation || activeTeam?.id || selectedTeamId);
                const projectArg = isPersonal ? null : (activeProject?.abbreviation || activeProject?.id || selectedProjectId);
                navigateTo(teamArg, projectArg, null, false, false, false, false, false, true);
              }
            }}
            sx={{
              py: 0.75,
              px: 1.5,
              borderRadius: "6px",
              color: "text.secondary",
              "&:hover": {
                color: "var(--primary-color, #8b5cf6)",
                bgcolor: "rgba(255, 255, 255, 0.04)",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 28, color: "inherit" }}>
              <Trash2 size={16} />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography sx={{ fontSize: "13px", fontWeight: 600, fontFamily: '"Outfit", sans-serif' }}>
                  Trash Bin
                </Typography>
              }
            />
          </ListItemButton>
        )}

        {/* My Mentions Button */}
        <ListItemButton
          onClick={() => {
            navigateTo(null, null, null, false, false, false, false, false, false, false, true);
          }}
          sx={{
            py: 0.75,
            px: 1.5,
            borderRadius: "6px",
            color: "text.secondary",
            "&:hover": {
              color: "var(--primary-color, #8b5cf6)",
              bgcolor: "rgba(255, 255, 255, 0.04)",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 28, color: "inherit" }}>
            <AtSign size={16} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography sx={{ fontSize: "13px", fontWeight: 600, fontFamily: '"Outfit", sans-serif' }}>
                My Mentions
              </Typography>
            }
          />
        </ListItemButton>
      </Box>

      {/* Import Hierarchy Dialog */}
      {importDialogOpen && selectedTeamId && (
        <ImportDialog
          open={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          teamId={selectedTeamId}
          projectId={selectedProjectId}
          parentId={activeDocId}
          onImportSuccess={(newDocId) => {
            onSelectDoc(newDocId);
          }}
        />
      )}
    </Box>
  );
};
