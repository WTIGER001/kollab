import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { MacroBlock } from "../editor/extensions/MacroBlock";
import { LayoutSection } from "../editor/extensions/LayoutSection";
import { LayoutColumn } from "../editor/extensions/LayoutColumn";
import { CalloutPanel } from "../editor/extensions/CalloutPanel";
import { InlineStatus } from "../editor/extensions/InlineStatus";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import { CustomTableCell, CustomTableHeader } from "../editor/extensions/CustomTableExtensions";
import { CustomImage } from "../editor/extensions/CustomImage";
import { PresenceCursors } from "../editor/extensions/PresenceCursors";
import { usePresence } from "../hooks/usePresence";
import { uploadImage, fetchVersions, restoreVersion, createMilestone } from "../services/api";
import type { DocumentVersion } from "../services/api";
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
  Button
} from "@mui/material";
import { 
  Heading1, 
  Heading2, 
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
  Info
} from "lucide-react";

interface EditorCanvasProps {
  activeDocId: string | null;
  authToken: string | null;
  initialTitle: string;
  initialContent: string;
  onSave: (title: string, content: string) => void;
  isSaving?: boolean;
}

interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: (editor: any) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  activeDocId,
  authToken,
  initialTitle,
  initialContent,
  onSave,
  isSaving = false
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tableCreatorOpen, setTableCreatorOpen] = useState(false);
  const [layoutMenuAnchor, setLayoutMenuAnchor] = useState<null | HTMLElement>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);

  // Version History & Preview state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);
  const [milestoneSummary, setMilestoneSummary] = useState("");
  const [isSavingMilestone, setIsSavingMilestone] = useState(false);

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
            src: `http://localhost:8080/api/images/${meta.id}/O`,
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
  }, [initialTitle]);

  const menuStateRef = React.useRef<{
    menuOpen: boolean;
    selectedIndex: number;
    filteredCommands: SlashCommandItem[];
    executeCommand: (cmd: SlashCommandItem) => void;
  }>({
    menuOpen: false,
    selectedIndex: 0,
    filteredCommands: [],
    executeCommand: () => {}
  });

  const [ydoc] = useState(() => new Y.Doc());

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable native history since Collaboration takes over undo/redo management
        history: false,
      } as any),
      Collaboration.configure({
        document: ydoc,
      }),
      MacroBlock,
      LayoutSection,
      LayoutColumn,
      CalloutPanel,
      InlineStatus,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      CustomTableCell,
      CustomTableHeader,
      CustomImage,
      PresenceCursors,
    ],
    content: "", // Start empty; populated dynamically by WebSocket sync-history or offline fallback
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

        if (!menuStateRef.current.menuOpen || menuStateRef.current.filteredCommands.length === 0) {
          return false;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex(prev => (prev + 1) % menuStateRef.current.filteredCommands.length);
          return true;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex(prev => (prev - 1 + menuStateRef.current.filteredCommands.length) % menuStateRef.current.filteredCommands.length);
          return true;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          const cmd = menuStateRef.current.filteredCommands[menuStateRef.current.selectedIndex];
          if (cmd) {
            menuStateRef.current.executeCommand(cmd);
          }
          return true;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          setMenuOpen(false);
          return true;
        }

        return false;
      }
    },
    onUpdate: ({ editor, transaction }) => {
      // Prevent duplicate save requests by only saving locally-initiated updates
      const isRemote = transaction.getMeta("y-sync") !== undefined;
      if (!isRemote) {
        onSave(title, JSON.stringify(editor.getJSON()));
      }
      checkSlashCommand(editor);
    },
    // Triggers when selection changes
    onSelectionUpdate: ({ editor }) => {
      checkSlashCommand(editor);
    }
  });

  // Secondary read-only editor for previewing document history securely
  const previewEditor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      } as any),
      MacroBlock,
      LayoutSection,
      LayoutColumn,
      CalloutPanel,
      InlineStatus,
      Table.configure({
        resizable: false,
      }),
      TableRow,
      CustomTableCell,
      CustomTableHeader,
      CustomImage,
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
    }, 1500);
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
      action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run()
    },
    {
      id: "h2",
      label: "Heading 2",
      description: "Medium section subtitle",
      icon: <Heading2 size={16} style={{ color: "var(--accent-purple)" }} />,
      action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run()
    },
    {
      id: "bullet",
      label: "Bullet List",
      description: "Simple bulleted list",
      icon: <List size={16} style={{ color: "var(--accent-pink)" }} />,
      action: (ed) => ed.chain().focus().toggleBulletList().run()
    },
    {
      id: "number",
      label: "Numbered List",
      description: "Ordered sequential list",
      icon: <ListOrdered size={16} style={{ color: "#fbbf24" }} />,
      action: (ed) => ed.chain().focus().toggleOrderedList().run()
    },
    {
      id: "code",
      label: "Code Block",
      description: "Syntax highlighted code block",
      icon: <Code size={16} style={{ color: "#2dd4bf" }} />,
      action: (ed) => ed.chain().focus().toggleCodeBlock().run()
    },
    {
      id: "ai-prompt",
      label: "Ask AI",
      description: "Generate or rewrite text inline",
      icon: <Sparkles size={16} style={{ color: "var(--accent-purple)" }} />,
      action: () => {
        setAiPromptOpen(true);
      }
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
      }
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
      }
    },
    {
      id: "table",
      label: "Table",
      description: "Insert an interactive data table",
      icon: <Grid3X3 size={16} style={{ color: "var(--accent-blue)" }} />,
      action: () => {
        setTableCreatorOpen(true);
      }
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
      }
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
      }
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
      }
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
      }
    },
    {
      id: "image",
      label: "Insert Image",
      description: "Upload and insert an image",
      icon: <Image size={16} style={{ color: "#8b5cf6" }} />,
      action: (ed) => {
        triggerImageUpload(ed);
      }
    },
    {
      id: "inline-status",
      label: "Status Badge",
      description: "Insert an inline status pill",
      icon: <Smile size={16} style={{ color: "#3b82f6" }} />,
      action: (ed) => ed.chain().focus().insertContent({ type: "inlineStatus", attrs: { text: "TODO", color: "blue" } }).run()
    },
    {
      id: "callout-info",
      label: "Info Panel",
      description: "Insert a blue information callout",
      icon: <Info size={16} style={{ color: "#3b82f6" }} />,
      action: (ed) => ed.chain().focus().insertContent({ type: "calloutPanel", attrs: { type: "info" } }).run()
    },
    {
      id: "callout-note",
      label: "Note Panel",
      description: "Insert a yellow note callout",
      icon: <AlertCircle size={16} style={{ color: "#f59e0b" }} />,
      action: (ed) => ed.chain().focus().insertContent({ type: "calloutPanel", attrs: { type: "note" } }).run()
    },
    {
      id: "callout-tip",
      label: "Tip Panel",
      description: "Insert a green tip callout",
      icon: <Lightbulb size={16} style={{ color: "#10b981" }} />,
      action: (ed) => ed.chain().focus().insertContent({ type: "calloutPanel", attrs: { type: "tip" } }).run()
    },
    {
      id: "callout-warning",
      label: "Warning Panel",
      description: "Insert a red warning callout",
      icon: <AlertTriangle size={16} style={{ color: "#ef4444" }} />,
      action: (ed) => ed.chain().focus().insertContent({ type: "calloutPanel", attrs: { type: "warning" } }).run()
    }
  ];

  // Filter commands dynamically based on input query
  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const checkSlashCommand = (editorInstance: any) => {
    const { selection } = editorInstance.state;
    const { $from } = selection;
    
    // Extract text in current paragraph block before the cursor
    const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset, null, null);
    const lastSlashIndex = textBeforeCursor.lastIndexOf("/");
    
    if (lastSlashIndex !== -1) {
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
            // 20px header + (itemCount * 36.5px item height) + 8px padding
            const estimatedMenuHeight = Math.min(280, 20 + (itemCount * 36.5) + 8);
            const spaceBelow = viewportHeight - rect.bottom;
            
            let top = rect.bottom + 8;
            // If space below is not enough, flip to show above the cursor (relative to caret position)
            if (spaceBelow < estimatedMenuHeight + 16 && rect.top > estimatedMenuHeight + 16) {
              top = rect.top - estimatedMenuHeight - 8;
            }

            setMenuPosition({
              top: top,
              left: rect.left,
            });
            setSearchQuery(query);
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
    
    // Delete the "/" and the search query typed so far
    const queryLength = searchQuery.length;
    editor
      .chain()
      .focus()
      .deleteRange({ from: $from.pos - 1 - queryLength, to: $from.pos })
      .run();
    
    // Execute command action
    cmd.action(editor);
    setMenuOpen(false);
  };

  // Keep the ref up to date on every render
  menuStateRef.current = {
    menuOpen,
    selectedIndex,
    filteredCommands,
    executeCommand
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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = e.target.value;
    setTitle(nextTitle);
    if (editor) {
      onSave(nextTitle, JSON.stringify(editor.getJSON()));
    }
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
        px: { xs: 1.5, sm: 2, md: 3 },
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
          maxWidth: 768,
          width: "100%",
          mx: "auto",
          mt: { xs: 1.5, sm: 2, md: 3 },
          mb: { xs: 1.5, sm: 2, md: 3 },
          p: { xs: 2.5, sm: 4, md: 4 },
          minHeight: 500,
          borderRadius: 4,
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
              mb: 4,
              borderRadius: "8px",
              backgroundColor: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              color: "#f59e0b",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Clock size={16} />
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12.5px", fontFamily: '"Outfit", sans-serif' }}>
                Previewing Version {previewVersion.versionNumber} (Created {new Date(previewVersion.createdAt).toLocaleString()} by {previewVersion.createdBy || "Anonymous"})
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

        {/* Formatting Quick Toolbar */}
        {editor && !previewVersion && (
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
            // Offset Paper padding to align flush with the top edge when sticking
            mt: { xs: -2.5, sm: -4, md: -4 },
            pt: { xs: 2.5, sm: 4, md: 4 },
            pb: 1.5,
            mb: 4,
            borderBottom: "1px solid var(--border-color)",
            borderTopLeftRadius: "inherit",
            borderTopRightRadius: "inherit",
          }}>
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

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 16, alignSelf: "center" }} />

            {/* Block formats */}
            <Tooltip title="Heading 1" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                sx={{ 
                  color: editor.isActive("heading", { level: 1 }) ? "primary.light" : "inherit", 
                  backgroundColor: editor.isActive("heading", { level: 1 }) ? "rgba(139, 92, 246, 0.1)" : "transparent"
                }}
              >
                <Heading1 size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Heading 2" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                sx={{ 
                  color: editor.isActive("heading", { level: 2 }) ? "primary.light" : "inherit", 
                  backgroundColor: editor.isActive("heading", { level: 2 }) ? "rgba(139, 92, 246, 0.1)" : "transparent"
                }}
              >
                <Heading2 size={15} />
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

            {/* Upload Image */}
            <Tooltip title="Upload Image" arrow>
              <IconButton
                size="small"
                onClick={() => triggerImageUpload(editor)}
                sx={{ 
                  color: "inherit",
                  "&:hover": { color: "primary.light", backgroundColor: "action.hover" }
                }}
              >
                <Image size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Insert Status Badge" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().insertContent({ type: "inlineStatus", attrs: { text: "TODO", color: "blue" } }).run()}
                sx={{ 
                  color: "inherit",
                  "&:hover": { color: "primary.light", backgroundColor: "action.hover" }
                }}
              >
                <Smile size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Insert Info Panel" arrow>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().insertContent({ type: "calloutPanel", attrs: { type: "info" } }).run()}
                sx={{ 
                  color: "inherit",
                  "&:hover": { color: "primary.light", backgroundColor: "action.hover" }
                }}
              >
                <Info size={15} />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 16, alignSelf: "center" }} />

            {/* Favorite Star */}
            <Tooltip title={isFavorite ? "Remove from Favorites" : "Add to Favorites"} arrow>
              <IconButton
                size="small"
                onClick={() => setIsFavorite(prev => !prev)}
                sx={{ 
                  color: isFavorite ? "#fbbf24" : "inherit", 
                  backgroundColor: isFavorite ? "action.selected" : "transparent",
                  "&:hover": {
                    backgroundColor: isFavorite ? "action.selected" : "action.hover"
                  }
                }}
              >
                <Star size={15} fill={isFavorite ? "#fbbf24" : "none"} />
              </IconButton>
            </Tooltip>

            {/* Version History Toggle */}
            <Tooltip title="Version History" arrow>
              <IconButton
                size="small"
                onClick={handleToggleHistory}
                sx={{ 
                  color: historyOpen ? "primary.light" : "inherit", 
                  backgroundColor: historyOpen ? "rgba(139, 92, 246, 0.1)" : "transparent",
                  "&:hover": {
                    backgroundColor: historyOpen ? "rgba(139, 92, 246, 0.15)" : "action.hover"
                  }
                }}
              >
                <History size={15} />
              </IconButton>
            </Tooltip>

            {/* Active Users Presence List */}
            {uniqueActiveUsers.length > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: "auto", mr: 1.5 }}>
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
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          backgroundColor: user.color,
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "9px",
                          fontWeight: 700,
                          border: "2px solid var(--panel-color)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
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

            {/* Saving Indicator */}
            <Box 
              sx={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 0.75, 
                pl: 1.5, 
                ml: uniqueActiveUsers.length > 0 ? 0 : "auto",
                borderLeft: uniqueActiveUsers.length > 0 ? "1px solid var(--border-color)" : "none" 
              }}
            >
              {isSaving ? (
                <>
                  <CircularProgress size={11} sx={{ color: "text.secondary", opacity: 0.7 }} thickness={6} />
                  <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.7, fontSize: "11px", fontWeight: 500, userSelect: "none" }}>
                    Saving...
                  </Typography>
                </>
              ) : (
                <>
                  <Cloud size={13} style={{ color: "rgba(16, 185, 129, 0.7)" }} />
                  <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.7, fontSize: "11px", fontWeight: 500, display: "flex", alignItems: "center", gap: 0.25, userSelect: "none" }}>
                    Saved <Check size={11} style={{ color: "rgba(16, 185, 129, 0.8)" }} />
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        )}

        {/* Title Input */}
        <InputBase
          value={previewVersion ? `${title} (Version ${previewVersion.versionNumber} Preview)` : title}
          disabled={!!previewVersion}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          placeholder="Untitled Document"
          fullWidth
          sx={{
            color: "text.primary",
            fontSize: { xs: "28px", md: "36px" },
            fontWeight: 800,
            mb: 3,
            "& input::placeholder": { color: "text.disabled", opacity: 0.5 },
            fontFamily: '"Outfit", sans-serif',
            letterSpacing: "-0.02em"
          }}
        />

        {/* Editor Body */}
        <Box sx={{ flex: 1 }}>
          <EditorContent editor={previewVersion ? previewEditor : editor} />
        </Box>
      </Paper>

      {/* Caret-Positioned Autocomplete Popup Menu */}
      {menuOpen && filteredCommands.length > 0 && (
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
          </Paper>
        </ClickAwayListener>
      )}

      {/* Table Creator Dialog */}
      <TableCreatorDialog
        open={tableCreatorOpen}
        onClose={() => setTableCreatorOpen(false)}
        onSubmit={handleInsertTable}
      />

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
                        backgroundColor: isCurrentPreview ? "var(--primary-color)" : "var(--border-color)",
                        border: isCurrentPreview ? "2.5px solid var(--panel-color)" : "1.5px solid var(--panel-color)",
                        boxShadow: isCurrentPreview ? "0 0 0 2px var(--primary-color)" : "none",
                        zIndex: 2,
                        transition: "all 0.15s ease"
                      }}
                    />

                    {/* Version Card */}
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: "8px",
                        backgroundColor: isCurrentPreview ? "color-mix(in srgb, var(--primary-color) 8%, transparent)" : "rgba(255, 255, 255, 0.02)",
                        border: isCurrentPreview 
                          ? "1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)" 
                          : "1px solid var(--border-color)",
                        "&:hover": {
                          borderColor: isCurrentPreview 
                            ? "color-mix(in srgb, var(--primary-color) 35%, transparent)"
                            : "color-mix(in srgb, var(--text-primary) 12%, transparent)",
                          backgroundColor: isCurrentPreview 
                            ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                            : "rgba(255, 255, 255, 0.04)"
                        },
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography sx={{ fontSize: "12px", fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>
                          Version {v.versionNumber}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px", ml: "auto" }}>
                          {formattedDate}
                        </Typography>
                      </Box>

                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.25, fontSize: "10px" }}>
                        Edited by {v.createdBy || "Anonymous"}
                      </Typography>

                      {v.changeSummary && (
                        <Box
                          sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: "4px",
                            backgroundColor: "rgba(139, 92, 246, 0.08)",
                            border: "1px solid rgba(139, 92, 246, 0.15)",
                            mb: 1.5,
                          }}
                        >
                          <Typography sx={{ fontSize: "10px", fontWeight: 600, color: "var(--primary-color)" }}>
                            Milestone: {v.changeSummary}
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
                            boxShadow: "none"
                          }}
                        >
                          {isCurrentPreview ? "Viewing" : "Preview"}
                        </Button>
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
    </Box>
  );
};
