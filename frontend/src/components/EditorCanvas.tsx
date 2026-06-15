import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { MacroBlock } from "../editor/extensions/MacroBlock";
import { Excerpt } from "../editor/extensions/Excerpt";
import { LayoutSection } from "../editor/extensions/LayoutSection";
import { LayoutColumn } from "../editor/extensions/LayoutColumn";
import { CalloutPanel } from "../editor/extensions/CalloutPanel";
import { InlineStatus } from "../editor/extensions/InlineStatus";
import { Details, DetailsSummary, DetailsContent } from "../editor/extensions/Details";
import { InlineDate } from "../editor/extensions/InlineDate";
import { NoFormatPanel } from "../editor/extensions/NoFormatPanel";
import { TableOfContents } from "../editor/extensions/TableOfContents";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import { CustomTableCell, CustomTableHeader } from "../editor/extensions/CustomTableExtensions";
import { CustomImage } from "../editor/extensions/CustomImage";
import { PresenceCursors } from "../editor/extensions/PresenceCursors";
import { usePresence } from "../hooks/usePresence";
import { uploadImage, fetchVersions, restoreVersion, createMilestone, fetchDocument, fetchDocumentAnalytics, autogenSummary, addFavorite, removeFavorite, isFavorite as checkIsFavorite, fetchComments, createComment, updateComment, deleteComment, fetchAttachments, fetchTeamUsers, API_BASE_URL } from "../services/api";
import type { DocumentVersion, DocumentAnalytics, Comment, Attachment } from "../services/api";
import { UserAvatar } from "./UserAvatar";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { TableCreatorDialog } from "./TableCreatorDialog";
import { TableBubbleToolbar } from "./TableBubbleToolbar";
import { AIPromptBar } from "./AIPromptBar";
import { 
  Box, 
  Paper, 
  IconButton, 
  Typography, 
  Tooltip,
  Divider,
  InputBase,
  ClickAwayListener,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Drawer,
  Button,
  Popover,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tabs,
  Tab,
  Chip,
  Select,
  Avatar
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { 
  Plus,
  Search,
  Heading1, 
  Heading2, 
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Heading,
  List, 
  ListOrdered, 
  Code, 
  Sparkles, 
  BadgeAlert, 
  Bold, 
  Italic,
  Strikethrough,
  Columns2,
  Columns3,
  Layout,
  Grid3X3,
  Star,
  SquareTerminal,
  Cloud,
  Check,
  Image,
  History,
  Clock,
  X,
  Smile,
  AlertCircle,
  Lightbulb,
  AlertTriangle,
  Info,
  ListTodo,
  Calendar,
  ChevronsUpDown,
  ChevronRight,
  BarChart2,
  Edit,
  FileText,
  Type,
  Users,
  MoreHorizontal,
  FolderInput,
  Trash2,
  BookOpen,
  Layers,
  FileUp,
  Paperclip,
  AlignLeft,
  AlignCenter,
  AlignRight
} from "lucide-react";
import { MovePageDialog } from "./Sidebar";
import type { DocumentItem } from "./Sidebar";
import { PageAttachments } from "./PageAttachments";

import { DocumentContext } from "./DocumentContext";

interface EditorCanvasProps {
  activeDocId: string | null;
  authToken: string | null;
  initialTitle: string;
  initialContent: string;
  onSave: (title: string, content: string, changeSummary?: string) => void;
  isSaving: boolean;
  documents?: DocumentItem[];
  selectedTeamName?: string;
  selectedProjectName?: string;
  initialEditMode?: boolean;
  onDeleteDoc?: (id: string) => void;
  onMoveDoc?: (id: string, parentId: string | null) => Promise<void>;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: string;
  onRestore?: () => Promise<void>;
  onDeletePermanently?: () => Promise<void>;
  onSelectDoc?: (id: string) => void;
  isAuditPage?: boolean;
  onNavigateToAudit?: () => void;
  onNavigateToNormal?: () => void;
  developerMode?: boolean;
  selectedTeamId?: string | null;
}

interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: (editor: any) => void;
  category?: string;
}

// Helper to find path to active document in hierarchical documents tree
const findBreadcrumbPath = (
  items: DocumentItem[],
  targetId: string,
  currentPath: DocumentItem[] = []
): DocumentItem[] | null => {
  for (const item of items) {
    const newPath = [...currentPath, item];
    if (item.id === targetId) {
      return newPath;
    }
    if (item.children) {
      const found = findBreadcrumbPath(item.children, targetId, newPath);
      if (found) return found;
    }
  }
  return null;
};

// Helper component for Page Analytics block breakdown legend
const LegendItem = ({ color, label, count }: { color: string; label: string; count: number }) => {
  if (count === 0) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <Typography 
        variant="caption" 
        sx={{ 
          fontSize: "10px", 
          color: "text.secondary", 
          textOverflow: "ellipsis", 
          overflow: "hidden", 
          whiteSpace: "nowrap" 
        }}
      >
        {label}: <strong>{count}</strong>
      </Typography>
    </Box>
  );
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "Apr 27, 2026";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Apr 27, 2026";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  activeDocId,
  authToken,
  initialTitle,
  initialContent,
  onSave,
  isSaving = false,
  documents = [],
  selectedTeamName,
  selectedProjectName,
  initialEditMode = false,
  onDeleteDoc,
  onMoveDoc,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
  deletedAt,
  onRestore,
  onDeletePermanently,
  onSelectDoc,
  isAuditPage = false,
  onNavigateToAudit,
  onNavigateToNormal,
  developerMode = false,
  selectedTeamId
}) => {
  const [title, setTitle] = useState(initialTitle);
  const lastNonEmptyTitle = React.useRef(initialTitle || "Untitled Document");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tableCreatorOpen, setTableCreatorOpen] = useState(false);
  const [loremDialogOpen, setLoremDialogOpen] = useState(false);
  const [layoutMenuAnchor, setLayoutMenuAnchor] = useState<null | HTMLElement>(null);
  const [symbolMenuAnchorEl, setSymbolMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(initialEditMode && !deletedAt);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [macroSelectorOpen, setMacroSelectorOpen] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState("text");
  const [macroSearchQuery, setMacroSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("arkollab_favorite_macros");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return ["inline-status", "callout-info", "task-list", "details-summary", "inline-date", "table", "image"];
  });

  const toggleFavorite = (commandId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setFavorites(prev => {
      const next = prev.includes(commandId)
        ? prev.filter(id => id !== commandId)
        : [...prev, commandId];
      try {
        localStorage.setItem("arkollab_favorite_macros", JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const [menuMode, setMenuMode] = useState<"slash" | "mention">("slash");
  const [teamUsers, setTeamUsers] = useState<{ id: string; username: string }[]>([]);

  useEffect(() => {
    if (!selectedTeamId) {
      setTeamUsers([
        { id: "dev_admin", username: "dev_admin" },
        { id: "jbauer", username: "jbauer" }
      ]);
      return;
    }
    fetchTeamUsers(selectedTeamId)
      .then(users => {
        if (users && users.length > 0) {
          setTeamUsers(users);
        } else {
          setTeamUsers([
            { id: "dev_admin", username: "dev_admin" },
            { id: "jbauer", username: "jbauer" }
          ]);
        }
      })
      .catch(err => {
        console.error("Failed to fetch team users:", err);
        setTeamUsers([
          { id: "dev_admin", username: "dev_admin" },
          { id: "jbauer", username: "jbauer" }
        ]);
      });
  }, [selectedTeamId]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  const loadAttachments = async () => {
    if (!activeDocId) {
      setAttachments([]);
      return;
    }
    setAttachmentsLoading(true);
    try {
      const data = await fetchAttachments(activeDocId);
      setAttachments(data || []);
    } catch (err) {
      console.error("Failed to load attachments:", err);
    } finally {
      setAttachmentsLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [activeDocId]);

  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);

  const handleOpenMoreMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    setMoreMenuAnchor(e.currentTarget);
  };

  const handleCloseMoreMenu = () => {
    setMoreMenuAnchor(null);
  };

  const handleTriggerMove = () => {
    handleCloseMoreMenu();
    setMoveDialogOpen(true);
  };

  const handleTriggerDelete = () => {
    handleCloseMoreMenu();
    if (onDeleteDoc && activeDocId) {
      onDeleteDoc(activeDocId);
    }
  };

  // Version History & Preview state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);
  const [milestoneSummary, setMilestoneSummary] = useState("");
  const [isSavingMilestone, setIsSavingMilestone] = useState(false);

  // Done Checkpoint Modal states & Idle Timeout
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [commitDescription, setCommitDescription] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [idleToastOpen, setIdleToastOpen] = useState(false);

  // Page Analytics live state
  const [analyticsData, setAnalyticsData] = useState<DocumentAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Trigger a page view record when activeDocId is retrieved/mounted
  useEffect(() => {
    if (activeDocId) {
      fetchDocument(activeDocId).catch((err) => {
        console.error("Failed to record page view:", err);
      });
    }
  }, [activeDocId]);

  // Fetch favorites status on doc load
  useEffect(() => {
    if (!activeDocId) {
      setIsFavorite(false);
      return;
    }

    checkIsFavorite(activeDocId)
      .then(status => {
        setIsFavorite(status);
      })
      .catch(err => {
        console.error("Failed to check favorite status:", err);
      });
  }, [activeDocId]);

  // Listen for active doc unfavorite events from FavoritesDialog
  useEffect(() => {
    const handleUnfavoriteDoc = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.id === activeDocId) {
        setIsFavorite(false);
      }
    };

    window.addEventListener("unfavorite-active-doc", handleUnfavoriteDoc);
    return () => {
      window.removeEventListener("unfavorite-active-doc", handleUnfavoriteDoc);
    };
  }, [activeDocId]);

  // Fetch live page analytics when Dialog is opened
  useEffect(() => {
    if (analyticsOpen && activeDocId) {
      setLoadingAnalytics(true);
      fetchDocumentAnalytics(activeDocId)
        .then((data) => {
          setAnalyticsData(data);
        })
        .catch((err) => {
          console.error("Failed to fetch live analytics:", err);
        })
        .finally(() => {
          setLoadingAnalytics(false);
        });
    }
  }, [analyticsOpen, activeDocId]);

  const triggerImageUpload = (targetEditor: any) => {
    if (!targetEditor) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const meta = await uploadImage(file);
        targetEditor.chain().focus().insertContent({
          type: "customImage",
          attrs: {
            imageId: meta.id,
            src: `${API_BASE_URL}/api/images/${meta.id}/O`,
            size: "O",
            alignment: "center",
            originalWidth: meta.originalWidth,
            originalHeight: meta.originalHeight
          }
        }).run();
      } catch (err) {
        console.error("Failed to upload image:", err);
        alert("Failed to upload image. Please try again.");
      }
    };
    input.click();
  };

  // Sync title when initialTitle changes
  useEffect(() => {
    setTitle(initialTitle);
    if (initialTitle && initialTitle.trim() !== "") {
      lastNonEmptyTitle.current = initialTitle;
    }
  }, [initialTitle]);



  const menuStateRef = React.useRef<{
    menuOpen: boolean;
    menuMode: "slash" | "mention";
    selectedIndex: number;
    filteredCommands: SlashCommandItem[];
    filteredUsers: { id: string; username: string }[];
    executeCommand: (cmd: SlashCommandItem) => void;
    executeUserSelect: (user: { id: string; username: string }) => void;
  }>({
    menuOpen: false,
    menuMode: "slash",
    selectedIndex: 0,
    filteredCommands: [],
    filteredUsers: [],
    executeCommand: () => {},
    executeUserSelect: () => {}
  });

  const [ydoc] = useState(() => new Y.Doc());

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable native history since Collaboration takes over undo/redo management
        history: false,
        heading: {
          levels: [1, 2, 3, 4, 5, 6, 7, 8] as any,
        },
      } as any),
      Collaboration.configure({
        document: ydoc,
      }),
      MacroBlock,
      Excerpt,
      LayoutSection,
      LayoutColumn,
      CalloutPanel,
      InlineStatus,
      Details,
      DetailsSummary,
      DetailsContent,
      InlineDate,
      NoFormatPanel,
      TaskList,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      CustomTableCell,
      CustomTableHeader,
      CustomImage,
      PresenceCursors,
      TableOfContents,
    ],
    content: "", // Start empty; populated dynamically by WebSocket sync-history or offline fallback
    editable: false,
    editorProps: {
      attributes: {
        class: "editor-content",
      },
      handleKeyDown: (_, event) => {
        // Intercept Cmd+K or Ctrl+K to open AI Assistant prompt bar
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          setAiPromptOpen(true);
          return true;
        }

        if (!menuStateRef.current.menuOpen) {
          return false;
        }

        const itemsLength = menuStateRef.current.menuMode === "slash" 
          ? menuStateRef.current.filteredCommands.length 
          : menuStateRef.current.filteredUsers.length;

        if (itemsLength === 0) {
          return false;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex(prev => (prev + 1) % itemsLength);
          return true;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex(prev => (prev - 1 + itemsLength) % itemsLength);
          return true;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          if (menuStateRef.current.menuMode === "slash") {
            const cmd = menuStateRef.current.filteredCommands[menuStateRef.current.selectedIndex];
            if (cmd) {
              menuStateRef.current.executeCommand(cmd);
            }
          } else {
            const user = menuStateRef.current.filteredUsers[menuStateRef.current.selectedIndex];
            if (user) {
              menuStateRef.current.executeUserSelect(user);
            }
          }
          return true;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          setMenuOpen(false);
          return true;
        }

        return false;
      },
      handleDOMEvents: {
        click: (view, event) => {
          const target = event.target as HTMLElement;
          const summary = target.closest("summary");
          if (!summary) return false;

          const detailsElement = summary.closest("details");
          if (!detailsElement) return false;

          try {
            const domPos = view.posAtDOM(detailsElement, 0);
            const nodePos = domPos - 1;
            const node = view.state.doc.nodeAt(nodePos);
            if (node && node.type.name === "details") {
              view.dispatch(
                view.state.tr.setNodeMarkup(nodePos, undefined, {
                  ...node.attrs,
                  open: !node.attrs.open,
                })
              );
              event.preventDefault();
              event.stopPropagation();
              return true;
            }
          } catch (err) {
            console.error("Error toggling details block:", err);
          }
          return false;
        }
      }
    },
    onUpdate: ({ editor, transaction }) => {
      // Prevent duplicate save requests by only saving locally-initiated updates
      const isRemote = transaction.getMeta("y-sync") !== undefined;
      if (!isRemote && isEditing) {
        saveDocument();
      }
      checkSlashCommand(editor);
    },
    // Triggers when selection changes
    onSelectionUpdate: ({ editor }) => {
      checkSlashCommand(editor);
    }
  });

  const handleForceCheckout = async (isTimeout: boolean) => {
    if (!editor) return;
    let description = "Auto-saved snapshot";
    if (isTimeout) {
      try {
        const res = await autogenSummary(activeDocId || "", JSON.stringify(editor.getJSON()), title);
        description = res.summary + " (Idle Timeout)";
      } catch (err) {
        description = "Auto-saved snapshot (Idle Timeout)";
      }
    }

    saveDocument(title, description);
    setIsEditing(false);
    if (isTimeout) {
      setIdleToastOpen(true);
    }
  };

  // 10-Minute Idle Session Timeout
  useEffect(() => {
    if (!isEditing) return;

    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleForceCheckout(true);
      }, 10 * 60 * 1000); // 10 minutes
    };

    // Initialize timer
    resetTimer();

    // Event listeners for activity
    const activityEvents = ["mousemove", "keydown", "click", "scroll"];
    const registerListeners = () => {
      activityEvents.forEach((event) => {
        window.addEventListener(event, resetTimer);
      });
    };

    const removeListeners = () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };

    registerListeners();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      removeListeners();
    };
  }, [isEditing, editor, title, activeDocId]);

  // Secondary read-only editor for previewing document history securely
  const previewEditor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
        heading: {
          levels: [1, 2, 3, 4, 5, 6, 7, 8] as any,
        },
      } as any),
      MacroBlock,
      Excerpt,
      LayoutSection,
      LayoutColumn,
      CalloutPanel,
      InlineStatus,
      Details,
      DetailsSummary,
      DetailsContent,
      InlineDate,
      NoFormatPanel,
      TaskList,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      CustomTableCell,
      CustomTableHeader,
      CustomImage,
      TableOfContents,
    ],
    content: "",
    editable: false,
  });

  // Keep previewEditor sync'd with selected version content
  useEffect(() => {
    if (previewVersion && previewEditor && !previewEditor.isDestroyed) {
      try {
        previewEditor.commands.setContent(JSON.parse(previewVersion.content));
      } catch {
        previewEditor.commands.setContent(previewVersion.content);
      }
    }
  }, [previewVersion, previewEditor]);

  // Synchronize isEditing state with the Tiptap editor instance
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(isEditing);
    }
  }, [editor, isEditing]);

  const saveDocument = (customTitle?: string, customDescription?: string) => {
    const activeTitle = customTitle !== undefined ? customTitle : title;
    const titleToSave = activeTitle.trim() === "" ? lastNonEmptyTitle.current : activeTitle;
    if (editor && !editor.isDestroyed) {
      onSave(titleToSave, JSON.stringify(editor.getJSON()), customDescription);
    }
  };

  // Expose editor globally for E2E testing convenience
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      (window as any).editor = editor;
    }
    return () => {
      delete (window as any).editor;
    };
  }, [editor]);

  const getHeadingValue = () => {
    if (!editor) return "paragraph";
    for (let i = 1; i <= 8; i++) {
      if (editor.isActive("heading", { level: i })) {
        return `h${i}`;
      }
    }
    return "paragraph";
  };

  const handleHeadingChange = (event: SelectChangeEvent<string>) => {
    const val = event.target.value;
    if (!editor) return;
    if (val === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else {
      const match = val.match(/^h(\d)$/);
      if (match) {
        const level = parseInt(match[1], 10);
        editor.chain().focus().toggleHeading({ level: level as any }).run();
      }
    }
  };

  // Breadcrumb path computation
  const path = documents && activeDocId ? findBreadcrumbPath(documents, activeDocId) : null;
  const breadcrumbsList = path
    ? path.map((item, idx) => idx === path.length - 1 ? { ...item, title } : item)
    : [{ id: activeDocId || "root", title }];

  // Page Analytics statistics computation
  const getDocumentStats = () => {
    if (!editor) return { words: 0, characters: 0, readTime: 0, blocks: { paragraphs: 0, headings: 0, tables: 0, images: 0, callouts: 0, statuses: 0, dates: 0, tasks: 0 } };
    const text = editor.getText();
    const characters = text.length;
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const readTime = Math.ceil(words / 200) || 1; // minimum 1 min

    let paragraphs = 0;
    let headings = 0;
    let tables = 0;
    let images = 0;
    let callouts = 0;
    let statuses = 0;
    let dates = 0;
    let tasks = 0;

    const visit = (node: any) => {
      if (node.type === "paragraph") paragraphs++;
      else if (node.type === "heading") headings++;
      else if (node.type === "table") tables++;
      else if (node.type === "customImage" || node.type === "image") images++;
      else if (node.type === "calloutPanel") callouts++;
      else if (node.type === "inlineStatus") statuses++;
      else if (node.type === "inlineDate") dates++;
      else if (node.type === "taskItem") tasks++;
      
      if (node.content) {
        node.content.forEach(visit);
      }
    };

    editor.getJSON().content?.forEach(visit);

    return {
      words,
      characters,
      readTime,
      blocks: {
        paragraphs,
        headings,
        tables,
        images,
        callouts,
        statuses,
        dates,
        tasks
      }
    };
  };

  const isInitializedRef = React.useRef(false);

  // Resilient offline fallback: if WebSocket doesn't initialize content in 1.5 seconds, load database content
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isInitializedRef.current && editor && !editor.isDestroyed) {
        isInitializedRef.current = true;
        editor.commands.setContent(
          (() => {
            try {
              return JSON.parse(initialContent);
            } catch {
              return initialContent;
            }
          })()
        );
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [editor, initialContent]);

  const { activeUsers } = usePresence(activeDocId, authToken, editor, ydoc, (isFirst) => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    if (isFirst && editor && !editor.isDestroyed) {
      editor.commands.setContent(
        (() => {
          try {
            return JSON.parse(initialContent);
          } catch {
            return initialContent;
          }
        })()
      );
    }
  });

  const uniqueActiveUsers = activeUsers.filter(
    (user, index, self) => self.findIndex((u) => u.userId === user.userId) === index
  );

  const commands: SlashCommandItem[] = [
    {
      id: "h1",
      label: "Heading 1",
      description: "Big section title",
      icon: <Heading1 size={16} style={{ color: "var(--accent-blue)" }} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
      category: "text"
    },
    {
      id: "h2",
      label: "Heading 2",
      description: "Medium section subtitle",
      icon: <Heading2 size={16} style={{ color: "var(--accent-purple)" }} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
      category: "text"
    },
    {
      id: "h3",
      label: "Heading 3",
      description: "Small section heading",
      icon: <Heading3 size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
      category: "text"
    },
    {
      id: "h4",
      label: "Heading 4",
      description: "Heading level 4",
      icon: <Heading4 size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 4 }).run(),
      category: "text"
    },
    {
      id: "h5",
      label: "Heading 5",
      description: "Heading level 5",
      icon: <Heading5 size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 5 }).run(),
      category: "text"
    },
    {
      id: "h6",
      label: "Heading 6",
      description: "Heading level 6",
      icon: <Heading6 size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 6 }).run(),
      category: "text"
    },
    {
      id: "h7",
      label: "Heading 7",
      description: "Heading level 7",
      icon: <Heading size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 7 as any }).run(),
      category: "text"
    },
    {
      id: "h8",
      label: "Heading 8",
      description: "Heading level 8",
      icon: <Heading size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 8 as any }).run(),
      category: "text"
    },
    {
      id: "bullet",
      label: "Bullet List",
      description: "Simple bulleted list",
      icon: <List size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => ed.chain().focus().toggleBulletList().run(),
      category: "text"
    },
    {
      id: "number",
      label: "Numbered List",
      description: "Ordered sequential list",
      icon: <ListOrdered size={16} style={{ color: "#fbbf24" }} />,
      action: (ed) => ed.chain().focus().toggleOrderedList().run(),
      category: "text"
    },
    {
      id: "code",
      label: "Code Block",
      description: "Syntax highlighted code block",
      icon: <Code size={16} style={{ color: "#2dd4bf" }} />,
      action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
      category: "text"
    },
    {
      id: "ai-prompt",
      label: "Ask AI",
      description: "Generate or rewrite text inline",
      icon: <Sparkles size={16} style={{ color: "var(--accent-purple)" }} />,
      action: () => {
        setAiPromptOpen(true);
      },
      category: "advanced"
    },
    {
      id: "status-badge",
      label: "Status Indicator",
      description: "Dynamically render status widget",
      icon: <BadgeAlert size={16} style={{ color: "#34d399" }} />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "status-badge",
              config: { status: "Active" }
            }
          })
          .run();
      },
      category: "advanced"
    },
    {
      id: "chart-analytics",
      label: "Analytics Chart",
      description: "Insert interactive chart block",
      icon: <BadgeAlert size={16} style={{ color: "var(--accent-purple)" }} />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "chart-analytics",
              config: { tableId: "table_metrics_01" }
            }
          })
          .run();
      },
      category: "advanced"
    },
    {
      id: "children-display",
      label: "Children Display",
      description: "List child pages under the current document",
      icon: <FolderInput size={16} style={{ color: "var(--accent-blue, #60a5fa)" }} />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "children-display",
              config: {}
            }
          })
          .run();
      },
      category: "advanced"
    },
    {
      id: "page-index",
      label: "Page Index",
      description: "Alphabetical directory of all pages",
      icon: <Layers size={16} style={{ color: "var(--accent-purple, #a78bfa)" }} />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "page-index",
              config: {}
            }
          })
          .run();
      },
      category: "advanced"
    },
    {
      id: "attachments-list",
      label: "Attachments List",
      description: "Show table or grid of all page attachments",
      icon: <Paperclip size={16} style={{ color: "var(--accent-purple, #a78bfa)" }} />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "attachments-list",
              config: { layout: "table" }
            }
          })
          .run();
      },
      category: "advanced"
    },
    {
      id: "single-attachment",
      label: "Single Attachment",
      description: "Link a single page attachment as tile or hyperlink",
      icon: <Paperclip size={16} style={{ color: "var(--accent-blue, #60a5fa)" }} />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "single-attachment",
              config: { attachmentId: "", layoutStyle: "tile" }
            }
          })
          .run();
      },
      category: "advanced"
    },
    {
      id: "excerpt",
      label: "Excerpt Area",
      description: "Define excerpt section for inclusion",
      icon: <FileText size={16} style={{ color: "var(--accent-purple, #a78bfa)" }} />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "excerpt",
            content: [{ type: "paragraph" }]
          })
          .run();
      },
      category: "advanced"
    },
    {
      id: "excerpt-include",
      label: "Excerpt Include",
      description: "Include excerpt from another page",
      icon: <FileUp size={16} style={{ color: "var(--accent-blue, #60a5fa)" }} />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "excerpt-include",
              config: {}
            }
          })
          .run();
      },
      category: "advanced"
    },
    {
      id: "table",
      label: "Table",
      description: "Insert an interactive data table",
      icon: <Grid3X3 size={16} style={{ color: "var(--accent-blue)" }} />,
      action: () => {
        setTableCreatorOpen(true);
      },
      category: "layout"
    },
    {
      id: "layout-twocol",
      label: "2 Columns (50/50)",
      description: "Two columns with equal width",
      icon: <Columns2 size={16} style={{ color: "var(--accent-purple)" }} />,
      action: (ed) => {
        const pos = ed.state.selection.from;
        ed.chain()
          .focus()
          .insertContent({
            type: "layoutSection",
            attrs: { layout: "twocol" },
            content: [
              { type: "layoutColumn", content: [{ type: "paragraph" }] },
              { type: "layoutColumn", content: [{ type: "paragraph" }] }
            ]
          })
          .setTextSelection(pos + 3)
          .run();
      },
      category: "layout"
    },
    {
      id: "layout-threecol",
      label: "3 Columns",
      description: "Three columns with equal width",
      icon: <Columns3 size={16} style={{ color: "var(--accent-blue)" }} />,
      action: (ed) => {
        const pos = ed.state.selection.from;
        ed.chain()
          .focus()
          .insertContent({
            type: "layoutSection",
            attrs: { layout: "threecol" },
            content: [
              { type: "layoutColumn", content: [{ type: "paragraph" }] },
              { type: "layoutColumn", content: [{ type: "paragraph" }] },
              { type: "layoutColumn", content: [{ type: "paragraph" }] }
            ]
          })
          .setTextSelection(pos + 3)
          .run();
      },
      category: "layout"
    },
    {
      id: "layout-asymmetric-left",
      label: "Columns (70/30)",
      description: "Wide left column, narrow right column",
      icon: <Layout size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => {
        const pos = ed.state.selection.from;
        ed.chain()
          .focus()
          .insertContent({
            type: "layoutSection",
            attrs: { layout: "asymmetric-left" },
            content: [
              { type: "layoutColumn", content: [{ type: "paragraph" }] },
              { type: "layoutColumn", content: [{ type: "paragraph" }] }
            ]
          })
          .setTextSelection(pos + 3)
          .run();
      },
      category: "layout"
    },
    {
      id: "layout-asymmetric-right",
      label: "Columns (30/70)",
      description: "Narrow left column, wide right column",
      icon: <Layout size={16} style={{ color: "#fbbf24", transform: "scaleX(-1)" }} />,
      action: (ed) => {
        const pos = ed.state.selection.from;
        ed.chain()
          .focus()
          .insertContent({
            type: "layoutSection",
            attrs: { layout: "asymmetric-right" },
            content: [
              { type: "layoutColumn", content: [{ type: "paragraph" }] },
              { type: "layoutColumn", content: [{ type: "paragraph" }] }
            ]
          })
          .setTextSelection(pos + 3)
          .run();
      },
      category: "layout"
    },
    {
      id: "image",
      label: "Insert Image",
      description: "Upload and insert an image",
      icon: <Image size={16} style={{ color: "#8b5cf6" }} />,
      action: (ed) => {
        triggerImageUpload(ed);
      },
      category: "layout"
    },
    {
      id: "inline-status",
      label: "Status Badge",
      description: "Insert an inline status pill",
      icon: <Smile size={16} style={{ color: "#3b82f6" }} />,
      action: (ed) => ed.chain().focus().insertContent({ type: "inlineStatus", attrs: { text: "TODO", color: "blue" } }).run(),
      category: "tasks"
    },
    {
      id: "callout-info",
      label: "Info Panel",
      description: "Insert a blue information callout",
      icon: <Info size={16} style={{ color: "#3b82f6" }} />,
      action: (ed) => ed.chain().focus().insertContent({
        type: "calloutPanel",
        attrs: { type: "info" },
        content: [{ type: "paragraph" }]
      }).run(),
      category: "callouts"
    },
    {
      id: "callout-note",
      label: "Note Panel",
      description: "Insert a yellow note callout",
      icon: <AlertCircle size={16} style={{ color: "#f59e0b" }} />,
      action: (ed) => ed.chain().focus().insertContent({
        type: "calloutPanel",
        attrs: { type: "note" },
        content: [{ type: "paragraph" }]
      }).run(),
      category: "callouts"
    },
    {
      id: "callout-tip",
      label: "Tip Panel",
      description: "Insert a green tip callout",
      icon: <Lightbulb size={16} style={{ color: "#10b981" }} />,
      action: (ed) => ed.chain().focus().insertContent({
        type: "calloutPanel",
        attrs: { type: "tip" },
        content: [{ type: "paragraph" }]
      }).run(),
      category: "callouts"
    },
    {
      id: "callout-warning",
      label: "Warning Panel",
      description: "Insert a yellow warning callout",
      icon: <AlertTriangle size={16} style={{ color: "#f59e0b" }} />,
      action: (ed) => ed.chain().focus().insertContent({
        type: "calloutPanel",
        attrs: { type: "warning" },
        content: [{ type: "paragraph" }]
      }).run(),
      category: "callouts"
    },
    {
      id: "callout-error",
      label: "Error Panel",
      description: "Insert a red error callout",
      icon: <AlertCircle size={16} style={{ color: "#ef4444" }} />,
      action: (ed) => ed.chain().focus().insertContent({
        type: "calloutPanel",
        attrs: { type: "error" },
        content: [{ type: "paragraph" }]
      }).run(),
      category: "callouts"
    },
    {
      id: "callout-check",
      label: "Check Panel",
      description: "Insert a green success callout",
      icon: <Check size={16} style={{ color: "#10b981" }} />,
      action: (ed) => ed.chain().focus().insertContent({
        type: "calloutPanel",
        attrs: { type: "check" },
        content: [{ type: "paragraph" }]
      }).run(),
      category: "callouts"
    },
    {
      id: "task-list",
      label: "Task List",
      description: "Insert a checkable task checklist",
      icon: <ListTodo size={16} style={{ color: "var(--accent-purple)" }} />,
      action: (ed) => ed.chain().focus().toggleTaskList().run(),
      category: "tasks"
    },
    {
      id: "details-summary",
      label: "Expandable Box",
      description: "Insert a collapsible block panel",
      icon: <ChevronsUpDown size={16} style={{ color: "var(--accent-blue)" }} />,
      action: (ed) => ed.chain().focus().insertContent({
        type: "details",
        content: [
          { type: "detailsSummary" },
          { type: "detailsContent", content: [{ type: "paragraph" }] }
        ]
      }).run(),
      category: "callouts"
    },
    {
      id: "inline-date",
      label: "Date Pill",
      description: "Insert an inline date indicator",
      icon: <Calendar size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => ed.chain().focus().insertContent({ type: "inlineDate" }).run(),
      category: "tasks"
    },
    {
      id: "no-format-panel",
      label: "No Format Panel",
      description: "Monospace panel block for unformatted text",
      icon: <SquareTerminal size={16} style={{ color: "#94a3b8" }} />,
      action: (ed) => ed.chain().focus().insertContent({ type: "noFormatPanel" }).run(),
      category: "text"
    },
    {
      id: "table-of-contents",
      label: "Table of Contents",
      description: "Auto-generate a heading-based outline",
      icon: <List size={16} style={{ color: "var(--primary-color)" }} />,
      action: (ed) => ed.chain().focus().insertContent({ type: "tableOfContents" }).run(),
      category: "advanced"
    },
    {
      id: "symbol-picker",
      label: "Symbol Picker",
      description: "Insert special symbols (Ω, →, etc.)",
      icon: <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "14px", color: "#fbbf24", pl: 0.25 }}>Ω</Typography>,
      action: () => {
        const rect = window.getSelection()?.getRangeAt(0).getBoundingClientRect();
        if (rect) {
          const tempEl = document.createElement("div");
          tempEl.style.position = "absolute";
          tempEl.style.left = `${rect.left + window.scrollX}px`;
          tempEl.style.top = `${rect.top + window.scrollY}px`;
          tempEl.style.width = "0px";
          tempEl.style.height = "0px";
          document.body.appendChild(tempEl);
          setSymbolMenuAnchorEl(tempEl);
          setTimeout(() => {
            tempEl.remove();
          }, 5000);
        } else {
          setSymbolMenuAnchorEl(document.querySelector(".editor-content"));
        }
      },
      category: "text"
    },
    {
      id: "lorem-ipsum",
      label: "Lorem Ipsum",
      description: "Insert dummy lorem ipsum text",
      icon: <Type size={16} style={{ color: "var(--accent-blue)" }} />,
      action: () => {
        setLoremDialogOpen(true);
      },
      category: "text"
    }
  ];

  // Filter commands dynamically based on input query
  // Filter commands dynamically based on input query
  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = teamUsers.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const checkSlashCommand = (editorInstance: any) => {
    if (!isEditing) {
      setMenuOpen(false);
      return;
    }
    const { selection } = editorInstance.state;
    const { $from } = selection;
    
    // Extract text in current paragraph block before the cursor
    const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset, null, null);
    
    const lastSlashIndex = textBeforeCursor.lastIndexOf("/");
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex !== -1 && (lastSlashIndex === -1 || lastAtIndex > lastSlashIndex)) {
      const query = textBeforeCursor.substring(lastAtIndex + 1);
      
      // Ensure there are no spaces after the @
      if (!query.includes(" ")) {
        const range = window.getSelection()?.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          const matchingUsers = teamUsers.filter(u => 
            u.username.toLowerCase().includes(query.toLowerCase())
          );
          
          if (matchingUsers.length > 0) {
            const viewportHeight = window.innerHeight;
            const itemCount = matchingUsers.length;
            const estimatedMenuHeight = Math.min(280, 20 + (itemCount * 36.5) + 8);
            const spaceBelow = viewportHeight - rect.bottom;
            
            let top = rect.bottom + 8;
            if (spaceBelow < estimatedMenuHeight + 16 && rect.top > estimatedMenuHeight + 16) {
              top = rect.top - estimatedMenuHeight - 8;
            }
            
            setMenuPosition({
              top: top,
              left: rect.left,
            });
            setSearchQuery(query);
            setMenuMode("mention");
            setMenuOpen(true);
            setSelectedIndex(prev => prev >= matchingUsers.length ? 0 : prev);
          } else {
            setMenuOpen(false);
          }
        }
      } else {
        setMenuOpen(false);
      }
    } else if (lastSlashIndex !== -1) {
      const query = textBeforeCursor.substring(lastSlashIndex + 1);
      
      // Ensure there are no spaces after the slash (trigger remains active for search term)
      if (!query.includes(" ")) {
        const range = window.getSelection()?.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          
          const matching = commands.filter(c => 
            c.label.toLowerCase().includes(query.toLowerCase()) ||
            c.description.toLowerCase().includes(query.toLowerCase())
          );

          if (matching.length > 0) {
            const viewportHeight = window.innerHeight;
            const itemCount = matching.length;
            const estimatedMenuHeight = Math.min(280, 20 + (itemCount * 36.5) + 8);
            const spaceBelow = viewportHeight - rect.bottom;
            
            let top = rect.bottom + 8;
            if (spaceBelow < estimatedMenuHeight + 16 && rect.top > estimatedMenuHeight + 16) {
              top = rect.top - estimatedMenuHeight - 8;
            }

            setMenuPosition({
              top: top,
              left: rect.left,
            });
            setSearchQuery(query);
            setMenuMode("slash");
            setMenuOpen(true);
            setSelectedIndex(prev => prev >= matching.length ? 0 : prev);
          } else {
            setMenuOpen(false);
          }
        }
      } else {
        setMenuOpen(false);
      }
    } else {
      setMenuOpen(false);
    }
  };

  const executeCommand = (cmd: SlashCommandItem) => {
    if (!editor) return;
    
    const { selection } = editor.state;
    const { $from } = selection;
    
    const queryLength = searchQuery.length;
    editor
      .chain()
      .focus()
      .deleteRange({ from: $from.pos - 1 - queryLength, to: $from.pos })
      .run();
    
    cmd.action(editor);
    setMenuOpen(false);
  };

  const executeUserSelect = (user: { id: string; username: string }) => {
    if (!editor) return;
    
    const { selection } = editor.state;
    const { $from } = selection;
    
    const queryLength = searchQuery.length;
    editor
      .chain()
      .focus()
      .deleteRange({ from: $from.pos - 1 - queryLength, to: $from.pos })
      .insertContent(`@${user.username} `)
      .run();
    setMenuOpen(false);
  };

  // Keep the ref up to date on every render
  menuStateRef.current = {
    menuOpen,
    menuMode,
    selectedIndex,
    filteredCommands,
    filteredUsers,
    executeCommand,
    executeUserSelect
  };

  // Scroll selected autocomplete menu item into view automatically
  useEffect(() => {
    if (menuOpen) {
      const selectedEl = document.getElementById(`slash-menu-item-${selectedIndex}`);
      const container = document.getElementById("slash-menu-container");
      if (selectedEl && container) {
        selectedEl.scrollIntoView({ block: "nearest", behavior: "auto" });
      }
    }
  }, [selectedIndex, menuOpen]);

  const handleInsertTable = (rows: number, cols: number, withHeaderRow: boolean) => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow }).run();
  };

  const LOREM_PARAGRAPHS = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin elementum metus a ipsum imperdiet, sit amet convallis ipsum dictum. Ut ac metus id mi sodales consequat a a felis. Praesent sit amet facilisis lectus. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Vestibulum sed tristique tellus, vel egestas massa. In cursus nunc vitae scelerisque maximus.",
    "Nullam cursus lacus quis leo facilisis, a consequat diam cursus. Integer a purus vel ex hendrerit interdum. Phasellus porta leo ut egestas volutpat. Phasellus ut convallis arcu. Duis quis nisl id leo scelerisque bibendum. Praesent eget urna vel elit aliquet congue rhoncus id erat. Quisque porta nunc id tortor tempor convallis.",
    "Duis elementum accumsan nulla sed tempus. Aliquam nec arcu sodales, pretium ex eget, iaculis erat. Curabitur vel sodales magna, quis tempus elit. Suspendisse non sapien sed urna interdum euismod ac non nibh. Praesent non dictum dolor. Morbi a metus congue, accumsan nunc ut, pretium urna. Pellentesque at sem sem. Cras convallis ipsum vel tellus lacinia dictum.",
    "Maecenas id ex efficitur, iaculis ante a, euismod dolor. Aliquam pulvinar est vel tristique egestas. Pellentesque sodales volutpat arcu sed feugiat. Ut et felis eget sapien pretium tristique eu nec lectus. Mauris non tincidunt massa. Proin quis sapien varius, accumsan diam a, congue elit. Donec et sem eget lacus tempus varius.",
    "Sed tristique, leo id rhoncus convallis, lorem felis sodales leo, sed vestibulum nisl erat ut neque. Suspendisse eget elit vitae nisl hendrerit laoreet. Fusce sed finibus mauris. Cras sollicitudin tincidunt turpis vel elementum. Aliquam erat volutpat. Nam nec urna vel tellus dictum ultrices et et lectus. Curabitur a tempor leo. Sed nec ipsum sed justo consequat commodo nec id elit."
  ];

  const insertLoremIpsum = (count: number) => {
    if (!editor) return;
    const contentToInsert = LOREM_PARAGRAPHS.slice(0, count).map(text => ({
      type: "paragraph",
      content: [{ type: "text", text }]
    }));
    editor.chain().focus().insertContent(contentToInsert).run();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = e.target.value;
    setTitle(nextTitle);
    if (nextTitle.trim() !== "") {
      lastNonEmptyTitle.current = nextTitle;
    }
    saveDocument(nextTitle);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (editor) {
        editor.commands.focus("start");
      }
    }
  };

  const loadVersions = () => {
    if (!activeDocId) return;
    setLoadingVersions(true);
    fetchVersions(activeDocId)
      .then((data) => {
        setVersions(data || []);
      })
      .catch((err) => console.error("Error loading versions:", err))
      .finally(() => setLoadingVersions(false));
  };

  const handleToggleHistory = () => {
    const nextState = !historyOpen;
    setHistoryOpen(nextState);
    if (nextState) {
      loadVersions();
    } else {
      setPreviewVersion(null);
    }
  };

  const handleRestoreVersion = async (version: DocumentVersion) => {
    if (!activeDocId) return;
    try {
      const restoredDoc = await restoreVersion(activeDocId, version.id);
      if (editor && !editor.isDestroyed) {
        try {
          editor.commands.setContent(JSON.parse(restoredDoc.content));
        } catch {
          editor.commands.setContent(restoredDoc.content);
        }
      }
      setPreviewVersion(null);
      setHistoryOpen(false);
    } catch (err) {
      console.error("Failed to restore version:", err);
      alert("Failed to restore version. Please try again.");
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDocId || !milestoneSummary.trim()) return;
    setIsSavingMilestone(true);
    try {
      await createMilestone(activeDocId, milestoneSummary);
      setMilestoneSummary("");
      loadVersions();
    } catch (err) {
      console.error("Failed to create milestone:", err);
      alert("Failed to create milestone checkpoint.");
    } finally {
      setIsSavingMilestone(false);
    }
  };

  return (
    <Box 
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
        position: "relative",
        px: 0,
        pt: 0,
        pb: 0,
        backgroundColor: "background.default",
      }}
      className="scrollbar-thin"
    >
      {/* Decorative Blur Backgrounds */}
      <div className="accent-glow-purple" style={{ position: "absolute", right: "40px", top: "40px" }} />
      <div className="accent-glow-blue" style={{ position: "absolute", left: "80px", bottom: "40px" }} />

      {/* Editor Container Paper */}
      <Paper
        elevation={0}
        className="glass-editor"
        sx={{
          maxWidth: "none",
          width: "100%",
          mx: 0,
          mt: 0,
          mb: 0,
          p: 0,
          minHeight: "100%",
          borderRadius: 0,
          boxShadow: "none",
          border: "none",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 1,
          flexShrink: 0, // Prevent the paper card from shrinking under parent flex-height constraints
        }}
      >
        {/* Preview Banner */}
        {previewVersion && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 2,
              mx: { xs: 2, sm: 3, md: 4 },
              mt: 2,
              mb: 2,
              borderRadius: "8px",
              backgroundColor: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              color: "#f59e0b",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Clock size={16} />
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12.5px", fontFamily: '"Outfit", sans-serif' }}>
                Previewing Version {previewVersion.versionNumber} - "{previewVersion.changeSummary || "Auto-saved snapshot"}" (Created {new Date(previewVersion.createdAt).toLocaleString()} by {previewVersion.createdBy || "Anonymous"})
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                color="warning"
                size="small"
                onClick={() => handleRestoreVersion(previewVersion)}
                sx={{
                  fontSize: "10px",
                  fontWeight: 700,
                  bgcolor: "#d97706",
                  color: "#ffffff",
                  "&:hover": { bgcolor: "#b45309" }
                }}
              >
                Restore
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={() => setPreviewVersion(null)}
                sx={{
                  fontSize: "10px",
                  fontWeight: 600,
                  borderColor: "rgba(245, 158, 11, 0.4)",
                  "&:hover": { borderColor: "#f59e0b" }
                }}
              >
                Exit Preview
              </Button>
            </Box>
          </Box>
        )}

        {/* Top Header Actions Bar */}
        {editor && !previewVersion && (
          <Box sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "text.secondary",
            px: { xs: 2, sm: 3, md: 4 },
            pt: 2,
            pb: 1.5,
            borderBottom: "1px solid var(--border-color)",
            borderColor: "rgba(255, 255, 255, 0.04)",
          }}>
            {/* Left: Breadcrumbs in Readonly, Mode/Save in Edit */}
            {!isEditing ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", color: "text.secondary", userSelect: "none" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
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
                  {breadcrumbsList.map((crumb, idx) => (
                    <React.Fragment key={crumb.id}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontSize: "11px", 
                          color: idx === breadcrumbsList.length - 1 ? "text.primary" : "text.secondary", 
                          fontWeight: idx === breadcrumbsList.length - 1 ? 600 : 500,
                          letterSpacing: "0.03em"
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
                  <Box sx={{ display: "flex", alignItems: "center", ml: 2, borderLeft: "1px solid rgba(255,255,255,0.08)", pl: 2 }}>
                    <Tooltip title="Jump to attachments at bottom">
                      <Button
                        size="small"
                        startIcon={<Paperclip size={12} />}
                        onClick={() => {
                          document.getElementById("page-attachments-section")?.scrollIntoView({ behavior: "smooth" });
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
                            backgroundColor: "rgba(139, 92, 246, 0.12)"
                          }
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
                    backgroundColor: "rgba(139, 92, 246, 0.12)",
                    color: "var(--primary-color)",
                    border: "1px solid rgba(139, 92, 246, 0.25)",
                    borderColor: "rgba(139, 92, 246, 0.25)",
                    borderRadius: "4px",
                  }}
                />
                
                {attachments.length > 0 && (
                  <Tooltip title="Jump to attachments at bottom">
                    <Button
                      size="small"
                      startIcon={<Paperclip size={12} />}
                      onClick={() => {
                        document.getElementById("page-attachments-section")?.scrollIntoView({ behavior: "smooth" });
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
                          backgroundColor: "rgba(139, 92, 246, 0.12)"
                        }
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
                      <CircularProgress size={10} sx={{ color: "text.secondary", opacity: 0.7 }} thickness={6} />
                      <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.6, fontSize: "11px", fontWeight: 500, userSelect: "none" }}>
                        Saving...
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Cloud size={12} style={{ color: "rgba(16, 185, 129, 0.6)" }} />
                      <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.6, fontSize: "11px", fontWeight: 500, display: "flex", alignItems: "center", gap: 0.25, userSelect: "none" }}>
                        Saved <Check size={10} style={{ color: "rgba(16, 185, 129, 0.7)" }} />
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>
            )}

            {/* Right: Actions Toolbar */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              {/* Active Users */}
              {uniqueActiveUsers.length > 0 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 1 }}>
                  {uniqueActiveUsers.map((user) => {
                    const initials = user.username
                      ? user.username
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()
                      : "??";
                    return (
                      <Tooltip key={user.userId} title={`${user.username} (Online)`} arrow>
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
              <Tooltip title={isFavorite ? "Remove from Favorites" : "Add to Favorites"} arrow>
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
                    color: isFavorite ? "#fbbf24" : "text.secondary",
                    "&:hover": { color: "#fbbf24", backgroundColor: "action.hover" }
                  }}
                >
                  <Star size={14} fill={isFavorite ? "#fbbf24" : "none"} />
                </IconButton>
              </Tooltip>

              {/* Developer Mode: View JSON Button */}
              {developerMode && (
                <Tooltip title="View JSON Representation" arrow>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Code size={13} />}
                    onClick={() => setJsonDialogOpen(true)}
                    sx={{
                      fontSize: "11px",
                      fontWeight: 600,
                      fontFamily: '"Outfit", sans-serif',
                      height: 26,
                      px: 1.25,
                      borderRadius: "5px",
                      borderColor: "rgba(255, 255, 255, 0.08)",
                      color: "text.secondary",
                      textTransform: "none",
                      "&:hover": {
                        borderColor: "rgba(255, 255, 255, 0.15)",
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                      }
                    }}
                  >
                    View JSON
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
                      startIcon={<BarChart2 size={13} />}
                      onClick={() => setAnalyticsOpen(true)}
                      sx={{
                        fontSize: "11px",
                        fontWeight: 600,
                        fontFamily: '"Outfit", sans-serif',
                        height: 26,
                        px: 1.25,
                        borderRadius: "5px",
                        borderColor: "rgba(255, 255, 255, 0.08)",
                        color: "text.secondary",
                        textTransform: "none",
                        "&:hover": {
                          borderColor: "rgba(255, 255, 255, 0.15)",
                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                        }
                      }}
                    >
                      Analytics
                    </Button>
                  </Tooltip>

                  {/* History Button */}
                  <Tooltip title="Version History" arrow>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<History size={13} />}
                      onClick={handleToggleHistory}
                      sx={{
                        fontSize: "11px",
                        fontWeight: 600,
                        fontFamily: '"Outfit", sans-serif',
                        height: 26,
                        px: 1.25,
                        borderRadius: "5px",
                        borderColor: "rgba(255, 255, 255, 0.08)",
                        color: "text.secondary",
                        textTransform: "none",
                        "&:hover": {
                          borderColor: "rgba(255, 255, 255, 0.15)",
                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                        }
                      }}
                    >
                      History
                    </Button>
                  </Tooltip>

                  <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 14, alignSelf: "center", borderColor: "rgba(255,255,255,0.06)" }} />

                  {/* Edit Button */}
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Edit size={12} />}
                    disabled={!!deletedAt}
                    onClick={() => setIsEditing(true)}
                    sx={{
                      fontSize: "11px",
                      fontWeight: 600,
                      fontFamily: '"Outfit", sans-serif',
                      height: 26,
                      px: 1.5,
                      borderRadius: "5px",
                      backgroundColor: "var(--primary-color)",
                      color: "#ffffff",
                      boxShadow: "none",
                      textTransform: "none",
                      "&:hover": {
                        backgroundColor: "var(--primary-dark)",
                        boxShadow: "none"
                      }
                    }}
                  >
                    Edit
                  </Button>
                </>
              ) : (
                <>
                  {/* History Button (icon only in edit mode to save space) */}
                  <Tooltip title="Version History" arrow>
                    <IconButton
                      size="small"
                      onClick={handleToggleHistory}
                      sx={{ 
                        color: historyOpen ? "primary.light" : "text.secondary",
                        "&:hover": { color: "primary.light", backgroundColor: "action.hover" }
                      }}
                    >
                      <History size={14} />
                    </IconButton>
                  </Tooltip>

                  <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 14, alignSelf: "center", borderColor: "rgba(255,255,255,0.06)" }} />

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
                      px: 1.5,
                      borderRadius: "5px",
                      backgroundColor: "rgba(16, 185, 129, 0.12)",
                      color: "#10b981",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      borderColor: "rgba(16, 185, 129, 0.25)",
                      boxShadow: "none",
                      textTransform: "none",
                      "&:hover": {
                        backgroundColor: "rgba(16, 185, 129, 0.2)",
                        boxShadow: "none"
                      }
                    }}
                  >
                    Done
                  </Button>
                </>
              )}

              {/* More Actions Menu */}
              {activeDocId && (
                <>
                  <Tooltip title={deletedAt ? "Actions disabled for deleted page" : "More Actions"} arrow>
                    <IconButton
                      size="small"
                      disabled={!!deletedAt}
                      onClick={handleOpenMoreMenu}
                      sx={{ 
                        color: "text.secondary",
                        width: 26,
                        height: 26,
                        "&:hover": { backgroundColor: "action.hover" }
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
                          width: 150,
                          mt: 0.5,
                        }
                      }
                    }}
                  >
                    <MenuItem
                      onClick={() => {
                        handleCloseMoreMenu();
                        if (onNavigateToAudit) {
                          onNavigateToAudit();
                        }
                      }}
                      sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}
                    >
                      <ListItemIcon sx={{ minWidth: 24 }}><Users size={12} /></ListItemIcon>
                      <ListItemText primary={<Typography sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Viewers & Editors</Typography>} />
                    </MenuItem>
                    <MenuItem onClick={handleTriggerMove} sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>
                      <ListItemIcon sx={{ minWidth: 24 }}><FolderInput size={12} /></ListItemIcon>
                      <ListItemText primary={<Typography sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>Move Page</Typography>} />
                    </MenuItem>
                    <MenuItem onClick={handleTriggerDelete} sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif', color: "error.main" }}>
                      <ListItemIcon sx={{ minWidth: 24, color: "error.main" }}><Trash2 size={12} /></ListItemIcon>
                      <ListItemText primary={<Typography sx={{ fontSize: "12px", fontFamily: '"Outfit", sans-serif', color: "error.main" }}>Delete Page</Typography>} />
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Box>
          </Box>
        )}

        {/* Formatting Quick Toolbar */}
        {editor && isEditing && !previewVersion && (
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            flexWrap: "wrap",
            gap: 0.75, 
            color: "text.secondary",
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: "var(--panel-color)",
            px: { xs: 2, sm: 3, md: 4 },
            pt: 1,
            pb: 1,
            borderBottom: "1px solid var(--border-color)",
            pointerEvents: isTitleFocused ? "none" : "auto",
            opacity: isTitleFocused ? 0.35 : 1,
            transition: "all 0.15s ease",
          }}>
            <Select
              value={getHeadingValue()}
              onChange={handleHeadingChange}
              size="small"
              variant="outlined"
              sx={{
                height: 32,
                minWidth: 120,
                fontSize: "13px",
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 500,
                color: "text.primary",
                backgroundColor: "rgba(255, 255, 255, 0.01)",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--border-color)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--primary-color)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--primary-color)",
                },
                "& .MuiSelect-select": {
                  py: 0.5,
                  px: 1.5,
                  display: "flex",
                  alignItems: "center",
                }
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      backgroundColor: "var(--panel-color)",
                      border: "1px solid var(--border-color)",
                      boxShadow: "var(--shadow-premium)",
                      backgroundImage: "none",
                      "& .MuiMenuItem-root": {
                        fontSize: "13px",
                        fontFamily: '"Outfit", sans-serif',
                        "&:hover": {
                          backgroundColor: "rgba(139, 92, 246, 0.08)",
                        },
                        "&.Mui-selected": {
                          backgroundColor: "rgba(139, 92, 246, 0.12)",
                          color: "var(--primary-color)",
                          "&:hover": {
                            backgroundColor: "rgba(139, 92, 246, 0.18)",
                          }
                        }
                      }
                    }
                  }
                }
              } as any}
            >
              <MenuItem value="paragraph">Normal</MenuItem>
              <MenuItem value="h1">Heading 1</MenuItem>
              <MenuItem value="h2">Heading 2</MenuItem>
              <MenuItem value="h3">Heading 3</MenuItem>
              <MenuItem value="h4">Heading 4</MenuItem>
              <MenuItem value="h5">Heading 5</MenuItem>
              <MenuItem value="h6">Heading 6</MenuItem>
              <MenuItem value="h7">Heading 7</MenuItem>
              <MenuItem value="h8">Heading 8</MenuItem>
            </Select>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 16, alignSelf: "center" }} />

            {/* Typography Group */}
            <Tooltip title="Bold" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleBold().run()}
                sx={{ 
                  color: editor.isActive("bold") ? "primary.light" : "inherit", 
                  backgroundColor: editor.isActive("bold") ? "rgba(139, 92, 246, 0.1)" : "transparent"
                }}
              >
                <Bold size={15} />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Italic" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                sx={{ 
                  color: editor.isActive("italic") ? "primary.light" : "inherit", 
                  backgroundColor: editor.isActive("italic") ? "rgba(139, 92, 246, 0.1)" : "transparent"
                }}
              >
                <Italic size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Strikethrough" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                sx={{ 
                  color: editor.isActive("strike") ? "primary.light" : "inherit", 
                  backgroundColor: editor.isActive("strike") ? "rgba(139, 92, 246, 0.1)" : "transparent"
                }}
              >
                <Strikethrough size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Inline Code" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleCode().run()}
                sx={{ 
                  color: editor.isActive("code") ? "primary.light" : "inherit", 
                  backgroundColor: editor.isActive("code") ? "rgba(139, 92, 246, 0.1)" : "transparent"
                }}
              >
                <Code size={15} />
              </IconButton>
            </Tooltip>



            <Tooltip title="Code Block" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                sx={{ 
                  color: editor.isActive("codeBlock") ? "primary.light" : "inherit", 
                  backgroundColor: editor.isActive("codeBlock") ? "rgba(139, 92, 246, 0.1)" : "transparent"
                }}
              >
                <SquareTerminal size={15} />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 16, alignSelf: "center" }} />

            {/* Alignment Group */}
            <Tooltip title="Align Left" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
                sx={{ 
                  color: editor.isActive({ textAlign: "left" }) ? "primary.light" : "inherit", 
                  backgroundColor: editor.isActive({ textAlign: "left" }) ? "rgba(139, 92, 246, 0.1)" : "transparent"
                }}
              >
                <AlignLeft size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Align Center" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
                sx={{ 
                  color: editor.isActive({ textAlign: "center" }) ? "primary.light" : "inherit", 
                  backgroundColor: editor.isActive({ textAlign: "center" }) ? "rgba(139, 92, 246, 0.1)" : "transparent"
                }}
              >
                <AlignCenter size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Align Right" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
                sx={{ 
                  color: editor.isActive({ textAlign: "right" }) ? "primary.light" : "inherit", 
                  backgroundColor: editor.isActive({ textAlign: "right" }) ? "rgba(139, 92, 246, 0.1)" : "transparent"
                }}
              >
                <AlignRight size={15} />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 16, alignSelf: "center" }} />

            {/* Lists */}
            <Tooltip title="Bullet List" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                sx={{ 
                  color: editor.isActive("bulletList") ? "primary.light" : "inherit", 
                  backgroundColor: editor.isActive("bulletList") ? "rgba(139, 92, 246, 0.1)" : "transparent"
                }}
              >
                <List size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Numbered List" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                sx={{ 
                  color: editor.isActive("orderedList") ? "primary.light" : "inherit", 
                  backgroundColor: editor.isActive("orderedList") ? "rgba(139, 92, 246, 0.1)" : "transparent"
                }}
              >
                <ListOrdered size={15} />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 16, alignSelf: "center" }} />

            {/* Insert Complex Components */}
            <Tooltip title="Insert Table" arrow>
              <IconButton
                size="small"
                onClick={() => setTableCreatorOpen(true)}
                sx={{ 
                  color: "inherit",
                  "&:hover": { color: "primary.light", backgroundColor: "action.hover" }
                }}
              >
                <Grid3X3 size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Insert Column Layout" arrow>
              <IconButton
                size="small"
                onClick={(e) => setLayoutMenuAnchor(e.currentTarget)}
                sx={{ 
                  color: "inherit",
                  "&:hover": { color: "primary.light", backgroundColor: "action.hover" }
                }}
              >
                <Layout size={15} />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={layoutMenuAnchor}
              open={Boolean(layoutMenuAnchor)}
              onClose={() => setLayoutMenuAnchor(null)}
              slotProps={{
                paper: {
                  sx: {
                    backgroundColor: "background.paper",
                    border: "1px solid var(--border-color)",
                    color: "text.primary",
                  },
                },
              }}
            >
              <MenuItem
                onClick={() => {
                  const pos = editor.state.selection.from;
                  editor.chain()
                    .focus()
                    .insertContent({
                      type: "layoutSection",
                      attrs: { layout: "twocol" },
                      content: [
                        { type: "layoutColumn", content: [{ type: "paragraph" }] },
                        { type: "layoutColumn", content: [{ type: "paragraph" }] }
                      ]
                    })
                    .setTextSelection(pos + 3)
                    .run();
                  setLayoutMenuAnchor(null);
                }}
              >
                <ListItemIcon sx={{ color: "text.secondary" }}><Columns2 size={14} /></ListItemIcon>
                <ListItemText primary={<Typography variant="body2">2 Columns (50/50)</Typography>} />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  const pos = editor.state.selection.from;
                  editor.chain()
                    .focus()
                    .insertContent({
                      type: "layoutSection",
                      attrs: { layout: "threecol" },
                      content: [
                        { type: "layoutColumn", content: [{ type: "paragraph" }] },
                        { type: "layoutColumn", content: [{ type: "paragraph" }] },
                        { type: "layoutColumn", content: [{ type: "paragraph" }] }
                      ]
                    })
                    .setTextSelection(pos + 3)
                    .run();
                  setLayoutMenuAnchor(null);
                }}
              >
                <ListItemIcon sx={{ color: "text.secondary" }}><Columns3 size={14} /></ListItemIcon>
                <ListItemText primary={<Typography variant="body2">3 Columns</Typography>} />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  const pos = editor.state.selection.from;
                  editor.chain()
                    .focus()
                    .insertContent({
                      type: "layoutSection",
                      attrs: { layout: "asymmetric-left" },
                      content: [
                        { type: "layoutColumn", content: [{ type: "paragraph" }] },
                        { type: "layoutColumn", content: [{ type: "paragraph" }] }
                      ]
                    })
                    .setTextSelection(pos + 3)
                    .run();
                  setLayoutMenuAnchor(null);
                }}
              >
                <ListItemIcon sx={{ color: "text.secondary" }}><Layout size={14} /></ListItemIcon>
                <ListItemText primary={<Typography variant="body2">Columns (70/30)</Typography>} />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  const pos = editor.state.selection.from;
                  editor.chain()
                    .focus()
                    .insertContent({
                      type: "layoutSection",
                      attrs: { layout: "asymmetric-right" },
                      content: [
                        { type: "layoutColumn", content: [{ type: "paragraph" }] },
                        { type: "layoutColumn", content: [{ type: "paragraph" }] }
                      ]
                    })
                    .setTextSelection(pos + 3)
                    .run();
                  setLayoutMenuAnchor(null);
                }}
              >
                <ListItemIcon sx={{ color: "text.secondary" }}><Layout size={14} style={{ transform: "scaleX(-1)" }} /></ListItemIcon>
                <ListItemText primary={<Typography variant="body2">Columns (30/70)</Typography>} />
              </MenuItem>
            </Menu>

            <Tooltip title="Ask AI Assistant" arrow>
              <IconButton
                size="small"
                onClick={() => setAiPromptOpen(true)}
                sx={{ 
                  color: "inherit",
                  "&:hover": { color: "primary.light", backgroundColor: "action.hover" }
                }}
              >
                <Sparkles size={15} />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 16, alignSelf: "center" }} />

            {/* Dynamically Render Favorited Macros */}
            <Box sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              flexWrap: "nowrap",
              overflow: "hidden",
              flexShrink: 1,
            }}>
              {favorites.map((favId) => {
                const cmd = commands.find(c => c.id === favId);
                if (!cmd) return null;
                
                const isActive = () => {
                  if (cmd.id === "bullet") return editor.isActive("bulletList");
                  if (cmd.id === "number") return editor.isActive("orderedList");
                  if (cmd.id === "code") return editor.isActive("codeBlock");
                  if (cmd.id === "task-list") return editor.isActive("taskList");
                  return false;
                };

                return (
                  <Tooltip key={cmd.id} title={cmd.label} arrow>
                    <IconButton
                      size="small"
                      onClick={() => cmd.action(editor)}
                      sx={{ 
                        color: isActive() ? "primary.light" : "inherit",
                        backgroundColor: isActive() ? "rgba(139, 92, 246, 0.1)" : "transparent",
                        flexShrink: 0,
                        "&:hover": { color: "primary.light", backgroundColor: "action.hover" }
                      }}
                    >
                      {cmd.icon}
                    </IconButton>
                  </Tooltip>
                );
              })}
            </Box>

            {/* Always-visible Plus Button to choose macros */}
            <Tooltip title="Add macro or block..." arrow>
              <IconButton
                size="small"
                onClick={() => {
                  setMacroSearchQuery("");
                  setMacroSelectorOpen(true);
                }}
                sx={{ 
                  color: "primary.light",
                  backgroundColor: "rgba(139, 92, 246, 0.08)",
                  border: "1px dashed rgba(139, 92, 246, 0.3)",
                  flexShrink: 0,
                  ml: 0.5,
                  "&:hover": { 
                    backgroundColor: "rgba(139, 92, 246, 0.15)",
                    borderColor: "var(--primary-color)" 
                  }
                }}
              >
                <Plus size={15} />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Document Content Area */}
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 3, display: "flex", flexDirection: "column", flex: 1, gap: 2 }}>
          {deletedAt && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 1,
                borderRadius: "8px",
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <AlertCircle size={20} style={{ color: "var(--error-color, #ef4444)", flexShrink: 0 }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary", fontSize: "14px", fontFamily: '"Outfit", sans-serif' }}>
                    This page is in the Trash Bin
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "12.5px" }}>
                    It was deleted on {new Date(deletedAt).toLocaleDateString()}. You cannot edit this page until it is restored.
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" }, justifyContent: { xs: "flex-end", sm: "flex-start" } }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onRestore}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    fontFamily: '"Outfit", sans-serif',
                    color: "var(--primary-color, #8b5cf6)",
                    borderColor: "var(--primary-color, #8b5cf6)",
                    "&:hover": {
                      borderColor: "var(--primary-dark)",
                      backgroundColor: "rgba(139, 92, 246, 0.04)",
                    }
                  }}
                >
                  Restore Page
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="error"
                  onClick={onDeletePermanently}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    fontFamily: '"Outfit", sans-serif',
                    boxShadow: "none",
                    "&:hover": { boxShadow: "none" }
                  }}
                >
                  Delete Permanently
                </Button>
              </Box>
            </Paper>
          )}

          {/* Title and Metadata group */}
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <InputBase
              value={previewVersion ? `${title} (Version ${previewVersion.versionNumber} Preview)` : title}
              readOnly={!isEditing || !!previewVersion}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              onFocus={() => setIsTitleFocused(true)}
              onBlur={() => setIsTitleFocused(false)}
              placeholder="Untitled Document"
              fullWidth
              sx={{
                color: "text.primary",
                fontSize: { xs: "28px", md: "36px" },
                fontWeight: 800,
                mb: 0,
                "& input": { p: 0 },
                "& input::placeholder": { color: "text.disabled", opacity: 0.5 },
                fontFamily: '"Outfit", sans-serif',
                letterSpacing: "-0.02em"
              }}
            />

            {/* Metadata line in read-only mode */}
            {(!isEditing || !!previewVersion) && (
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  mt: 0.5,
                  mb: 0.5,
                  fontSize: "11px",
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 500,
                  opacity: 0.75
                }}
              >
                Created by {createdBy || "System"}, last updated on {formatDate(updatedAt || createdAt)} by {updatedBy || "System"}
              </Typography>
            )}
          </Box>

          {/* Editor Body */}
          <Box sx={{ flex: 1 }}>
            <DocumentContext.Provider value={{ documents, activeDocId, onSelectDoc: onSelectDoc || (() => {}) }}>
              <EditorContent editor={previewVersion ? previewEditor : editor} />
            </DocumentContext.Provider>
          </Box>

          {/* Page Attachments Section */}
          {activeDocId && ((isEditing && !deletedAt) || attachments.length > 0) && (
            <Box id="page-attachments-section">
              <PageAttachments
                docId={activeDocId}
                authToken={authToken}
                isEditable={isEditing && !deletedAt}
                attachments={attachments}
                onRefresh={loadAttachments}
                loading={attachmentsLoading}
              />
            </Box>
          )}

          {/* Page Comments Section */}
          {activeDocId && (
            <PageComments 
              docId={activeDocId} 
              authToken={authToken} 
              readOnly={!!deletedAt} 
            />
          )}
        </Box>
      </Paper>

      {/* Move Page Dialog */}
      {moveDialogOpen && onMoveDoc && (
        <MovePageDialog
          open={moveDialogOpen}
          onClose={() => setMoveDialogOpen(false)}
          documentId={activeDocId || ""}
          documentTitle={title}
          documents={documents}
          onConfirm={onMoveDoc}
        />
      )}

      {/* Caret-Positioned Autocomplete Popup Menu */}
      {menuOpen && ((menuMode === "slash" && filteredCommands.length > 0) || (menuMode === "mention" && filteredUsers.length > 0)) && (
        <ClickAwayListener onClickAway={() => setMenuOpen(false)}>
          <Paper
            id="slash-menu-container"
            sx={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              zIndex: 1300,
              width: 260,
              maxHeight: 280,
              overflowY: "auto",
              backgroundColor: "background.paper",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--border-color)",
              borderRadius: 2,
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.2)",
              py: 0.5,
            }}
            className="scrollbar-thin"
          >
            {menuMode === "slash" ? (
              <>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    px: 2, 
                    py: 1, 
                    display: "block", 
                    fontWeight: 700, 
                    letterSpacing: "0.05em",
                    color: "text.disabled",
                    textTransform: "uppercase",
                    fontSize: "9px"
                  }}
                >
                  Basic Blocks & Macros
                </Typography>
                
                {filteredCommands.map((cmd, idx) => (
                  <Box
                    key={cmd.id}
                    id={`slash-menu-item-${idx}`}
                    onClick={() => executeCommand(cmd)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      py: 0.75,
                      px: 2,
                      mx: 0.5,
                      my: 0.25,
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: idx === selectedIndex ? "color-mix(in srgb, var(--primary-color) 12%, transparent)" : "transparent",
                      color: idx === selectedIndex ? "text.primary" : "text.secondary",
                      "&:hover": {
                        backgroundColor: idx === selectedIndex ? "color-mix(in srgb, var(--primary-color) 18%, transparent)" : "action.hover",
                        color: "text.primary"
                      },
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Box sx={{ 
                      backgroundColor: "var(--bg-color)", 
                      border: "1px solid var(--border-color)",
                      p: 0.75, 
                      borderRadius: 1.5, 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      color: idx === selectedIndex ? "primary.light" : "inherit"
                    }}>
                      {cmd.icon}
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12.5px" }}>
                        {cmd.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px" }} noWrap>
                        {cmd.description}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </>
            ) : (
              <>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    px: 2, 
                    py: 1, 
                    display: "block", 
                    fontWeight: 700, 
                    letterSpacing: "0.05em",
                    color: "text.disabled",
                    textTransform: "uppercase",
                    fontSize: "9px"
                  }}
                >
                  Team Members
                </Typography>
                
                {filteredUsers.map((user, idx) => (
                  <Box
                    key={user.id}
                    id={`slash-menu-item-${idx}`}
                    onClick={() => executeUserSelect(user)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      py: 0.75,
                      px: 2,
                      mx: 0.5,
                      my: 0.25,
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: idx === selectedIndex ? "color-mix(in srgb, var(--primary-color) 12%, transparent)" : "transparent",
                      color: idx === selectedIndex ? "text.primary" : "text.secondary",
                      "&:hover": {
                        backgroundColor: idx === selectedIndex ? "color-mix(in srgb, var(--primary-color) 18%, transparent)" : "action.hover",
                        color: "text.primary"
                      },
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Users size={15} style={{ color: idx === selectedIndex ? "var(--primary-color)" : "inherit" }} />
                    <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12.5px" }}>
                        @{user.username}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </>
            )}
          </Paper>
        </ClickAwayListener>
      )}

      {/* Macro Chooser Dialog */}
      <Dialog
        open={macroSelectorOpen}
        onClose={() => setMacroSelectorOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            className: "glass-card",
            sx: {
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--panel-color)",
              color: "var(--text-primary)",
              borderRadius: "16px",
              boxShadow: "var(--shadow-premium)",
              overflow: "hidden",
            }
          }
        }}
      >
        <DialogTitle sx={{ 
          fontFamily: '"Outfit", sans-serif', 
          fontWeight: 800, 
          pb: 1.5,
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: '"Outfit", sans-serif' }}>
            Insert Macro or Block
          </Typography>
          <IconButton 
            size="small" 
            onClick={() => setMacroSelectorOpen(false)}
            sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
          >
            <X size={18} />
          </IconButton>
        </DialogTitle>

        {/* Search Bar at the Top */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 3,
            py: 1.5,
            borderBottom: "1px solid var(--border-color)",
            backgroundColor: "rgba(0, 0, 0, 0.1)",
          }}
        >
          <Search size={16} style={{ color: "var(--primary-color)" }} />
          <InputBase
            value={macroSearchQuery}
            onChange={(e) => setMacroSearchQuery(e.target.value)}
            placeholder="Search macros by name or description..."
            fullWidth
            sx={{
              color: "text.primary",
              fontSize: "13.5px",
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 500,
              "& input::placeholder": { color: "text.disabled", opacity: 0.6 },
            }}
          />
          {macroSearchQuery && (
            <IconButton
              size="small"
              onClick={() => setMacroSearchQuery("")}
              sx={{ p: 0.25, color: "text.secondary" }}
            >
              <X size={14} />
            </IconButton>
          )}
        </Box>

        <DialogContent sx={{ p: 0, height: 480, display: "flex" }}>
          {/* Vertical Category Tabs */}
          {!macroSearchQuery && (
            <Tabs
            orientation="vertical"
            value={activeCategoryTab}
            onChange={(e, val) => setActiveCategoryTab(val)}
            variant="scrollable"
            sx={{
              borderRight: "1px solid var(--border-color)",
              minWidth: 180,
              backgroundColor: "rgba(255, 255, 255, 0.01)",
              "& .MuiTabs-indicator": {
                left: 0,
                right: "auto",
                backgroundColor: "var(--primary-color)",
                width: 3,
              },
              "& .MuiTab-root": {
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 600,
                fontSize: "13px",
                textTransform: "none",
                alignItems: "flex-start",
                textAlign: "left",
                py: 2,
                px: 2.5,
                color: "text.secondary",
                minHeight: 48,
                justifyContent: "flex-start",
                borderBottom: "1px solid rgba(255, 255, 255, 0.02)",
                "&.Mui-selected": {
                  color: "var(--primary-color)",
                  backgroundColor: "rgba(139, 92, 246, 0.05)",
                },
                "&:hover": {
                  color: "text.primary",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                }
              }
            }}
          >
            <Tab label="Text & Lists" value="text" icon={<Type size={16} />} iconPosition="start" />
            <Tab label="Layout & Media" value="layout" icon={<Columns2 size={16} />} iconPosition="start" />
            <Tab label="Callouts & Details" value="callouts" icon={<Info size={16} />} iconPosition="start" />
            <Tab label="Task & Status" value="tasks" icon={<ListTodo size={16} />} iconPosition="start" />
            <Tab label="Advanced Macros" value="advanced" icon={<Layers size={16} />} iconPosition="start" />
          </Tabs>
          )}

          {/* Macro Cards Grid */}
          <Box sx={{ 
            flex: 1, 
            p: 3, 
            overflowY: "auto", 
            display: "grid", 
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            alignContent: "start",
            gap: 1.5,
            backgroundColor: "rgba(0, 0, 0, 0.05)"
          }} className="scrollbar-thin">
            {commands
              .filter(cmd => {
                const matchesSearch = cmd.label.toLowerCase().includes(macroSearchQuery.toLowerCase()) ||
                                      cmd.description.toLowerCase().includes(macroSearchQuery.toLowerCase());
                if (macroSearchQuery) {
                  return matchesSearch;
                }
                return cmd.category === activeCategoryTab;
              })
              .map((cmd) => {
                const isFav = favorites.includes(cmd.id);
                return (
                  <Box
                    key={cmd.id}
                    onClick={() => {
                      cmd.action(editor);
                      setMacroSelectorOpen(false);
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 2,
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--panel-color)",
                      cursor: "pointer",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        borderColor: "var(--primary-color)",
                        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                        transform: "translateY(-1px)",
                        backgroundColor: "rgba(139, 92, 246, 0.02)",
                        "& .macro-icon-box": {
                          backgroundColor: "rgba(139, 92, 246, 0.15)",
                          borderColor: "rgba(139, 92, 246, 0.3)"
                        }
                      }
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
                      {/* Macro Icon Container */}
                      <Box className="macro-icon-box" sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid var(--border-color)",
                        color: "text.primary",
                        transition: "all 0.2s ease"
                      }}>
                        {cmd.icon}
                      </Box>
                      {/* Title & Description Card */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary", fontFamily: '"Outfit", sans-serif', fontSize: "13.5px" }}>
                          {cmd.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "11.5px" }}>
                          {cmd.description}
                        </Typography>
                      </Box>
                    </Box>
                    {/* Star Favorite Toggle */}
                    <Tooltip title={isFav ? "Remove from Favorites" : "Pin to Toolbar Favorites"} arrow>
                      <IconButton
                        size="small"
                        onClick={(e) => toggleFavorite(cmd.id, e)}
                        sx={{
                          color: isFav ? "#fbbf24" : "text.disabled",
                          "&:hover": {
                            color: "#fbbf24",
                            backgroundColor: "rgba(251, 191, 36, 0.08)"
                          }
                        }}
                      >
                        <Star size={16} fill={isFav ? "#fbbf24" : "none"} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              })}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Table Creator Dialog */}
      <TableCreatorDialog
        open={tableCreatorOpen}
        onClose={() => setTableCreatorOpen(false)}
        onSubmit={handleInsertTable}
      />

      {/* Lorem Ipsum Generator Dialog */}
      <Dialog
        open={loremDialogOpen}
        onClose={() => setLoremDialogOpen(false)}
        slotProps={{
          paper: {
            className: "glass-card",
            sx: {
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--panel-color)",
              color: "var(--text-primary)",
              borderRadius: "12px",
              p: 2,
              minWidth: 320,
            }
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, pb: 1 }}>
          Generate Lorem Ipsum
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontFamily: '"Outfit", sans-serif', color: "text.secondary", mb: 3 }}>
            Choose the number of paragraphs to generate and insert at the cursor:
          </DialogContentText>
          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center" }}>
            {[1, 2, 3, 4, 5].map((num) => (
              <Button
                key={num}
                variant="outlined"
                onClick={() => {
                  insertLoremIpsum(num);
                  setLoremDialogOpen(false);
                }}
                sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 600,
                  fontSize: "14px",
                  minWidth: "48px",
                  height: "40px",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)",
                  borderRadius: "8px",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    borderColor: "var(--primary-color)",
                    backgroundColor: "rgba(139, 92, 246, 0.08)",
                    transform: "translateY(-1px)"
                  }
                }}
              >
                {num}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 1 }}>
          <Button 
            onClick={() => setLoremDialogOpen(false)} 
            sx={{ 
              fontFamily: '"Outfit", sans-serif', 
              color: "text.secondary",
              fontWeight: 500,
              fontSize: "12.5px"
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Table Contextual Bubble Toolbar */}
      {editor && !previewVersion && <TableBubbleToolbar editor={editor} />}

      {/* AI Assistant Inline Prompt Bar */}
      {editor && !previewVersion && (
        <AIPromptBar
          editor={editor}
          open={aiPromptOpen}
          onClose={() => setAiPromptOpen(false)}
        />
      )}

      {/* Symbol Picker Popover */}
      {editor && !previewVersion && (
        <Popover
          anchorEl={symbolMenuAnchorEl}
          open={Boolean(symbolMenuAnchorEl)}
          onClose={() => setSymbolMenuAnchorEl(null)}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
          slotProps={{
            paper: {
              className: "glass-card",
              sx: {
                p: 1,
                mt: 0.5,
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--panel-color)",
                color: "text.primary",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                width: 220,
              }
            }
          }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 0.5 }}>
            {[
              "→", "←", "↑", "↓", "↔", "⇒", "⇐", "⇔",
              "≠", "≈", "≤", "≥", "±", "×", "÷", "∞", "∑", "∏", "√", "∂", "∆", "µ", "π", "Ω",
              "¢", "£", "€", "¥", "©", "®", "™", "§", "¶", "•", "✔", "✘", "★", "✰", "✦", "▲", "▼"
            ].map(sym => (
              <IconButton
                key={sym}
                size="small"
                onClick={() => {
                  editor.chain().focus().insertContent(sym).run();
                  setSymbolMenuAnchorEl(null);
                }}
                sx={{
                  fontSize: "13px",
                  p: 0.5,
                  minWidth: 0,
                  color: "text.primary",
                  borderRadius: "4px",
                  "&:hover": { backgroundColor: "rgba(139, 92, 246, 0.15)", color: "var(--primary-color)" }
                }}
              >
                {sym}
              </IconButton>
            ))}
          </Box>
        </Popover>
      )}

      {/* Version History Drawer */}
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
        <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: "text.primary" }}>
            Version History
          </Typography>
          <IconButton onClick={() => handleToggleHistory()} sx={{ color: "text.secondary" }}>
            <X size={16} />
          </IconButton>
        </Box>

        {/* Create Milestone Section */}
        <Box sx={{ p: 2, borderBottom: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: "9px", color: "text.disabled", letterSpacing: "0.05em" }}>
            Create Milestone Checkpoint
          </Typography>
          <Box component="form" onSubmit={handleCreateMilestone} sx={{ display: "flex", gap: 1 }}>
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
                "& input::placeholder": { color: "text.disabled", opacity: 0.6 }
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
                boxShadow: "none"
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
                const formattedDate = new Date(v.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });

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
                      }
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
                        backgroundColor: isLiveChanges ? "#10b981" : (isCurrentPreview ? "var(--primary-color)" : "var(--border-color)"),
                        border: (isLiveChanges || isCurrentPreview) ? "2.5px solid var(--panel-color)" : "1.5px solid var(--panel-color)",
                        boxShadow: isLiveChanges 
                          ? "0 0 0 2px rgba(16, 185, 129, 0.4)" 
                          : (isCurrentPreview ? "0 0 0 2px var(--primary-color)" : "none"),
                        zIndex: 2,
                        animation: isLiveChanges ? "live-pulse 2s infinite" : "none",
                        transition: "all 0.15s ease"
                      }}
                    />

                    {/* Version Card */}
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: "8px",
                        backgroundColor: isCurrentPreview 
                          ? "color-mix(in srgb, var(--primary-color) 8%, transparent)" 
                          : (isLiveChanges ? "rgba(16, 185, 129, 0.04)" : "rgba(255, 255, 255, 0.02)"),
                        border: isCurrentPreview 
                          ? "1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)" 
                          : (isLiveChanges ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid var(--border-color)"),
                        "&:hover": {
                          borderColor: isCurrentPreview 
                            ? "color-mix(in srgb, var(--primary-color) 35%, transparent)"
                            : (isLiveChanges ? "rgba(16, 185, 129, 0.4)" : "color-mix(in srgb, var(--text-primary) 12%, transparent)"),
                          backgroundColor: isCurrentPreview 
                            ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                            : (isLiveChanges ? "rgba(16, 185, 129, 0.06)" : "rgba(255, 255, 255, 0.04)")
                        },
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography sx={{ 
                          fontSize: "12px", 
                          fontWeight: 700, 
                          fontFamily: '"Outfit", sans-serif',
                          color: isLiveChanges ? "#10b981" : "inherit"
                        }}>
                          {isLiveChanges ? "Live Changes" : (v.changeSummary || "Auto-saved snapshot")}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px", ml: "auto" }}>
                          {formattedDate}
                        </Typography>
                      </Box>

                      {!isLiveChanges && (
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.25, fontSize: "10px" }}>
                          Version {v.versionNumber} • Edited by {v.createdBy || "Anonymous"}
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
                          <Typography sx={{ fontSize: "10px", fontWeight: 600, color: "#10b981" }}>
                            Unsaved Local Edits
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          variant={isCurrentPreview ? "contained" : "outlined"}
                          onClick={() => setPreviewVersion(isCurrentPreview ? null : v)}
                          sx={{
                            fontSize: "9px",
                            py: 0.25,
                            px: 1,
                            height: 22,
                            borderRadius: "4px",
                            boxShadow: "none",
                            color: isLiveChanges && !isCurrentPreview ? "#10b981" : "white",
                            borderColor: isLiveChanges && !isCurrentPreview ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.15)",
                            "&:hover": {
                              borderColor: isLiveChanges ? "#10b981" : "rgba(255, 255, 255, 0.3)",
                              backgroundColor: isLiveChanges && !isCurrentPreview ? "rgba(16, 185, 129, 0.05)" : "rgba(255, 255, 255, 0.05)",
                            }
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
                                borderColor: "var(--primary-color)"
                              }
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
              <Typography variant="body2">
                No versions recorded yet.
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                Versions are captured automatically every 5 minutes during editing, or on user handover.
              </Typography>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Page Analytics Dialog */}
      <Dialog
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: "blur(4px)",
              backgroundColor: "rgba(0, 0, 0, 0.4)"
            }
          },
          paper: {
            className: "glass-card",
            sx: {
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--panel-color)",
              color: "text.primary",
              borderRadius: "12px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
              p: 3,
            }
          }
        }}
      >
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box 
              sx={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                width: 32, 
                height: 32, 
                borderRadius: "8px", 
                backgroundColor: "rgba(139, 92, 246, 0.12)",
                color: "var(--primary-color)" 
              }}
            >
              <BarChart2 size={18} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>
              Page Analytics
            </Typography>
          </Box>
          <IconButton onClick={() => setAnalyticsOpen(false)} sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
            <X size={18} />
          </IconButton>
        </Box>

        {/* Dialog Content */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          
          {/* Grid of KPI Cards */}
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
            {/* Words */}
            <Box 
              data-testid="kpi-words"
              sx={{ 
                p: 1.75, 
                borderRadius: "8px", 
                backgroundColor: "rgba(255, 255, 255, 0.02)", 
                border: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                gap: 1
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#8b5cf6" }}>
                <FileText size={16} />
                <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>Words</Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>
                {getDocumentStats().words}
              </Typography>
            </Box>

            {/* Characters */}
            <Box 
              data-testid="kpi-chars"
              sx={{ 
                p: 1.75, 
                borderRadius: "8px", 
                backgroundColor: "rgba(255, 255, 255, 0.02)", 
                border: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                gap: 1
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#06b6d4" }}>
                <Type size={16} />
                <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>Chars</Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>
                {getDocumentStats().characters}
              </Typography>
            </Box>

            {/* Est. Read Time */}
            <Box 
              data-testid="kpi-read-time"
              sx={{ 
                p: 1.75, 
                borderRadius: "8px", 
                backgroundColor: "rgba(255, 255, 255, 0.02)", 
                border: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                gap: 1
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#10b981" }}>
                <Clock size={16} />
                <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>Read Time</Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', display: "flex", alignItems: "baseline", gap: 0.5 }}>
                {getDocumentStats().readTime} <Typography variant="caption" sx={{ fontSize: "10px", color: "text.secondary", fontWeight: 600 }}>min</Typography>
              </Typography>
            </Box>

            {/* Online Users */}
            <Box 
              data-testid="kpi-online"
              sx={{ 
                p: 1.75, 
                borderRadius: "8px", 
                backgroundColor: "rgba(255, 255, 255, 0.02)", 
                border: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                gap: 1
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#f59e0b" }}>
                <Users size={16} />
                <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>Online</Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>
                {uniqueActiveUsers.length || 1}
              </Typography>
            </Box>
          </Box>

          {/* Block Composition Bar Chart */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: "9.5px", color: "text.disabled", letterSpacing: "0.05em" }}>
              Content Composition
            </Typography>
            
            {/* Horizontal Stacked Bar */}
            <Box sx={{ 
              height: 10, 
              borderRadius: "5px", 
              width: "100%", 
              backgroundColor: "rgba(255,255,255,0.03)", 
              display: "flex", 
              overflow: "hidden" 
            }}>
              {/* Paragraphs */}
              {getDocumentStats().blocks.paragraphs > 0 && (
                <Tooltip title={`Paragraphs: ${getDocumentStats().blocks.paragraphs}`}>
                  <Box sx={{ width: `${(getDocumentStats().blocks.paragraphs / (Object.values(getDocumentStats().blocks).reduce((a, b) => a + b, 0) || 1)) * 100}%`, height: "100%", backgroundColor: "#a78bfa" }} />
                </Tooltip>
              )}
              {/* Headings */}
              {getDocumentStats().blocks.headings > 0 && (
                <Tooltip title={`Headings: ${getDocumentStats().blocks.headings}`}>
                  <Box sx={{ width: `${(getDocumentStats().blocks.headings / (Object.values(getDocumentStats().blocks).reduce((a, b) => a + b, 0) || 1)) * 100}%`, height: "100%", backgroundColor: "#38bdf8" }} />
                </Tooltip>
              )}
              {/* Tables */}
              {getDocumentStats().blocks.tables > 0 && (
                <Tooltip title={`Tables: ${getDocumentStats().blocks.tables}`}>
                  <Box sx={{ width: `${(getDocumentStats().blocks.tables / (Object.values(getDocumentStats().blocks).reduce((a, b) => a + b, 0) || 1)) * 100}%`, height: "100%", backgroundColor: "#34d399" }} />
                </Tooltip>
              )}
              {/* Tasks */}
              {getDocumentStats().blocks.tasks > 0 && (
                <Tooltip title={`Tasks: ${getDocumentStats().blocks.tasks}`}>
                  <Box sx={{ width: `${(getDocumentStats().blocks.tasks / (Object.values(getDocumentStats().blocks).reduce((a, b) => a + b, 0) || 1)) * 100}%`, height: "100%", backgroundColor: "#facc15" }} />
                </Tooltip>
              )}
              {/* Callouts */}
              {getDocumentStats().blocks.callouts > 0 && (
                <Tooltip title={`Callout Panels: ${getDocumentStats().blocks.callouts}`}>
                  <Box sx={{ width: `${(getDocumentStats().blocks.callouts / (Object.values(getDocumentStats().blocks).reduce((a, b) => a + b, 0) || 1)) * 100}%`, height: "100%", backgroundColor: "#fb923c" }} />
                </Tooltip>
              )}
              {/* Images */}
              {getDocumentStats().blocks.images > 0 && (
                <Tooltip title={`Images: ${getDocumentStats().blocks.images}`}>
                  <Box sx={{ width: `${(getDocumentStats().blocks.images / (Object.values(getDocumentStats().blocks).reduce((a, b) => a + b, 0) || 1)) * 100}%`, height: "100%", backgroundColor: "#f472b6" }} />
                </Tooltip>
              )}
              {/* Status / Dates */}
              {(getDocumentStats().blocks.statuses + getDocumentStats().blocks.dates) > 0 && (
                <Tooltip title={`Status/Date Chips: ${getDocumentStats().blocks.statuses + getDocumentStats().blocks.dates}`}>
                  <Box sx={{ width: `${((getDocumentStats().blocks.statuses + getDocumentStats().blocks.dates) / (Object.values(getDocumentStats().blocks).reduce((a, b) => a + b, 0) || 1)) * 100}%`, height: "100%", backgroundColor: "#94a3b8" }} />
                </Tooltip>
              )}
            </Box>

            {/* Legend Grid */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, mt: 0.5 }}>
              <LegendItem color="#a78bfa" label="Paragraphs" count={getDocumentStats().blocks.paragraphs} />
              <LegendItem color="#38bdf8" label="Headings" count={getDocumentStats().blocks.headings} />
              <LegendItem color="#34d399" label="Tables" count={getDocumentStats().blocks.tables} />
              <LegendItem color="#facc15" label="Tasks" count={getDocumentStats().blocks.tasks} />
              <LegendItem color="#fb923c" label="Callouts" count={getDocumentStats().blocks.callouts} />
              <LegendItem color="#f472b6" label="Media" count={getDocumentStats().blocks.images} />
              <LegendItem color="#94a3b8" label="Chips" count={getDocumentStats().blocks.statuses + getDocumentStats().blocks.dates} />
            </Box>
          </Box>


          {/* Traffic Sparklines (Last 7 Days) */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: "9.5px", color: "text.disabled", letterSpacing: "0.05em" }}>
                Page Views & Visitors (Last 7 Days)
              </Typography>
              {!loadingAnalytics && analyticsData && (
                <Typography variant="caption" sx={{ 
                  color: (analyticsData.trendPercentage ?? 0) >= 0 ? "#10b981" : "#ef4444", 
                  fontWeight: 600, 
                  fontSize: "10.5px" 
                }}>
                  {(analyticsData.trendPercentage ?? 0) >= 0 ? `+${(analyticsData.trendPercentage ?? 0).toFixed(0)}%` : `${(analyticsData.trendPercentage ?? 0).toFixed(0)}%`} this week
                </Typography>
              )}
            </Box>
            
            {loadingAnalytics ? (
              <Box sx={{ 
                height: 150, 
                borderRadius: "8px", 
                backgroundColor: "rgba(0, 0, 0, 0.15)", 
                border: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5
              }}>
                <CircularProgress size={24} sx={{ color: "var(--primary-color)" }} />
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Loading traffic trend...</Typography>
              </Box>
            ) : !analyticsData ? (
              <Box sx={{ 
                height: 150, 
                borderRadius: "8px", 
                backgroundColor: "rgba(0, 0, 0, 0.15)", 
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Typography variant="caption" sx={{ color: "text.disabled" }}>Failed to load traffic analytics.</Typography>
              </Box>
            ) : (() => {
              const history = analyticsData.history || [];
              const maxVal = Math.max(...history.map(h => Math.max(h.views, h.uniqueVisitors)), 10);

              const viewsPoints = history.map((pt, i) => {
                const x = 10 + i * 80;
                const y = 106 - ((pt.views / maxVal) * 86);
                return { x, y };
              });

              const visitorsPoints = history.map((pt, i) => {
                const x = 10 + i * 80;
                const y = 106 - ((pt.uniqueVisitors / maxVal) * 86);
                return { x, y };
              });

              const viewsPath = viewsPoints.length > 0 
                ? `M ${viewsPoints.map(p => `${p.x} ${p.y}`).join(' L ')}` 
                : "";
              const visitorsPath = visitorsPoints.length > 0 
                ? `M ${visitorsPoints.map(p => `${p.x} ${p.y}`).join(' L ')}` 
                : "";

              const viewsAreaPath = viewsPoints.length > 0 
                ? `M 10 120 L ${viewsPoints.map(p => `${p.x} ${p.y}`).join(' L ')} L 490 120 Z` 
                : "";
              const visitorsAreaPath = visitorsPoints.length > 0 
                ? `M 10 120 L ${visitorsPoints.map(p => `${p.x} ${p.y}`).join(' L ')} L 490 120 Z` 
                : "";

              const formatDateLabel = (dateStr: string, isToday: boolean) => {
                if (isToday) return "Today";
                const parts = dateStr.split("-");
                if (parts.length === 3) {
                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  const monthIdx = parseInt(parts[1], 10) - 1;
                  const day = parseInt(parts[2], 10);
                  if (monthIdx >= 0 && monthIdx < 12) {
                    return `${months[monthIdx]} ${day}`;
                  }
                }
                return dateStr;
              };

              return (
                <Box sx={{ 
                  p: 2, 
                  borderRadius: "8px", 
                  backgroundColor: "rgba(0, 0, 0, 0.15)", 
                  border: "1px solid var(--border-color)",
                  position: "relative" 
                }}>
                  <svg viewBox="0 0 500 120" style={{ width: "100%", height: "110px", display: "block" }}>
                    <defs>
                      <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0.0"/>
                      </linearGradient>
                      <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>

                    <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1="55" x2="500" y2="55" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                    {viewsAreaPath && <path d={viewsAreaPath} fill="url(#viewsGrad)" />}
                    {visitorsAreaPath && <path d={visitorsAreaPath} fill="url(#visitorsGrad)" />}

                    {viewsPath && (
                      <path 
                        d={viewsPath} 
                        fill="none" 
                        stroke="var(--primary-color)" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        style={{ filter: "drop-shadow(0 2px 8px rgba(139, 92, 246, 0.4))" }}
                      />
                    )}

                    {visitorsPath && (
                      <path 
                        d={visitorsPath} 
                        fill="none" 
                        stroke="#06b6d4" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        style={{ filter: "drop-shadow(0 2px 8px rgba(6, 182, 212, 0.4))" }}
                      />
                    )}

                    {viewsPoints.length > 0 && (
                      <circle cx={viewsPoints[viewsPoints.length - 1].x} cy={viewsPoints[viewsPoints.length - 1].y} r="4" fill="var(--primary-color)" stroke="#ffffff" strokeWidth="1.5" />
                    )}
                    {visitorsPoints.length > 0 && (
                      <circle cx={visitorsPoints[visitorsPoints.length - 1].x} cy={visitorsPoints[visitorsPoints.length - 1].y} r="3.5" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
                    )}

                    {history.map((pt, idx) => {
                      const x = 10 + idx * 80;
                      const isLast = idx === history.length - 1;
                      const textX = isLast ? x - 18 : x - 12;
                      return (
                        <text key={idx} x={textX} y="118" fill="rgba(255,255,255,0.3)" fontSize="8.5" fontFamily='"Outfit", sans-serif'>
                          {formatDateLabel(pt.date, isLast)}
                        </text>
                      );
                    })}
                  </svg>
                  
                  <Box sx={{ display: "flex", gap: 3, mt: 1, px: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--primary-color)" }} />
                      <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 600 }}>
                        {analyticsData.totalViews.toLocaleString()} <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Views</span>
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#06b6d4" }} />
                      <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 600 }}>
                        {analyticsData.totalVisitors.toLocaleString()} <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Unique Visitors</span>
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })()}
          </Box>
        </Box>
      </Dialog>



      {/* Commit Checkpoint Modal */}
      <Dialog
        open={commitModalOpen}
        onClose={() => setCommitModalOpen(false)}
        maxWidth="xs"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: "var(--panel-color)",
            backgroundImage: "none",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            color: "text.primary",
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>
          Save Version Checkpoint
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <DialogContentText sx={{ color: "text.secondary", fontSize: "13px", mb: 1 }}>
            Describe your changes to create a named checkpoint in the document version history.
          </DialogContentText>
          <InputBase
            autoFocus
            placeholder="Change Description"
            fullWidth
            value={commitDescription}
            onChange={(e) => setCommitDescription(e.target.value)}
            disabled={isGeneratingSummary}
            sx={{
              fontSize: "13px",
              fontFamily: '"Inter", sans-serif',
              color: "text.primary",
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              px: 1.5,
              py: 1,
              mb: 1,
              "&:hover": { borderColor: "rgba(255,255,255,0.2)" },
              "&.Mui-focused": { 
                borderColor: "var(--primary-color)",
                boxShadow: "0 0 0 2px rgba(139, 92, 246, 0.15)"
              },
              transition: "all 0.15s ease"
            }}
          />
          <Button
            size="small"
            variant="outlined"
            onClick={async () => {
              if (!editor) return;
              setIsGeneratingSummary(true);
              try {
                const res = await autogenSummary(activeDocId || "", JSON.stringify(editor.getJSON()), title);
                setCommitDescription(res.summary);
              } catch (err) {
                console.error("AI summary failed:", err);
                alert("AI description generation failed. Using word difference fallback.");
              } finally {
                setIsGeneratingSummary(false);
              }
            }}
            disabled={isGeneratingSummary}
            sx={{
              alignSelf: "flex-start",
              fontSize: "11px",
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 600,
              textTransform: "none",
              color: "var(--primary-color)",
              borderColor: "rgba(139, 92, 246, 0.3)",
              "&:hover": {
                borderColor: "var(--primary-color)",
                backgroundColor: "rgba(139, 92, 246, 0.05)"
              }
            }}
            startIcon={isGeneratingSummary ? <CircularProgress size={12} color="inherit" /> : <Sparkles size={12} />}
          >
            {isGeneratingSummary ? "Generating..." : "Auto-generate using AI"}
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: "flex", justifyContent: "space-between" }}>
          <Button
            onClick={() => {
              // Skip Checkpoint
              saveDocument();
              setIsEditing(false);
              setCommitModalOpen(false);
            }}
            sx={{
              color: "text.secondary",
              textTransform: "none",
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 600,
              fontSize: "12px",
              "&:hover": { color: "text.primary" }
            }}
          >
            Skip Checkpoint
          </Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              onClick={() => setCommitModalOpen(false)}
              sx={{
                color: "text.secondary",
                textTransform: "none",
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 600,
                fontSize: "12px",
                "&:hover": { color: "text.primary" }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Publish & Save Checkpoint
                saveDocument(title, commitDescription || "Auto-saved snapshot");
                setIsEditing(false);
                setCommitModalOpen(false);
              }}
              variant="contained"
              disabled={isGeneratingSummary}
              sx={{
                backgroundColor: "var(--primary-color)",
                color: "white",
                textTransform: "none",
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 600,
                fontSize: "12px",
                px: 2,
                "&:hover": {
                  backgroundColor: "var(--primary-hover)"
                }
              }}
            >
              Publish & Save
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Idle Timeout Dialog */}
      <Dialog
        open={idleToastOpen}
        onClose={() => setIdleToastOpen(false)}
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: "var(--panel-color)",
            backgroundImage: "none",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            color: "text.primary",
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>
          Session Idle Timeout
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary", fontSize: "14px" }}>
            You have been checked out due to 10 minutes of inactivity. Your edits were automatically published and saved as a checkpoint.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setIdleToastOpen(false)}
            variant="contained"
            sx={{
              backgroundColor: "var(--primary-color)",
              color: "white",
              textTransform: "none",
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 600,
              px: 3,
              "&:hover": {
                backgroundColor: "var(--primary-hover)"
              }
            }}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      {/* View JSON Dialog */}
      <Dialog
        open={jsonDialogOpen}
        onClose={() => setJsonDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            className: "glass-card",
            sx: {
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--panel-color)",
              color: "text.primary",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              borderRadius: "12px",
            }
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Document JSON Representation</span>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                if (editor) {
                  navigator.clipboard.writeText(JSON.stringify(editor.getJSON(), null, 2));
                }
              }}
              sx={{
                fontSize: "11px",
                fontFamily: '"Outfit", sans-serif',
                borderColor: "rgba(255,255,255,0.08)",
                color: "text.secondary",
                textTransform: "none",
                "&:hover": { borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.03)" }
              }}
            >
              Copy JSON
            </Button>
            <IconButton size="small" onClick={() => setJsonDialogOpen(false)} sx={{ color: "text.disabled" }}>
              <X size={16} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: "rgba(255,255,255,0.06)", p: 0 }}>
          <Box
            component="pre"
            sx={{
              p: 2,
              m: 0,
              fontSize: "12px",
              fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              color: "#34d399",
              overflow: "auto",
              maxHeight: "60vh",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all"
            }}
          >
            {editor ? JSON.stringify(editor.getJSON(), null, 2) : "{}"}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: "flex-end" }}>
          <Button 
            variant="contained" 
            size="small" 
            onClick={() => setJsonDialogOpen(false)}
            sx={{
              fontSize: "11px",
              fontWeight: 600,
              fontFamily: '"Outfit", sans-serif',
              backgroundColor: "var(--primary-color)",
              color: "#ffffff",
              textTransform: "none",
              "&:hover": { backgroundColor: "var(--primary-hover)" }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ==========================================
// PageComments Component
// ==========================================

interface PageCommentsProps {
  docId: string;
  authToken: string | null;
  readOnly?: boolean;
}

const parseJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

const PageComments: React.FC<PageCommentsProps> = ({ docId, authToken, readOnly = false }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [likesState, setLikesState] = useState<Record<string, { count: number; liked: boolean }>>({});

  const decoded = authToken ? parseJwt(authToken) : null;
  const currentUserId = decoded ? (decoded.sub || decoded.user_id) : "";
  const currentUserDisplayName = decoded ? (decoded.name || decoded.username || decoded.preferred_username || "You") : "You";

  const loadComments = async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const data = await fetchComments(docId);
      const sorted = [...(data || [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setComments(sorted);

      const initialLikes: Record<string, { count: number; liked: boolean }> = {};
      sorted.forEach(c => {
        const count = c.id.charCodeAt(0) % 4;
        initialLikes[c.id] = { count, liked: false };
      });
      setLikesState(initialLikes);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
    setNewCommentText("");
    setReplyToId(null);
    setReplyText("");
    setEditingCommentId(null);
  }, [docId]);

  const handleCreateComment = async () => {
    if (!newCommentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await createComment(docId, null, newCommentText);
      setComments(prev => [...prev, created]);
      setNewCommentText("");
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReply = async (parentId: string) => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await createComment(docId, parentId, replyText);
      setComments(prev => [...prev, created]);
      setReplyText("");
      setReplyToId(null);
    } catch (err) {
      console.error("Failed to post reply:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async (id: string) => {
    if (!editText.trim()) return;
    try {
      const updated = await updateComment(id, editText);
      setComments(prev => prev.map(c => c.id === id ? updated : c));
      setEditingCommentId(null);
    } catch (err) {
      console.error("Failed to edit comment:", err);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await deleteComment(id);
      setComments(prev => prev.filter(c => c.id !== id && c.parentId !== id));
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const handleToggleLike = (id: string) => {
    setLikesState(prev => {
      const current = prev[id] || { count: 0, liked: false };
      const nextLiked = !current.liked;
      const nextCount = nextLiked ? current.count + 1 : Math.max(0, current.count - 1);
      return {
        ...prev,
        [id]: { count: nextCount, liked: nextLiked }
      };
    });
  };

  const topLevelComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

  const formatCommentDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  if (loading && comments.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={24} sx={{ color: "var(--primary-color, #8b5cf6)" }} />
      </Box>
    );
  }

  const renderCommentItem = (comment: Comment, isReply = false) => {
    const isEditingThis = editingCommentId === comment.id;
    const isAuthor = comment.createdBy === currentUserId;
    const likesInfo = likesState[comment.id] || { count: 0, liked: false };

    return (
      <Box 
        key={comment.id} 
        sx={{ 
          display: "flex", 
          gap: 2, 
          ml: isReply ? 6 : 0, 
          mt: 2, 
          pb: 2,
          borderBottom: isReply ? "none" : "1px solid var(--border-color)",
          "&:last-child": {
            borderBottom: "none"
          }
        }}
      >
        <UserAvatar 
          displayName={comment.createdByName}
          sx={{ 
            bgcolor: isAuthor ? "var(--primary-color, #8b5cf6)" : "var(--border-color, #e2e8f0)",
            color: isAuthor ? "#fff" : "text.primary",
            width: 32, 
            height: 32, 
            fontSize: "12px", 
            fontWeight: 700,
            border: "1px solid var(--border-color)"
          }}
        />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography 
              sx={{ 
                color: "var(--primary-color, #8b5cf6)", 
                fontWeight: 600, 
                fontSize: "13px",
                fontFamily: '"Outfit", sans-serif',
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" }
              }}
            >
              {comment.createdByName}
            </Typography>
            <Typography 
              sx={{ 
                color: "text.secondary", 
                fontSize: "11px",
                fontFamily: '"Outfit", sans-serif',
                opacity: 0.8
              }}
            >
              {formatCommentDate(comment.createdAt)}
            </Typography>
          </Box>

          {isEditingThis ? (
            <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
              <InputBase
                multiline
                rows={2}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                sx={{
                  width: "100%",
                  p: 1.5,
                  borderRadius: 2,
                  fontSize: "13.5px",
                  border: "1px solid var(--primary-color, #8b5cf6)",
                  backgroundColor: "background.paper",
                  fontFamily: 'inherit',
                  color: "text.primary"
                }}
              />
              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button 
                  size="small" 
                  onClick={() => setEditingCommentId(null)}
                  sx={{ textTransform: "none", fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}
                >
                  Cancel
                </Button>
                <Button 
                  size="small" 
                  variant="contained"
                  onClick={() => handleUpdateComment(comment.id)}
                  sx={{ 
                    textTransform: "none", 
                    fontSize: "12px", 
                    fontFamily: '"Outfit", sans-serif',
                    bgcolor: "var(--primary-color, #8b5cf6)",
                    boxShadow: "none",
                    "&:hover": { bgcolor: "var(--primary-dark)", boxShadow: "none" }
                  }}
                >
                  Save
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography 
              sx={{ 
                color: "text.primary", 
                fontSize: "13.5px", 
                mt: 1, 
                whiteSpace: "pre-wrap",
                fontFamily: 'inherit',
                lineHeight: 1.5
              }}
            >
              {comment.content}
            </Typography>
          )}

          {!isEditingThis && (
            <Box sx={{ display: "flex", gap: 2, mt: 1, alignItems: "center" }}>
              {!readOnly && (
                <Typography 
                  variant="caption"
                  onClick={() => {
                    setReplyToId(comment.id);
                    setReplyText("");
                  }}
                  sx={{ 
                    cursor: "pointer", 
                    color: "text.secondary", 
                    fontSize: "11px",
                    fontWeight: 500,
                    userSelect: "none",
                    "&:hover": { color: "var(--primary-color, #8b5cf6)" }
                  }}
                >
                  Reply
                </Typography>
              )}

              {isAuthor && !readOnly && (
                <>
                  <Typography 
                    variant="caption"
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditText(comment.content);
                    }}
                    sx={{ 
                      cursor: "pointer", 
                      color: "text.secondary", 
                      fontSize: "11px",
                      fontWeight: 500,
                      userSelect: "none",
                      "&:hover": { color: "var(--primary-color, #8b5cf6)" }
                    }}
                  >
                    Edit
                  </Typography>

                  <Typography 
                    variant="caption"
                    onClick={() => handleDeleteComment(comment.id)}
                    sx={{ 
                      cursor: "pointer", 
                      color: "text.secondary", 
                      fontSize: "11px",
                      fontWeight: 500,
                      userSelect: "none",
                      "&:hover": { color: "var(--error-color, #ef4444)" }
                    }}
                  >
                    Delete
                  </Typography>
                </>
              )}

              <Typography 
                variant="caption"
                onClick={() => handleToggleLike(comment.id)}
                sx={{ 
                  cursor: "pointer", 
                  color: likesInfo.liked ? "var(--primary-color, #8b5cf6)" : "text.secondary", 
                  fontSize: "11px",
                  fontWeight: likesInfo.liked ? 700 : 500,
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  "&:hover": { color: "var(--primary-color, #8b5cf6)" }
                }}
              >
                Like {likesInfo.count > 0 && `(${likesInfo.count})`}
              </Typography>
            </Box>
          )}

          {replyToId === comment.id && !readOnly && (
            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
              <InputBase
                multiline
                rows={2}
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                sx={{
                  width: "100%",
                  p: 1.5,
                  borderRadius: 2,
                  fontSize: "13.5px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "background.paper",
                  fontFamily: 'inherit',
                  color: "text.primary"
                }}
              />
              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button 
                  size="small" 
                  onClick={() => setReplyToId(null)}
                  sx={{ textTransform: "none", fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}
                >
                  Cancel
                </Button>
                <Button 
                  size="small" 
                  variant="contained"
                  disabled={!replyText.trim() || submitting}
                  onClick={() => handleCreateReply(isReply ? comment.parentId! : comment.id)}
                  sx={{ 
                    textTransform: "none", 
                    fontSize: "12px", 
                    fontFamily: '"Outfit", sans-serif',
                    bgcolor: "var(--primary-color, #8b5cf6)",
                    boxShadow: "none",
                    "&:hover": { bgcolor: "var(--primary-dark)", boxShadow: "none" }
                  }}
                >
                  Reply
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  const totalCount = comments.length;

  return (
    <Box sx={{ mt: 5, mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontSize: "16px", 
            fontWeight: 700, 
            color: "text.primary",
            fontFamily: '"Outfit", sans-serif'
          }}
        >
          {totalCount} Comment{totalCount !== 1 ? "s" : ""}
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2, borderColor: "var(--border-color)" }} />

      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {topLevelComments.map(parent => (
          <Box key={parent.id}>
            {renderCommentItem(parent, false)}
            {getReplies(parent.id).map(reply => renderCommentItem(reply, true))}
          </Box>
        ))}

        {totalCount === 0 && (
          <Typography 
            variant="body2" 
            sx={{ 
              color: "text.secondary", 
              py: 2, 
              fontStyle: "italic",
              fontSize: "13px",
              fontFamily: '"Outfit", sans-serif'
            }}
          >
            No comments yet. Be the first to share your thoughts!
          </Typography>
        )}
      </Box>

      {!readOnly ? (
        <Box sx={{ display: "flex", gap: 2, mt: 4, pt: 3, borderTop: "1px solid var(--border-color)" }}>
          <UserAvatar 
            displayName={currentUserDisplayName}
            sx={{ 
              bgcolor: "var(--primary-color, #8b5cf6)", 
              color: "#fff",
              width: 36, 
              height: 36, 
              fontSize: "13px", 
              fontWeight: 700
            }}
          />
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <InputBase
              multiline
              rows={2}
              placeholder="Write a comment..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              sx={{
                width: "100%",
                p: 2,
                borderRadius: 2.5,
                fontSize: "14px",
                border: "1px solid var(--border-color)",
                backgroundColor: "background.paper",
                fontFamily: 'inherit',
                color: "text.primary",
                transition: "border-color 0.2s",
                "&:focus-within": {
                  borderColor: "var(--primary-color, #8b5cf6)"
                }
              }}
            />
            {newCommentText.trim() && (
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  disabled={submitting}
                  onClick={handleCreateComment}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    fontFamily: '"Outfit", sans-serif',
                    bgcolor: "var(--primary-color, #8b5cf6)",
                    boxShadow: "none",
                    "&:hover": { bgcolor: "var(--primary-dark)", boxShadow: "none" }
                  }}
                >
                  Post Comment
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      ) : (
        <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: "action.disabledBackground", border: "1px dashed var(--border-color)" }}>
          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", fontStyle: "italic", fontSize: "13px" }}>
            Comments are disabled in read-only mode or when the page is in the Trash Bin.
          </Typography>
        </Box>
      )}
    </Box>
  );
};
