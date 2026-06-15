import React, { useContext, useState, useEffect } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useIsEditable } from "../hooks/useIsEditable";
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Chip,
  Popover,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  TextField,
  Stack,
  Divider,
  CircularProgress,
  Tooltip
} from "@mui/material";
import { 
  Settings, 
  Trash2, 
  Cpu, 
  BarChart2, 
  Smile, 
  FolderOpen, 
  FileText, 
  FileUp,
  Paperclip,
  Download,
  Eye,
  File,
  Image as ImageIcon,
  BookOpen,
  Sparkles
} from "lucide-react";
import { DocumentContext } from "./DocumentContext";
import type { DocumentItem } from "./Sidebar";
import { fetchAttachments, API_BASE_URL, generateAIContent } from "../services/api";
import type { Attachment } from "../services/api";

// Helper to extract explicit excerpt container text if present in Tiptap JSON content string
const extractExplicitExcerpt = (contentStr: string): string | null => {
  if (!contentStr) return null;
  try {
    const parsed = JSON.parse(contentStr);
    let excerptText = "";
    let found = false;

    const findExcerptNode = (node: any) => {
      if (node.type === "excerpt") {
        const gatherText = (n: any) => {
          if (n.type === "text" && n.text) {
            excerptText += n.text + " ";
          }
          if (n.content && Array.isArray(n.content)) {
            n.content.forEach(gatherText);
          }
        };
        gatherText(node);
        found = true;
        return;
      }
      if (node.content && Array.isArray(node.content) && !found) {
        node.content.forEach(findExcerptNode);
      }
    };

    if (parsed.type === "doc" && parsed.content && Array.isArray(parsed.content)) {
      parsed.content.forEach(findExcerptNode);
    } else {
      findExcerptNode(parsed);
    }

    return found ? excerptText.replace(/\s+/g, " ").trim() : null;
  } catch (e) {
    return null;
  }
};

// Helper to extract a clean plaintext excerpt from Tiptap JSON content string
const extractExcerpt = (contentStr: string, limit = 120): string => {
  if (!contentStr) return "";
  
  // Prioritize explicit excerpt blocks if defined on the page
  const explicit = extractExplicitExcerpt(contentStr);
  if (explicit !== null) {
    if (explicit.length > limit) {
      return explicit.substring(0, limit) + "...";
    }
    return explicit;
  }

  try {
    const parsed = JSON.parse(contentStr);
    let text = "";
    
    const extractText = (node: any) => {
      if (node.type === "text" && node.text) {
        text += node.text + " ";
      }
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(extractText);
      }
    };
    
    if (parsed.type === "doc" && parsed.content && Array.isArray(parsed.content)) {
      for (const block of parsed.content) {
        extractText(block);
        if (text.trim().length >= limit) {
          break;
        }
      }
    } else {
      extractText(parsed);
    }
    
    const cleanText = text.replace(/\s+/g, " ").trim();
    if (cleanText.length > limit) {
      return cleanText.substring(0, limit) + "...";
    }
    return cleanText;
  } catch (e) {
    const cleanText = contentStr.replace(/<[^>]*>/g, "").trim();
    if (cleanText.length > limit) {
      return cleanText.substring(0, limit) + "...";
    }
    return cleanText;
  }
};

// Recursive search to find target document node by its ID
const findDocNode = (list: DocumentItem[], targetId: string): DocumentItem | null => {
  for (const item of list) {
    if (item.id === targetId) return item;
    if (item.children && item.children.length > 0) {
      const found = findDocNode(item.children, targetId);
      if (found) return found;
    }
  }
  return null;
};

// Flatten tree structure to static list of active pages
const flattenTree = (list: DocumentItem[]): DocumentItem[] => {
  const result: DocumentItem[] = [];
  const traverse = (items: DocumentItem[]) => {
    items.forEach((item) => {
      result.push(item);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    });
  };
  traverse(list);
  return result;
};

export const MacroBlockView: React.FC<NodeViewProps> = ({ node, deleteNode, updateAttributes, editor }) => {
  const { type = "status-badge", config = {} } = node.attrs;

  const context = useContext(DocumentContext);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  useEffect(() => {
    if (context?.activeDocId && (type === "attachments-list" || type === "single-attachment")) {
      setAttachmentsLoading(true);
      fetchAttachments(context.activeDocId)
        .then(data => setAttachments(data || []))
        .catch(err => console.error("Macro failed to fetch attachments:", err))
        .finally(() => setAttachmentsLoading(false));
    }
  }, [context?.activeDocId, type]);

  const handleAIGenerate = () => {
    const prompt = config.prompt || "";
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setGenerateError("");

    generateAIContent(prompt)
      .then((res) => {
        updateAttributes({
          config: {
            ...config,
            generatedText: res.text,
          },
        });
      })
      .catch((err) => {
        console.error("AI Generation failed:", err);
        setGenerateError(err.message || "Failed to generate content");
      })
      .finally(() => {
        setIsGenerating(false);
      });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string, filename: string) => {
    const mt = mimeType.toLowerCase();
    const fn = filename.toLowerCase();
    if (mt.startsWith("image/")) {
      return <ImageIcon size={18} style={{ color: "#10b981" }} />;
    }
    if (mt === "application/pdf") {
      return <BookOpen size={18} style={{ color: "#ef4444" }} />;
    }
    if (
      mt.startsWith("text/") || 
      fn.endsWith(".txt") || 
      fn.endsWith(".md") || 
      fn.endsWith(".json")
    ) {
      return <FileText size={18} style={{ color: "#3b82f6" }} />;
    }
    return <File size={18} style={{ color: "#9ca3af" }} />;
  };

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleSettingsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setAnchorEl(null);
  };

  const openSettings = Boolean(anchorEl);

  const updateConfig = (key: string, value: any) => {
    updateAttributes({
      config: {
        ...config,
        [key]: value
      }
    });
  };

  const handleStatusChange = () => {
    const statuses = ["Active", "In Progress", "Blocked", "Done"];
    const currentIdx = statuses.indexOf(config.status || "Active");
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];
    updateAttributes({
      config: { ...config, status: nextStatus }
    });
  };

  const getMacroIcon = () => {
    switch (type) {
      case "status-badge":
        return <Smile size={14} color="#34d399" />;
      case "chart-analytics":
        return <BarChart2 size={14} color="#c084fc" />;
      case "ai-content":
        return <Sparkles size={14} color="#c084fc" />;
      case "children-display":
        return <FolderOpen size={14} color="#60a5fa" />;
      case "page-index":
        return <FileText size={14} color="#a78bfa" />;
      case "excerpt-include":
        return <FileUp size={14} color="#60a5fa" />;
      case "attachments-list":
      case "single-attachment":
        return <Paperclip size={14} color="#f472b6" />;
      default:
        return <Cpu size={14} color="#60a5fa" />;
    }
  };

  const isEditable = useIsEditable(editor);

  const renderViewport = () => {
    const updateConfig = (key: string, val: any) => {
      updateAttributes({
        config: {
          ...config,
          [key]: val
        }
      });
    };

    return (
      <>
          {type === "ai-content" && (
            <Box sx={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: 1.5, 
              p: 2.5, 
              border: "1px solid var(--border-color)", 
              borderRadius: 2, 
              bgcolor: "rgba(139, 92, 246, 0.02)",
              backdropFilter: "blur(8px)"
            }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Box sx={{ p: 0.5, display: "flex", borderRadius: 1, backgroundColor: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.2)" }}>
                  <Sparkles size={14} style={{ color: "var(--accent-purple)" }} />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', fontSize: "13px", color: "text.primary" }}>
                  AI Content Generator
                </Typography>
              </Box>

              {isEditable ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <TextField
                    label="Enter prompt for AI..."
                    placeholder="e.g. Write a brief overview of the importance of clean architecture..."
                    value={config.prompt || ""}
                    onChange={(e) => updateConfig("prompt", e.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                    size="small"
                    slotProps={{
                      inputLabel: { style: { fontSize: "12px" } },
                      htmlInput: { style: { fontSize: "13px" } }
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "rgba(0,0,0,0.15)",
                        "& fieldset": { borderColor: "var(--border-color)" },
                        "&:hover fieldset": { borderColor: "primary.main" }
                      }
                    }}
                  />
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={isGenerating || !config.prompt?.trim()}
                      onClick={handleAIGenerate}
                      sx={{
                        py: 0.75,
                        px: 2,
                        textTransform: "none",
                        fontSize: "12px",
                        fontWeight: 700,
                        bgcolor: "primary.main",
                        borderRadius: "6px",
                        boxShadow: "0 4px 12px rgba(139, 92, 246, 0.15)",
                        "&:hover": { bgcolor: "primary.dark" }
                      }}
                    >
                      {isGenerating ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CircularProgress size={12} color="inherit" />
                          <span>Generating...</span>
                        </Box>
                      ) : (
                        "Generate Content"
                      )}
                    </Button>
                  </Box>
                </Box>
              ) : (
                config.prompt && (
                  <Typography variant="body2" sx={{ fontSize: "12.5px", color: "text.secondary", fontStyle: "italic", borderLeft: "2px solid var(--border-color)", pl: 1.5, py: 0.5 }}>
                    Prompt: {config.prompt}
                  </Typography>
                )
              )}

              {config.generatedText && (
                <Box sx={{ 
                  mt: 0.5, 
                  p: 2, 
                  borderRadius: 1.5,
                  borderLeft: "3.5px solid var(--accent-purple)", 
                  bgcolor: "rgba(139, 92, 246, 0.03)",
                  border: "1px solid rgba(139, 92, 246, 0.08)",
                  borderLeftColor: "var(--accent-purple)"
                }}>
                  <Typography variant="body2" sx={{ 
                    whiteSpace: "pre-wrap", 
                    fontSize: "13.5px", 
                    lineHeight: 1.6, 
                    color: "text.primary" 
                  }}>
                    {config.generatedText}
                  </Typography>
                </Box>
              )}

              {generateError && (
                <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600, mt: 0.5, display: "block" }}>
                  {generateError}
                </Typography>
              )}
            </Box>
          )}

          {type === "status-badge" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {isEditable && (
                <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "13px" }}>
                  Task Status:
                </Typography>
              )}
              <Chip 
                label={config.status || "Active"} 
                onClick={isEditable ? handleStatusChange : undefined}
                color={
                  config.status === "Done" ? "success" : 
                  config.status === "Blocked" ? "error" : 
                  config.status === "In Progress" ? "warning" : "default"
                }
                size="small"
                sx={{ 
                  fontWeight: 600, 
                  fontSize: "11px",
                  cursor: isEditable ? "pointer" : "default",
                  "&:hover": isEditable ? { opacity: 0.8 } : {}
                }}
              />
              {isEditable && (
                <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px" }}>
                  (Click to toggle status)
                </Typography>
              )}
            </Box>
          )}

          {type === "chart-analytics" && (
            <Box sx={{ py: 1, textAlign: "center", color: "text.disabled", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: 1.5 }}>
              <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic", mb: 0.5, fontSize: "13px" }}>
                Analytics Chart Placeholder
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "10px" }}>
                Linked to Table ID: {config.tableId || "Not connected"}
              </Typography>
            </Box>
          )}

          {type === "excerpt-include" && (() => {
            const context = useContext(DocumentContext);
            if (!context) return null;
            const targetPageId = config.pageId || "";
            if (!targetPageId) {
              return (
                <Typography variant="body2" sx={{ color: "text.disabled", fontStyle: "italic", fontSize: "13px" }}>
                  No target page selected. Click settings icon to select a page.
                </Typography>
              );
            }

            const targetDoc = findDocNode(context.documents, targetPageId);
            if (!targetDoc) {
              return (
                <Typography variant="body2" sx={{ color: "error.main", fontStyle: "italic", fontSize: "13px" }}>
                  Selected page not found or deleted.
                </Typography>
              );
            }

            const explicitExcerpt = extractExplicitExcerpt(targetDoc.content || "");
            
            return (
              <Box 
                sx={{ 
                  p: 1.5, 
                  borderRadius: 1.5, 
                  bgcolor: "rgba(255, 255, 255, 0.02)", 
                  borderLeft: "3px solid var(--primary-color, #8b5cf6)" 
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <FileText size={12} style={{ color: "var(--text-secondary)" }} />
                  <Typography 
                    variant="caption" 
                    onClick={() => context.onSelectDoc(targetDoc.id)}
                    sx={{ 
                      fontWeight: 700, 
                      color: "text.secondary", 
                      cursor: "pointer",
                      "&:hover": { color: "var(--primary-color, #8b5cf6)", textDecoration: "underline" }
                    }}
                  >
                    Excerpt from {targetDoc.title}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: "text.primary", fontSize: "13.5px", fontStyle: explicitExcerpt ? "normal" : "italic" }}>
                  {explicitExcerpt ? explicitExcerpt : `[No excerpt defined - displaying title] ${targetDoc.title}`}
                </Typography>
              </Box>
            );
          })()}

          {type === "children-display" && (() => {
            const context = useContext(DocumentContext);
            if (!context) return null;
            const currentDoc = findDocNode(context.documents, context.activeDocId || "");
            const rawChildren = currentDoc?.children || [];

            if (rawChildren.length === 0) {
              return (
                <Typography variant="body2" sx={{ color: "text.disabled", fontStyle: "italic", fontSize: "13px" }}>
                  No sub-pages found.
                </Typography>
              );
            }

            // Extract configs
            const depthLimit = config.depth || "all";
            const displayType = config.displayType || (config.showExcerpts ? "both" : "titles");
            const layoutStyle = config.layoutStyle || (config.showBullets === false ? "paragraphs" : "bullets");
            const sortBy = config.sortBy || "title";
            const sortOrder = config.sortOrder || "asc";
            const maxLimit = config.limit ? parseInt(config.limit, 10) : null;

            // Sorting helper
            const sortItems = (items: DocumentItem[]) => {
              const sorted = [...items].sort((a, b) => {
                if (sortBy === "created") {
                  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                } else if (sortBy === "updated") {
                  return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
                } else {
                  return (a.title || "").localeCompare(b.title || "");
                }
              });
              return sortOrder === "desc" ? sorted.reverse() : sorted;
            };

            // Calculate max depth limit
            let maxDepth = -1;
            if (depthLimit === "custom") {
              maxDepth = config.depthCustom ? parseInt(config.depthCustom, 10) : 1;
            } else if (depthLimit !== "all") {
              maxDepth = parseInt(depthLimit, 10);
            }

            const renderItemContent = (item: DocumentItem, titleText: string, excerptText: string, inCard = false) => {
              const showTitle = displayType === "titles" || displayType === "both";
              const showExcerpt = displayType === "excerpts" || displayType === "both";

              return (
                <Box sx={{ display: "inline-block", verticalAlign: "top", width: "100%" }}>
                  {showTitle && (
                    <Typography
                      variant={inCard ? "subtitle1" : "body2"}
                      onClick={inCard ? undefined : () => context.onSelectDoc(item.id)}
                      sx={{
                        display: inCard ? "block" : "inline",
                        cursor: inCard ? "inherit" : "pointer",
                        color: "text.primary",
                        fontSize: inCard ? "14.5px" : "13.5px",
                        fontWeight: inCard ? 700 : 500,
                        transition: "color 0.15s ease",
                        "&:hover": inCard ? {} : {
                          color: "var(--primary-color, #8b5cf6)",
                          textDecoration: "underline",
                        },
                      }}
                    >
                      {titleText}
                    </Typography>
                  )}
                  {showExcerpt && excerptText && (
                    <Typography 
                      variant="caption" 
                      onClick={(!showTitle && !inCard) ? () => context.onSelectDoc(item.id) : undefined}
                      sx={{ 
                        display: "block", 
                        color: "text.secondary", 
                        fontSize: inCard ? "12px" : "11px", 
                        fontStyle: (displayType === "excerpts" && excerptText === titleText) ? "italic" : "normal",
                        mt: (showTitle && excerptText) ? 0.5 : 0,
                        opacity: inCard ? 0.9 : 0.8,
                        cursor: (!showTitle && !inCard) ? "pointer" : "inherit",
                        "&:hover": (!showTitle && !inCard) ? {
                          color: "var(--primary-color, #8b5cf6)",
                          textDecoration: "underline",
                        } : {}
                      }}
                    >
                      {excerptText}
                    </Typography>
                  )}
                </Box>
              );
            };

            // Recursive list renderer
            const renderChildrenList = (items: DocumentItem[], currentDepth: number): React.ReactNode => {
              // Check depth limit
              if (maxDepth !== -1 && currentDepth > maxDepth) {
                return null;
              }

              // Apply sorting
              let processed = sortItems(items);

              // Apply max limit
              if (maxLimit && maxLimit > 0) {
                processed = processed.slice(0, maxLimit);
              }

              if (layoutStyle === "bullets") {
                return (
                  <Box 
                    component="ul" 
                    sx={{ 
                      pl: 2.5, 
                      m: 0, 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: 1, 
                      listStyleType: "disc" 
                    }}
                  >
                    {processed.map((item) => {
                      const titleText = item.title || "Untitled";
                      const excerptText = extractExcerpt(item.content);
                      return (
                        <Box 
                          component="li" 
                          key={item.id} 
                          sx={{ 
                            color: "var(--primary-color, #8b5cf6)", 
                            mb: 0.5,
                          }}
                        >
                          {renderItemContent(item, titleText, excerptText, false)}
                          {item.children && item.children.length > 0 && renderChildrenList(item.children, currentDepth + 1)}
                        </Box>
                      );
                    })}
                  </Box>
                );
              }

              if (layoutStyle === "paragraphs") {
                return (
                  <Box 
                    sx={{ 
                      pl: currentDepth > 1 ? 2.5 : 0, 
                      m: 0, 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: 1.5 
                    }}
                  >
                    {processed.map((item) => {
                      const titleText = item.title || "Untitled";
                      const excerptText = extractExcerpt(item.content);
                      return (
                        <Box key={item.id} sx={{ mb: 0.5 }}>
                          {renderItemContent(item, titleText, excerptText, false)}
                          {item.children && item.children.length > 0 && renderChildrenList(item.children, currentDepth + 1)}
                        </Box>
                      );
                    })}
                  </Box>
                );
              }

              // layoutStyle === "cards"
              return (
                <Box 
                  sx={{ 
                    pl: currentDepth > 1 ? 3 : 0, 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: 2 
                  }}
                >
                  {processed.map((item) => {
                    const titleText = item.title || "Untitled";
                    const excerptText = extractExcerpt(item.content);
                    return (
                      <Box key={item.id} sx={{ mb: 1.5 }}>
                        <Paper
                          elevation={0}
                          onClick={() => context.onSelectDoc(item.id)}
                          sx={{
                            p: 2,
                            borderRadius: "10px",
                            bgcolor: "rgba(255, 255, 255, 0.02)",
                            border: "1px solid rgba(255, 255, 255, 0.04)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              bgcolor: "rgba(255, 255, 255, 0.04)",
                              borderColor: "rgba(139, 92, 246, 0.25)",
                              transform: "translateY(-1px)",
                            }
                          }}
                        >
                          {renderItemContent(item, titleText, excerptText, true)}
                        </Paper>
                        {item.children && item.children.length > 0 && renderChildrenList(item.children, currentDepth + 1)}
                      </Box>
                    );
                  })}
                </Box>
              );
            };

            return (
              <Box>
                {renderChildrenList(rawChildren, 1)}
              </Box>
            );
          })()}

          {type === "page-index" && (() => {
            const context = useContext(DocumentContext);
            if (!context) return null;
            const flatDocs = flattenTree(context.documents);
            
            if (flatDocs.length === 0) {
              return (
                <Typography variant="body2" sx={{ color: "text.disabled", fontStyle: "italic", fontSize: "13px" }}>
                  No pages found in this space.
                </Typography>
              );
            }

            // Sort alphabetically by title
            const sortedDocs = [...flatDocs].sort((a, b) =>
              a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
            );

            // Group by first letter
            const groups: Record<string, DocumentItem[]> = {};
            sortedDocs.forEach((doc) => {
              let firstLetter = doc.title.trim().charAt(0).toUpperCase();
              if (!/[A-Z]/.test(firstLetter)) {
                firstLetter = "#";
              }
              if (!groups[firstLetter]) {
                groups[firstLetter] = [];
              }
              groups[firstLetter].push(doc);
            });

            // Get sorted group keys (A-Z, with # at the end)
            const sortedKeys = Object.keys(groups).sort((a, b) => {
              if (a === "#") return 1;
              if (b === "#") return -1;
              return a.localeCompare(b);
            });

            return (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>
                  Page Directory Index:
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                      md: "1fr 1fr 1fr",
                    },
                    gap: 2,
                  }}
                >
                  {sortedKeys.map((key) => (
                    <Box
                      key={key}
                      sx={{
                        p: 1.5,
                        borderRadius: "8px",
                        bgcolor: "rgba(255, 255, 255, 0.01)",
                        border: "1px solid rgba(255, 255, 255, 0.02)",
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 800,
                          fontSize: "16px",
                          color: "var(--primary-color, #8b5cf6)",
                          fontFamily: '"Outfit", sans-serif',
                          borderBottom: "1.5px solid rgba(139, 92, 246, 0.15)",
                          pb: 0.5,
                          mb: 1,
                        }}
                      >
                        {key}
                      </Typography>
                      <Box component="ul" sx={{ listStyleType: "none", p: 0, m: 0, display: "flex", flexDirection: "column", gap: 0.75 }}>
                        {groups[key].map((doc) => (
                          <Box component="li" key={doc.id} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Typography
                              variant="body2"
                              onClick={() => context.onSelectDoc(doc.id)}
                              sx={{
                                cursor: "pointer",
                                fontSize: "12.5px",
                                fontWeight: 500,
                                color: "text.secondary",
                                transition: "all 0.15s ease",
                                "&:hover": {
                                  color: "var(--primary-color, #8b5cf6)",
                                  textDecoration: "underline",
                                },
                              }}
                            >
                              {doc.title}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })()}

          {type === "attachments-list" && (() => {
            if (attachmentsLoading) {
              return (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={20} sx={{ color: "var(--primary-color)" }} />
                </Box>
              );
            }

            if (attachments.length === 0) {
              return (
                <Typography variant="body2" sx={{ color: "text.disabled", fontStyle: "italic", fontSize: "13px" }}>
                  No attachments found for this document.
                </Typography>
              );
            }

            const layout = config.layout || "table";

            if (layout === "grid") {
              return (
                <Box 
                  sx={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", 
                    gap: 2,
                    mt: 1 
                  }}
                >
                  {attachments.map(att => (
                    <Paper
                      key={att.id}
                      elevation={0}
                      component="a"
                      href={`${API_BASE_URL}/api/attachments/${att.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        p: 1.5,
                        borderRadius: "8px",
                        bgcolor: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.04)",
                        cursor: "pointer",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          bgcolor: "rgba(255, 255, 255, 0.05)",
                          borderColor: "rgba(139, 92, 246, 0.2)",
                          transform: "translateY(-1px)"
                        }
                      }}
                    >
                      {getFileIcon(att.mimeType, att.filename)}
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography 
                          variant="body2" 
                          noWrap
                          sx={{ 
                            fontWeight: 600, 
                            color: "text.primary", 
                            fontSize: "12.5px",
                            fontFamily: '"Outfit", sans-serif'
                          }}
                        >
                          {att.filename}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: "text.secondary", 
                            fontSize: "10px",
                            fontFamily: '"Outfit", sans-serif'
                          }}
                        >
                          {formatFileSize(att.fileSize)}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              );
            }

            // Table layout
            return (
              <Box 
                sx={{ 
                  width: "100%", 
                  overflowX: "auto",
                  mt: 1,
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.05)",
                  backgroundColor: "rgba(0,0,0,0.1)"
                }}
              >
                <Box 
                  component="table" 
                  sx={{ 
                    width: "100%", 
                    borderCollapse: "collapse",
                    fontSize: "13px",
                    fontFamily: '"Outfit", sans-serif',
                    color: "text.primary",
                    textAlign: "left"
                  }}
                >
                  <Box component="thead">
                    <Box component="tr" sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)", bgcolor: "rgba(255,255,255,0.02)" }}>
                      <Box component="th" sx={{ p: 1.5, fontWeight: 700 }}>Name</Box>
                      <Box component="th" sx={{ p: 1.5, fontWeight: 700 }}>Size</Box>
                      <Box component="th" sx={{ p: 1.5, fontWeight: 700 }}>Type</Box>
                      <Box component="th" sx={{ p: 1.5, fontWeight: 700, textAlign: "right" }}>Action</Box>
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {attachments.map(att => (
                      <Box 
                        component="tr" 
                        key={att.id} 
                        sx={{ 
                          borderBottom: "1px solid rgba(255,255,255,0.04)", 
                          "&:hover": { bgcolor: "rgba(255,255,255,0.01)" } 
                        }}
                      >
                        <Box component="td" sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                          {getFileIcon(att.mimeType, att.filename)}
                          <Typography variant="body2" noWrap sx={{ fontSize: "13px", fontWeight: 500, color: "text.primary", maxWidth: "250px" }}>
                            {att.filename}
                          </Typography>
                        </Box>
                        <Box component="td" sx={{ p: 1.5, color: "text.secondary" }}>{formatFileSize(att.fileSize)}</Box>
                        <Box component="td" sx={{ p: 1.5, color: "text.secondary" }}>{att.mimeType.split("/")[1] || "unknown"}</Box>
                        <Box component="td" sx={{ p: 1.5, textAlign: "right" }}>
                          <Tooltip title="Download">
                            <IconButton 
                              size="small" 
                              component="a"
                              href={`${API_BASE_URL}/api/attachments/${att.id}`}
                              download={att.filename}
                              sx={{ p: 0.5, color: "text.secondary", "&:hover": { color: "primary.light" } }}
                            >
                              <Download size={14} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            );
          })()}

          {type === "single-attachment" && (() => {
            if (attachmentsLoading) {
              return (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={20} sx={{ color: "var(--primary-color)" }} />
                </Box>
              );
            }

            const targetId = config.attachmentId || "";
            if (!targetId) {
              return (
                <Typography variant="body2" sx={{ color: "text.disabled", fontStyle: "italic", fontSize: "13px" }}>
                  No attachment selected. Click settings icon to select an attachment.
                </Typography>
              );
            }

            const att = attachments.find(a => a.id === targetId);
            if (!att) {
              return (
                <Typography variant="body2" sx={{ color: "error.main", fontStyle: "italic", fontSize: "13px" }}>
                  Selected attachment not found on this page.
                </Typography>
              );
            }

            const style = config.layoutStyle || "tile";

            if (style === "hyperlink") {
              return (
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, py: 0.5 }}>
                  <Paperclip size={14} style={{ color: "var(--primary-color, #8b5cf6)" }} />
                  <Typography 
                    component="a" 
                    href={`${API_BASE_URL}/api/attachments/${att.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ 
                      fontSize: "13px", 
                      color: "primary.light", 
                      textDecoration: "none", 
                      fontWeight: 600,
                      fontFamily: '"Outfit", sans-serif',
                      "&:hover": { textDecoration: "underline", color: "var(--primary-color, #8b5cf6)" } 
                    }}
                  >
                    {att.filename} ({formatFileSize(att.fileSize)})
                  </Typography>
                </Box>
              );
            }

            // Tile style
            return (
              <Box sx={{ mt: 1 }}>
                <Paper
                  elevation={0}
                  component="a"
                  href={`${API_BASE_URL}/api/attachments/${att.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    p: 2,
                    maxWidth: "320px",
                    borderRadius: "10px",
                    bgcolor: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    cursor: "pointer",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.04)",
                      borderColor: "rgba(139, 92, 246, 0.25)",
                      transform: "translateY(-1px)"
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      p: 1.25, 
                      borderRadius: "8px", 
                      bgcolor: "rgba(0,0,0,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {getFileIcon(att.mimeType, att.filename)}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography 
                      variant="body2" 
                      noWrap
                      sx={{ 
                        fontWeight: 700, 
                        color: "text.primary", 
                        fontSize: "13px",
                        fontFamily: '"Outfit", sans-serif',
                        letterSpacing: "-0.01em"
                      }}
                    >
                      {att.filename}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: "text.secondary", 
                        fontSize: "11px",
                        fontFamily: '"Outfit", sans-serif',
                        mt: 0.25,
                        display: "block"
                      }}
                    >
                      {formatFileSize(att.fileSize)} • Download
                    </Typography>
                  </Box>
                  <Download size={16} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                </Paper>
              </Box>
            );
          })()}
      </>
    );
  };

  if (!isEditable) {
    return (
      <NodeViewWrapper className="macro-block-wrapper-readonly" style={{ marginTop: "0.25rem", marginBottom: "0.25rem" }}>
        <Box sx={{ py: 0.5 }}>
          {renderViewport()}
        </Box>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="macro-block-wrapper" style={{ marginTop: "0.25rem", marginBottom: "0.25rem" }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          backgroundColor: "rgba(22, 25, 36, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.04)",
          borderRadius: 2.5,
          position: "relative",
          userSelect: "none",
          transition: "all 0.2s ease",
          "&:hover": {
            borderColor: "rgba(139, 92, 246, 0.2)",
            backgroundColor: "rgba(22, 25, 36, 0.6)",
          }
        }}
      >
        {/* Macro Header Panel */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, pb: 1, borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ display: "flex", color: "primary.light" }}>
              {getMacroIcon()}
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.04em", color: "text.secondary", textTransform: "uppercase" }}>
              UI Macro: {type.replace("-", " ")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {type !== "ai-content" && (
              <IconButton 
                size="small" 
                onClick={handleSettingsClick}
                sx={{ p: 0.5, color: "text.disabled", "&:hover": { color: "text.primary" } }}
              >
                <Settings size={13} />
              </IconButton>
            )}
            <IconButton size="small" onClick={deleteNode} sx={{ p: 0.5, color: "text.disabled", "&:hover": { color: "error.main" } }}>
              <Trash2 size={13} />
            </IconButton>
          </Box>
        </Box>

        {/* Macro Render Viewport */}
        <Box sx={{ py: 0.5 }}>
          {renderViewport()}
        </Box>

        <Popover
          id={openSettings ? "macro-settings-popover" : undefined}
          open={openSettings}
          anchorEl={anchorEl}
          onClose={handleSettingsClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          slotProps={{
            paper: {
              sx: {
                p: 2.5,
                width: 280,
                border: "1px solid var(--border-color)",
                bgcolor: "var(--panel-color)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }
            }
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: "text.primary", fontFamily: '"Outfit", sans-serif' }}>
            Configure Macro Settings
          </Typography>
          
          <Stack spacing={2.5}>
            {type === "children-display" && (
              <>
                <FormControl fullWidth variant="outlined" size="small">
                  <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase" }}>Depth Limit</FormLabel>
                  <Select
                    value={config.depth || "all"}
                    onChange={(e) => updateConfig("depth", e.target.value)}
                    sx={{ fontSize: "13px", height: 36 }}
                  >
                    <MenuItem value="1" sx={{ fontSize: "13px" }}>1 (Direct children only)</MenuItem>
                    <MenuItem value="2" sx={{ fontSize: "13px" }}>2 Levels</MenuItem>
                    <MenuItem value="3" sx={{ fontSize: "13px" }}>3 Levels</MenuItem>
                    <MenuItem value="4" sx={{ fontSize: "13px" }}>4 Levels</MenuItem>
                    <MenuItem value="5" sx={{ fontSize: "13px" }}>5 Levels</MenuItem>
                    <MenuItem value="custom" sx={{ fontSize: "13px" }}>Custom...</MenuItem>
                    <MenuItem value="all" sx={{ fontSize: "13px" }}>All (No Limit)</MenuItem>
                  </Select>
                </FormControl>

                {config.depth === "custom" && (
                  <TextField
                    fullWidth
                    label="Custom Depth Level"
                    type="number"
                    variant="outlined"
                    size="small"
                    value={config.depthCustom || ""}
                    onChange={(e) => updateConfig("depthCustom", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ sx: { fontSize: "13px", height: 36 } }}
                  />
                )}

                <FormControl fullWidth variant="outlined" size="small">
                  <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase" }}>Display</FormLabel>
                  <Select
                    value={config.displayType || "titles"}
                    onChange={(e) => updateConfig("displayType", e.target.value)}
                    sx={{ fontSize: "13px", height: 36 }}
                  >
                    <MenuItem value="titles" sx={{ fontSize: "13px" }}>Titles Only</MenuItem>
                    <MenuItem value="excerpts" sx={{ fontSize: "13px" }}>Excerpts Only</MenuItem>
                    <MenuItem value="both" sx={{ fontSize: "13px" }}>Titles and Excerpts</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth variant="outlined" size="small">
                  <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase" }}>Style</FormLabel>
                  <Select
                    value={config.layoutStyle || "bullets"}
                    onChange={(e) => updateConfig("layoutStyle", e.target.value)}
                    sx={{ fontSize: "13px", height: 36 }}
                  >
                    <MenuItem value="bullets" sx={{ fontSize: "13px" }}>Bullets</MenuItem>
                    <MenuItem value="paragraphs" sx={{ fontSize: "13px" }}>Paragraphs</MenuItem>
                    <MenuItem value="cards" sx={{ fontSize: "13px" }}>Cards</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth variant="outlined" size="small">
                  <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase" }}>Sort By</FormLabel>
                  <Select
                    value={config.sortBy || "title"}
                    onChange={(e) => updateConfig("sortBy", e.target.value)}
                    sx={{ fontSize: "13px", height: 36 }}
                  >
                    <MenuItem value="title" sx={{ fontSize: "13px" }}>Title</MenuItem>
                    <MenuItem value="created" sx={{ fontSize: "13px" }}>Created Date</MenuItem>
                    <MenuItem value="updated" sx={{ fontSize: "13px" }}>Modified Date</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth variant="outlined" size="small">
                  <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase" }}>Sort Order</FormLabel>
                  <Select
                    value={config.sortOrder || "asc"}
                    onChange={(e) => updateConfig("sortOrder", e.target.value)}
                    sx={{ fontSize: "13px", height: 36 }}
                  >
                    <MenuItem value="asc" sx={{ fontSize: "13px" }}>Ascending</MenuItem>
                    <MenuItem value="desc" sx={{ fontSize: "13px" }}>Descending</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Max Listing Limit"
                  placeholder="No limit"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={config.limit || ""}
                  onChange={(e) => updateConfig("limit", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{ sx: { fontSize: "13px", height: 36 } }}
                />
              </>
            )}

            {type === "excerpt-include" && (() => {
              const context = useContext(DocumentContext);
              if (!context) return null;
              const flatDocs = flattenTree(context.documents);
              return (
                <FormControl fullWidth variant="outlined" size="small">
                  <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase" }}>Select Source Page</FormLabel>
                  <Select
                    value={config.pageId || ""}
                    onChange={(e) => updateConfig("pageId", e.target.value)}
                    sx={{ fontSize: "13px", height: 36 }}
                    displayEmpty
                  >
                    <MenuItem value="" disabled sx={{ fontSize: "13px" }}>Choose page...</MenuItem>
                    {flatDocs.map((doc) => (
                      <MenuItem key={doc.id} value={doc.id} sx={{ fontSize: "13px" }}>
                        {doc.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );
            })()}

            {type === "chart-analytics" && (
              <TextField
                fullWidth
                label="Linked Table ID"
                variant="outlined"
                size="small"
                value={config.tableId || ""}
                onChange={(e) => updateConfig("tableId", e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{ sx: { fontSize: "13px", height: 36 } }}
              />
            )}

            {type === "status-badge" && (
              <FormControl fullWidth variant="outlined" size="small">
                <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase" }}>Badge Status</FormLabel>
                <Select
                  value={config.status || "Active"}
                  onChange={(e) => updateConfig("status", e.target.value)}
                  sx={{ fontSize: "13px", height: 36 }}
                >
                  <MenuItem value="Active" sx={{ fontSize: "13px" }}>Active</MenuItem>
                  <MenuItem value="In Progress" sx={{ fontSize: "13px" }}>In Progress</MenuItem>
                  <MenuItem value="Blocked" sx={{ fontSize: "13px" }}>Blocked</MenuItem>
                  <MenuItem value="Done" sx={{ fontSize: "13px" }}>Done</MenuItem>
                </Select>
              </FormControl>
            )}

            {type === "attachments-list" && (
              <FormControl fullWidth variant="outlined" size="small">
                <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase" }}>Layout Style</FormLabel>
                <Select
                  value={config.layout || "table"}
                  onChange={(e) => updateConfig("layout", e.target.value)}
                  sx={{ fontSize: "13px", height: 36 }}
                >
                  <MenuItem value="table" sx={{ fontSize: "13px" }}>Table</MenuItem>
                  <MenuItem value="grid" sx={{ fontSize: "13px" }}>Icon Grid</MenuItem>
                </Select>
              </FormControl>
            )}

            {type === "single-attachment" && (
              <>
                <FormControl fullWidth variant="outlined" size="small">
                  <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase" }}>Select Attachment</FormLabel>
                  <Select
                    value={config.attachmentId || ""}
                    onChange={(e) => updateConfig("attachmentId", e.target.value)}
                    sx={{ fontSize: "13px", height: 36 }}
                    displayEmpty
                  >
                    <MenuItem value="" disabled sx={{ fontSize: "13px" }}>Choose attachment...</MenuItem>
                    {attachments.map((a) => (
                      <MenuItem key={a.id} value={a.id} sx={{ fontSize: "13px" }}>
                        {a.filename}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth variant="outlined" size="small">
                  <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase" }}>Display Style</FormLabel>
                  <Select
                    value={config.layoutStyle || "tile"}
                    onChange={(e) => updateConfig("layoutStyle", e.target.value)}
                    sx={{ fontSize: "13px", height: 36 }}
                  >
                    <MenuItem value="tile" sx={{ fontSize: "13px" }}>Tile Card</MenuItem>
                    <MenuItem value="hyperlink" sx={{ fontSize: "13px" }}>Hyperlink</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
          </Stack>
        </Popover>
      </Paper>
    </NodeViewWrapper>
  );
};
