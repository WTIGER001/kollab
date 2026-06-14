import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  List,
  ListItem,
  Avatar,
  Divider,
  Tooltip,
} from "@mui/material";
import { ArrowLeft, Users, Eye, Edit3, Calendar, Activity, ChevronRight } from "lucide-react";
import { fetchDocumentAuditLogs } from "../services/api";
import type { AuditLogEntry } from "../services/api";
import { UserAvatar } from "./UserAvatar";

interface PageAuditViewProps {
  docId: string;
  docTitle: string;
  selectedTeamName?: string;
  selectedProjectName?: string;
  onBack: () => void;
}

export const PageAuditView: React.FC<PageAuditViewProps> = ({
  docId,
  docTitle,
  selectedTeamName,
  selectedProjectName,
  onBack,
}) => {
  const [filterType, setFilterType] = useState<"views" | "edits" | "both">("both");
  const [viewMode, setViewMode] = useState<"timeline" | "users">("timeline");
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (docId) {
      setLoading(true);
      fetchDocumentAuditLogs(docId)
        .then((data) => {
          setLogs(data || []);
        })
        .catch((err) => {
          console.error("Failed to fetch page audit logs:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [docId]);

  const handleFilterChange = (
    _: React.MouseEvent<HTMLElement>,
    newType: "views" | "edits" | "both" | null
  ) => {
    if (newType !== null) {
      setFilterType(newType);
    }
  };

  const handleViewModeChange = (
    _: React.MouseEvent<HTMLElement>,
    newMode: "timeline" | "users" | null
  ) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  // Filter logs based on selection
  const filteredLogs = logs.filter((l) => {
    if (filterType === "views") return l.action === "view";
    if (filterType === "edits") return l.action === "edit";
    return true;
  });

  // Helper to format date
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  // Group logs by user
  interface UserGroup {
    userId: string;
    displayName: string;
    email: string;
    logs: AuditLogEntry[];
    lastActive: Date;
    viewsCount: number;
    editsCount: number;
  }

  const getUserGroups = (): UserGroup[] => {
    const groupsMap = new Map<string, UserGroup>();

    filteredLogs.forEach((l) => {
      const existing = groupsMap.get(l.userId);
      const logTime = new Date(l.createdAt);
      if (existing) {
        existing.logs.push(l);
        existing.viewsCount += l.action === "view" ? 1 : 0;
        existing.editsCount += l.action === "edit" ? 1 : 0;
        if (logTime > existing.lastActive) {
          existing.lastActive = logTime;
        }
      } else {
        groupsMap.set(l.userId, {
          userId: l.userId,
          displayName: l.userDisplayName || "Unknown User",
          email: l.userEmail || "",
          logs: [l],
          lastActive: logTime,
          viewsCount: l.action === "view" ? 1 : 0,
          editsCount: l.action === "edit" ? 1 : 0
        });
      }
    });

    return Array.from(groupsMap.values()).sort(
      (a, b) => b.lastActive.getTime() - a.lastActive.getTime()
    );
  };

  const userGroups = getUserGroups();

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", backgroundColor: "var(--background-color)" }}>
      {/* Header with back button and breadcrumbs */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          px: { xs: 2, sm: 3, md: 4 },
          py: 2,
          borderBottom: "1px solid var(--border-color)",
          borderColor: "rgba(255, 255, 255, 0.04)",
        }}
      >
        <Tooltip title="Back to document" arrow>
          <IconButton
            onClick={onBack}
            sx={{
              color: "text.secondary",
              backgroundColor: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.04)",
              "&:hover": {
                color: "var(--primary-color)",
                backgroundColor: "rgba(255,255,255,0.06)",
                borderColor: "rgba(139, 92, 246, 0.2)"
              }
            }}
          >
            <ArrowLeft size={16} />
          </IconButton>
        </Tooltip>

        <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Breadcrumbs */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary", mb: 0.5, userSelect: "none" }}>
            {selectedTeamName && (
              <>
                <Typography variant="body2" sx={{ fontSize: "11px", color: "text.secondary", fontWeight: 600, letterSpacing: "0.03em" }}>
                  {selectedTeamName}
                </Typography>
                <ChevronRight size={11} style={{ opacity: 0.4 }} />
              </>
            )}
            {selectedProjectName && (
              <>
                <Typography variant="body2" sx={{ fontSize: "11px", color: "text.secondary", fontWeight: 600, letterSpacing: "0.03em" }}>
                  {selectedProjectName}
                </Typography>
                <ChevronRight size={11} style={{ opacity: 0.4 }} />
              </>
            )}
            <Typography variant="body2" sx={{ fontSize: "11px", color: "text.secondary", fontWeight: 500, letterSpacing: "0.03em", noWrap: true }}>
              {docTitle}
            </Typography>
            <ChevronRight size={11} style={{ opacity: 0.4 }} />
            <Typography variant="body2" sx={{ fontSize: "11px", color: "text.primary", fontWeight: 600, letterSpacing: "0.03em" }}>
              Viewers & Editors
            </Typography>
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "18px", md: "22px" },
              color: "text.primary",
              fontFamily: '"Outfit", sans-serif',
              letterSpacing: "-0.01em"
            }}
          >
            Audit Log: {docTitle}
          </Typography>
        </Box>
      </Box>

      {/* Main Body content area */}
      <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 2, sm: 3, md: 4 }, display: "flex", flexDirection: "column", gap: 3 }} className="scrollbar-thin">
        
        {/* Controls Panel */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            backgroundColor: "rgba(22, 25, 36, 0.4)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.04)",
            borderRadius: "12px",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2
          }}
        >
          {/* Left: View Mode Toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
            sx={{
              backgroundColor: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.03)",
              p: 0.25,
              borderRadius: "8px",
              "& .MuiToggleButton-root": {
                border: "none",
                borderRadius: "6px",
                textTransform: "none",
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 600,
                fontSize: "12px",
                px: 2,
                py: 0.5,
                color: "text.secondary",
                "&.Mui-selected": {
                  color: "#ffffff",
                  backgroundColor: "var(--primary-color)",
                  "&:hover": {
                    backgroundColor: "var(--primary-dark)"
                  }
                }
              }
            }}
          >
            <ToggleButton value="timeline" value-id="timeline-btn">
              <Activity size={13} style={{ marginRight: 6 }} /> Activity Timeline
            </ToggleButton>
            <ToggleButton value="users" value-id="users-btn">
              <Users size={13} style={{ marginRight: 6 }} /> User Directory
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Right: Action Filter */}
          <ToggleButtonGroup
            value={filterType}
            exclusive
            onChange={handleFilterChange}
            size="small"
            sx={{
              backgroundColor: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.03)",
              p: 0.25,
              borderRadius: "8px",
              "& .MuiToggleButton-root": {
                border: "none",
                borderRadius: "6px",
                textTransform: "none",
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 600,
                fontSize: "12px",
                px: 2,
                py: 0.5,
                color: "text.secondary",
                "&.Mui-selected": {
                  color: "#ffffff",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.1)"
                  }
                }
              }
            }}
          >
            <ToggleButton value="both">All Activity</ToggleButton>
            <ToggleButton value="views">Views Only</ToggleButton>
            <ToggleButton value="edits">Edits Only</ToggleButton>
          </ToggleButtonGroup>
        </Paper>

        {/* Audit Details */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
            <CircularProgress size={36} sx={{ color: "var(--primary-color)" }} />
          </Box>
        ) : viewMode === "timeline" ? (
          /* TIMELINE VIEW */
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              backgroundColor: "rgba(22, 25, 36, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.02)",
              borderRadius: "12px",
            }}
          >
            {filteredLogs.length === 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic", textAlign: "center", py: 6 }}>
                No matching activity logs found.
              </Typography>
            ) : (
              <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {filteredLogs.map((log, index) => (
                  <Box key={log.id}>
                    <ListItem
                      sx={{
                        py: 1.5,
                        px: 2,
                        borderRadius: "8px",
                        bgcolor: "rgba(255, 255, 255, 0.01)",
                        border: "1px solid rgba(255,255,255,0.01)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <UserAvatar
                          displayName={log.userDisplayName || "Unknown User"}
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: log.action === "edit" ? "rgba(139, 92, 246, 0.12)" : "rgba(59, 130, 246, 0.12)",
                            color: log.action === "edit" ? "var(--primary-color)" : "info.main",
                            fontSize: "12px",
                            fontWeight: 700
                          }}
                        />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                            {log.userDisplayName || "Unknown User"}{" "}
                            <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>
                              {log.action === "edit" ? "edited the page" : "viewed the page"}
                            </span>
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "11px", display: "block", mt: 0.25 }}>
                            {log.userEmail}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                        {log.action === "edit" ? (
                          <Edit3 size={13} style={{ color: "var(--primary-color)" }} />
                        ) : (
                          <Eye size={13} style={{ color: "var(--accent-blue, #60a5fa)" }} />
                        )}
                        <Typography variant="caption" sx={{ fontSize: "11.5px", fontWeight: 500 }}>
                          {formatDate(log.createdAt)}
                        </Typography>
                      </Box>
                    </ListItem>
                    {index < filteredLogs.length - 1 && <Divider sx={{ borderColor: "rgba(255,255,255,0.02)", my: 0.5 }} />}
                  </Box>
                ))}
              </List>
            )}
          </Paper>
        ) : (
          /* USER DIRECTORY VIEW */
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
              gap: 2.5
            }}
          >
            {userGroups.length === 0 ? (
              <Box sx={{ gridColumn: "1 / -1", py: 6 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic", textAlign: "center" }}>
                  No active users found.
                </Typography>
              </Box>
            ) : (
              userGroups.map((group) => (
                <Paper
                  key={group.userId}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    backgroundColor: "rgba(22, 25, 36, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.03)",
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "rgba(139, 92, 246, 0.15)",
                      backgroundColor: "rgba(22, 25, 36, 0.4)",
                    }
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <UserAvatar
                      displayName={group.displayName}
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: "var(--primary-color)",
                        fontSize: "14px",
                        fontWeight: 700
                      }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }} noWrap>
                        {group.displayName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "11px" }} noWrap>
                        {group.email}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ borderColor: "rgba(255,255,255,0.03)" }} />

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px", textTransform: "uppercase", display: "block" }}>
                          Views
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "var(--accent-blue, #60a5fa)", mt: 0.25 }}>
                          {group.viewsCount}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px", textTransform: "uppercase", display: "block" }}>
                          Edits
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "var(--primary-color)", mt: 0.25 }}>
                          {group.editsCount}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px", textTransform: "uppercase", display: "block" }}>
                        Last Active
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mt: 0.25, display: "block", fontSize: "11.5px" }}>
                        {formatDate(group.lastActive.toISOString()).split(",")[0]}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};
