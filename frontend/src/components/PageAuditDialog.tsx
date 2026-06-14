import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Switch,
  CircularProgress,
  List,
  ListItem,
  Avatar
} from "@mui/material";
import { X, Users, Eye, Edit3, Calendar } from "lucide-react";
import { fetchDocumentAuditLogs } from "../services/api";
import type { AuditLogEntry } from "../services/api";
import { UserAvatar } from "./UserAvatar";

interface PageAuditDialogProps {
  open: boolean;
  onClose: () => void;
  docId: string | null;
  docTitle: string;
}

export const PageAuditDialog: React.FC<PageAuditDialogProps> = ({
  open,
  onClose,
  docId,
  docTitle
}) => {
  const [filterType, setFilterType] = useState<"views" | "edits" | "both">("both");
  const [groupByUser, setGroupByUser] = useState(false);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && docId) {
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
  }, [open, docId]);

  const handleFilterChange = (
    _: React.MouseEvent<HTMLElement>,
    newType: "views" | "edits" | "both" | null
  ) => {
    if (newType !== null) {
      setFilterType(newType);
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

    // Convert map to array and sort by last active date (newest first)
    return Array.from(groupsMap.values()).sort(
      (a, b) => b.lastActive.getTime() - a.lastActive.getTime()
    );
  };

  const userGroups = getUserGroups();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            backgroundColor: "background.paper",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--border-color)",
            color: "text.primary",
            borderRadius: 3,
            boxShadow: "var(--shadow-premium)"
          }
        }
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-color)"
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              p: 0.75,
              borderRadius: 1.5,
              backgroundColor: "color-mix(in srgb, var(--primary-color) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)",
              display: "flex"
            }}
          >
            <Users size={16} style={{ color: "var(--primary-color)" }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', letterSpacing: "-0.01em", lineHeight: 1.2 }}>
              Viewers & Editors
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {docTitle}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "text.disabled", "&:hover": { color: "text.primary" } }}>
          <X size={16} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Controls row */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <ToggleButtonGroup
            value={filterType}
            exclusive
            onChange={handleFilterChange}
            size="small"
            sx={{
              border: "1px solid var(--border-color)",
              "& .MuiToggleButton-root": {
                border: "none",
                borderRadius: "5px",
                textTransform: "none",
                fontSize: "12px",
                fontWeight: 600,
                px: 2,
                color: "text.secondary",
                "&.Mui-selected": {
                  color: "primary.light",
                  backgroundColor: "action.hover"
                }
              }
            }}
          >
            <ToggleButton value="both">Both</ToggleButton>
            <ToggleButton value="views">Views</ToggleButton>
            <ToggleButton value="edits">Edits</ToggleButton>
          </ToggleButtonGroup>

          <FormControlLabel
            control={
              <Switch
                checked={groupByUser}
                onChange={(e) => setGroupByUser(e.target.checked)}
                size="small"
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: "primary.light",
                    "& + .MuiSwitch-track": {
                      backgroundColor: "primary.light",
                    }
                  }
                }}
              />
            }
            label={
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Group by User
              </Typography>
            }
          />
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={24} sx={{ color: "primary.light" }} />
          </Box>
        ) : filteredLogs.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6, color: "text.disabled" }}>
            <Typography variant="body2">No logs found matching selection.</Typography>
          </Box>
        ) : groupByUser ? (
          /* Grouped View */
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5, maxHeight: 400, overflowY: "auto", pr: 1 }}>
            {userGroups.map((g) => (
              <Box key={g.userId} sx={{ borderBottom: "1px solid color-mix(in srgb, var(--border-color) 40%, transparent)", pb: 2, "&:last-child": { borderBottom: "none", pb: 0 } }}>
                {/* User Header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.75 }}>
                  <UserAvatar 
                    displayName={g.displayName}
                    sx={{ width: 32, height: 32, bgcolor: "color-mix(in srgb, var(--primary-color) 10%, transparent)", color: "primary.light", fontSize: "13px", fontWeight: 700 }}
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13.5px", lineHeight: 1.2 }}>
                      {g.displayName}
                    </Typography>
                    {g.email && (
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "11px" }}>
                        {g.email}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {g.viewsCount > 0 && (
                      <Box sx={{ py: 0.25, px: 0.75, borderRadius: 1, backgroundColor: "action.hover", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Eye size={10} style={{ color: "var(--text-secondary)" }} />
                        <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "text.secondary" }}>
                          {g.viewsCount} {g.viewsCount === 1 ? "view" : "views"}
                        </Typography>
                      </Box>
                    )}
                    {g.editsCount > 0 && (
                      <Box sx={{ py: 0.25, px: 0.75, borderRadius: 1, backgroundColor: "action.hover", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Edit3 size={10} style={{ color: "var(--text-secondary)" }} />
                        <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "text.secondary" }}>
                          {g.editsCount} {g.editsCount === 1 ? "edit" : "edits"}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* User History List */}
                <List sx={{ p: 0, pl: 6, display: "flex", flexDirection: "column", gap: 1.25 }}>
                  {g.logs.map((l) => (
                    <ListItem key={l.id} sx={{ p: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {l.action === "view" ? (
                          <Eye size={12} style={{ color: "var(--text-secondary)", opacity: 0.7 }} />
                        ) : (
                          <Edit3 size={12} style={{ color: "var(--text-secondary)", opacity: 0.7 }} />
                        )}
                        <Typography variant="body2" sx={{ fontSize: "12.5px", color: "text.secondary" }}>
                          {l.action === "view" ? "Viewed the page" : "Edited the page"}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.disabled" }}>
                        <Calendar size={10} />
                        <Typography variant="caption" sx={{ fontSize: "11px" }}>
                          {formatDate(l.createdAt)}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Box>
            ))}
          </Box>
        ) : (
          /* Flat Chronological View */
          <Box sx={{ maxHeight: 400, overflowY: "auto", pr: 1 }}>
            <List sx={{ p: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
              {filteredLogs.map((l) => (
                <ListItem
                  key={l.id}
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    backgroundColor: "action.hover",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <UserAvatar 
                      displayName={l.userDisplayName}
                      sx={{ width: 28, height: 28, bgcolor: "background.paper", border: "1px solid var(--border-color)", color: "text.primary", fontSize: "11px", fontWeight: 700 }}
                    />
                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13px" }}>
                          {l.userDisplayName}
                        </Typography>
                        <Box sx={{ py: 0.1, px: 0.5, borderRadius: 0.5, backgroundColor: "background.paper", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 0.5 }}>
                          {l.action === "view" ? (
                            <Eye size={10} style={{ color: "var(--text-secondary)" }} />
                          ) : (
                            <Edit3 size={10} style={{ color: "var(--text-secondary)" }} />
                          )}
                          <Typography variant="caption" sx={{ fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                            {l.action}
                          </Typography>
                        </Box>
                      </Box>
                      {l.userEmail && (
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "10.5px", display: "block" }}>
                          {l.userEmail}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.disabled" }}>
                    <Calendar size={11} />
                    <Typography variant="caption" sx={{ fontSize: "11px" }}>
                      {formatDate(l.createdAt)}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
