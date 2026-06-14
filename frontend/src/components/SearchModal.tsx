import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  Box,
  InputBase,
  List,
  ListItemButton,
  Typography,
  CircularProgress,
  IconButton,
  Divider,
} from "@mui/material";
import { Search, FileText, X, CornerDownLeft, Sparkles } from "lucide-react";
import { searchDocuments } from "../services/api";
import type { Document } from "../services/api";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  onSelectDoc: (id: string, projectId?: string | null) => void;
}

const getPlainTextFromTiptap = (jsonStr: string): string => {
  if (!jsonStr) return "";
  try {
    const obj = JSON.parse(jsonStr);
    const extractText = (node: any): string => {
      if (!node) return "";
      if (node.type === "text" && typeof node.text === "string") {
        return node.text;
      }
      if (Array.isArray(node.content)) {
        return node.content.map(extractText).join(" ");
      }
      return "";
    };
    return extractText(obj).trim();
  } catch (e) {
    // Return the string itself if it's not JSON
    return jsonStr.slice(0, 200);
  }
};

export const SearchModal: React.FC<SearchModalProps> = ({
  open,
  onClose,
  projectId,
  onSelectDoc,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !projectId) return;
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const delayDebounce = setTimeout(() => {
      searchDocuments(projectId, query)
        .then((data) => {
          setResults(data || []);
          setSelectedIndex(0);
        })
        .catch((err) => {
          console.error("Search error:", err);
          setResults([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [query, projectId, open]);

  // Handle hotkeys (⌘P / Ctrl+P is handled in parent, this is for navigation inside the modal)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelectDoc(results[selectedIndex].id, results[selectedIndex].projectId);
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "blur(8px)",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
          },
        },
        paper: {
          className: "glass-card",
          sx: {
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            color: "var(--text-primary)",
            overflow: "hidden",
            maxWidth: "600px",
            mx: "auto",
          },
        },
      }}
    >
      {/* Search Input Area */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 2,
          backgroundColor: "rgba(0, 0, 0, 0.15)",
        }}
      >
        <Search size={18} style={{ color: "var(--primary-color)" }} />
        <InputBase
          inputRef={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search documents semantically or by keywords..."
          fullWidth
          sx={{
            color: "var(--text-primary)",
            fontSize: "14px",
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 500,
            "& input::placeholder": { color: "var(--text-muted)", opacity: 1 },
          }}
        />
        {loading && <CircularProgress size={16} color="primary" />}
        {query && !loading && (
          <IconButton
            size="small"
            onClick={() => setQuery("")}
            sx={{ p: 0.5, color: "var(--text-secondary)" }}
          >
            <X size={14} />
          </IconButton>
        )}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.25,
            backgroundColor: "rgba(139, 92, 246, 0.08)",
            border: "1px solid rgba(139, 92, 246, 0.15)",
            borderRadius: "4px",
            color: "var(--primary-color)",
          }}
        >
          <Sparkles size={11} style={{ marginRight: "2px" }} />
          <Typography sx={{ fontSize: "9px", fontWeight: 700 }}>AI</Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: "var(--border-color)" }} />

      {/* Results / Empty / Info States */}
      <Box sx={{ maxHeight: "360px", overflowY: "auto", p: 1 }} className="scrollbar-thin">
        {!query.trim() ? (
          <Box sx={{ py: 6, px: 3, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "var(--text-secondary)", fontWeight: 500, mb: 1 }}>
              Search Everything
            </Typography>
            <Typography variant="caption" sx={{ color: "var(--text-muted)", display: "block" }}>
              Type your query to search. Uses local pgvector semantic match combined with text filters.
            </Typography>
          </Box>
        ) : results.length > 0 ? (
          <List disablePadding>
            {results.map((doc, idx) => {
              const isSelected = idx === selectedIndex;
              const plainText = getPlainTextFromTiptap(doc.content);
              const previewText = plainText.length > 120 ? plainText.slice(0, 120) + "..." : plainText;

              return (
                <ListItemButton
                  key={doc.id}
                  onClick={() => {
                    onSelectDoc(doc.id, doc.projectId);
                    onClose();
                  }}
                  selected={isSelected}
                  sx={{
                    borderRadius: "8px",
                    mb: 0.5,
                    p: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 0.5,
                    border: isSelected
                      ? "1px solid color-mix(in srgb, var(--primary-color) 30%, transparent)"
                      : "1px solid transparent",
                    backgroundColor: isSelected
                      ? "color-mix(in srgb, var(--primary-color) 8%, transparent) !important"
                      : "transparent",
                    "&:hover": {
                      backgroundColor: "color-mix(in srgb, var(--text-primary) 3%, transparent)",
                    },
                    transition: "all 0.15s ease",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: "100%" }}>
                    <FileText
                      size={16}
                      style={{
                        color: isSelected ? "var(--primary-color)" : "var(--text-secondary)",
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: "13px",
                        fontFamily: '"Outfit", sans-serif',
                        color: isSelected ? "var(--primary-color)" : "var(--text-primary)",
                        flexGrow: 1,
                      }}
                    >
                      {doc.title}
                    </Typography>
                    {isSelected && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          px: 0.75,
                          py: 0.25,
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "4px",
                          color: "var(--text-muted)",
                        }}
                      >
                        <Typography sx={{ fontSize: "8px", fontFamily: "monospace" }}>ENTER</Typography>
                        <CornerDownLeft size={8} />
                      </Box>
                    )}
                  </Box>
                  {previewText && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "var(--text-secondary)",
                        pl: 3.75,
                        fontSize: "11px",
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {previewText}
                    </Typography>
                  )}
                </ListItemButton>
              );
            })}
          </List>
        ) : (
          <Box sx={{ py: 6, px: 3, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "var(--text-secondary)", mb: 1 }}>
              No matches found
            </Typography>
            <Typography variant="caption" sx={{ color: "var(--text-muted)" }}>
              We couldn't find any documents containing "{query}" inside the current project.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Keyboard shortcuts hints footer */}
      <Divider sx={{ borderColor: "var(--border-color)" }} />
      <Box
        sx={{
          px: 2,
          py: 1.25,
          backgroundColor: "rgba(0, 0, 0, 0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "var(--text-muted)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography sx={{ fontSize: "9px", fontFamily: "monospace", px: 0.5, py: 0.25, border: "1px solid var(--border-color)", borderRadius: 0.5, backgroundColor: "rgba(255,255,255,0.02)" }}>↑↓</Typography>
            <Typography sx={{ fontSize: "10px" }}>Navigate</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography sx={{ fontSize: "9px", fontFamily: "monospace", px: 0.5, py: 0.25, border: "1px solid var(--border-color)", borderRadius: 0.5, backgroundColor: "rgba(255,255,255,0.02)" }}>ENTER</Typography>
            <Typography sx={{ fontSize: "10px" }}>Open</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography sx={{ fontSize: "9px", fontFamily: "monospace", px: 0.5, py: 0.25, border: "1px solid var(--border-color)", borderRadius: 0.5, backgroundColor: "rgba(255,255,255,0.02)" }}>ESC</Typography>
          <Typography sx={{ fontSize: "10px" }}>Close</Typography>
        </Box>
      </Box>
    </Dialog>
  );
};
