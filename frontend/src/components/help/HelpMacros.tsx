import React from "react";
import { Box, Typography } from "@mui/material";
import { Info, Sparkles, ChevronRight, Calendar, Code, List as ListIcon, Palette, PenTool } from "lucide-react";

export const HelpMacros: React.FC = () => {
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
};
