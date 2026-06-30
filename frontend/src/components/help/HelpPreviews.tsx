import React from "react";
import { Box, Typography } from "@mui/material";
import { FileText, Presentation, Package, Info } from "lucide-react";

export const HelpPreviews: React.FC = () => {
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
};
