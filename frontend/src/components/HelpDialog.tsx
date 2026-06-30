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
  Info,
  Calendar,
  Layers,
  ChevronRight,
  Code,
  List as ListIcon,
  Palette,
  PenTool,
  FileText,
  Presentation,
  Package
} from "lucide-react";

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

type HelpCategory = "overview" | "macros" | "previews" | "modes" | "search" | "versions" | "analytics";

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
        return (
          <Box>
            <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 1.5 }}>
              Welcome to Kollab
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 3 }}>
              Kollab is a next-generation collaborative workspace that combines real-time document synchronization, rich interactive formatting macros, session-based version history, and AI-driven workflows. Here is how to get started with the workspace organization:
            </Typography>

            <Typography variant="subtitle2" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mb: 1.5 }}>
              Workspace Structure
            </Typography>
            
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
              <Box sx={{ display: "flex", gap: 2, p: 2, borderRadius: "8px", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)" }}>
                <Box sx={{ p: 1, height: "fit-content", borderRadius: "6px", backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
                  <Layers size={18} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px" }}>Teams & Project Workspaces</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, lineHeight: 1.4 }}>
                    Documents are organized under parent Teams and Projects. Switch your active workspace using the dropdown menus at the top of the sidebar. Selecting a project loads its document directory hierarchy.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 2, p: 2, borderRadius: "8px", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)" }}>
                <Box sx={{ p: 1, height: "fit-content", borderRadius: "6px", backgroundColor: "rgba(139, 92, 246, 0.1)", color: "var(--primary-color)" }}>
                  <BookOpen size={18} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "13px" }}>Collaborative Documents</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, lineHeight: 1.4 }}>
                    Inside a project, you can build documents in a nested hierarchy folder tree. Create folders to group pages or build single documents. Clicking on any file loads it directly in the collaborative editing canvas.
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Typography variant="subtitle2" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mb: 1 }}>
              Quick Keyboard Shortcuts
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, borderRadius: "4px", backgroundColor: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border-color)", px: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 500 }}>Global Search</Typography>
                <Typography component="kbd" sx={{ fontSize: "10px", px: 1, py: 0.25, backgroundColor: "var(--panel-color)", border: "1px solid var(--border-color)", borderRadius: 0.5, color: "text.secondary", fontFamily: "monospace" }}>⌘ + P</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, borderRadius: "4px", backgroundColor: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border-color)", px: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 500 }}>Trigger Slash Commands</Typography>
                <Typography component="kbd" sx={{ fontSize: "10px", px: 1, py: 0.25, backgroundColor: "var(--panel-color)", border: "1px solid var(--border-color)", borderRadius: 0.5, color: "text.secondary", fontFamily: "monospace" }}>/</Typography>
              </Box>
            </Box>
          </Box>
        );

      case "macros":
        return (
          <Box>
            <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 1.5 }}>
              Rich Content & Editor Macros
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 3 }}>
              Enhance your document structure using our interactive Confluence-style macros. Press the <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: "var(--primary-color)" }}>/</Typography> (Slash) key on a new line inside the editor canvas to bring up the command menu and select a macro:
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mb: 2 }}>
              {/* Callout Panels */}
              <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Info size={15} style={{ color: "var(--primary-color)" }} />
                  Callout Panels
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2, lineHeight: 1.4 }}>
                  Highlight warnings, tips, notes, or information. Callouts feature customizable panel types and sync edits in real-time.
                </Typography>
                {/* Mockup */}
                <Box sx={{ p: 1.5, borderRadius: "6px", backgroundColor: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.15)", display: "flex", gap: 1 }}>
                  <Info size={14} style={{ color: "var(--primary-color)", marginTop: 2, flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ fontSize: "11px", color: "text.primary" }}>
                    <strong>Tip:</strong> Callout panels support dynamic formatting and type-toggling in the active toolbar.
                  </Typography>
                </Box>
              </Box>

              {/* Status Badges */}
              <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Sparkles size={15} style={{ color: "#10b981" }} />
                  Inline Status Badges
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2, lineHeight: 1.4 }}>
                  Insert status indicators directly in your text lines (e.g. WIP, Done, Review). Clicking the badge in edit mode reveals a customization popover to change text and background colors.
                </Typography>
                {/* Mockup */}
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Typography variant="caption">Project Milestone Status:</Typography>
                  <Box sx={{ px: 1, py: 0.25, borderRadius: "4px", backgroundColor: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981", fontSize: "10px", fontWeight: 700 }}>
                    APPROVED
                  </Box>
                  <Box sx={{ px: 1, py: 0.25, borderRadius: "4px", backgroundColor: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#f59e0b", fontSize: "10px", fontWeight: 700 }}>
                    IN PROGRESS
                  </Box>
                </Box>
              </Box>

              {/* Collapsible Details */}
              <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <ChevronRight size={15} />
                  Details Summary (Collapsible block)
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2, lineHeight: 1.4 }}>
                  Collapse lengthy details or code examples. Users can toggle sections open or closed, which is synchronized character-by-character for other co-authors.
                </Typography>
              </Box>

              {/* Inline Dates & Monospace Panels */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Calendar size={14} style={{ color: "#ef4444" }} />
                    Inline Date Picker
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
                    Embed deadlines and dates directly. Selecting the date opens an interactive calendar menu.
                  </Typography>
                </Box>
                <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Code size={14} style={{ color: "#a855f7" }} />
                    No Format Panel
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
                    Type standard code snippets, log files, or unformatted text inside clean monospace card panels.
                  </Typography>
                </Box>
              </Box>

              {/* Table of Contents */}
              <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <ListIcon size={15} style={{ color: "var(--primary-color)" }} />
                  Table of Contents
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
                  Auto-generate a clickable, nested outline directory of the page's headings. Updates in real-time and supports smooth-scrolling to section headers.
                </Typography>
              </Box>

              {/* Drawing Types */}
              <Typography variant="subtitle2" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, mt: 1.5 }}>
                Drawing & Sketching Blocks
              </Typography>

              <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Palette size={15} style={{ color: "var(--accent-pink, #f472b6)" }} />
                  Draw.io Diagram Macro (/drawio)
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
                  Embed offline vector drawing sheets for flowcharts, wireframes, database schemas, and network topologies. Features local light/dark editor themes and click-to-zoom fullscreen lightbox previews.
                </Typography>
              </Box>

              <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <PenTool size={15} style={{ color: "var(--accent-purple, #a78bfa)" }} />
                  Excalidraw Sketching Macro (/excalidraw)
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
                  Sketch mockups, mind maps, or hand-drawn doodles directly in the editor using the offline Excalidraw whiteboarding component. Updates compile to vector SVGs automatically and support fullscreen preview overlays.
                </Typography>
              </Box>

              <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Code size={15} style={{ color: "var(--accent-blue, #60a5fa)" }} />
                  Mermaid.js Diagram Macro (/mermaid)
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
                  Render sequence diagrams, flowcharts, timelines, and Git graphs declaratively from code syntax. Features a live split-screen editor, error parsing, and instant debounced rendering.
                </Typography>
              </Box>
            </Box>
          </Box>
        );

      case "previews":
        return (
          <Box>
            <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 1.5 }}>
              Media Previews & Attachment Types
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 3 }}>
              Kollab features a high-fidelity inline document and asset previewing suite. Upload files using the page attachment sidebar or the slash command to view them natively in the document:
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mb: 2 }}>
              {/* Word Documents */}
              <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <FileText size={15} style={{ color: "#3b82f6" }} />
                  Word Document Previews (.docx)
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
                  View text, paragraphs, structured lists, and tables compiled from Microsoft Word files directly inside the page view wrapper.
                </Typography>
              </Box>

              {/* PowerPoint presentations */}
              <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Presentation size={15} style={{ color: "#f97316" }} />
                  PowerPoint Presentations (.pptx)
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
                  Browse slide decks with slide navigation controllers, sidebar slide outlines, text bullets extraction, and images previews.
                </Typography>
              </Box>

              {/* 3D Engineering Models */}
              <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Package size={15} style={{ color: "#10b981" }} />
                  3D Engineering Models (.stl, .3mf)
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
                  Interact with three-dimensional engineering models in a WebGL workspace. Supports panning, orbiting, zooming, grid scales measurement, and wireframe views.
                </Typography>
              </Box>

              {/* PDF Documents */}
              <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Info size={15} style={{ color: "#ef4444" }} />
                  PDF Documents (.pdf)
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
                  Scroll, zoom, and inspect PDF attachments using our unified inline frame viewer.
                </Typography>
              </Box>
            </Box>
          </Box>
        );

      case "modes":
        return (
          <Box>
            <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 1.5 }}>
              Editing Modes & Collaboration
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 3 }}>
              Kollab operates in two main modes to safeguard changes and enable efficient collaboration. Use the **Edit** button in the canvas header toolbar to switch modes.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mb: 4 }}>
              <Box sx={{ borderLeft: "3px solid var(--accent-blue)", pl: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Read-Only Mode (Default)</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
                  Prevents accidental typing while viewing articles. All interactive macros (Inline Dates, Status Pickers, Details summary) are disabled and display clean read-only layouts.
                </Typography>
              </Box>

              <Box sx={{ borderLeft: "3px solid var(--primary-color)", pl: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Edit Mode</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
                  Enables typing, slash command menus, block formatting tools, and customizable configuration popovers. Entering edit mode unlocks full co-authoring capability.
                </Typography>
              </Box>

              <Box sx={{ borderLeft: "3px solid #10b981", pl: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Real-time Co-Authoring & Cursors</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
                  Multiple users can edit the same document concurrently. Collaboration is driven by Yjs CRDTs, synchronizing edits character-by-character. Active author cursor positions and name tags display dynamically on screen.
                </Typography>
              </Box>
            </Box>
          </Box>
        );

      case "search":
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

      case "versions":
        return (
          <Box>
            <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 1.5 }}>
              Version Control & AI Summaries
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 3 }}>
              Kollab maintains a comprehensive historical record of edits without cluttering your workspace. Click the **History/Clock icon** in the canvas header toolbar to open the drawer:
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mb: 2 }}>
              {/* Auto saves */}
              <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Clock size={15} style={{ color: "var(--text-muted)" }} />
                  Session-based Auto-saves
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
                  Edits are rate-limited and grouped under a single `"Auto-saved snapshot"` per session. This prevents skipping version numbers and reduces timeline bloat.
                </Typography>
              </Box>

              {/* Checkpoints Done */}
              <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Sparkles size={15} style={{ color: "var(--primary-color)" }} />
                  AI Checkpoint Descriptions
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
                  When clicking **Done** to exit edit mode, you can type a custom checkpoint description or click **Auto-generate using AI** to have Google Gemini or OpenAI automatically summarize your modifications.
                </Typography>
              </Box>

              {/* Timeouts */}
              <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Info size={15} style={{ color: "#f59e0b" }} />
                  10-Minute Idle Checkouts
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}>
                  If you leave the tab inactive, the system autogenerates a description, appends `(Idle Timeout)`, saves your final session snapshot, and checks you out to let others edit.
                </Typography>
              </Box>
            </Box>
          </Box>
        );

      case "analytics":
        return (
          <Box>
            <Typography variant="h5" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, mb: 1.5 }}>
              Live Page Analytics
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 3 }}>
              Understand reader engagement on your pages. Click the **Page Analytics** icon in the canvas header toolbar to open the glassmorphism metrics dashboard:
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mb: 4 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2, textAlign: "center" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "11px", textTransform: "uppercase" }}>Total Page Views</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, my: 1, fontFamily: '"Outfit", sans-serif' }}>84</Typography>
                  <Typography variant="caption" sx={{ color: "#10b981", fontWeight: 600 }}>+12% vs last week</Typography>
                </Box>
                <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2, textAlign: "center" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "11px", textTransform: "uppercase" }}>Unique Visitors</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, my: 1, fontFamily: '"Outfit", sans-serif' }}>29</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>This week</Typography>
                </Box>
              </Box>

              <Box sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>7-Day View Sparkline</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2, lineHeight: 1.4 }}>
                  The analytics panel renders a dynamic, SVG-based sparkline graph reflecting historical page view volumes over the past 7 days.
                </Typography>
              </Box>
            </Box>
          </Box>
        );

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
