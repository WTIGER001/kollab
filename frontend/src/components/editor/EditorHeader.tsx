import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Chip,
  CircularProgress,
  Button,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  MoreHorizontal,
  History,
  BarChart2,
  Star,
  Check,
  Cloud,
  Edit,
  FileUp,
  FolderInput,
  Link2,
  Trash2,
  Settings,
  Code,
  ChevronRight,
  Paperclip,
  Users,
  MessageSquare,
  MessageSquareOff,
  Bell,
} from "lucide-react";

export interface EditorHeaderProps {
  editor: any;
  activeDocId: string | null;
  developerMode: boolean;
  isSaving: boolean;
  previewVersion: any;
  isFavorite: boolean;
  setIsFavorite: (val: boolean) => void;
  isWatching: boolean;
  setIsWatching: (val: boolean) => void;
  selectedProjectName: string;
  selectedTeamName: string;
  breadcrumbsList: any[];
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  canEdit?: boolean;
  showComments?: boolean;
  setShowComments?: (val: boolean) => void;
  uniqueActiveUsers: any[];
  moreMenuAnchor: HTMLElement | null;
  historyOpen: boolean;
  attachments: any[];
  deletedAt?: string | null;
  handleToggleHistory: () => void;
  handleOpenMoreMenu: (e: React.MouseEvent<any>) => void;
  handleCloseMoreMenu: () => void;
  handleTriggerMove: () => void;
  handleTriggerDelete: () => void;
  setPageSettingsDialogOpen: (val: boolean) => void;
  setAnalyticsDialogOpen: (val: boolean) => void;
  setCommitDescription: (val: string) => void;
  setCommitModalOpen: (val: boolean) => void;
  setExportDialogOpen: (val: boolean) => void;
  setJsonDialogOpen: (val: boolean) => void;
  setRestrictionsDialogOpen: (val: boolean) => void;
  setSharingLinksDialogOpen: (val: boolean) => void;
  addFavorite: (id: string) => Promise<any>;
  removeFavorite: (id: string) => Promise<any>;
  addWatch: (id: string) => Promise<any>;
  removeWatch: (id: string) => Promise<any>;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  editor,
  activeDocId,
  developerMode,
  isSaving,
  previewVersion,
  isFavorite,
  setIsFavorite,
  isWatching,
  setIsWatching,
  selectedProjectName,
  selectedTeamName,
  breadcrumbsList,
  isEditing,
  setIsEditing,
  canEdit = true,
  showComments,
  setShowComments,
  uniqueActiveUsers,
  moreMenuAnchor,
  historyOpen,
  attachments,
  deletedAt,
  handleToggleHistory,
  handleOpenMoreMenu,
  handleCloseMoreMenu,
  handleTriggerMove,
  handleTriggerDelete,
  setPageSettingsDialogOpen,
  setAnalyticsDialogOpen,
  setCommitDescription,
  setCommitModalOpen,
  setExportDialogOpen,
  setJsonDialogOpen,
  setRestrictionsDialogOpen,
  setSharingLinksDialogOpen,
  addFavorite,
  removeFavorite,
  addWatch,
  removeWatch,
}) => {
  const toggleWatch = async () => {
    if (!activeDocId) return;
    try {
      if (isWatching) await removeWatch(activeDocId);
      else await addWatch(activeDocId);
      setIsWatching(!isWatching);
    } catch (err) { console.error("Failed to toggle page watch:", err); }
  };
  return (
    <>
      {editor && !previewVersion && (
        <Box
          sx={{
            display: "flex",
            minWidth: 0,
            "@media (max-width:899.95px)": { "& .MuiIconButton-root": { minWidth: 44, minHeight: 44 }, "& .MuiButton-root": { minHeight: 44, minWidth: 44 }, "& [data-mobile-secondary]": { display: "none" } },
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            color: "text.secondary",
            px: { xs: 2, sm: 3, md: 4 },
            pt: 2,
            pb: 1.5,
            borderBottom: "1px solid var(--border-color)",
            borderColor: "var(--border-color)",
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          {/* Left: Breadcrumbs in Readonly, Mode/Save in Edit */}
          {!isEditing ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                flexWrap: "wrap",
                minWidth: 0, overflowWrap: "anywhere",
                color: "text.secondary",
                userSelect: "none",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, flexWrap: "wrap" }}>
                {selectedTeamName && (
                  <>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "11px",
                        color: "text.secondary",
                        fontWeight: 600,
                        letterSpacing: "0.03em",
                      }}
                    >
                      {selectedTeamName}
                    </Typography>
                    <ChevronRight size={11} style={{ opacity: 0.4 }} />
                  </>
                )}
                {selectedProjectName && (
                  <>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "11px",
                        color: "text.secondary",
                        fontWeight: 600,
                        letterSpacing: "0.03em",
                      }}
                    >
                      {selectedProjectName}
                    </Typography>
                    <ChevronRight size={11} style={{ opacity: 0.4 }} />
                  </>
                )}
                {breadcrumbsList.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "11px",
                        color:
                          idx === breadcrumbsList.length - 1
                            ? "text.primary"
                            : "text.secondary",
                        fontWeight:
                          idx === breadcrumbsList.length - 1 ? 600 : 500,
                        letterSpacing: "0.03em",
                      }}
                    >
                      {crumb.title}
                    </Typography>
                    {idx < breadcrumbsList.length - 1 && (
                      <ChevronRight size={11} style={{ opacity: 0.4 }} />
                    )}
                  </React.Fragment>
                ))}
              </Box>
              {attachments.length > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    ml: 2,
                    borderLeft: "var(--border-color)",
                    pl: 2,
                  }}
                >
                  <Tooltip title="Jump to attachments at bottom">
                    <Button
                      size="small"
                      startIcon={<Paperclip size={12} />}
                      onClick={() => {
                        document
                          .getElementById("page-attachments-section")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                      sx={{
                        p: "2px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--primary-color, #8b5cf6)",
                        textTransform: "none",
                        fontFamily: '"Outfit", sans-serif',
                        minWidth: 0,
                        backgroundColor: "rgba(139, 92, 246, 0.05)",
                        borderRadius: "4px",
                        border: "1px solid rgba(139, 92, 246, 0.15)",
                        "&:hover": {
                          backgroundColor: "color-mix(in srgb, var(--primary-color) 12%, transparent)",
                        },
                      }}
                    >
                      Attachments ({attachments.length})
                    </Button>
                  </Tooltip>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Chip
                label="EDIT MODE"
                size="small"
                sx={{
                  height: 20,
                  fontSize: "9px",
                  fontWeight: 700,
                  fontFamily: '"Outfit", sans-serif',
                  letterSpacing: "0.05em",
                  backgroundColor: "color-mix(in srgb, var(--primary-color) 12%, transparent)",
                  color: "var(--primary-color)",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                  borderColor: "color-mix(in srgb, var(--primary-color) 25%, transparent)",
                  borderRadius: "4px",
                }}
              />

              {attachments.length > 0 && (
                <Tooltip title="Jump to attachments at bottom">
                  <Button
                    size="small"
                    startIcon={<Paperclip size={12} />}
                    onClick={() => {
                      document
                        .getElementById("page-attachments-section")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    sx={{
                      p: "2px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--primary-color, #8b5cf6)",
                      textTransform: "none",
                      fontFamily: '"Outfit", sans-serif',
                      minWidth: 0,
                      backgroundColor: "rgba(139, 92, 246, 0.05)",
                      borderRadius: "4px",
                      border: "1px solid rgba(139, 92, 246, 0.15)",
                      "&:hover": {
                        backgroundColor: "color-mix(in srgb, var(--primary-color) 12%, transparent)",
                      },
                    }}
                  >
                    Attachments ({attachments.length})
                  </Button>
                </Tooltip>
              )}

              {/* Saving Indicator */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                {isSaving ? (
                  <>
                    <CircularProgress
                      size={10}
                      sx={{ color: "text.secondary", opacity: 0.7 }}
                      thickness={6}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        opacity: 0.6,
                        fontSize: "11px",
                        fontWeight: 500,
                        userSelect: "none",
                      }}
                    >
                      Saving...
                    </Typography>
                  </>
                ) : (
                  <>
                    <Cloud
                      size={12}
                      style={{ color: "rgba(16, 185, 129, 0.6)" }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        opacity: 0.6,
                        fontSize: "11px",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.25,
                        userSelect: "none",
                      }}
                    >
                      Saved{" "}
                      <Check
                        size={10}
                        style={{ color: "rgba(16, 185, 129, 0.7)" }}
                      />
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          )}

          {/* Right: Actions Toolbar */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap", minWidth: 0 }}>
            {/* Active Users */}
            {uniqueActiveUsers.length > 0 && (
              <Box
                data-mobile-secondary
                sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 1 }}
              >
                {uniqueActiveUsers.map((user) => {
                  const initials = user.username
                    ? user.username
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()
                    : "??";
                  return (
                    <Tooltip
                      key={user.userId}
                      title={`${user.username} (Online)`}
                      arrow
                    >
                      <Box
                        sx={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          backgroundColor: user.color,
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "8.5px",
                          fontWeight: 700,
                          border: "1.5px solid var(--panel-color)",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                          userSelect: "none",
                        }}
                      >
                        {initials}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            )}

            {/* Favorite */}
            <Tooltip
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              arrow
            >
              <IconButton
                size="small"
                onClick={async () => {
                  if (!activeDocId) return;
                  try {
                    if (isFavorite) {
                      await removeFavorite(activeDocId);
                      setIsFavorite(false);
                    } else {
                      await addFavorite(activeDocId);
                      setIsFavorite(true);
                    }
                  } catch (err) {
                    console.error("Failed to toggle favorite status:", err);
                  }
                }}
                sx={{
                  color: isFavorite ? "var(--accent-color)" : "text.secondary",
                  "&:hover": {
                    color: "var(--accent-color)",
                    backgroundColor: "action.hover",
                  },
                }}
              >
                <Star size={14} fill={isFavorite ? "var(--accent-color)" : "none"} />
              </IconButton>
            </Tooltip>

            {/* Page watch */}
            <Tooltip title={isWatching ? "Stop watching this page" : "Watch this page"} arrow>
              <IconButton
                size="small"
                aria-label={isWatching ? "Stop watching this page" : "Watch this page"}
                data-mobile-secondary
                onClick={toggleWatch}
                sx={{
                  color: isWatching ? "var(--primary-color)" : "var(--text-secondary)",
                  "&:hover": {
                    color: "var(--primary-color)",
                    backgroundColor: "var(--glass-bg)",
                  },
                }}
              >
                <Bell size={14} fill={isWatching ? "currentColor" : "none"} />
              </IconButton>
            </Tooltip>

            {/* Developer Mode: View JSON Button */}
            {developerMode && (
              <Tooltip title="View JSON Representation" arrow>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setJsonDialogOpen(true)}
                  sx={{
                    fontSize: "11px",
                    fontWeight: 600,
                    fontFamily: '"Outfit", sans-serif',
                    height: 26,
                    px: { xs: 1, sm: 1.25 },
                    minWidth: { xs: 26, sm: "auto" },
                    borderRadius: "5px",
                    borderColor: "var(--border-color)",
                    color: "text.secondary",
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "var(--border-color)",
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  <Code size={13} />
                  <Box
                    component="span"
                    sx={{ display: { xs: "none", sm: "inline" }, ml: 0.75 }}
                  >
                    View JSON
                  </Box>
                </Button>
              </Tooltip>
            )}

            {!isEditing ? (
              <>
                {/* Analytics Button */}
                <Tooltip title="View Page Analytics" arrow>
                  <Button
                    variant="outlined"
                    size="small"
                    data-mobile-secondary
                    onClick={() => setAnalyticsDialogOpen(true)}
                    sx={{
                      fontSize: "11px",
                      fontWeight: 600,
                      fontFamily: '"Outfit", sans-serif',
                      height: 26,
                      px: { xs: 1, sm: 1.25 },
                      minWidth: { xs: 26, sm: "auto" },
                      borderRadius: "5px",
                      borderColor: "var(--border-color)",
                      color: "text.secondary",
                      textTransform: "none",
                      "&:hover": {
                        borderColor: "var(--border-color)",
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <BarChart2 size={13} />
                    <Box
                      component="span"
                      sx={{ display: { xs: "none", sm: "inline" }, ml: 0.75 }}
                    >
                      Analytics
                    </Box>
                  </Button>
                </Tooltip>

                {/* History Button */}
                <Tooltip title="Version History" arrow>
                  <Button
                    variant="outlined"
                    size="small"
                    data-mobile-secondary
                    onClick={handleToggleHistory}
                    sx={{
                      fontSize: "11px",
                      fontWeight: 600,
                      fontFamily: '"Outfit", sans-serif',
                      height: 26,
                      px: { xs: 1, sm: 1.25 },
                      minWidth: { xs: 26, sm: "auto" },
                      borderRadius: "5px",
                      borderColor: "var(--border-color)",
                      color: "text.secondary",
                      textTransform: "none",
                      "&:hover": {
                        borderColor: "var(--border-color)",
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <History size={13} />
                    <Box
                      component="span"
                      sx={{ display: { xs: "none", sm: "inline" }, ml: 0.75 }}
                    >
                      History
                    </Box>
                  </Button>
                </Tooltip>

                {/* Show/Hide Comments Toggle */}
                {setShowComments && (
                  <Tooltip title={showComments ? "Hide Comments" : "Show Comments"} arrow>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setShowComments(!showComments)}
                      sx={{
                        fontSize: "11px",
                        fontWeight: 600,
                        fontFamily: '"Outfit", sans-serif',
                        height: 26,
                        px: { xs: 1, sm: 1.25 },
                        minWidth: { xs: 26, sm: "auto" },
                        borderRadius: "5px",
                        borderColor: "var(--border-color)",
                        color: showComments ? "text.primary" : "text.secondary",
                        backgroundColor: showComments ? "rgba(255, 255, 255, 0.05)" : "transparent",
                        textTransform: "none",
                        "&:hover": {
                          borderColor: "var(--border-color)",
                          backgroundColor: "action.hover",
                        },
                      }}
                    >
                      {showComments ? <MessageSquare size={13} /> : <MessageSquareOff size={13} />}
                    </Button>
                  </Tooltip>
                )}

                {/* Share Button */}
                <Tooltip title="Link Sharing" arrow>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!!deletedAt || !canEdit}
                    onClick={() => setSharingLinksDialogOpen(true)}
                    sx={{
                      fontSize: "11px",
                      fontWeight: 600,
                      fontFamily: '"Outfit", sans-serif',
                      height: 26,
                      px: { xs: 1, sm: 1.25 },
                      minWidth: { xs: 26, sm: "auto" },
                      borderRadius: "5px",
                      borderColor: "var(--border-color)",
                      color: "text.secondary",
                      textTransform: "none",
                      "&:hover": {
                        borderColor: "var(--border-color)",
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <Link2 size={13} />
                    <Box
                      component="span"
                      sx={{ display: { xs: "none", sm: "inline" }, ml: 0.75 }}
                    >
                      Share
                    </Box>
                  </Button>
                </Tooltip>

                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{
                    mx: 0.5,
                    height: 14,
                    alignSelf: "center",
                    borderColor: "var(--border-color)",
                  }}
                />

                {/* Edit Button */}
                <Button
                  variant="contained"
                  size="small"
                  disabled={!!deletedAt || !canEdit}
                  onClick={() => setIsEditing(true)}
                  sx={{
                    fontSize: "11px",
                    fontWeight: 600,
                    fontFamily: '"Outfit", sans-serif',
                    height: 26,
                    px: { xs: 1, sm: 1.5 },
                    minWidth: { xs: 26, sm: "auto" },
                    borderRadius: "5px",
                    backgroundColor: "var(--primary-color)",
                    color: "var(--primary-contrast)",
                    boxShadow: "none",
                    textTransform: "none",
                    "&:hover": {
                      backgroundColor: "var(--secondary-color)",
                      boxShadow: "none",
                    },
                  }}
                >
                  <Edit size={12} />
                  <Box
                    component="span"
                    sx={{ display: "inline", ml: 0.75 }}
                  >
                    Edit
                  </Box>
                </Button>
              </>
            ) : (
              <>
                {/* History Button (icon only in edit mode to save space) */}
                <Tooltip title="Version History" arrow>
                  <IconButton
                    size="small"
                    data-mobile-secondary
                    onClick={handleToggleHistory}
                    sx={{
                      color: historyOpen ? "primary.light" : "text.secondary",
                      "&:hover": {
                        color: "primary.light",
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <History size={14} />
                  </IconButton>
                </Tooltip>

                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{
                    mx: 0.5,
                    height: 14,
                    alignSelf: "center",
                    borderColor: "var(--border-color)",
                  }}
                />

                {/* Done Button */}
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    setCommitDescription("");
                    setCommitModalOpen(true);
                  }}
                  sx={{
                    fontSize: "11px",
                    fontWeight: 600,
                    fontFamily: '"Outfit", sans-serif',
                    height: 26,
                    px: { xs: 1, sm: 1.5 },
                    minWidth: { xs: 26, sm: "auto" },
                    borderRadius: "5px",
                    backgroundColor: "color-mix(in srgb, var(--primary-color) 12%, transparent)",
                    color: "var(--primary-color)",
                    border: "1px solid var(--border-color)",
                    borderColor: "var(--border-color)",
                    boxShadow: "none",
                    textTransform: "none",
                    "&:hover": {
                      backgroundColor: "var(--glass-bg)",
                      boxShadow: "none",
                    },
                  }}
                >
                  <Check size={12} />
                  <Box
                    component="span"
                    sx={{ display: "inline", ml: 0.75 }}
                  >
                    Done
                  </Box>
                </Button>
              </>
            )}

            {/* More Actions Menu */}
            {activeDocId && (
              <>
                <Tooltip
                  title={
                    deletedAt
                      ? "Actions disabled for deleted page"
                      : "More Actions"
                  }
                  arrow
                >
                  <IconButton
                    size="small"
                    disabled={!!deletedAt}
                    aria-label="Page actions"
                    onClick={handleOpenMoreMenu}
                    sx={{
                      color: "text.secondary",
                      width: 26,
                      height: 26,
                      "&:hover": { backgroundColor: "action.hover" },
                    }}
                  >
                    <MoreHorizontal size={14} />
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={moreMenuAnchor}
                  open={Boolean(moreMenuAnchor)}
                  onClose={handleCloseMoreMenu}
                  slotProps={{
                    paper: {
                      sx: {
                        minWidth: 160,
                        mt: 0.5,
                      },
                    },
                  }}
                >
                  <MenuItem onClick={() => { handleCloseMoreMenu(); handleToggleHistory(); }} sx={{ display: { xs: "flex", md: "none" }, minHeight: 44 }}><ListItemIcon><History size={18} /></ListItemIcon>Version history</MenuItem>
                  <MenuItem onClick={() => { handleCloseMoreMenu(); setAnalyticsDialogOpen(true); }} sx={{ display: { xs: "flex", md: "none" }, minHeight: 44 }}><ListItemIcon><BarChart2 size={18} /></ListItemIcon>Page analytics</MenuItem>
                  <MenuItem onClick={() => { handleCloseMoreMenu(); void toggleWatch(); }} sx={{ display: { xs: "flex", md: "none" }, minHeight: 44 }}><ListItemIcon><Bell size={18} /></ListItemIcon>{isWatching ? "Stop watching this page" : "Watch this page"}</MenuItem>
                  <MenuItem
                    disabled={!canEdit}
                    onClick={() => {
                      handleCloseMoreMenu();
                      setRestrictionsDialogOpen(true);
                    }}
                    sx={{
                      fontSize: "12px",
                      fontFamily: '"Outfit", sans-serif',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <Users size={12} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          sx={{
                            fontSize: "12px",
                            fontFamily: '"Outfit", sans-serif',
                          }}
                        >
                          Viewers & Editors
                        </Typography>
                      }
                    />
                  </MenuItem>
                  <MenuItem
                    disabled={!canEdit}
                    onClick={() => {
                      handleCloseMoreMenu();
                      setSharingLinksDialogOpen(true);
                    }}
                    sx={{
                      fontSize: "12px",
                      fontFamily: '"Outfit", sans-serif',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <Link2 size={12} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          sx={{
                            fontSize: "12px",
                            fontFamily: '"Outfit", sans-serif',
                          }}
                        >
                          Share Link
                        </Typography>
                      }
                    />
                  </MenuItem>
                  <MenuItem
                    disabled={!canEdit}
                    onClick={() => {
                      handleCloseMoreMenu();
                      setPageSettingsDialogOpen(true);
                    }}
                    sx={{
                      fontSize: "12px",
                      fontFamily: '"Outfit", sans-serif',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <Settings size={12} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          sx={{
                            fontSize: "12px",
                            fontFamily: '"Outfit", sans-serif',
                          }}
                        >
                          Page Settings
                        </Typography>
                      }
                    />
                  </MenuItem>
                  <MenuItem
                    disabled={!canEdit}
                    onClick={handleTriggerMove}
                    sx={{
                      fontSize: "12px",
                      fontFamily: '"Outfit", sans-serif',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <FolderInput size={12} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          sx={{
                            fontSize: "12px",
                            fontFamily: '"Outfit", sans-serif',
                          }}
                        >
                          Move Page
                        </Typography>
                      }
                    />
                  </MenuItem>
                  <MenuItem
                    disabled={!canEdit}
                    onClick={() => {
                      handleCloseMoreMenu();
                      setExportDialogOpen(true);
                    }}
                    sx={{
                      fontSize: "12px",
                      fontFamily: '"Outfit", sans-serif',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <FileUp size={12} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          sx={{
                            fontSize: "12px",
                            fontFamily: '"Outfit", sans-serif',
                          }}
                        >
                          Export Page
                        </Typography>
                      }
                    />
                  </MenuItem>
                  <MenuItem
                    disabled={!canEdit}
                    onClick={handleTriggerDelete}
                    sx={{
                      fontSize: "12px",
                      fontFamily: '"Outfit", sans-serif',
                      color: "error.main",
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 24, color: "error.main" }}>
                      <Trash2 size={12} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          sx={{
                            fontSize: "12px",
                            fontFamily: '"Outfit", sans-serif',
                            color: "error.main",
                          }}
                        >
                          Delete Page
                        </Typography>
                      }
                    />
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </Box>
      )}
    </>
  );
};
