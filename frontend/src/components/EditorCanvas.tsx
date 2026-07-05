import React, { useEffect, useState } from "react";
import { useToastStore } from "../store/useToastStore";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { MacroBlock } from "../editor/extensions/MacroBlock";
import { Excerpt } from "../editor/extensions/Excerpt";
import { LayoutSection } from "../editor/extensions/LayoutSection";
import { LayoutColumn } from "../editor/extensions/LayoutColumn";
import { CardsGrid, CardItem, TabsContainer, TabItem } from "../editor/extensions/LayoutNodes";
import { CalloutPanel } from "../editor/extensions/CalloutPanel";
import { InlineStatus } from "../editor/extensions/InlineStatus";
import { Mention } from "../editor/extensions/Mention";
import {
  Details,
  DetailsSummary,
  DetailsContent,
} from "../editor/extensions/Details";
import { InlineDate } from "../editor/extensions/InlineDate";
import { NoFormatPanel } from "../editor/extensions/NoFormatPanel";
import { TableOfContents } from "../editor/extensions/TableOfContents";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import { Link } from "@tiptap/extension-link";
import { Underline } from "@tiptap/extension-underline";
import { Highlight } from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Typography as TypographyExtension } from "@tiptap/extension-typography";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import {
  CustomTableCell,
  CustomTableHeader,
} from "../editor/extensions/CustomTableExtensions";
import { CustomImage } from "../editor/extensions/CustomImage";
import { PresenceCursors } from "../editor/extensions/PresenceCursors";
import { CommentMark } from "../editor/extensions/CommentMark";
import { usePresence } from "../hooks/usePresence";
import {
  uploadImage,
  fetchVersions,
  restoreVersion,
  createMilestone,
  fetchDocument,
  fetchDocumentAnalytics,
  autogenSummary,
  addFavorite,
  removeFavorite,
  isFavorite as checkIsFavorite,
  fetchAttachments,
  fetchTeamUsers,
  getTemplates,
  API_BASE_URL,
} from "../services/api";
import type {
  DocumentVersion,
  DocumentAnalytics,
  Attachment,
  Template,
} from "../services/api";
import { PlaceholderBlock } from "../editor/extensions/PlaceholderBlock";
import { DocumentTags } from "./DocumentTags";
import { UserAvatar } from "./UserAvatar";

import { EditorHeader } from "./editor/EditorHeader";
import { EditorAnalyticsDialog } from "./editor/EditorAnalyticsDialog";
import { EditorHistoryDrawer } from "./editor/EditorHistoryDrawer";
import { EditorMacroDialog } from "./editor/EditorMacroDialog";
import { EditorToolbar } from "./editor/EditorToolbar";
import { EditorFloatingMenus } from "./editor/EditorFloatingMenus";
import { InsertLinkDialog } from "./editor/InsertLinkDialog";
import { ImageSelectionDialog } from "./editor/ImageSelectionDialog";
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
  Avatar,
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
  AlignRight,
  Tag,
  AtSign,
  Link2,
  Palette,
  Network,
  PenTool,
  Cpu,
  Underline as UnderlineIcon,
  Highlighter,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Quote,
  Copy,
} from "lucide-react";
import { MovePageDialog } from "./Sidebar";
import type { DocumentItem } from "./Sidebar";
import { PageAttachments } from "./PageAttachments";
import { ExportDialog } from "./ExportDialog";
import { PageRestrictionsDialog } from "./PageRestrictionsDialog";
import { SharingLinksDialog } from "./SharingLinksDialog";
import { PageSettingsModal } from "./PageSettingsModal";
import { ImageGallery } from "./ImageGallery";

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
  selectedProjectId?: string | null;
  teams?: any[];
  projects?: any[];
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
  currentPath: DocumentItem[] = [],
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
const LegendItem = ({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) => {
  if (count === 0) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <Typography
        variant="caption"
        sx={{
          fontSize: "10px",
          color: "text.secondary",
          textOverflow: "ellipsis",
          overflow: "hidden",
          whiteSpace: "nowrap",
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
    year: "numeric",
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
  selectedTeamId,
  selectedProjectId,
  teams = [],
  projects = [],
}) => {
  const [title, setTitle] = useState(initialTitle);
  const { showToast } = useToastStore();
  const lastNonEmptyTitle = React.useRef(initialTitle || "Untitled Document");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tableCreatorOpen, setTableCreatorOpen] = useState(false);
  const [loremDialogOpen, setLoremDialogOpen] = useState(false);
  const [layoutMenuAnchor, setLayoutMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [symbolMenuAnchorEl, setSymbolMenuAnchorEl] =
    useState<null | HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(initialEditMode && !deletedAt);
  const [showComments, setShowComments] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [macroSelectorOpen, setMacroSelectorOpen] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState("text");
  const [macroSearchQuery, setMacroSearchQuery] = useState("");
  
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDialogTargetEditor, setImageDialogTargetEditor] = useState<any>(null);

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("arkollab_favorite_macros");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [
      "inline-status",
      "callout-info",
      "task-list",
      "details-summary",
      "inline-date",
      "table",
      "image",
    ];
  });

  const toggleFavorite = (commandId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setFavorites((prev) => {
      const next = prev.includes(commandId)
        ? prev.filter((id) => id !== commandId)
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
  const [teamUsers, setTeamUsers] = useState<
    { id: string; username: string }[]
  >([]);
  const [blockTemplates, setBlockTemplates] = useState<Template[]>([]);

  useEffect(() => {
    if (!selectedTeamId) return;
    getTemplates({ templateType: "block", teamId: selectedTeamId })
      .then((templates) => {
        setBlockTemplates(templates || []);
      })
      .catch((err) => {
        console.error("Failed to load block templates", err);
      });
  }, [selectedTeamId]);

  useEffect(() => {
    if (!selectedTeamId) {
      setTeamUsers([
        { id: "dev_admin", username: "dev_admin" },
        { id: "jbauer", username: "jbauer" },
      ]);
      return;
    }
    fetchTeamUsers(selectedTeamId)
      .then((users) => {
        if (users && users.length > 0) {
          setTeamUsers(users);
        } else {
          setTeamUsers([
            { id: "dev_admin", username: "dev_admin" },
            { id: "jbauer", username: "jbauer" },
          ]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch team users:", err);
        setTeamUsers([
          { id: "dev_admin", username: "dev_admin" },
          { id: "jbauer", username: "jbauer" },
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

  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [restrictionsDialogOpen, setRestrictionsDialogOpen] = useState(false);
  const [sharingLinksDialogOpen, setSharingLinksDialogOpen] = useState(false);
  const [pageSettingsDialogOpen, setPageSettingsDialogOpen] = useState(false);
  const [insertLinkDialogOpen, setInsertLinkDialogOpen] = useState(false);
  const [linkInitialUrl, setLinkInitialUrl] = useState("");
  const [linkInitialText, setLinkInitialText] = useState("");

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
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(
    null,
  );
  const [milestoneSummary, setMilestoneSummary] = useState("");
  const [isSavingMilestone, setIsSavingMilestone] = useState(false);

  // Done Checkpoint Modal states & Idle Timeout
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [commitDescription, setCommitDescription] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [idleToastOpen, setIdleToastOpen] = useState(false);

  // Page Analytics live state
  const [analyticsData, setAnalyticsData] = useState<DocumentAnalytics | null>(
    null,
  );
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Trigger a page view record when activeDocId is retrieved/mounted
  useEffect(() => {
    if (activeDocId && !activeDocId.startsWith('template_')) {
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
      .then((status) => {
        setIsFavorite(status);
      })
      .catch((err) => {
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
    const loadAnalytics = async () => {
      if (analyticsOpen && activeDocId && !activeDocId.startsWith('template_')) {
        setLoadingAnalytics(true);
        try {
          const data = await fetchDocumentAnalytics(activeDocId);
          setAnalyticsData(data);
        } catch (err) {
          console.error("Failed to fetch live analytics:", err);
        } finally {
          setLoadingAnalytics(false);
        }
      }
    };

    loadAnalytics();
  }, [analyticsOpen, activeDocId]);

  const triggerImageUpload = (targetEditor: any) => {
    if (!targetEditor) return;
    setImageDialogTargetEditor(targetEditor);
    setImageDialogOpen(true);
  };

  const handleImageSelect = (imageData: { src: string; imageId?: string; originalWidth?: number; originalHeight?: number }) => {
    if (!imageDialogTargetEditor) return;
    
    imageDialogTargetEditor
      .chain()
      .focus()
      .insertContent({
        type: "customImage",
        attrs: {
          imageId: imageData.imageId || null,
          src: imageData.src,
          size: "O",
          alignment: "center",
          originalWidth: imageData.originalWidth || null,
          originalHeight: imageData.originalHeight || null,
        },
      })
      .run();
      
    setImageDialogOpen(false);
    setImageDialogTargetEditor(null);
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
    executeUserSelect: () => {},
  });

  const [ydoc] = useState(() => new Y.Doc());

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable native history since Collaboration takes over undo/redo management
        history: false,
        undoRedo: false,
        heading: {
          levels: [1, 2, 3, 4, 5, 6, 7, 8] as any,
        },
      } as any),
      Collaboration.configure({
        document: ydoc,
      }),
      PlaceholderBlock,
      MacroBlock,
      Excerpt,
      LayoutSection,
      LayoutColumn,
      CardsGrid,
      CardItem,
      TabsContainer,
      TabItem,
      CalloutPanel,
      InlineStatus,
      Mention,
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
      CommentMark,
    ],
    content: "", // Start empty; populated dynamically by WebSocket sync-history or offline fallback
    editable: false,
    editorProps: {
      attributes: {
        class: "editor-content",
      },
      handleKeyDown: (_, event) => {
        // Intercept Cmd+K or Ctrl+K to open AI Assistant prompt bar
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "k"
        ) {
          event.preventDefault();
          setAiPromptOpen(true);
          return true;
        }

        if (!menuStateRef.current.menuOpen) {
          return false;
        }

        const itemsLength =
          menuStateRef.current.menuMode === "slash"
            ? menuStateRef.current.filteredCommands.length
            : menuStateRef.current.filteredUsers.length;

        if (itemsLength === 0) {
          return false;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % itemsLength);
          return true;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + itemsLength) % itemsLength);
          return true;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          if (menuStateRef.current.menuMode === "slash") {
            const cmd =
              menuStateRef.current.filteredCommands[
                menuStateRef.current.selectedIndex
              ];
            if (cmd) {
              menuStateRef.current.executeCommand(cmd);
            }
          } else {
            const user =
              menuStateRef.current.filteredUsers[
                menuStateRef.current.selectedIndex
              ];
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
                }),
              );
              event.preventDefault();
              event.stopPropagation();
              return true;
            }
          } catch (err) {
            console.error("Error toggling details block:", err);
          }
          return false;
        },
      },
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
    },
  });

  const handleForceCheckout = async (isTimeout: boolean) => {
    if (!editor) return;
    let description = "Auto-saved snapshot";
    if (isTimeout) {
      try {
        const res = await autogenSummary(
          activeDocId || "",
          JSON.stringify(editor.getJSON()),
          title,
        );
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
      timeoutId = setTimeout(
        () => {
          handleForceCheckout(true);
        },
        10 * 60 * 1000,
      ); // 10 minutes
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
        undoRedo: false,
        heading: {
          levels: [1, 2, 3, 4, 5, 6, 7, 8] as any,
        },
      } as any),
      MacroBlock,
      Excerpt,
      LayoutSection,
      LayoutColumn,
      CardsGrid,
      CardItem,
      TabsContainer,
      TabItem,
      CalloutPanel,
      InlineStatus,
      Mention,
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

  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const saveDocument = (customTitle?: string, customDescription?: string) => {
    const activeTitle = customTitle !== undefined ? customTitle : title;
    const titleToSave =
      activeTitle.trim() === "" ? lastNonEmptyTitle.current : activeTitle;
    if (editor && !editor.isDestroyed) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onSave(titleToSave, JSON.stringify(editor.getJSON()), customDescription);
      }, 1000);
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
        editor
          .chain()
          .focus()
          .toggleHeading({ level: level as any })
          .run();
      }
    }
  };

  // Breadcrumb path computation
  const path =
    documents && activeDocId
      ? findBreadcrumbPath(documents, activeDocId)
      : null;
  const breadcrumbsList = path
    ? path.map((item, idx) =>
        idx === path.length - 1 ? { ...item, title } : item,
      )
    : [{ id: activeDocId || "root", title }];

  // Page Analytics statistics computation
  const getDocumentStats = () => {
    if (!editor || editor.isDestroyed || !editor.schema)
      return {
        words: 0,
        characters: 0,
        readTime: 0,
        blocks: {
          paragraphs: 0,
          headings: 0,
          tables: 0,
          images: 0,
          callouts: 0,
          statuses: 0,
          dates: 0,
          tasks: 0,
        },
      };
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
        tasks,
      },
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
          })(),
        );
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [editor, initialContent]);

  const { activeUsers } = usePresence(
    activeDocId,
    authToken,
    editor,
    ydoc,
    (isFirst) => {
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
          })(),
        );
      }
    },
  );

  const uniqueActiveUsers = activeUsers.filter(
    (user, index, self) =>
      self.findIndex((u) => u.userId === user.userId) === index,
  );

  const commands: SlashCommandItem[] = [
    {
      id: "h1",
      label: "Heading 1",
      description: "Big section title",
      icon: <Heading1 size={16} style={{ color: "var(--accent-blue)" }} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
      category: "text",
    },
    {
      id: "h2",
      label: "Heading 2",
      description: "Medium section subtitle",
      icon: <Heading2 size={16} style={{ color: "var(--accent-purple)" }} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
      category: "text",
    },
    {
      id: "h3",
      label: "Heading 3",
      description: "Small section heading",
      icon: <Heading3 size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
      category: "text",
    },
    {
      id: "h4",
      label: "Heading 4",
      description: "Heading level 4",
      icon: <Heading4 size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 4 }).run(),
      category: "text",
    },
    {
      id: "h5",
      label: "Heading 5",
      description: "Heading level 5",
      icon: <Heading5 size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 5 }).run(),
      category: "text",
    },
    {
      id: "h6",
      label: "Heading 6",
      description: "Heading level 6",
      icon: <Heading6 size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 6 }).run(),
      category: "text",
    },
    {
      id: "h7",
      label: "Heading 7",
      description: "Heading level 7",
      icon: <Heading size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) =>
        ed
          .chain()
          .focus()
          .toggleHeading({ level: 7 as any })
          .run(),
      category: "text",
    },
    {
      id: "h8",
      label: "Heading 8",
      description: "Heading level 8",
      icon: <Heading size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) =>
        ed
          .chain()
          .focus()
          .toggleHeading({ level: 8 as any })
          .run(),
      category: "text",
    },
    {
      id: "bullet",
      label: "Bullet List",
      description: "Simple bulleted list",
      icon: <List size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => ed.chain().focus().toggleBulletList().run(),
      category: "text",
    },
    {
      id: "number",
      label: "Numbered List",
      description: "Ordered sequential list",
      icon: <ListOrdered size={16} style={{ color: "#fbbf24" }} />,
      action: (ed) => ed.chain().focus().toggleOrderedList().run(),
      category: "text",
    },
    {
      id: "code",
      label: "Code Block",
      description: "Syntax highlighted code block",
      icon: <Code size={16} style={{ color: "#2dd4bf" }} />,
      action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
      category: "text",
    },
    {
      id: "quote",
      label: "Quote",
      description: "Blockquote style",
      icon: <Quote size={16} style={{ color: "#a78bfa" }} />,
      action: (ed) => ed.chain().focus().toggleBlockquote().run(),
      category: "text",
    },
    {
      id: "ai-prompt",
      label: "Ask AI",
      description: "Generate or rewrite text inline",
      icon: <Sparkles size={16} style={{ color: "var(--accent-purple)" }} />,
      action: () => {
        setAiPromptOpen(true);
      },
      category: "ai",
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
              config: { status: "Active" },
            },
          })
          .run();
      },
      category: "tasks",
    },
    {
      id: "markdown-paste",
      label: "Markdown Import",
      description: "Paste and parse Markdown content",
      icon: <FileText size={16} style={{ color: "var(--accent-purple)" }} />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "markdown-paste",
              config: { markdown: "", isBlockMode: false },
            },
          })
          .run();
      },
      category: "integrations",
    },
    {
      id: "ai-content",
      label: "AI Content Block",
      description: "Ask AI to generate text directly on the page",
      icon: <Sparkles size={16} style={{ color: "var(--accent-purple)" }} />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "ai-content",
              config: { prompt: "", generatedText: "" },
            },
          })
          .run();
      },
      category: "ai",
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
              config: { tableId: "table_metrics_01" },
            },
          })
          .run();
      },
      category: "diagrams",
    },
    {
      id: "roadmap-planner",
      label: "Roadmap Planner",
      description: "Insert a Gantt-style project roadmap",
      icon: <BadgeAlert size={16} style={{ color: "var(--accent-purple)" }} />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "roadmap-planner",
              config: {},
            },
          })
          .run();
      },
      category: "diagrams",
    },
    {
      id: "team-calendars",
      label: "Team Calendars",
      description: "Embed a team event calendar",
      icon: <BadgeAlert size={16} style={{ color: "var(--accent-purple)" }} />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "team-calendars",
              config: {},
            },
          })
          .run();
      },
      category: "diagrams",
    },
    {
      id: "popular-labels",
      label: "Popular Labels",
      description: "Generate a word cloud of popular labels",
      icon: <BadgeAlert size={16} style={{ color: "var(--accent-purple)" }} />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "popular-labels",
              config: {},
            },
          })
          .run();
      },
      category: "integrations",
    },
    {
      id: "children-display",
      label: "Children Display",
      description: "List child pages under the current document",
      icon: (
        <FolderInput
          size={16}
          style={{ color: "var(--accent-blue, #60a5fa)" }}
        />
      ),
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "children-display",
              config: {},
            },
          })
          .run();
      },
      category: "layout",
    },
    {
      id: "page-index",
      label: "Page Index",
      description: "Alphabetical directory of all pages",
      icon: (
        <Layers size={16} style={{ color: "var(--accent-purple, #a78bfa)" }} />
      ),
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "page-index",
              config: {},
            },
          })
          .run();
      },
      category: "layout",
    },
    {
      id: "attachments-list",
      label: "Attachments List",
      description: "Show table or grid of all page attachments",
      icon: (
        <Paperclip
          size={16}
          style={{ color: "var(--accent-purple, #a78bfa)" }}
        />
      ),
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "attachments-list",
              config: { layout: "table" },
            },
          })
          .run();
      },
      category: "media",
    },
    {
      id: "file-preview",
      label: "File Preview",
      description:
        "Embed an interactive file preview (Word, PowerPoint, 3D model, PDF)",
      icon: (
        <Paperclip size={16} style={{ color: "var(--accent-blue, #60a5fa)" }} />
      ),
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "single-attachment",
              config: { attachmentId: "", layoutStyle: "preview" },
            },
          })
          .run();
      },
      category: "media",
    },
    {
      id: "excerpt",
      label: "Excerpt Area",
      description: "Define excerpt section for inclusion",
      icon: (
        <FileText
          size={16}
          style={{ color: "var(--accent-purple, #a78bfa)" }}
        />
      ),
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "excerpt",
            content: [{ type: "paragraph" }],
          })
          .run();
      },
      category: "integrations",
    },
    {
      id: "excerpt-include",
      label: "Excerpt Include",
      description: "Include excerpt from another page",
      icon: (
        <FileUp size={16} style={{ color: "var(--accent-blue, #60a5fa)" }} />
      ),
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "excerpt-include",
              config: {},
            },
          })
          .run();
      },
      category: "integrations",
    },
    {
      id: "mentions-list",
      label: "Mentions List",
      description: "List of all documents mentioning a user",
      icon: (
        <AtSign size={16} style={{ color: "var(--accent-purple, #a78bfa)" }} />
      ),
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "mentions-list",
              config: {
                username: "current",
                sortBy: "updated_at",
              },
            },
          })
          .run();
      },
      category: "integrations",
    },
    {
      id: "drawio",
      label: "Draw.io Diagram",
      description: "Insert an offline Draw.io vector drawing canvas",
      icon: (
        <Palette size={16} style={{ color: "var(--accent-pink, #f472b6)" }} />
      ),
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "drawio",
              config: { xml: "", svg: "" },
            },
          })
          .run();
      },
      category: "diagrams",
    },
    {
      id: "excalidraw",
      label: "Excalidraw Diagram",
      description: "Insert an offline Excalidraw sketching canvas",
      icon: (
        <PenTool size={16} style={{ color: "var(--accent-purple, #a78bfa)" }} />
      ),
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "excalidraw",
              config: { elements: [], appState: {}, svg: "" },
            },
          })
          .run();
      },
      category: "diagrams",
    },
    {
      id: "mermaid",
      label: "Mermaid Diagram",
      description: "Render flowcharts and sequence diagrams from text",
      icon: (
        <Network size={16} style={{ color: "var(--accent-blue, #60a5fa)" }} />
      ),
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "mermaid",
              config: { code: "graph TD\n  A --> B", svg: "" },
            },
          })
          .run();
      },
      category: "diagrams",
    },
    {
      id: "jira-gitlab-issue",
      label: "Jira / GitLab Issue",
      description: "Embed an interactive JIRA or GitLab issue card",
      icon: <Cpu size={16} style={{ color: "#fca121" }} />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "jira-gitlab-issue",
              config: { url: "" },
            },
          })
          .run();
      },
      category: "integrations",
    },
    {
      id: "table",
      label: "Table",
      description: "Insert an interactive data table",
      icon: <Grid3X3 size={16} style={{ color: "var(--accent-blue)" }} />,
      action: () => {
        setTableCreatorOpen(true);
      },
      category: "layout",
    },
    {
      id: "hero",
      label: "Hero / Banner",
      description: "A large landing-page style banner with text and buttons",
      icon: <Layout size={16} style={{ color: "#f43f5e" }} />,
      action: (ed) => {
        ed.chain()
          .focus()
          .insertContent({
            type: "macroBlock",
            attrs: {
              type: "hero",
              config: {
                title: "Welcome to the Hub",
                subtitle: "Discover our roadmaps and team directory.",
                primaryCtaLabel: "Get Started",
                layoutVariant: "hero",
                alignment: "Center"
              },
            },
          })
          .run();
      },
      category: "layout",
    },
    {
      id: "cards-grid",
      label: "Cards Grid",
      description: "A responsive grid of cards",
      icon: <Layout size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => {
        ed.chain().focus().insertContent({
          type: "cardsGrid",
          attrs: { cardSize: "md" },
          content: [
            { type: "cardItem", attrs: { cardId: Math.random().toString(36).substr(2, 9) }, content: [{ type: "paragraph", content: [{ type: "text", text: "New Card" }] }] },
            { type: "cardItem", attrs: { cardId: Math.random().toString(36).substr(2, 9) }, content: [{ type: "paragraph", content: [{ type: "text", text: "New Card" }] }] },
          ]
        }).run();
      },
      category: "layout",
    },
    {
      id: "tabs",
      label: "Tabs",
      description: "Interactive tabbed content",
      icon: <FolderInput size={16} style={{ color: "var(--accent-blue)" }} />,
      action: (ed) => {
        ed.chain().focus().insertContent({
          type: "tabsContainer",
          content: [
            { type: "tabItem", attrs: { label: "Tab 1", tabId: Math.random().toString(36).substr(2, 9) }, content: [{ type: "paragraph", content: [{ type: "text", text: "Content 1" }] }] },
            { type: "tabItem", attrs: { label: "Tab 2", tabId: Math.random().toString(36).substr(2, 9) }, content: [{ type: "paragraph", content: [{ type: "text", text: "Content 2" }] }] },
          ]
        }).run();
      },
      category: "layout",
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
              { type: "layoutColumn", content: [{ type: "paragraph" }] },
            ],
          })
          .setTextSelection(pos + 3)
          .run();
      },
      category: "layout",
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
              { type: "layoutColumn", content: [{ type: "paragraph" }] },
            ],
          })
          .setTextSelection(pos + 3)
          .run();
      },
      category: "layout",
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
              { type: "layoutColumn", content: [{ type: "paragraph" }] },
            ],
          })
          .setTextSelection(pos + 3)
          .run();
      },
      category: "layout",
    },
    {
      id: "layout-asymmetric-right",
      label: "Columns (30/70)",
      description: "Narrow left column, wide right column",
      icon: (
        <Layout
          size={16}
          style={{ color: "#fbbf24", transform: "scaleX(-1)" }}
        />
      ),
      action: (ed) => {
        const pos = ed.state.selection.from;
        ed.chain()
          .focus()
          .insertContent({
            type: "layoutSection",
            attrs: { layout: "asymmetric-right" },
            content: [
              { type: "layoutColumn", content: [{ type: "paragraph" }] },
              { type: "layoutColumn", content: [{ type: "paragraph" }] },
            ],
          })
          .setTextSelection(pos + 3)
          .run();
      },
      category: "layout",
    },
    {
      id: "image",
      label: "Insert Image",
      description: "Upload and insert an image",
      icon: <Image size={16} style={{ color: "#8b5cf6" }} />,
      action: (ed) => {
        triggerImageUpload(ed);
      },
      category: "media",
    },
    {
      id: "inline-status",
      label: "Status Badge",
      description: "Insert an inline status pill",
      icon: <Smile size={16} style={{ color: "#3b82f6" }} />,
      action: (ed) =>
        ed
          .chain()
          .focus()
          .insertContent({
            type: "inlineStatus",
            attrs: { text: "TODO", color: "blue" },
          })
          .run(),
      category: "tasks",
    },
    {
      id: "callout-info",
      label: "Info Panel",
      description: "Insert a blue information callout",
      icon: <Info size={16} style={{ color: "#3b82f6" }} />,
      action: (ed) =>
        ed
          .chain()
          .focus()
          .insertContent({
            type: "calloutPanel",
            attrs: { type: "info" },
            content: [{ type: "paragraph" }],
          })
          .run(),
      category: "callouts",
    },
    {
      id: "callout-note",
      label: "Note Panel",
      description: "Insert a yellow note callout",
      icon: <AlertCircle size={16} style={{ color: "#f59e0b" }} />,
      action: (ed) =>
        ed
          .chain()
          .focus()
          .insertContent({
            type: "calloutPanel",
            attrs: { type: "note" },
            content: [{ type: "paragraph" }],
          })
          .run(),
      category: "callouts",
    },
    {
      id: "callout-tip",
      label: "Tip Panel",
      description: "Insert a green tip callout",
      icon: <Lightbulb size={16} style={{ color: "#10b981" }} />,
      action: (ed) =>
        ed
          .chain()
          .focus()
          .insertContent({
            type: "calloutPanel",
            attrs: { type: "tip" },
            content: [{ type: "paragraph" }],
          })
          .run(),
      category: "callouts",
    },
    {
      id: "callout-warning",
      label: "Warning Panel",
      description: "Insert a yellow warning callout",
      icon: <AlertTriangle size={16} style={{ color: "#f59e0b" }} />,
      action: (ed) =>
        ed
          .chain()
          .focus()
          .insertContent({
            type: "calloutPanel",
            attrs: { type: "warning" },
            content: [{ type: "paragraph" }],
          })
          .run(),
      category: "callouts",
    },
    {
      id: "callout-error",
      label: "Error Panel",
      description: "Insert a red error callout",
      icon: <AlertCircle size={16} style={{ color: "#ef4444" }} />,
      action: (ed) =>
        ed
          .chain()
          .focus()
          .insertContent({
            type: "calloutPanel",
            attrs: { type: "error" },
            content: [{ type: "paragraph" }],
          })
          .run(),
      category: "callouts",
    },
    {
      id: "callout-check",
      label: "Check Panel",
      description: "Insert a green success callout",
      icon: <Check size={16} style={{ color: "#10b981" }} />,
      action: (ed) =>
        ed
          .chain()
          .focus()
          .insertContent({
            type: "calloutPanel",
            attrs: { type: "check" },
            content: [{ type: "paragraph" }],
          })
          .run(),
      category: "callouts",
    },
    {
      id: "task-list",
      label: "Task List",
      description: "Insert a checkable task checklist",
      icon: <ListTodo size={16} style={{ color: "var(--accent-purple)" }} />,
      action: (ed) => ed.chain().focus().toggleTaskList().run(),
      category: "tasks",
    },
    {
      id: "details-summary",
      label: "Expandable Box",
      description: "Insert a collapsible block panel",
      icon: (
        <ChevronsUpDown size={16} style={{ color: "var(--accent-blue)" }} />
      ),
      action: (ed) =>
        ed
          .chain()
          .focus()
          .insertContent({
            type: "details",
            content: [
              { type: "detailsSummary" },
              { type: "detailsContent", content: [{ type: "paragraph" }] },
            ],
          })
          .run(),
      category: "callouts",
    },
    {
      id: "inline-date",
      label: "Date Pill",
      description: "Insert an inline date indicator",
      icon: <Calendar size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) =>
        ed.chain().focus().insertContent({ type: "inlineDate" }).run(),
      category: "tasks",
    },
    {
      id: "no-format-panel",
      label: "No Format Panel",
      description: "Monospace panel block for unformatted text",
      icon: <SquareTerminal size={16} style={{ color: "#94a3b8" }} />,
      action: (ed) =>
        ed.chain().focus().insertContent({ type: "noFormatPanel" }).run(),
      category: "text",
    },
    {
      id: "table-of-contents",
      label: "Table of Contents",
      description: "Auto-generate a heading-based outline",
      icon: <List size={16} style={{ color: "var(--primary-color)" }} />,
      action: (ed) =>
        ed.chain().focus().insertContent({ type: "tableOfContents" }).run(),
      category: "advanced",
    },
    {
      id: "symbol-picker",
      label: "Symbol Picker",
      description: "Insert special symbols (Ω, →, etc.)",
      icon: (
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, fontSize: "14px", color: "#fbbf24", pl: 0.25 }}
        >
          Ω
        </Typography>
      ),
      action: () => {
        const rect = window
          .getSelection()
          ?.getRangeAt(0)
          .getBoundingClientRect();
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
      category: "text",
    },
    {
      id: "lorem-ipsum",
      label: "Lorem Ipsum",
      description: "Insert dummy lorem ipsum text",
      icon: <Type size={16} style={{ color: "var(--accent-blue)" }} />,
      action: () => {
        setLoremDialogOpen(true);
      },
      category: "text",
    },
  ];

  const templateCommands: SlashCommandItem[] = blockTemplates.map((t) => ({
    id: `template_${t.id}`,
    label: t.title,
    description: t.description || "Template snippet",
    icon: <Copy size={16} style={{ color: "var(--primary-color)" }} />,
    action: (editor) => {
      try {
        const json = JSON.parse(t.content);
        editor.chain().focus().insertContent(json).run();
      } catch (e) {
        console.error("Failed to parse template AST", e);
      }
    },
    category: "Snippets",
  }));

  const allCommands = [...commands, ...templateCommands];

  // Filter commands dynamically based on input query
  const filteredCommands = allCommands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredUsers = teamUsers.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const checkSlashCommand = (editorInstance: any) => {
    if (!isEditing) {
      setMenuOpen(false);
      return;
    }
    const { selection } = editorInstance.state;
    const { $from } = selection;

    // Extract text in current paragraph block before the cursor
    const textBeforeCursor = $from.parent.textBetween(
      0,
      $from.parentOffset,
      null,
      null,
    );

    const lastSlashIndex = textBeforeCursor.lastIndexOf("/");
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (
      lastAtIndex !== -1 &&
      (lastSlashIndex === -1 || lastAtIndex > lastSlashIndex)
    ) {
      const query = textBeforeCursor.substring(lastAtIndex + 1);

      // Ensure there are no spaces after the @
      if (!query.includes(" ")) {
        const range = window.getSelection()?.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          const matchingUsers = teamUsers.filter((u) =>
            u.username.toLowerCase().includes(query.toLowerCase()),
          );

          if (matchingUsers.length > 0) {
            const viewportHeight = window.innerHeight;
            const itemCount = matchingUsers.length;
            const estimatedMenuHeight = Math.min(
              280,
              20 + itemCount * 36.5 + 8,
            );
            const spaceBelow = viewportHeight - rect.bottom;

            let top = rect.bottom + 8;
            if (
              spaceBelow < estimatedMenuHeight + 16 &&
              rect.top > estimatedMenuHeight + 16
            ) {
              top = rect.top - estimatedMenuHeight - 8;
            }

            setMenuPosition({
              top: top,
              left: rect.left,
            });
            setSearchQuery(query);
            setMenuMode("mention");
            setMenuOpen(true);
            setSelectedIndex((prev) =>
              prev >= matchingUsers.length ? 0 : prev,
            );
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

          const matching = commands.filter(
            (c) =>
              c.label.toLowerCase().includes(query.toLowerCase()) ||
              c.description.toLowerCase().includes(query.toLowerCase()),
          );

          if (matching.length > 0) {
            const viewportHeight = window.innerHeight;
            const itemCount = matching.length;
            const estimatedMenuHeight = Math.min(
              280,
              20 + itemCount * 36.5 + 8,
            );
            const spaceBelow = viewportHeight - rect.bottom;

            let top = rect.bottom + 8;
            if (
              spaceBelow < estimatedMenuHeight + 16 &&
              rect.top > estimatedMenuHeight + 16
            ) {
              top = rect.top - estimatedMenuHeight - 8;
            }

            setMenuPosition({
              top: top,
              left: rect.left,
            });
            setSearchQuery(query);
            setMenuMode("slash");
            setMenuOpen(true);
            setSelectedIndex((prev) => (prev >= matching.length ? 0 : prev));
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
      .insertContent({
        type: "mention",
        attrs: { id: user.id, username: user.username },
      })
      .insertContent(" ")
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
    executeUserSelect,
  };
  // Scroll selected autocomplete menu item into view automatically
  useEffect(() => {
    const handleRemoveCommentMark = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { anchorId } = customEvent.detail;
      if (!editor || !anchorId) return;

      const tr = editor.state.tr;
      editor.state.doc.descendants((node, pos) => {
        const hasMark = node.marks.find(
          (mark) =>
            mark.type.name === "comment" && mark.attrs.commentId === anchorId,
        );
        if (hasMark) {
          tr.removeMark(pos, pos + node.nodeSize, hasMark);
        }
      });

      if (tr.docChanged) {
        editor.view.dispatch(tr);
        saveDocument();
      }
    };

    document.addEventListener("remove-comment-mark", handleRemoveCommentMark);
    return () => {
      document.removeEventListener("remove-comment-mark", handleRemoveCommentMark);
    };
  }, [editor]);

  // Scroll selected autocomplete menu item into view automatically
  useEffect(() => {
    if (menuOpen) {
      const selectedEl = document.getElementById(
        `slash-menu-item-${selectedIndex}`,
      );
      const container = document.getElementById("slash-menu-container");
      if (selectedEl && container) {
        selectedEl.scrollIntoView({ block: "nearest", behavior: "auto" });
      }
    }
  }, [selectedIndex, menuOpen]);

  const handleInsertTable = (
    rows: number,
    cols: number,
    withHeaderRow: boolean,
  ) => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow }).run();
  };

  const LOREM_PARAGRAPHS = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin elementum metus a ipsum imperdiet, sit amet convallis ipsum dictum. Ut ac metus id mi sodales consequat a a felis. Praesent sit amet facilisis lectus. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Vestibulum sed tristique tellus, vel egestas massa. In cursus nunc vitae scelerisque maximus.",
    "Nullam cursus lacus quis leo facilisis, a consequat diam cursus. Integer a purus vel ex hendrerit interdum. Phasellus porta leo ut egestas volutpat. Phasellus ut convallis arcu. Duis quis nisl id leo scelerisque bibendum. Praesent eget urna vel elit aliquet congue rhoncus id erat. Quisque porta nunc id tortor tempor convallis.",
    "Duis elementum accumsan nulla sed tempus. Aliquam nec arcu sodales, pretium ex eget, iaculis erat. Curabitur vel sodales magna, quis tempus elit. Suspendisse non sapien sed urna interdum euismod ac non nibh. Praesent non dictum dolor. Morbi a metus congue, accumsan nunc ut, pretium urna. Pellentesque at sem sem. Cras convallis ipsum vel tellus lacinia dictum.",
    "Maecenas id ex efficitur, iaculis ante a, euismod dolor. Aliquam pulvinar est vel tristique egestas. Pellentesque sodales volutpat arcu sed feugiat. Ut et felis eget sapien pretium tristique eu nec lectus. Mauris non tincidunt massa. Proin quis sapien varius, accumsan diam a, congue elit. Donec et sem eget lacus tempus varius.",
    "Sed tristique, leo id rhoncus convallis, lorem felis sodales leo, sed vestibulum nisl erat ut neque. Suspendisse eget elit vitae nisl hendrerit laoreet. Fusce sed finibus mauris. Cras sollicitudin tincidunt turpis vel elementum. Aliquam erat volutpat. Nam nec urna vel tellus dictum ultrices et et lectus. Curabitur a tempor leo. Sed nec ipsum sed justo consequat commodo nec id elit.",
  ];

  const insertLoremIpsum = (count: number) => {
    if (!editor) return;
    const contentToInsert = LOREM_PARAGRAPHS.slice(0, count).map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
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
      <div
        className="accent-glow-purple"
        style={{ position: "absolute", right: "40px", top: "40px" }}
      />
      <div
        className="accent-glow-blue"
        style={{ position: "absolute", left: "80px", bottom: "40px" }}
      />

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
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: "12.5px",
                  fontFamily: '"Outfit", sans-serif',
                }}
              >
                Previewing Version {previewVersion.versionNumber} - "
                {previewVersion.changeSummary || "Auto-saved snapshot"}"
                (Created {new Date(previewVersion.createdAt).toLocaleString()}{" "}
                by {previewVersion.createdBy || "Anonymous"})
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
                  "&:hover": { bgcolor: "#b45309" },
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
                  "&:hover": { borderColor: "#f59e0b" },
                }}
              >
                Exit Preview
              </Button>
            </Box>
          </Box>
        )}

        {/* Sticky Header Container */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: "var(--panel-color)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top Header Actions Bar */}
          <EditorHeader
          editor={editor}
          activeDocId={activeDocId}
          developerMode={developerMode}
          isSaving={isSaving}
          previewVersion={previewVersion}
          isFavorite={isFavorite}
          setIsFavorite={setIsFavorite}
          selectedProjectName={selectedProjectName || ""}
          selectedTeamName={selectedTeamName || ""}
          breadcrumbsList={breadcrumbsList}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          showComments={showComments}
          setShowComments={setShowComments}
          uniqueActiveUsers={uniqueActiveUsers}
          moreMenuAnchor={moreMenuAnchor}
          historyOpen={historyOpen}
          attachments={attachments}
          deletedAt={deletedAt}
          handleToggleHistory={handleToggleHistory}
          handleOpenMoreMenu={handleOpenMoreMenu}
          handleCloseMoreMenu={handleCloseMoreMenu}
          handleTriggerMove={handleTriggerMove}
          handleTriggerDelete={handleTriggerDelete}
          setAnalyticsOpen={setAnalyticsOpen}
          setCommitDescription={setCommitDescription}
          setCommitModalOpen={setCommitModalOpen}
          setExportDialogOpen={setExportDialogOpen}
          setJsonDialogOpen={setJsonDialogOpen}
          setRestrictionsDialogOpen={setRestrictionsDialogOpen}
          setSharingLinksDialogOpen={setSharingLinksDialogOpen}
          setPageSettingsDialogOpen={setPageSettingsDialogOpen}
          addFavorite={addFavorite}
          removeFavorite={removeFavorite}
        />

        {/* Formatting Quick Toolbar */}
        {editor && isEditing && !previewVersion && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 0.75,
              color: "text.secondary",
              px: { xs: 2, sm: 3, md: 4 },
              pt: 1,
              pb: 1,
              borderBottom: "1px solid var(--border-color)",
              pointerEvents: isTitleFocused ? "none" : "auto",
              opacity: isTitleFocused ? 0.35 : 1,
              transition: "all 0.15s ease",
            }}
          >
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
                backgroundColor: "action.hover",
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
                },
              }}
              MenuProps={
                {
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
                            },
                          },
                        },
                      },
                    },
                  },
                } as any
              }
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

            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.5, height: 16, alignSelf: "center" }}
            />

            {/* Typography Group */}
            <Tooltip title="Bold" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleBold().run()}
                sx={{
                  color: editor.isActive("bold") ? "primary.light" : "inherit",
                  backgroundColor: editor.isActive("bold")
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
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
                  color: editor.isActive("italic")
                    ? "primary.light"
                    : "inherit",
                  backgroundColor: editor.isActive("italic")
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
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
                  color: editor.isActive("strike")
                    ? "primary.light"
                    : "inherit",
                  backgroundColor: editor.isActive("strike")
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
                }}
              >
                <Strikethrough size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Underline" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                sx={{
                  color: editor.isActive("underline") ? "primary.light" : "inherit",
                  backgroundColor: editor.isActive("underline")
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
                }}
              >
                <UnderlineIcon size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Text Color" arrow>
              <IconButton
                size="small"
                sx={{
                  position: "relative",
                  color: editor.getAttributes("textStyle")?.color || "inherit",
                  backgroundColor: editor.isActive("textStyle", { color: editor.getAttributes("textStyle")?.color })
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
                }}
              >
                <Palette size={15} />
                <input 
                  type="color"
                  value={editor.getAttributes("textStyle")?.color || "#000000"}
                  onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
                  style={{
                    position: "absolute",
                    opacity: 0,
                    width: "100%",
                    height: "100%",
                    cursor: "pointer"
                  }}
                />
              </IconButton>
            </Tooltip>

            <Tooltip title="Highlight" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                sx={{
                  color: editor.isActive("highlight") ? "primary.light" : "inherit",
                  backgroundColor: editor.isActive("highlight")
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
                }}
              >
                <Highlighter size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Subscript" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleSubscript().run()}
                sx={{
                  color: editor.isActive("subscript") ? "primary.light" : "inherit",
                  backgroundColor: editor.isActive("subscript")
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
                }}
              >
                <SubscriptIcon size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Superscript" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleSuperscript().run()}
                sx={{
                  color: editor.isActive("superscript") ? "primary.light" : "inherit",
                  backgroundColor: editor.isActive("superscript")
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
                }}
              >
                <SuperscriptIcon size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Insert Link" arrow>
              <IconButton
                size="small"
                onClick={() => {
                  if (editor) {
                    const attrs = editor.getAttributes("link");
                    setLinkInitialUrl(attrs.href || "");
                    setLinkInitialText("");
                    setInsertLinkDialogOpen(true);
                  }
                }}
                sx={{
                  color: editor.isActive("link") ? "primary.light" : "inherit",
                  backgroundColor: editor.isActive("link")
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
                }}
              >
                <Link2 size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Inline Code" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleCode().run()}
                sx={{
                  color: editor.isActive("code") ? "primary.light" : "inherit",
                  backgroundColor: editor.isActive("code")
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
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
                  color: editor.isActive("codeBlock")
                    ? "primary.light"
                    : "inherit",
                  backgroundColor: editor.isActive("codeBlock")
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
                }}
              >
                <SquareTerminal size={15} />
              </IconButton>
            </Tooltip>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.5, height: 16, alignSelf: "center" }}
            />

            {/* Alignment Group */}
            <Tooltip title="Align Left" arrow>
              <IconButton
                size="small"
                onClick={() =>
                  editor.chain().focus().setTextAlign("left").run()
                }
                sx={{
                  color: editor.isActive({ textAlign: "left" })
                    ? "primary.light"
                    : "inherit",
                  backgroundColor: editor.isActive({ textAlign: "left" })
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
                }}
              >
                <AlignLeft size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Align Center" arrow>
              <IconButton
                size="small"
                onClick={() =>
                  editor.chain().focus().setTextAlign("center").run()
                }
                sx={{
                  color: editor.isActive({ textAlign: "center" })
                    ? "primary.light"
                    : "inherit",
                  backgroundColor: editor.isActive({ textAlign: "center" })
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
                }}
              >
                <AlignCenter size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Align Right" arrow>
              <IconButton
                size="small"
                onClick={() =>
                  editor.chain().focus().setTextAlign("right").run()
                }
                sx={{
                  color: editor.isActive({ textAlign: "right" })
                    ? "primary.light"
                    : "inherit",
                  backgroundColor: editor.isActive({ textAlign: "right" })
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
                }}
              >
                <AlignRight size={15} />
              </IconButton>
            </Tooltip>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.5, height: 16, alignSelf: "center" }}
            />

            {/* Lists */}
            <Tooltip title="Bullet List" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                sx={{
                  color: editor.isActive("bulletList")
                    ? "primary.light"
                    : "inherit",
                  backgroundColor: editor.isActive("bulletList")
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
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
                  color: editor.isActive("orderedList")
                    ? "primary.light"
                    : "inherit",
                  backgroundColor: editor.isActive("orderedList")
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
                }}
              >
                <ListOrdered size={15} />
              </IconButton>
            </Tooltip>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.5, height: 16, alignSelf: "center" }}
            />

            {/* Insert Complex Components */}
            <Tooltip title="Insert Table" arrow>
              <IconButton
                size="small"
                onClick={() => setTableCreatorOpen(true)}
                sx={{
                  color: "inherit",
                  "&:hover": {
                    color: "primary.light",
                    backgroundColor: "action.hover",
                  },
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
                  "&:hover": {
                    color: "primary.light",
                    backgroundColor: "action.hover",
                  },
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
                  editor
                    .chain()
                    .focus()
                    .insertContent({
                      type: "layoutSection",
                      attrs: { layout: "twocol" },
                      content: [
                        {
                          type: "layoutColumn",
                          content: [{ type: "paragraph" }],
                        },
                        {
                          type: "layoutColumn",
                          content: [{ type: "paragraph" }],
                        },
                      ],
                    })
                    .setTextSelection(pos + 3)
                    .run();
                  setLayoutMenuAnchor(null);
                }}
              >
                <ListItemIcon sx={{ color: "text.secondary" }}>
                  <Columns2 size={14} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2">2 Columns (50/50)</Typography>
                  }
                />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  const pos = editor.state.selection.from;
                  editor
                    .chain()
                    .focus()
                    .insertContent({
                      type: "layoutSection",
                      attrs: { layout: "threecol" },
                      content: [
                        {
                          type: "layoutColumn",
                          content: [{ type: "paragraph" }],
                        },
                        {
                          type: "layoutColumn",
                          content: [{ type: "paragraph" }],
                        },
                        {
                          type: "layoutColumn",
                          content: [{ type: "paragraph" }],
                        },
                      ],
                    })
                    .setTextSelection(pos + 3)
                    .run();
                  setLayoutMenuAnchor(null);
                }}
              >
                <ListItemIcon sx={{ color: "text.secondary" }}>
                  <Columns3 size={14} />
                </ListItemIcon>
                <ListItemText
                  primary={<Typography variant="body2">3 Columns</Typography>}
                />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  const pos = editor.state.selection.from;
                  editor
                    .chain()
                    .focus()
                    .insertContent({
                      type: "layoutSection",
                      attrs: { layout: "asymmetric-left" },
                      content: [
                        {
                          type: "layoutColumn",
                          content: [{ type: "paragraph" }],
                        },
                        {
                          type: "layoutColumn",
                          content: [{ type: "paragraph" }],
                        },
                      ],
                    })
                    .setTextSelection(pos + 3)
                    .run();
                  setLayoutMenuAnchor(null);
                }}
              >
                <ListItemIcon sx={{ color: "text.secondary" }}>
                  <Layout size={14} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2">Columns (70/30)</Typography>
                  }
                />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  const pos = editor.state.selection.from;
                  editor
                    .chain()
                    .focus()
                    .insertContent({
                      type: "layoutSection",
                      attrs: { layout: "asymmetric-right" },
                      content: [
                        {
                          type: "layoutColumn",
                          content: [{ type: "paragraph" }],
                        },
                        {
                          type: "layoutColumn",
                          content: [{ type: "paragraph" }],
                        },
                      ],
                    })
                    .setTextSelection(pos + 3)
                    .run();
                  setLayoutMenuAnchor(null);
                }}
              >
                <ListItemIcon sx={{ color: "text.secondary" }}>
                  <Layout size={14} style={{ transform: "scaleX(-1)" }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2">Columns (30/70)</Typography>
                  }
                />
              </MenuItem>
            </Menu>

            <Tooltip title="Ask AI Assistant" arrow>
              <IconButton
                size="small"
                onClick={() => setAiPromptOpen(true)}
                sx={{
                  color: "inherit",
                  "&:hover": {
                    color: "primary.light",
                    backgroundColor: "action.hover",
                  },
                }}
              >
                <Sparkles size={15} />
              </IconButton>
            </Tooltip>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.5, height: 16, alignSelf: "center" }}
            />

            {/* Dynamically Render Favorited Macros */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                flexWrap: "nowrap",
                overflow: "hidden",
                flexShrink: 1,
              }}
            >
              {favorites.map((favId) => {
                const cmd = commands.find((c) => c.id === favId);
                if (!cmd) return null;

                const isActive = () => {
                  if (cmd.id === "bullet") return editor.isActive("bulletList");
                  if (cmd.id === "number")
                    return editor.isActive("orderedList");
                  if (cmd.id === "code") return editor.isActive("codeBlock");
                  if (cmd.id === "task-list")
                    return editor.isActive("taskList");
                  return false;
                };

                return (
                  <Tooltip key={cmd.id} title={cmd.label} arrow>
                    <IconButton
                      size="small"
                      onClick={() => cmd.action(editor)}
                      sx={{
                        color: isActive() ? "primary.light" : "inherit",
                        backgroundColor: isActive()
                          ? "rgba(139, 92, 246, 0.1)"
                          : "transparent",
                        flexShrink: 0,
                        "&:hover": {
                          color: "primary.light",
                          backgroundColor: "action.hover",
                        },
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
                    borderColor: "var(--primary-color)",
                  },
                }}
              >
                <Plus size={15} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        </Box>

        {/* Editor Main Content */}
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: 3,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            gap: 2,
          }}
        >
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
                <AlertCircle
                  size={20}
                  style={{
                    color: "var(--error-color, #ef4444)",
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      color: "text.primary",
                      fontSize: "14px",
                      fontFamily: '"Outfit", sans-serif',
                    }}
                  >
                    This page is in the Trash Bin
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", fontSize: "12.5px" }}
                  >
                    It was deleted on {new Date(deletedAt).toLocaleDateString()}
                    . You cannot edit this page until it is restored.
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  width: { xs: "100%", sm: "auto" },
                  justifyContent: { xs: "flex-end", sm: "flex-start" },
                }}
              >
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
                    },
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
                    "&:hover": { boxShadow: "none" },
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
              value={
                previewVersion
                  ? `${title} (Version ${previewVersion.versionNumber} Preview)`
                  : title
              }
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
                "& input::placeholder": {
                  color: "text.disabled",
                  opacity: 0.5,
                },
                fontFamily: '"Outfit", sans-serif',
                letterSpacing: "-0.02em",
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
                  opacity: 0.75,
                }}
              >
                Created by {createdBy || "System"}, last updated on{" "}
                {formatDate(updatedAt || createdAt)} by {updatedBy || "System"}
              </Typography>
            )}
          </Box>

          {/* Editor Body */}
          <Box sx={{ flex: 1 }} className={!showComments ? "hide-comments" : ""}>
            <DocumentContext.Provider
              value={{
                documents,
                activeDocId,
                onSelectDoc: onSelectDoc || (() => {}),
                selectedTeamId,
              }}
            >
              <EditorContent editor={previewVersion ? previewEditor : editor} />
            </DocumentContext.Provider>
          </Box>

          {/* Page Attachments Section */}
          {activeDocId &&
            ((isEditing && !deletedAt) || attachments.length > 0) && (
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

          {/* Image Gallery Section */}
          {activeDocId && attachments.length > 0 && (
            <Box id="page-image-gallery-section">
              <ImageGallery
                attachments={attachments}
                apiBaseUrl={API_BASE_URL}
              />
            </Box>
          )}

          {/* Page Tags Section */}
          {activeDocId && (
            <DocumentTags docId={activeDocId} readOnly={!!deletedAt} />
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
          teams={teams}
          projects={projects}
          currentTeamId={selectedTeamId || undefined}
          currentProjectId={selectedProjectId || undefined}
          onConfirm={onMoveDoc}
        />
      )}

      {/* Page Settings Modal */}
      {pageSettingsDialogOpen && (
        <PageSettingsModal
          open={pageSettingsDialogOpen}
          onClose={() => setPageSettingsDialogOpen(false)}
          document={documents.find((d: any) => d.id === activeDocId) || { id: activeDocId, title, content: "", slug: "", projectId: "", parentId: null, createdAt: "", updatedAt: "", createdBy: "", updatedBy: "" } as any}
          onUpdate={(updatedDoc) => {
            if (activeDocId) {
              const currentUrl = new URL(window.location.href);
              const pathParts = currentUrl.pathname.split('/');
              if (pathParts[pathParts.length - 1] === activeDocId || pathParts.includes(activeDocId)) {
                // If the url was using the documentId, or the old slug, replace it with the new slug
                const newPath = currentUrl.pathname.replace(pathParts[pathParts.length - 1], updatedDoc.slug || updatedDoc.id);
                window.history.pushState({}, "", newPath);
              }
            }
          }}
          showToast={showToast}
        />
      )}

      {/* Export Page Dialog */}
      {exportDialogOpen && (
        <ExportDialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          documentId={activeDocId || ""}
          documentTitle={title}
          hasChildren={
            !!(
              documents &&
              documents.some((d) => d.parentId === activeDocId && !d.deletedAt)
            )
          }
        />
      )}

      {/* Page Restrictions Dialog */}
      {restrictionsDialogOpen && (
        <PageRestrictionsDialog
          open={restrictionsDialogOpen}
          onClose={() => setRestrictionsDialogOpen(false)}
          documentId={activeDocId || ""}
          documentTitle={title}
        />
      )}

      {/* Sharing Links Dialog */}
      {sharingLinksDialogOpen && (
        <SharingLinksDialog
          open={sharingLinksDialogOpen}
          onClose={() => setSharingLinksDialogOpen(false)}
          documentId={activeDocId || ""}
          documentTitle={title}
        />
      )}

      {/* Caret-Positioned Autocomplete Popup Menu */}
      {menuOpen &&
        ((menuMode === "slash" && filteredCommands.length > 0) ||
          (menuMode === "mention" && filteredUsers.length > 0)) && (
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
                      fontSize: "9px",
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
                        backgroundColor:
                          idx === selectedIndex
                            ? "color-mix(in srgb, var(--primary-color) 12%, transparent)"
                            : "transparent",
                        color:
                          idx === selectedIndex
                            ? "text.primary"
                            : "text.secondary",
                        "&:hover": {
                          backgroundColor:
                            idx === selectedIndex
                              ? "color-mix(in srgb, var(--primary-color) 18%, transparent)"
                              : "action.hover",
                          color: "text.primary",
                        },
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Box
                        sx={{
                          backgroundColor: "var(--bg-color)",
                          border: "1px solid var(--border-color)",
                          p: 0.75,
                          borderRadius: 1.5,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color:
                            idx === selectedIndex ? "primary.light" : "inherit",
                        }}
                      >
                        {cmd.icon}
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, fontSize: "12.5px" }}
                        >
                          {cmd.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.disabled", fontSize: "10px" }}
                          noWrap
                        >
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
                      fontSize: "9px",
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
                        backgroundColor:
                          idx === selectedIndex
                            ? "color-mix(in srgb, var(--primary-color) 12%, transparent)"
                            : "transparent",
                        color:
                          idx === selectedIndex
                            ? "text.primary"
                            : "text.secondary",
                        "&:hover": {
                          backgroundColor:
                            idx === selectedIndex
                              ? "color-mix(in srgb, var(--primary-color) 18%, transparent)"
                              : "action.hover",
                          color: "text.primary",
                        },
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Users
                        size={15}
                        style={{
                          color:
                            idx === selectedIndex
                              ? "var(--primary-color)"
                              : "inherit",
                        }}
                      />
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, fontSize: "12.5px" }}
                        >
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

      {/* Editor Floating Menus */}
      <EditorFloatingMenus
        editor={editor}
        tableCreatorOpen={tableCreatorOpen}
        setTableCreatorOpen={setTableCreatorOpen}
        insertTable={handleInsertTable}
        aiPromptOpen={aiPromptOpen}
        setAiPromptOpen={setAiPromptOpen}
        menuOpen={menuOpen}
        menuAnchorEl={menuPosition}
        setMenuOpen={setMenuOpen}
        menuStateRef={menuStateRef}
        handleUserMentionSelect={executeUserSelect}
        handleCommandSelect={executeCommand}
        onEditLink={() => {
          if (editor) {
            const attrs = editor.getAttributes("link");
            setLinkInitialUrl(attrs.href || "");
            setLinkInitialText("");
            setInsertLinkDialogOpen(true);
          }
        }}
        onAddComment={(commentId) => {
          saveDocument(); // Ensure we save the new inline comment marks even if in read mode
          // Fire custom event to be picked up by the CommentDrawer globally
          document.dispatchEvent(new CustomEvent("open-comment-drawer", { detail: { commentId } }));
        }}
      />

      {/* Macro Chooser Dialog */}
      <EditorMacroDialog
        macroSelectorOpen={macroSelectorOpen}
        setMacroSelectorOpen={setMacroSelectorOpen}
        macroSearchQuery={macroSearchQuery}
        setMacroSearchQuery={setMacroSearchQuery}
        activeCategoryTab={activeCategoryTab}
        setActiveCategoryTab={setActiveCategoryTab}
        commands={commands}
        editor={editor}
        toggleFavorite={toggleFavorite}
        favorites={favorites}
      />

      {/* Version History Drawer */}
      <EditorHistoryDrawer
        historyOpen={historyOpen}
        handleToggleHistory={handleToggleHistory}
        loadingVersions={loadingVersions}
        versions={versions}
        previewVersion={previewVersion}
        setPreviewVersion={setPreviewVersion}
        handleRestoreVersion={handleRestoreVersion}
        milestoneSummary={milestoneSummary}
        setMilestoneSummary={setMilestoneSummary}
        handleCreateMilestone={handleCreateMilestone}
        isSavingMilestone={isSavingMilestone}
      />

      {/* Page Analytics Dialog */}
      <EditorAnalyticsDialog
        analyticsOpen={analyticsOpen}
        setAnalyticsOpen={setAnalyticsOpen}
        loadingAnalytics={loadingAnalytics}
        analyticsData={analyticsData}
        getDocumentStats={getDocumentStats}
        LegendItem={LegendItem}
        uniqueActiveUsers={uniqueActiveUsers}
      />

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
            p: 1,
          },
        }}
      >
        <DialogTitle
          sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}
        >
          Save Version Checkpoint
        </DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <DialogContentText
            sx={{ color: "text.secondary", fontSize: "13px", mb: 1 }}
          >
            Describe your changes to create a named checkpoint in the document
            version history.
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
              "&:hover": { borderColor: "var(--border-color)" },
              "&.Mui-focused": {
                borderColor: "var(--primary-color)",
                boxShadow: "0 0 0 2px rgba(139, 92, 246, 0.15)",
              },
              transition: "all 0.15s ease",
            }}
          />
          <Button
            size="small"
            variant="outlined"
            onClick={async () => {
              if (!editor) return;
              setIsGeneratingSummary(true);
              try {
                const res = await autogenSummary(
                  activeDocId || "",
                  JSON.stringify(editor.getJSON()),
                  title,
                );
                setCommitDescription(res.summary);
              } catch (err) {
                console.error("AI summary failed:", err);
                alert(
                  "AI description generation failed. Using word difference fallback.",
                );
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
                backgroundColor: "rgba(139, 92, 246, 0.05)",
              },
            }}
            startIcon={
              isGeneratingSummary ? (
                <CircularProgress size={12} color="inherit" />
              ) : (
                <Sparkles size={12} />
              )
            }
          >
            {isGeneratingSummary ? "Generating..." : "Auto-generate using AI"}
          </Button>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
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
              "&:hover": { color: "text.primary" },
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
                "&:hover": { color: "text.primary" },
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
                  backgroundColor: "var(--primary-hover)",
                },
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
            p: 1,
          },
        }}
      >
        <DialogTitle
          sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}
        >
          Session Idle Timeout
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary", fontSize: "14px" }}>
            You have been checked out due to 10 minutes of inactivity. Your
            edits were automatically published and saved as a checkpoint.
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
                backgroundColor: "var(--primary-hover)",
              },
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
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Document JSON Representation</span>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                if (editor) {
                  navigator.clipboard.writeText(
                    JSON.stringify(editor.getJSON(), null, 2),
                  );
                }
              }}
              sx={{
                fontSize: "11px",
                fontFamily: '"Outfit", sans-serif',
                borderColor: "var(--border-color)",
                color: "text.secondary",
                textTransform: "none",
                "&:hover": {
                  borderColor: "var(--border-color)",
                  backgroundColor: "action.hover",
                },
              }}
            >
              Copy JSON
            </Button>
            <IconButton
              size="small"
              onClick={() => setJsonDialogOpen(false)}
              sx={{ color: "text.disabled" }}
            >
              <X size={16} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{ borderColor: "var(--border-color)", p: 0 }}
        >
          <Box
            component="pre"
            sx={{
              p: 2,
              m: 0,
              fontSize: "12px",
              fontFamily:
                'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              color: "#34d399",
              overflow: "auto",
              maxHeight: "60vh",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
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
              "&:hover": { backgroundColor: "var(--primary-hover)" },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <ImageSelectionDialog
        open={imageDialogOpen}
        onClose={() => {
          setImageDialogOpen(false);
          setImageDialogTargetEditor(null);
        }}
        onSelect={handleImageSelect}
        activeDocId={activeDocId}
        attachments={attachments}
        selectedTeamId={selectedTeamId}
      />

      <InsertLinkDialog
        open={insertLinkDialogOpen}
        onClose={() => setInsertLinkDialogOpen(false)}
        projectId={document.projectId || null}
        initialUrl={linkInitialUrl}
        initialText={linkInitialText}
        teams={teams}
        projects={projects}
        onSubmit={(url, text) => {
          if (editor) {
            if (text) {
              editor.chain().focus().extendMarkRange("link").setLink({ href: url }).insertContent(text).run();
            } else {
              editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            }
          }
        }}
      />
    </Box>
  );
};
