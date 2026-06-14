import React from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { Box, IconButton, Tooltip, Divider, Button } from "@mui/material";
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from "lucide-react";

export const ImageComponent = ({ editor, node, getPos, updateAttributes, deleteNode, selected }: any) => {
  const { imageId, size, alignment, src, alt, originalWidth } = node.attrs;

  const handleAlign = (align: string) => {
    updateAttributes({ alignment: align });
  };

  const handleSize = (sz: string) => {
    const newSrc = `http://localhost:8080/api/images/${imageId}/${sz}`;
    updateAttributes({ size: sz, src: newSrc });
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!originalWidth && size === "O") {
      const img = e.currentTarget;
      if (img.naturalWidth) {
        updateAttributes({
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight
        });
      }
    }
  };

  const alignmentStyles: Record<string, React.CSSProperties> = {
    left: { display: "flex", justifyContent: "flex-start" },
    center: { display: "flex", justifyContent: "center" },
    right: { display: "flex", justifyContent: "flex-end" }
  };

  return (
    <NodeViewWrapper style={{ ...alignmentStyles[alignment || "center"], margin: "1.5rem 0" }}>
      <Box 
        onClick={(e) => {
          e.stopPropagation();
          if (typeof getPos === "function") {
            editor.commands.setNodeSelection(getPos());
          }
        }}
        sx={{ 
          position: "relative", 
          border: selected ? "2px solid #8b5cf6" : "2px solid transparent",
          borderRadius: 2,
          overflow: "hidden",
          transition: "all 0.2s ease",
          display: "inline-block",
          cursor: "pointer",
          "&:hover .image-toolbar": { opacity: 1 }
        }}
      >
        <img 
          src={src} 
          alt={alt || "Uploaded image"} 
          onLoad={handleImageLoad}
          style={{ 
            display: "block", 
            maxHeight: "600px", 
            width: "auto",
            maxWidth: "100%",
            height: "auto"
          }} 
        />
        
        {/* Floating Toolbar on hover / selection */}
        <Box 
          className="image-toolbar"
          sx={{ 
            position: "absolute", 
            top: 8, 
            left: "50%", 
            transform: "translateX(-50%)", 
            display: "flex", 
            alignItems: "center", 
            gap: 0.5, 
            backgroundColor: "rgba(20, 22, 33, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 2,
            p: 0.5,
            opacity: selected ? 1 : 0,
            transition: "opacity 0.2s ease",
            zIndex: 10,
            pointerEvents: "auto",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
          }}
        >
          {/* Alignment */}
          <Tooltip title="Align Left" arrow>
            <IconButton size="small" onClick={() => handleAlign("left")} sx={{ color: alignment === "left" ? "primary.light" : "rgba(255,255,255,0.6)", p: 0.5 }}>
              <AlignLeft size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Align Center" arrow>
            <IconButton size="small" onClick={() => handleAlign("center")} sx={{ color: alignment === "center" ? "primary.light" : "rgba(255,255,255,0.6)", p: 0.5 }}>
              <AlignCenter size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Align Right" arrow>
            <IconButton size="small" onClick={() => handleAlign("right")} sx={{ color: alignment === "right" ? "primary.light" : "rgba(255,255,255,0.6)", p: 0.5 }}>
              <AlignRight size={14} />
            </IconButton>
          </Tooltip>
 
          <Divider orientation="vertical" flexItem sx={{ mx: 0.25, height: 16, borderColor: "rgba(255,255,255,0.1)" }} />
 
          {/* Size Selectors */}
          {(!originalWidth || originalWidth > 300) && (
            <Button size="small" onClick={() => handleSize("1")} sx={{ minWidth: 28, fontSize: "10px", p: 0.5, color: size === "1" ? "primary.light" : "rgba(255,255,255,0.6)" }}>SM</Button>
          )}
          {(!originalWidth || originalWidth > 600) && (
            <Button size="small" onClick={() => handleSize("2")} sx={{ minWidth: 28, fontSize: "10px", p: 0.5, color: size === "2" ? "primary.light" : "rgba(255,255,255,0.6)" }}>MED</Button>
          )}
          {(!originalWidth || originalWidth > 900) && (
            <Button size="small" onClick={() => handleSize("3")} sx={{ minWidth: 28, fontSize: "10px", p: 0.5, color: size === "3" ? "primary.light" : "rgba(255,255,255,0.6)" }}>LG</Button>
          )}
          {(!originalWidth || originalWidth > 1200) && (
            <Button size="small" onClick={() => handleSize("4")} sx={{ minWidth: 28, fontSize: "10px", p: 0.5, color: size === "4" ? "primary.light" : "rgba(255,255,255,0.6)" }}>XL</Button>
          )}
          <Button size="small" onClick={() => handleSize("O")} sx={{ minWidth: 28, fontSize: "10px", p: 0.5, color: size === "O" ? "primary.light" : "rgba(255,255,255,0.6)" }}>ORIG</Button>
 
          <Divider orientation="vertical" flexItem sx={{ mx: 0.25, height: 16, borderColor: "rgba(255,255,255,0.1)" }} />
 
          {/* Delete */}
          <Tooltip title="Delete Image" arrow>
            <IconButton size="small" onClick={deleteNode} sx={{ color: "error.light", p: 0.5 }}>
              <Trash2 size={14} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </NodeViewWrapper>
  );
};
