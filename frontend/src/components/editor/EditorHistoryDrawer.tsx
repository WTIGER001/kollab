import React from "react";
import {
  Box,
  Typography,
  Drawer,
  IconButton,
  Button,
  InputBase,
  CircularProgress,
} from "@mui/material";
import { X } from "lucide-react";
import type { DocumentVersion } from "../../services/api";

export interface EditorHistoryDrawerProps {
  historyOpen: boolean;
  handleToggleHistory: () => void;
  milestoneSummary: string;
  setMilestoneSummary: (val: string) => void;
  handleCreateMilestone: (e: React.FormEvent) => void;
  isSavingMilestone: boolean;
  loadingVersions: boolean;
  versions: DocumentVersion[];
  previewVersion: DocumentVersion | null;
  setPreviewVersion: (val: DocumentVersion | null) => void;
  handleRestoreVersion: (val: DocumentVersion) => void;
}

export const EditorHistoryDrawer: React.FC<EditorHistoryDrawerProps> = ({
  historyOpen,
  handleToggleHistory,
  milestoneSummary,
  setMilestoneSummary,
  handleCreateMilestone,
  isSavingMilestone,
  loadingVersions,
  versions,
  previewVersion,
  setPreviewVersion,
  handleRestoreVersion,
}) => {
  return (
    <Drawer
      anchor="right"
      open={historyOpen}
      onClose={() => handleToggleHistory()}
      variant="temporary"
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "blur(2px)",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
          },
        },
        paper: {
          className: "glass-sidebar",
          sx: {
            width: 360,
            borderLeft: "1px solid var(--border-color)",
            color: "var(--text-primary)",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            backgroundColor: "var(--panel-color)",
          },
        },
      }}
    >
      {/* Drawer Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            fontFamily: '"Outfit", sans-serif',
            color: "text.primary",
          }}
        >
          Version History
        </Typography>
        <IconButton
          onClick={() => handleToggleHistory()}
          sx={{ color: "text.secondary" }}
        >
          <X size={16} />
        </IconButton>
      </Box>

      {/* Create Milestone Section */}
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: "uppercase",
            fontSize: "9px",
            color: "text.disabled",
            letterSpacing: "0.05em",
          }}
        >
          Create Milestone Checkpoint
        </Typography>
        <Box
          component="form"
          onSubmit={handleCreateMilestone}
          sx={{ display: "flex", gap: 1 }}
        >
          <InputBase
            value={milestoneSummary}
            onChange={(e) => setMilestoneSummary(e.target.value)}
            placeholder="E.g., Final Draft, V1 Release..."
            sx={{
              flex: 1,
              fontSize: "12px",
              px: 1.5,
              py: 0.75,
              borderRadius: "6px",
              backgroundColor: "var(--bg-color)",
              border: "1px solid var(--border-color)",
              color: "text.primary",
              "& input::placeholder": { color: "text.disabled", opacity: 0.6 },
            }}
          />
          <Button
            type="submit"
            disabled={isSavingMilestone || !milestoneSummary.trim()}
            variant="contained"
            size="small"
            sx={{
              fontSize: "10px",
              fontWeight: 600,
              px: 1.5,
              py: 0.75,
              borderRadius: "6px",
              boxShadow: "none",
            }}
          >
            {isSavingMilestone ? "Saving..." : "Save"}
          </Button>
        </Box>
      </Box>

      {/* Versions Timeline List */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }} className="scrollbar-thin">
        {loadingVersions ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : versions.length > 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {versions.map((v, idx) => {
              const isCurrentPreview = previewVersion?.id === v.id;
              const isLiveChanges = v.versionNumber === -1;
              const formattedDate = new Date(v.createdAt).toLocaleString(
                undefined,
                {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              );

              return (
                <Box
                  key={v.id}
                  sx={{
                    position: "relative",
                    pl: 2.5,
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      left: 4,
                      top: 10,
                      bottom: idx === versions.length - 1 ? 0 : -20,
                      width: "1.5px",
                      backgroundColor: "var(--border-color)",
                      display: idx === versions.length - 1 ? "none" : "block",
                    },
                  }}
                >
                  {/* Timeline node dot */}
                  <Box
                    sx={{
                      position: "absolute",
                      left: 0,
                      top: 4,
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      backgroundColor: isLiveChanges
                        ? "#10b981"
                        : isCurrentPreview
                          ? "var(--primary-color)"
                          : "var(--border-color)",
                      border:
                        isLiveChanges || isCurrentPreview
                          ? "2.5px solid var(--panel-color)"
                          : "1.5px solid var(--panel-color)",
                      boxShadow: isLiveChanges
                        ? "0 0 0 2px rgba(16, 185, 129, 0.4)"
                        : isCurrentPreview
                          ? "0 0 0 2px var(--primary-color)"
                          : "none",
                      zIndex: 2,
                      animation: isLiveChanges
                        ? "live-pulse 2s infinite"
                        : "none",
                      transition: "all 0.15s ease",
                    }}
                  />

                  {/* Version Card */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "8px",
                      backgroundColor: isCurrentPreview
                        ? "color-mix(in srgb, var(--primary-color) 8%, transparent)"
                        : isLiveChanges
                          ? "rgba(16, 185, 129, 0.04)"
                          : "rgba(255, 255, 255, 0.02)",
                      border: isCurrentPreview
                        ? "1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)"
                        : isLiveChanges
                          ? "1px solid rgba(16, 185, 129, 0.25)"
                          : "1px solid var(--border-color)",
                      "&:hover": {
                        borderColor: isCurrentPreview
                          ? "color-mix(in srgb, var(--primary-color) 35%, transparent)"
                          : isLiveChanges
                            ? "rgba(16, 185, 129, 0.4)"
                            : "color-mix(in srgb, var(--text-primary) 12%, transparent)",
                        backgroundColor: isCurrentPreview
                          ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                          : isLiveChanges
                            ? "rgba(16, 185, 129, 0.06)"
                            : "rgba(255, 255, 255, 0.04)",
                      },
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "12px",
                          fontWeight: 700,
                          fontFamily: '"Outfit", sans-serif',
                          color: isLiveChanges ? "#10b981" : "inherit",
                        }}
                      >
                        {isLiveChanges
                          ? "Live Changes"
                          : v.changeSummary || "Auto-saved snapshot"}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.disabled",
                          fontSize: "10px",
                          ml: "auto",
                        }}
                      >
                        {formattedDate}
                      </Typography>
                    </Box>

                    {!isLiveChanges && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          display: "block",
                          mb: 1.25,
                          fontSize: "10px",
                        }}
                      >
                        Version {v.versionNumber} • Edited by{" "}
                        {v.createdBy || "Anonymous"}
                      </Typography>
                    )}

                    {isLiveChanges && (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: "4px",
                          backgroundColor: "rgba(16, 185, 129, 0.08)",
                          border: "1px solid rgba(16, 185, 129, 0.15)",
                          mb: 1.5,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#10b981",
                          }}
                        >
                          Unsaved Local Edits
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant={isCurrentPreview ? "contained" : "outlined"}
                        onClick={() =>
                          setPreviewVersion(isCurrentPreview ? null : v)
                        }
                        sx={{
                          fontSize: "9px",
                          py: 0.25,
                          px: 1,
                          height: 22,
                          borderRadius: "4px",
                          boxShadow: "none",
                          color:
                            isLiveChanges && !isCurrentPreview
                              ? "#10b981"
                              : "white",
                          borderColor:
                            isLiveChanges && !isCurrentPreview
                              ? "rgba(16, 185, 129, 0.3)"
                              : "rgba(255, 255, 255, 0.15)",
                          "&:hover": {
                            borderColor: isLiveChanges
                              ? "#10b981"
                              : "rgba(255, 255, 255, 0.3)",
                            backgroundColor:
                              isLiveChanges && !isCurrentPreview
                                ? "rgba(16, 185, 129, 0.05)"
                                : "rgba(255, 255, 255, 0.05)",
                          },
                        }}
                      >
                        {isCurrentPreview ? "Viewing" : "Preview"}
                      </Button>
                      {!isLiveChanges && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleRestoreVersion(v)}
                          sx={{
                            fontSize: "9px",
                            py: 0.25,
                            px: 1,
                            height: 22,
                            borderRadius: "4px",
                            color: "text.secondary",
                            borderColor: "var(--border-color)",
                            "&:hover": {
                              color: "primary.light",
                              borderColor: "var(--primary-color)",
                            },
                          }}
                        >
                          Restore
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box sx={{ py: 6, textAlign: "center", color: "text.disabled" }}>
            <Typography variant="body2">No versions recorded yet.</Typography>
            <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
              Versions are captured automatically every 5 minutes during
              editing, or on user handover.
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};
