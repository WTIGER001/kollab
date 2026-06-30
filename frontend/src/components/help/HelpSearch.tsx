import React from "react";
import { Box, Typography } from "@mui/material";
import { Search, Sparkles } from "lucide-react";

export const HelpSearch: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 1.5 }}>
        Global Search & AI Embeddings
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 3 }}>
        Quickly retrieve documents inside your project space using our advanced hybrid search engine. Open the search overlay by pressing <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>⌘P</Typography> or clicking the search box in the sidebar:
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mb: 4 }}>
        <Box sx={{ display: "flex", gap: 2, p: 2, borderRadius: "8px", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)" }}>
          <Box sx={{ p: 1, height: "fit-content", borderRadius: "6px", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
            <Search size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px" }}>Fuzzy & Keyword Match</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, lineHeight: 1.4 }}>
              Type query strings to search page titles and text contents. The search engine scores documents to rank matches, falling back to database keyword queries if needed.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 2, p: 2, borderRadius: "8px", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)" }}>
          <Box sx={{ p: 1, height: "fit-content", borderRadius: "6px", backgroundColor: "rgba(139, 92, 246, 0.1)", color: "var(--primary-color)" }}>
            <Sparkles size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px" }}>AI Vector Embeddings (Semantic Search)</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, lineHeight: 1.4 }}>
              When Ollama, Gemini, or OpenAI API credentials are loaded, the system automatically translates document contents into high-dimensional vector embeddings. The search engine performs cosine similarity searches to return relevant results even when title terms don't match exactly.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
