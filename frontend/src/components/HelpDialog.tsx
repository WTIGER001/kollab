import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  TextField
} from "@mui/material";
import {
  X,
  BookOpen,
  Sparkles,
  Edit3,
  Clock,
  Search,
  BarChart3,
  Layers,
  Settings
} from "lucide-react";

import { HelpOverview } from "./help/HelpOverview";
import { HelpMacros } from "./help/HelpMacros";
import { HelpPreviews } from "./help/HelpPreviews";
import { HelpModes } from "./help/HelpModes";
import { HelpSearch } from "./help/HelpSearch";
import { HelpVersions } from "./help/HelpVersions";
import { HelpAnalytics } from "./help/HelpAnalytics";
import { HelpAdmin } from "./help/HelpAdmin";

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

type HelpCategory = "overview" | "macros" | "previews" | "modes" | "search" | "versions" | "analytics" | "admin";

export const HelpDialog: React.FC<HelpDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [activeCategory, setActiveCategory] = useState<HelpCategory>("overview");

  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: "overview" as HelpCategory, label: "Getting Started", icon: <BookOpen size={16} /> },
    { id: "macros" as HelpCategory, label: "Drawing & Macros (/) ", icon: <Sparkles size={16} /> },
    { id: "previews" as HelpCategory, label: "Media & Previews", icon: <Layers size={16} /> },
    { id: "modes" as HelpCategory, label: "Editing Modes", icon: <Edit3 size={16} /> },
    { id: "search" as HelpCategory, label: "Search & Navigation", icon: <Search size={16} /> },
    { id: "versions" as HelpCategory, label: "Version Control", icon: <Clock size={16} /> },
    { id: "analytics" as HelpCategory, label: "Page Analytics", icon: <BarChart3 size={16} /> },
    { id: "admin" as HelpCategory, label: "Server Administration", icon: <Settings size={16} /> },
  ];

  const allHelpTopics = [
    {
      title: "Workspace Structure (Teams & Projects)",
      category: "overview",
      categoryLabel: "Getting Started",
      description: "How documents are structured under parent Teams and Projects in the sidebar directory.",
      keywords: ["team", "project", "workspace", "folder", "sidebar", "directory"]
    },
    {
      title: "Callout Panels",
      category: "macros",
      categoryLabel: "Drawing & Macros",
      description: "Highlight rules, tips, warnings, errors, or notes with custom styles and icons using /info, /warning, /error, etc.",
      keywords: ["callout", "info", "warning", "error", "note", "tip", "check", "alert", "box"]
    },
    {
      title: "Inline Status Badges",
      category: "macros",
      categoryLabel: "Drawing & Macros",
      description: "Insert status indicators (TODO, WIP, Done, Review) inline with text and customize colors in edit mode.",
      keywords: ["status", "badge", "pill", "todo", "wip", "done", "review", "color"]
    },
    {
      title: "Expandable Boxes (Details Accordions)",
      category: "macros",
      categoryLabel: "Drawing & Macros",
      description: "Collapse lengthy details, log output, or secondary text inside accordions using /expand or /details.",
      keywords: ["expand", "details", "accordion", "collapse", "box"]
    },
    {
      title: "Inline Date Selector Pills",
      category: "macros",
      categoryLabel: "Drawing & Macros",
      description: "Embed calendar deadlines directly into paragraphs using /date or // shortcuts.",
      keywords: ["date", "calendar", "pill", "deadline", "datepicker"]
    },
    {
      title: "No Format Monospace Panels",
      category: "macros",
      categoryLabel: "Drawing & Macros",
      description: "Type raw text, log terminal prints, or script copy bypasses rich styling inside /noformat panels.",
      keywords: ["noformat", "monospace", "code", "terminal", "plain", "text"]
    },
    {
      title: "Table of Contents (ToC)",
      category: "macros",
      categoryLabel: "Drawing & Macros",
      description: "Automatically render a nested directory outline of page headings that updates in real-time.",
      keywords: ["toc", "table of contents", "outline", "heading", "navigation"]
    },
    {
      title: "Draw.io Diagram Macro",
      category: "macros",
      categoryLabel: "Drawing & Macros",
      description: "Offline drawing canvas widget for flowcharts, wireframes, network topologies, and UML. Supports dark themes and click-to-zoom.",
      keywords: ["drawio", "diagram", "flowchart", "wireframe", "schema", "xml", "svg"]
    },
    {
      title: "Excalidraw Sketching Macro",
      category: "macros",
      categoryLabel: "Drawing & Macros",
      description: "Offline hand-drawn sketching canvas widget for mind maps, mockups, or notes. Auto-saves elements and compiles to SVG.",
      keywords: ["excalidraw", "sketch", "draw", "whiteboard", "mockup", "mindmap"]
    },
    {
      title: "Mermaid.js Diagram Macro",
      category: "macros",
      categoryLabel: "Drawing & Macros",
      description: "Render flowcharts, sequence diagrams, state diagrams, and timelines from code declarations using a split-panel editor.",
      keywords: ["mermaid", "code", "sequence", "gantt", "flowchart", "text", "diagram"]
    },
    {
      title: "Word Document Previews (.docx)",
      category: "previews",
      categoryLabel: "Media & Previews",
      description: "Preview attached Microsoft Word documents (.docx) natively with layouts, tables, and paragraphs rendering.",
      keywords: ["docx", "word", "document", "office", "attachment", "preview"]
    },
    {
      title: "PowerPoint Presentation Previews (.pptx)",
      category: "previews",
      categoryLabel: "Media & Previews",
      description: "Browse presentation slide decks with layout slides navigation, bullets outline extraction, and image extraction.",
      keywords: ["pptx", "powerpoint", "slides", "presentation", "preview", "attachment"]
    },
    {
      title: "3D Engineering Model Previews (.stl, .3mf)",
      category: "previews",
      categoryLabel: "Media & Previews",
      description: "Interact with STL/3MF files in a live WebGL viewer. Orbit, pan, zoom, measure scales, and toggle wireframe rendering.",
      keywords: ["stl", "3mf", "3d", "model", "engineering", "webgl", "wireframe"]
    },
    {
      title: "PDF Document Previews (.pdf)",
      category: "previews",
      categoryLabel: "Media & Previews",
      description: "Natively scroll, read, and inspect PDF attachments in the workspace content frames.",
      keywords: ["pdf", "viewer", "document", "attachment", "preview"]
    },
    {
      title: "Editing Modes (Read-only vs Edit)",
      category: "modes",
      categoryLabel: "Editing Modes",
      description: "Read-only mode blocks modifications to protect layouts. Edit mode unlocks co-authoring typing and settings popovers.",
      keywords: ["editing", "modes", "readonly", "edit", "coauthoring", "lock"]
    },
    {
      title: "Real-time Co-Authoring & Cursors",
      category: "modes",
      categoryLabel: "Editing Modes",
      description: "Collaborative edits synchronized character-by-character using Yjs CRDTs. Active users display colored name carets.",
      keywords: ["collaboration", "coauthoring", "cursor", "yjs", "sync", "realtime"]
    },
    {
      title: "Global Search & AI Vector Embeddings",
      category: "search",
      categoryLabel: "Search & Navigation",
      description: "Hybrid search matching titles and content keywords, plus semantic search based on LLM vectors.",
      keywords: ["search", "fuzzy", "vector", "embeddings", "ai", "semantic", "gemini", "ollama"]
    },
    {
      title: "Version Control Snapshot History",
      category: "versions",
      categoryLabel: "Version Control",
      description: "Explore session auto-saves and snapshot versions history. Restore previous states or generate AI change summaries.",
      keywords: ["history", "version", "checkpoint", "restore", "snapshot", "summary", "ai"]
    },
    {
      title: "Live Page Analytics & View Tracking",
      category: "analytics",
      categoryLabel: "Page Analytics",
      description: "Inspect total page views count, unique visitors, and view statistics over the last 7 days using sparklines.",
      keywords: ["analytics", "views", "views count", "visitors", "sparkline", "traffic", "metric"]
    },
    {
      title: "Server Administration Settings",
      category: "admin",
      categoryLabel: "Server Administration",
      description: "How to configure global welcome screen, logo, AI rate limits, and preview engines.",
      keywords: ["admin", "settings", "server", "branding", "welcome", "logo", "aspose", "libreoffice"]
    },
    {
      title: "Server Backup & Restoration",
      category: "admin",
      categoryLabel: "Server Administration",
      description: "How to export the entire server state as a single portable ZIP archive or restore backups.",
      keywords: ["backup", "restore", "zip", "export", "import", "admin", "server"]
    },
    {
      title: "Diff-Based Sync (Air-Gap Sync)",
      category: "admin",
      categoryLabel: "Server Administration",
      description: "How to generate incremental sync delta packages since an operation ID and import them on air-gapped targets.",
      keywords: ["sync", "export", "import", "air-gap", "diff", "delta", "incremental"]
    }
  ];

  const renderSearchResults = () => {
    const query = searchQuery.toLowerCase().trim();
    const filtered = allHelpTopics.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.description.toLowerCase().includes(query) ||
      t.keywords.some(k => k.includes(query))
    );

    return (
      <Box>
        <Typography variant="h6" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 0.5 }}>
          Search Results
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 3 }}>
          Found {filtered.length} matching topics for "{searchQuery}"
        </Typography>

        {filtered.length > 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {filtered.map((topic, index) => (
              <Box 
                key={index} 
                onClick={() => {
                  setActiveCategory(topic.category);
                  setSearchQuery("");
                }}
                sx={{ 
                  border: "1px solid var(--border-color)", 
                  borderRadius: "8px", 
                  p: 2, 
                  cursor: "pointer",
                  bgcolor: "rgba(255, 255, 255, 0.01)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.03)",
                    borderColor: "var(--primary-color)",
                    transform: "translateY(-1px)"
                  }
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary", fontSize: "13px" }}>
                    {topic.title}
                  </Typography>
                  <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: "4px", backgroundColor: "rgba(139, 92, 246, 0.1)", color: "var(--primary-color)", fontSize: "10px", fontWeight: 600 }}>
                    {topic.categoryLabel}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.4 }}>
                  {topic.description}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: "center", border: "2px dashed var(--border-color)", borderRadius: "12px", mt: 2 }}>
            <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 600 }}>
              No help topics found
            </Typography>
            <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.5 }}>
              Try searching for "drawio", "docx", "pdf", "history", or "analytics"
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const renderContent = () => {
    switch (activeCategory) {
      case "overview":
        return <HelpOverview />;
      case "macros":
        return <HelpMacros />;
      case "previews":
        return <HelpPreviews />;
      case "modes":
        return <HelpModes />;
      case "search":
        return <HelpSearch />;
      case "versions":
        return <HelpVersions />;
      case "analytics":
        return <HelpAnalytics />;
      case "admin":
        return <HelpAdmin />;
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: "var(--panel-color)",
          backgroundImage: "none",
          border: isMobile ? "none" : "1px solid var(--border-color)",
          borderRadius: isMobile ? 0 : "16px",
          boxShadow: "var(--shadow-premium)",
          maxHeight: isMobile ? "100%" : "80vh",
          height: isMobile ? "100%" : "auto",
          overflow: "hidden",
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: "220px", order: 1 }}>
          <Box
            sx={{
              backgroundColor: "rgba(139, 92, 246, 0.1)",
              border: "1px solid rgba(139, 92, 246, 0.2)",
              p: 0.75,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BookOpen size={16} style={{ color: "var(--primary-color)" }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', lineHeight: 1.2 }}>
              Help Center & User Guide
            </Typography>
            <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.25 }}>
              Learn how to utilize Kollab collaborative capabilities
            </Typography>
          </Box>
        </Box>

        {/* Search Bar in Header */}
        <Box sx={{ flexGrow: 1, maxWidth: { xs: "100%", sm: "300px" }, order: { xs: 3, sm: 2 } }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <Search size={14} style={{ marginRight: 6, color: "var(--text-secondary)" }} />
              ),
              sx: { 
                fontSize: "12.5px", 
                height: 34,
                bgcolor: "rgba(255, 255, 255, 0.02)",
                borderRadius: "8px",
                "& input::placeholder": { fontSize: "12.5px" }
              }
            }}
          />
        </Box>

        <IconButton size="small" onClick={onClose} sx={{ color: "text.disabled", "&:hover": { color: "text.primary" }, order: { xs: 2, sm: 3 } }}>
          <X size={16} />
        </IconButton>
      </Box>

      {/* Main Panel Content */}
      <DialogContent 
        sx={{ 
          p: 0, 
          display: "flex", 
          flexDirection: { xs: "column", sm: "row" }, 
          height: { xs: "auto", sm: "550px" },
          flexGrow: 1,
          overflow: "hidden" 
        }}
      >
        {/* Navigation Sidebar */}
        <Box
          sx={{
            width: { xs: "100%", sm: "220px" },
            borderRight: { xs: "none", sm: "1px solid var(--border-color)" },
            borderBottom: { xs: "1px solid var(--border-color)", sm: "none" },
            backgroundColor: "color-mix(in srgb, var(--text-primary) 1.5%, transparent)",
            flexShrink: 0,
            overflowX: { xs: "auto", sm: "visible" },
            overflowY: { xs: "visible", sm: "auto" },
            p: 1.5,
          }}
        >
          <List 
            disablePadding 
            sx={{ 
              display: "flex", 
              flexDirection: { xs: "row", sm: "column" }, 
              gap: 0.5,
              overflowX: { xs: "auto", sm: "visible" },
              whiteSpace: { xs: "nowrap", sm: "normal" },
              pb: { xs: 0.5, sm: 0 },
              "&::-webkit-scrollbar": { display: "none" }
            }}
          >
            {categories.map((c) => {
              const isActive = activeCategory === c.id;
              return (
                <ListItemButton
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  sx={{
                    borderRadius: "8px",
                    py: 1,
                    px: 1.5,
                    flexShrink: 0,
                    color: isActive ? "var(--primary-color)" : "text.secondary",
                    backgroundColor: isActive ? "color-mix(in srgb, var(--primary-color) 8%, transparent)" : "transparent",
                    border: isActive ? "1px solid color-mix(in srgb, var(--primary-color) 20%, transparent)" : "1px solid transparent",
                    "&:hover": {
                      color: isActive ? "var(--primary-color)" : "text.primary",
                      backgroundColor: isActive
                        ? "color-mix(in srgb, var(--primary-color) 12%, transparent)"
                        : "color-mix(in srgb, var(--text-primary) 3%, transparent)",
                    },
                    transition: "all 0.15s ease",
                  }}
                >
                  <ListItemIcon sx={{ minWidth: { xs: 22, sm: 26 }, color: "inherit", display: "flex", alignItems: "center" }}>{c.icon}</ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontSize: "12.5px", fontWeight: isActive ? 600 : 500, fontFamily: '"Outfit", sans-serif' }}>
                        {c.label}
                      </Typography>
                    }
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>

        {/* Content Viewer */}
        <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 2.5, sm: 4 } }} className="scrollbar-thin">
          {searchQuery.trim() !== "" ? renderSearchResults() : renderContent()}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
