import React, { useContext, useState, useEffect } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useIsEditable } from "../hooks/useIsEditable";
import { useAuth } from "react-oidc-context";
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Button,
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
  Sparkles,
  AtSign
} from "lucide-react";
import { DocumentContext } from "./DocumentContext";
import { DocumentPreviewer } from "./DocumentPreviewer";
import type { DocumentItem } from "./Sidebar";
import { fetchAttachments, API_BASE_URL, generateAIContent, fetchTags, fetchAllDocumentTags, fetchTeamUsers, fetchTeams, fetchUserMentions } from "../services/api";
import type { Attachment, Tag as TagType } from "../services/api";
import { marked } from "marked";

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

export const MacroBlockView: React.FC<NodeViewProps> = ({ node, deleteNode, updateAttributes, editor, getPos }) => {
  const { type = "status-badge", config = {} } = node.attrs;

  const context = useContext(DocumentContext);
  const isEditable = useIsEditable(editor);
  const auth = useAuth();
  const currentUsername = auth?.isAuthenticated
    ? (auth?.user?.profile?.preferred_username || (auth?.user?.profile as any)?.username || "user")
    : "dev_admin";

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const openSettings = Boolean(anchorEl);

  const [mentionDocs, setMentionDocs] = useState<DocumentItem[]>([]);
  const [mentionDocsLoading, setMentionDocsLoading] = useState(false);
  const [usersList, setUsersList] = useState<{ id: string; username: string }[]>([]);

  useEffect(() => {
    if (type === "mentions-list" && !isEditable) {
      const targetUser = config.username === "current" || !config.username
        ? currentUsername
        : config.username;

      if (!targetUser) return;

      setMentionDocsLoading(true);
      fetchUserMentions(targetUser)
        .then(data => {
          setMentionDocs(data || []);
        })
        .catch(err => console.error("Macro failed to fetch user mentions:", err))
        .finally(() => setMentionDocsLoading(false));
    }
  }, [type, config.username, currentUsername, isEditable]);

  useEffect(() => {
    if (type === "mentions-list" && openSettings) {
      if (context?.selectedTeamId) {
        fetchTeamUsers(context.selectedTeamId)
          .then(data => setUsersList(data || []))
          .catch(err => console.error("Failed to fetch team users:", err));
      } else {
        fetchTeams()
          .then(async teamsData => {
            const allUsers: { id: string; username: string }[] = [];
            const userIds = new Set<string>();
            for (const t of teamsData) {
              try {
                const users = await fetchTeamUsers(t.id);
                for (const u of users) {
                  if (!userIds.has(u.id)) {
                    userIds.add(u.id);
                    allUsers.push(u);
                  }
                }
              } catch (e) {
                // ignore
              }
            }
            setUsersList(allUsers);
          })
          .catch(err => console.error("Failed to fetch teams:", err));
      }
    }
  }, [type, openSettings, context?.selectedTeamId]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [docTagsMap, setDocTagsMap] = useState<Record<string, TagType[]>>({});
  const [tagsLoading, setTagsLoading] = useState(false);

  useEffect(() => {
    if (type === "page-index") {
      setTagsLoading(true);
      Promise.all([fetchTags(), fetchAllDocumentTags()])
        .then(([tagsData, assocData]) => {
          setAllTags(tagsData || []);
          setDocTagsMap(assocData || {});
        })
        .catch(err => console.error("Macro failed to fetch tags:", err))
        .finally(() => setTagsLoading(false));
    }
  }, [type]);

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
        if (res && res.text) {
          const pos = getPos();
          editor.chain().focus()
            .insertContentAt(pos, res.text)
            .run();
          deleteNode();
        } else {
          setGenerateError("Failed to generate content: empty response");
        }
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

  const handleSettingsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setAnchorEl(null);
  };

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

  const parseMarkdownToHtml = (markdown: string): string => {
    try {
      return marked.parse(markdown) as string;
    } catch (e) {
      console.error("Markdown parsing failed:", e);
      return markdown.replace(/\n/g, "<br />");
    }
  };

  const handleImportMarkdown = (markdown: string) => {
    const htmlContent = parseMarkdownToHtml(markdown);
    const pos = getPos();
    editor.chain()
      .focus()
      .insertContentAt(pos, htmlContent)
      .run();
    deleteNode();
  };

  const getMacroIcon = () => {
    switch (type) {
      case "status-badge":
        return <Smile size={14} color="#34d399" />;
      case "mentions-list":
        return <AtSign size={14} color="#a78bfa" />;
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
      case "markdown-paste":
        return <FileText size={14} color="#c084fc" />;
      default:
        return <Cpu size={14} color="#60a5fa" />;
    }
  };

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
          {type === "markdown-paste" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {isEditable && (!config.isBlockMode || !config.markdown) ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <TextField
                    placeholder="# Heading 1\nSome text with **bold** and *italic*...\n- List item 1\n- List item 2"
                    value={config.markdown || ""}
                    onChange={(e) => updateConfig("markdown", e.target.value)}
                    multiline
                    minRows={4}
                    fullWidth
                    size="small"
                    sx={{
                      "& .MuiInputBase-root": {
                        fontFamily: "monospace",
                        fontSize: "12.5px"
                      },
                      "& textarea": {
                        resize: "vertical",
                        overflow: "auto"
                      }
                    }}
                  />

                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={!config.markdown?.trim()}
                      onClick={() => handleImportMarkdown(config.markdown || "")}
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "12px",
                        fontFamily: '"Outfit", sans-serif',
                        backgroundColor: "var(--primary-color)",
                        color: "#ffffff",
                        "&:hover": { backgroundColor: "var(--primary-dark)" }
                      }}
                    >
                      Import to Document
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={!config.markdown?.trim()}
                      onClick={() => updateConfig("isBlockMode", true)}
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "12px",
                        fontFamily: '"Outfit", sans-serif',
                        borderColor: "var(--border-color)",
                        color: "text.primary",
                        "&:hover": { borderColor: "var(--primary-color)" }
                      }}
                    >
                      Keep as Block
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Box>
                  {!config.markdown?.trim() ? (
                    <Typography variant="body2" sx={{ color: "text.disabled", fontStyle: "italic", fontSize: "12.5px" }}>
                      No Markdown content pasted yet.
                    </Typography>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <Box 
                        className="markdown-rendered-content"
                        dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(config.markdown) }}
                        sx={{
                          fontSize: "13.5px",
                          lineHeight: 1.6,
                          color: "text.primary",
                          "& h1, & h2, & h3, & h4": { fontFamily: '"Outfit", sans-serif', fontWeight: 700, mt: 1.5, mb: 1 },
                          "& h1": { fontSize: "1.4em" },
                          "& h2": { fontSize: "1.25em" },
                          "& h3": { fontSize: "1.15em" },
                          "& p": { my: 1 },
                          "& ul, & ol": { pl: 2.5, my: 1 },
                          "& li": { my: 0.5 },
                          "& code": { bgcolor: "rgba(255, 255, 255, 0.05)", p: "2px 4px", borderRadius: "3px", fontSize: "0.9em", fontFamily: "monospace" },
                          "& pre": { bgcolor: "rgba(0, 0, 0, 0.2)", p: 1.5, borderRadius: "6px", overflowX: "auto", my: 1.5 },
                          "& pre code": { p: 0, bgcolor: "transparent", fontSize: "0.85em" },
                          "& blockquote": { borderLeft: "3px solid var(--primary-color)", pl: 2, m: "1em 0", color: "text.secondary", fontStyle: "italic" },
                          "& table": { width: "100%", borderCollapse: "collapse", my: 1.5 },
                          "& th, & td": { border: "1px solid var(--border-color)", p: 1, textAlign: "left" },
                          "& th": { bgcolor: "rgba(255, 255, 255, 0.02)", fontWeight: 700 }
                        }}
                      />
                      
                      {isEditable && config.isBlockMode && (
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => updateConfig("isBlockMode", false)}
                          sx={{
                            alignSelf: "flex-start",
                            textTransform: "none",
                            fontWeight: 600,
                            fontSize: "11.5px",
                            fontFamily: '"Outfit", sans-serif',
                            color: "var(--primary-color)",
                            p: 0,
                            minWidth: 0,
                            "&:hover": { textDecoration: "underline", backgroundColor: "transparent" }
                          }}
                        >
                          Edit Markdown
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}

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

          {type === "mentions-list" && (() => {
            if (isEditable) {
              const targetUser = config.username === "current" || !config.username ? "Current Reader" : `@${config.username}`;
              const sortOrder = config.sortBy === "title" ? "Page Title" : "Last Updated";
              return (
                <Box sx={{ p: 1.5, border: "1.5px dashed rgba(139, 92, 246, 0.25)", borderRadius: "8px", bgcolor: "rgba(139, 92, 246, 0.03)" }}>
                  <Typography variant="body2" sx={{ color: "var(--primary-color)", fontWeight: 600, fontSize: "12.5px", display: "flex", alignItems: "center", gap: 0.75, fontFamily: '"Outfit", sans-serif' }}>
                    <AtSign size={14} /> Mentions List Macro
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.5, fontFamily: '"Outfit", sans-serif' }}>
                    Target User: {targetUser} • Sorting: {sortOrder} • (Full list hidden in Edit mode)
                  </Typography>
                </Box>
              );
            }

            const getSortedMentionDocs = () => {
              const sortBy = config.sortBy || "updated_at";
              const sorted = [...mentionDocs];
              if (sortBy === "title") {
                return sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
              }
              return sorted.sort((a, b) => {
                const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                return dateB - dateA;
              });
            };

            const sortedDocs = getSortedMentionDocs();

            if (mentionDocsLoading) {
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 2 }}>
                  <CircularProgress size={16} sx={{ color: "var(--primary-color)" }} />
                  <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"Outfit", sans-serif' }}>
                    Loading mentions...
                  </Typography>
                </Box>
              );
            }

            if (sortedDocs.length === 0) {
              const displayTarget = config.username === "current" || !config.username ? "you" : `@${config.username}`;
              return (
                <Typography variant="body2" sx={{ color: "text.disabled", fontStyle: "italic", fontSize: "13px", py: 1, fontFamily: '"Outfit", sans-serif' }}>
                  No mentions found for {displayTarget}.
                </Typography>
              );
            }

            return (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                {sortedDocs.map((doc) => {
                  return (
                    <Box
                      key={doc.id}
                      onClick={() => {
                        if (context?.onSelectDoc) {
                          context.onSelectDoc(doc.id);
                        }
                      }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        px: 1.5,
                        py: 1,
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)",
                        bgcolor: "rgba(255, 255, 255, 0.01)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          borderColor: "rgba(139, 92, 246, 0.3)",
                          bgcolor: "rgba(139, 92, 246, 0.02)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        }
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <AtSign size={14} style={{ color: "var(--primary-color)" }} />
                        <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", fontFamily: '"Outfit", sans-serif' }} noWrap>
                          {doc.title || "Untitled Page"}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: "11px", color: "text.disabled", fontFamily: '"Outfit", sans-serif' }}>
                        {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : ""}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            );
          })()}

          {type === "page-index" && (() => {
            if (isEditable) {
              const filterTags = config.filterTags || [];
              const activeFilters = filterTags.length > 0
                ? allTags.filter(t => filterTags.includes(t.id)).map(t => t.name).join(", ")
                : "None";
              return (
                <Box sx={{ p: 1.5, border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "8px", bgcolor: "rgba(255,255,255,0.01)" }}>
                  <Typography variant="body2" sx={{ color: "text.disabled", fontStyle: "italic", fontSize: "12.5px" }}>
                    Page Index (Directory listing hidden in Edit mode)
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.5 }}>
                    Filters: {activeFilters} • Grouping: {config.groupBy === "tag" ? "By Tag" : "None"} • Sorting: {config.sortBy === "updated" ? "Last Updated" : "Name"}
                  </Typography>
                </Box>
              );
            }

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

            // Apply filter
            const filterTags = config.filterTags || [];
            const filteredDocs = flatDocs.filter(doc => {
              if (filterTags.length === 0) return true;
              const docTags = docTagsMap[doc.id] || [];
              return docTags.some(tag => filterTags.includes(tag.id));
            });

            if (filteredDocs.length === 0) {
              return (
                <Typography variant="body2" sx={{ color: "text.disabled", fontStyle: "italic", fontSize: "13px" }}>
                  No pages match the configured tag filters.
                </Typography>
              );
            }

            // Sort
            const sortBy = config.sortBy || "name";
            const sortedDocs = [...filteredDocs].sort((a, b) => {
              if (sortBy === "updated") {
                const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                return timeB - timeA;
              } else {
                return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
              }
            });

            // Group
            const groupBy = config.groupBy || "none";
            if (groupBy === "tag") {
              const grouped: Record<string, DocumentItem[]> = {};
              const untagged: DocumentItem[] = [];

              sortedDocs.forEach(doc => {
                const docTags = docTagsMap[doc.id] || [];
                if (docTags.length === 0) {
                  untagged.push(doc);
                } else {
                  docTags.forEach(tag => {
                    if (!grouped[tag.id]) {
                      grouped[tag.id] = [];
                    }
                    grouped[tag.id].push(doc);
                  });
                }
              });

              const activeTags = allTags.filter(t => grouped[t.id] && grouped[t.id].length > 0);

              return (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                      md: "1fr 1fr 1fr",
                    },
                    gap: 2.5,
                  }}
                >
                  {activeTags.map((tag) => (
                    <Box
                      key={tag.id}
                      sx={{
                        p: 1.5,
                        borderRadius: "8px",
                        bgcolor: "rgba(255, 255, 255, 0.01)",
                        border: "1px solid rgba(255, 255, 255, 0.02)",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, borderBottom: "1.5px solid rgba(255, 255, 255, 0.05)", pb: 0.5, mb: 1.25 }}>
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: tag.color || "var(--primary-color)",
                          }}
                        />
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            fontSize: "13px",
                            fontFamily: '"Outfit", sans-serif',
                            color: "text.primary",
                          }}
                        >
                          {tag.name}
                        </Typography>
                      </Box>
                      <Box component="ul" sx={{ listStyleType: "none", p: 0, m: 0, display: "flex", flexDirection: "column", gap: 0.75 }}>
                        {grouped[tag.id].map((doc) => (
                          <Box component="li" key={doc.id} sx={{ display: "flex", flexDirection: "column" }}>
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
                                  color: tag.color || "var(--primary-color, #8b5cf6)",
                                  textDecoration: "underline",
                                },
                              }}
                            >
                              {doc.title}
                            </Typography>
                            {sortBy === "updated" && doc.updatedAt && (
                              <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px", mt: 0.25 }}>
                                Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  ))}
                  
                  {untagged.length > 0 && filterTags.length === 0 && (
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: "8px",
                        bgcolor: "rgba(255, 255, 255, 0.01)",
                        border: "1px solid rgba(255, 255, 255, 0.02)",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, borderBottom: "1.5px solid rgba(255, 255, 255, 0.05)", pb: 0.5, mb: 1.25 }}>
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "text.disabled",
                          }}
                        />
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            fontSize: "13px",
                            fontFamily: '"Outfit", sans-serif',
                            color: "text.secondary",
                          }}
                        >
                          Untagged
                        </Typography>
                      </Box>
                      <Box component="ul" sx={{ listStyleType: "none", p: 0, m: 0, display: "flex", flexDirection: "column", gap: 0.75 }}>
                        {untagged.map((doc) => (
                          <Box component="li" key={doc.id} sx={{ display: "flex", flexDirection: "column" }}>
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
                            {sortBy === "updated" && doc.updatedAt && (
                              <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px", mt: 0.25 }}>
                                Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              );
            }

            // Flat directory
            return (
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
                {sortedDocs.map((doc) => {
                  const docTags = docTagsMap[doc.id] || [];
                  return (
                    <Paper
                      key={doc.id}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: "8px",
                        bgcolor: "rgba(255, 255, 255, 0.01)",
                        border: "1px solid rgba(255, 255, 255, 0.03)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 1.5,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          bgcolor: "rgba(255, 255, 255, 0.02)",
                          borderColor: "rgba(139, 92, 246, 0.15)",
                        }
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          onClick={() => context.onSelectDoc(doc.id)}
                          sx={{
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "text.primary",
                            transition: "all 0.15s ease",
                            "&:hover": {
                              color: "var(--primary-color, #8b5cf6)",
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {doc.title}
                        </Typography>
                        {sortBy === "updated" && doc.updatedAt && (
                          <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px", display: "block", mt: 0.5 }}>
                            Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                      {docTags.length > 0 && (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
                          {docTags.map(tag => (
                            <Chip
                              key={tag.id}
                              label={tag.name}
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: "9px",
                                fontWeight: 700,
                                bgcolor: `${tag.color}15`,
                                color: tag.color,
                                border: `1px solid ${tag.color}25`,
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Paper>
                  );
                })}
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

            if (style === "preview") {
              return (
                <Box sx={{ mt: 1.5, width: "100%" }}>
                  <DocumentPreviewer
                    attachmentId={att.id}
                    filename={att.filename}
                    mimeType={att.mimeType}
                    fileSize={att.fileSize}
                    apiBaseUrl={API_BASE_URL}
                    heightSize={config.previewSize || "md"}
                    onHeightChange={(newSize) => updateConfig("previewSize", newSize)}
                  />
                </Box>
              );
            }

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
              UI Macro: {type === "markdown-paste" ? "Markdown" : type.replace("-", " ")}
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
            {type === "mentions-list" && (
              <>
                <FormControl fullWidth variant="outlined" size="small">
                  <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase", fontFamily: '"Outfit", sans-serif' }}>Target User</FormLabel>
                  <Select
                    value={config.username || "current"}
                    onChange={(e) => updateConfig("username", e.target.value)}
                    sx={{ fontSize: "13px", height: 36, fontFamily: '"Outfit", sans-serif' }}
                  >
                    <MenuItem value="current" sx={{ fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>Current Reader (You)</MenuItem>
                    {usersList.map((u) => (
                      <MenuItem key={u.id} value={u.username} sx={{ fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>
                        @{u.username}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth variant="outlined" size="small">
                  <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase", fontFamily: '"Outfit", sans-serif' }}>Sort By</FormLabel>
                  <Select
                    value={config.sortBy || "updated_at"}
                    onChange={(e) => updateConfig("sortBy", e.target.value)}
                    sx={{ fontSize: "13px", height: 36, fontFamily: '"Outfit", sans-serif' }}
                  >
                    <MenuItem value="updated_at" sx={{ fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>Last Updated</MenuItem>
                    <MenuItem value="title" sx={{ fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>Page Title (A-Z)</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}

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

            {type === "page-index" && (
              <>
                <FormControl fullWidth variant="outlined" size="small">
                  <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase" }}>Filter by Tag(s)</FormLabel>
                  <Select
                    multiple
                    value={config.filterTags || []}
                    onChange={(e) => updateConfig("filterTags", typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => {
                          const tag = allTags.find(t => t.id === value);
                          return (
                            <Chip 
                              key={value} 
                              label={tag ? tag.name : value} 
                              size="small" 
                              sx={{ 
                                height: 20, 
                                fontSize: "10px", 
                                bgcolor: tag ? `${tag.color}20` : undefined,
                                color: tag ? tag.color : undefined
                              }} 
                            />
                          );
                        })}
                      </Box>
                    )}
                    sx={{ fontSize: "13px", minHeight: 36 }}
                    displayEmpty
                  >
                    {allTags.map((tag) => (
                      <MenuItem key={tag.id} value={tag.id} sx={{ fontSize: "13px" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: tag.color }} />
                          {tag.name}
                        </Box>
                      </MenuItem>
                    ))}
                    {allTags.length === 0 && (
                      <MenuItem disabled sx={{ fontSize: "13px" }}>No tags available</MenuItem>
                    )}
                  </Select>
                </FormControl>

                <FormControl fullWidth variant="outlined" size="small">
                  <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase" }}>Group By</FormLabel>
                  <Select
                    value={config.groupBy || "none"}
                    onChange={(e) => updateConfig("groupBy", e.target.value)}
                    sx={{ fontSize: "13px", height: 36 }}
                  >
                    <MenuItem value="none" sx={{ fontSize: "13px" }}>None (Flat List)</MenuItem>
                    <MenuItem value="tag" sx={{ fontSize: "13px" }}>Tags</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth variant="outlined" size="small">
                  <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase" }}>Sort By</FormLabel>
                  <Select
                    value={config.sortBy || "name"}
                    onChange={(e) => updateConfig("sortBy", e.target.value)}
                    sx={{ fontSize: "13px", height: 36 }}
                  >
                    <MenuItem value="name" sx={{ fontSize: "13px" }}>Name (Alphabetical)</MenuItem>
                    <MenuItem value="updated" sx={{ fontSize: "13px" }}>Last Updated</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}

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
                    <MenuItem value="preview" sx={{ fontSize: "13px" }}>Interactive Preview</MenuItem>
                  </Select>
                </FormControl>

                {config.layoutStyle === "preview" && (
                  <FormControl fullWidth variant="outlined" size="small">
                    <FormLabel sx={{ fontSize: "11px", fontWeight: 700, color: "text.secondary", mb: 0.75, textTransform: "uppercase" }}>Default Height</FormLabel>
                    <Select
                      value={config.previewSize || "md"}
                      onChange={(e) => updateConfig("previewSize", e.target.value)}
                      sx={{ fontSize: "13px", height: 36 }}
                    >
                      <MenuItem value="sm" sx={{ fontSize: "13px" }}>Small (320px)</MenuItem>
                      <MenuItem value="md" sx={{ fontSize: "13px" }}>Medium (540px)</MenuItem>
                      <MenuItem value="lg" sx={{ fontSize: "13px" }}>Large (820px)</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </>
            )}
          </Stack>
        </Popover>
      </Paper>
    </NodeViewWrapper>
  );
};
