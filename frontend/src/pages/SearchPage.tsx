import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  CircularProgress,
  List,
  ListItemButton,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
} from "@mui/material";
import { Search, FileText, Sparkles } from "lucide-react";
import { searchDocuments } from "../services/api";
import type { Document } from "../services/api";

interface SearchPageProps {
  onNavigate: (documentId: string, teamId: string, projectId: string | null) => void;
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
    return jsonStr.slice(0, 200);
  }
};

export const SearchPage: React.FC<SearchPageProps> = ({ onNavigate }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const projectId = searchParams.get("projectId") || null;
  const initialMode = (searchParams.get("mode") as "ai" | "keyword") || "ai";

  const [searchMode, setSearchMode] = useState<"ai" | "keyword">(initialMode);
  const [results, setResults] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const delayDebounce = setTimeout(() => {
      searchDocuments(projectId || "", query, searchMode)
        .then((data) => {
          setResults(data || []);
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
  }, [query, projectId, searchMode]);

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: "ai" | "keyword" | null) => {
    if (newMode) {
      setSearchMode(newMode);
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.set("mode", newMode);
        return newParams;
      });
    }
  };

  const handleRowClick = (doc: Document) => {
    const teamArg = doc.teamId?.startsWith("personal_") || doc.teamId === "personal" ? "personal" : doc.teamId;
    const projectArg = doc.projectId || null;
    onNavigate(doc.id, teamArg, projectArg);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, flex: 1, overflowY: "auto" }}>
      <Box sx={{ maxWidth: 800, mx: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 1 }}>
              Search Results
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {query ? `Showing results for "${query}"` : "Enter a search query in the top bar to begin."}
            </Typography>
          </Box>
          
          {query && (
            <ToggleButtonGroup
              value={searchMode}
              exclusive
              onChange={handleModeChange}
              size="small"
              sx={{
                "& .MuiToggleButton-root": {
                  color: "var(--text-secondary)",
                  borderColor: "var(--border-color)",
                  px: 2,
                  py: 0.75,
                  textTransform: "none",
                  fontSize: "0.875rem",
                  "&.Mui-selected": {
                    color: "var(--primary-color)",
                    backgroundColor: "rgba(139, 92, 246, 0.1)",
                  }
                }
              }}
            >
              <ToggleButton value="ai">
                <Sparkles size={16} style={{ marginRight: 6 }} /> Semantic (AI)
              </ToggleButton>
              <ToggleButton value="keyword">
                <FileText size={16} style={{ marginRight: 6 }} /> Keyword
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        </Box>

        <Divider sx={{ borderColor: "var(--border-color)" }} />

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : !query.trim() ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Search size={48} style={{ color: "var(--border-color)", margin: "0 auto", opacity: 0.5 }} />
            <Typography sx={{ color: "text.secondary", mt: 2 }}>Type your query above to search globally.</Typography>
          </Box>
        ) : results.length > 0 ? (
          <List disablePadding>
            {results.map((doc) => {
              const plainText = getPlainTextFromTiptap(doc.content);
              const previewText = plainText.length > 200 ? plainText.slice(0, 200) + "..." : plainText;

              return (
                <ListItemButton
                  key={doc.id}
                  onClick={() => handleRowClick(doc)}
                  sx={{
                    borderRadius: "8px",
                    mb: 1.5,
                    p: 2.5,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 1,
                    backgroundColor: "rgba(0,0,0,0.1)",
                    border: "1px solid var(--border-color)",
                    "&:hover": {
                      backgroundColor: "rgba(139, 92, 246, 0.05)",
                      borderColor: "rgba(139, 92, 246, 0.3)",
                    },
                  }}
                >
                  <Typography
                    sx={{
                      color: "var(--text-primary)",
                      fontSize: "16px",
                      fontWeight: 600,
                      fontFamily: '"Outfit", sans-serif',
                    }}
                  >
                    {doc.title}
                  </Typography>
                  <Typography
                    sx={{
                      color: "var(--text-secondary)",
                      fontSize: "13px",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {previewText}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                    <Typography sx={{ color: "var(--text-muted)", fontSize: "11px" }}>
                      Updated {new Date(doc.updatedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </ListItemButton>
              );
            })}
          </List>
        ) : (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Typography sx={{ color: "text.secondary" }}>No results found for "{query}".</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
