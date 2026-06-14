import React, { useEffect, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useIsEditable } from "../hooks/useIsEditable";
import { Box, Paper, Typography, IconButton, Tooltip } from "@mui/material";
import { List, Trash2, ChevronRight } from "lucide-react";

interface HeadingItem {
  text: string;
  level: number;
  index: number;
}

export const TableOfContentsView: React.FC<NodeViewProps> = ({ deleteNode, editor }) => {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const isEditable = useIsEditable(editor);

  useEffect(() => {
    if (!editor) return;

    const parseHeadings = () => {
      const list: HeadingItem[] = [];
      let index = 0;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "heading") {
          list.push({
            text: node.textContent,
            level: node.attrs.level,
            index: index,
          });
          index++;
        }
      });
      setHeadings(list);
    };

    // Parse initially
    parseHeadings();

    // Listen to updates
    editor.on("update", parseHeadings);
    return () => {
      editor.off("update", parseHeadings);
    };
  }, [editor]);

  const handleScrollToHeading = (index: number) => {
    if (!editor) return;
    const headingElements = editor.view.dom.querySelectorAll("h1, h2, h3, h4, h5, h6, h7, h8");
    if (headingElements && headingElements[index]) {
      headingElements[index].scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <NodeViewWrapper className="table-of-contents-node">
      <Paper
        elevation={0}
        sx={{
          py: 1.5,
          px: 2,
          my: 1.5,
          borderRadius: "12px",
          backgroundColor: "rgba(255, 255, 255, 0.01)",
          border: "1px solid var(--border-color)",
          position: "relative",
          transition: "all 0.2s ease",
          "& .toc-actions": {
            opacity: 0,
            transition: "opacity 0.2s ease, transform 0.2s ease",
            transform: "translateY(2px)",
            pointerEvents: "none",
          },
          "&:hover .toc-actions": {
            opacity: 1,
            transform: "translateY(0)",
            pointerEvents: "auto",
          },
        }}
      >
        {/* Header Title */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, pb: 0.75, borderBottom: "1px solid var(--border-color)" }}>
          <List size={16} style={{ color: "var(--primary-color)" }} />
          <Typography
            sx={{
              fontSize: "13px",
              fontWeight: 700,
              fontFamily: '"Outfit", sans-serif',
              color: "text.primary",
              letterSpacing: "0.02em",
              textTransform: "uppercase"
            }}
          >
            Table of Contents
          </Typography>
        </Box>
 
        {/* Outline Directory */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
          {headings.length === 0 ? (
            <Typography variant="caption" sx={{ color: "text.disabled", display: "block", fontStyle: "italic", py: 1 }}>
              No headings found. Add headings (H1, H2, H3...) to automatically build the outline.
            </Typography>
          ) : (
            (() => {
              const minLevel = headings.length > 0 ? Math.min(...headings.map(x => x.level)) : 1;
              return headings.map((h, i) => {
                // Indent relative to the minimum heading level in the document
                const indent = Math.max(0, (h.level - minLevel) * 12);
                return (
                  <Box
                    key={i}
                    onClick={() => handleScrollToHeading(h.index)}
                    sx={{
                      pl: `${indent}px`,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      py: 0.4,
                      px: 1,
                      borderRadius: "4px",
                      cursor: "pointer",
                      color: "text.secondary",
                      "&:hover": {
                        color: "var(--primary-color)",
                        backgroundColor: "rgba(139, 92, 246, 0.04)",
                        "& .arrow-icon": {
                          opacity: 1,
                          transform: "translateX(2px)"
                        }
                      },
                      transition: "all 0.15s ease",
                    }}
                  >
                    <ChevronRight 
                      className="arrow-icon"
                      size={10} 
                      style={{ 
                        opacity: 0.4, 
                        transition: "all 0.15s ease",
                        color: "inherit"
                      }} 
                    />
                    <Typography
                      sx={{
                        fontSize: "12.5px",
                        fontWeight: h.level <= 2 ? 600 : 500,
                        fontFamily: '"Outfit", sans-serif',
                        lineHeight: 1.4
                      }}
                    >
                      {h.text || `Heading ${h.level}`}
                    </Typography>
                  </Box>
                );
              });
            })()
          )}
        </Box>

        {/* Floating actions (Delete Button) */}
        {isEditable && (
          <Box
            className="toc-actions"
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: "var(--panel-color)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              p: 0.25,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              zIndex: 5,
            }}
          >
            <Tooltip title="Delete Outline" arrow>
              <IconButton
                size="small"
                onClick={deleteNode}
                aria-label="Delete Outline"
                sx={{
                  p: 0.5,
                  color: "text.disabled",
                  "&:hover": { color: "error.main", backgroundColor: "rgba(239, 68, 68, 0.08)" },
                }}
              >
                <Trash2 size={12} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Paper>
    </NodeViewWrapper>
  );
};
