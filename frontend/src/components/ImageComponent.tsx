import { authenticatedMediaUrl } from "../services/api";
import React, { useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { Box, IconButton, Tooltip, Divider, Button, Dialog } from "@mui/material";
import { AlignLeft, AlignCenter, AlignRight, Trash2, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { API_BASE_URL } from "../services/api";
import { useIsEditable } from "../hooks/useIsEditable";

export const ImageComponent = ({ editor, node, getPos, updateAttributes, deleteNode, selected }: any) => {
  const { imageId, size, alignment, src, alt, originalWidth } = node.attrs;
  const isEditable = useIsEditable(editor);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const handleAlign = (align: string) => {
    updateAttributes({ alignment: align });
  };

  const handleSize = (sz: string) => {
    const newSrc = `${API_BASE_URL}/api/images/${imageId}/${sz}`;
    updateAttributes({ size: sz, src: newSrc });
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (isEditable && !originalWidth && size === "O") {
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

  const resetViewport = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    resetViewport();
  };

  const openLightbox = () => {
    resetViewport();
    setLightboxOpen(true);
  };

  const lightboxSrc = imageId ? `${API_BASE_URL}/api/images/${imageId}/O` : src;
  const changeZoom = (amount: number) => {
    setScale((current) => Math.min(4, Math.max(1, Number((current + amount).toFixed(2)))));
  };

  return (
    <NodeViewWrapper style={{ ...alignmentStyles[alignment || "center"], margin: "1.5rem 0" }}>
      <Box 
        onClick={(e) => {
          e.stopPropagation();
          if (!isEditable) {
            openLightbox();
            return;
          }
          if (typeof getPos === "function") {
            editor.commands.setNodeSelection(getPos());
          }
        }}
        onKeyDown={(e) => {
          if (!isEditable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            e.stopPropagation();
            openLightbox();
          }
        }}
        role={isEditable ? undefined : "button"}
        tabIndex={isEditable ? undefined : 0}
        aria-label={isEditable ? undefined : `Open ${alt || "image"} in full screen`}
        sx={{ 
          position: "relative", 
          border: (selected && isEditable) ? "2px solid var(--primary-color)" : "2px solid transparent",
          borderRadius: 2,
          overflow: "hidden",
          transition: "all 0.2s ease",
          display: "inline-block",
          cursor: isEditable ? "pointer" : "zoom-in",
          "&:hover .image-toolbar": isEditable ? { opacity: 1 } : {}
        }}
      >
        <img 
          src={authenticatedMediaUrl(src)}
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
        {isEditable && (
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
              backgroundColor: "var(--panel-color)",
              border: "1px solid var(--border-color)",
              borderRadius: 2,
              p: 0.5,
              opacity: selected ? 1 : 0,
              transition: "opacity 0.2s ease",
              zIndex: 10,
              pointerEvents: "auto",
              boxShadow: "var(--shadow-elevation)"
            }}
          >
            {/* Alignment */}
            <Tooltip title="Align Left" arrow>
              <IconButton size="small" onClick={() => handleAlign("left")} sx={{ color: alignment === "left" ? "var(--primary-color)" : "var(--text-secondary)", p: 0.5 }}>
                <AlignLeft size={14} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Align Center" arrow>
              <IconButton size="small" onClick={() => handleAlign("center")} sx={{ color: alignment === "center" ? "var(--primary-color)" : "var(--text-secondary)", p: 0.5 }}>
                <AlignCenter size={14} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Align Right" arrow>
              <IconButton size="small" onClick={() => handleAlign("right")} sx={{ color: alignment === "right" ? "var(--primary-color)" : "var(--text-secondary)", p: 0.5 }}>
                <AlignRight size={14} />
              </IconButton>
            </Tooltip>
   
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25, height: 16, borderColor: "var(--border-color)" }} />
   
            {/* Size Selectors */}
            {(!originalWidth || originalWidth > 300) && (
              <Button size="small" onClick={() => handleSize("1")} sx={{ minWidth: 28, fontSize: "10px", p: 0.5, color: size === "1" ? "var(--primary-color)" : "var(--text-secondary)" }}>SM</Button>
            )}
            {(!originalWidth || originalWidth > 600) && (
              <Button size="small" onClick={() => handleSize("2")} sx={{ minWidth: 28, fontSize: "10px", p: 0.5, color: size === "2" ? "var(--primary-color)" : "var(--text-secondary)" }}>MED</Button>
            )}
            {(!originalWidth || originalWidth > 900) && (
              <Button size="small" onClick={() => handleSize("3")} sx={{ minWidth: 28, fontSize: "10px", p: 0.5, color: size === "3" ? "var(--primary-color)" : "var(--text-secondary)" }}>LG</Button>
            )}
            {(!originalWidth || originalWidth > 1200) && (
              <Button size="small" onClick={() => handleSize("4")} sx={{ minWidth: 28, fontSize: "10px", p: 0.5, color: size === "4" ? "var(--primary-color)" : "var(--text-secondary)" }}>XL</Button>
            )}
            <Button size="small" onClick={() => handleSize("O")} sx={{ minWidth: 28, fontSize: "10px", p: 0.5, color: size === "O" ? "var(--primary-color)" : "var(--text-secondary)" }}>ORIG</Button>
   
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25, height: 16, borderColor: "var(--border-color)" }} />
   
            {/* Delete */}
            <Tooltip title="Delete Image" arrow>
              <IconButton size="small" onClick={deleteNode} sx={{ color: "var(--accent-color)", p: 0.5 }}>
                <Trash2 size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      <Dialog
        open={lightboxOpen}
        onClose={closeLightbox}
        fullScreen
        aria-labelledby="image-lightbox-title"
        slotProps={{
          backdrop: { sx: { backgroundColor: "var(--glass-bg)", backdropFilter: "blur(10px)" } },
          paper: { sx: { backgroundColor: "var(--bg-color)", backgroundImage: "none" } },
        }}
      >
        <Box sx={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%", color: "var(--text-primary)" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, p: 1.5, borderBottom: "1px solid var(--border-color)", backgroundColor: "var(--panel-color)" }}>
            <Box id="image-lightbox-title" component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary)" }}>
              {alt || "Image preview"}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
              <Tooltip title="Zoom out"><span><IconButton aria-label="Zoom out" disabled={scale <= 1} onClick={() => changeZoom(-0.25)} sx={{ color: "var(--text-primary)" }}><ZoomOut size={18} /></IconButton></span></Tooltip>
              <Button aria-label="Reset zoom" onClick={resetViewport} sx={{ minWidth: 52, color: "var(--text-primary)", borderColor: "var(--border-color)" }} variant="outlined">{Math.round(scale * 100)}%</Button>
              <Tooltip title="Zoom in"><span><IconButton aria-label="Zoom in" disabled={scale >= 4} onClick={() => changeZoom(0.25)} sx={{ color: "var(--text-primary)" }}><ZoomIn size={18} /></IconButton></span></Tooltip>
              <Tooltip title="Reset view"><IconButton aria-label="Reset view" onClick={resetViewport} sx={{ color: "var(--text-primary)" }}><RotateCcw size={18} /></IconButton></Tooltip>
              <Tooltip title="Close preview"><IconButton aria-label="Close image preview" onClick={closeLightbox} sx={{ color: "var(--text-primary)" }}><X size={20} /></IconButton></Tooltip>
            </Box>
          </Box>
          <Box
            onWheel={(event) => { event.preventDefault(); changeZoom(event.deltaY > 0 ? -0.25 : 0.25); }}
            onPointerDown={(event) => {
              if (scale <= 1) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              panStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
            }}
            onPointerMove={(event) => {
              if (!panStart.current) return;
              setPan({ x: panStart.current.panX + event.clientX - panStart.current.x, y: panStart.current.panY + event.clientY - panStart.current.y });
            }}
            onPointerUp={() => { panStart.current = null; }}
            onPointerCancel={() => { panStart.current = null; }}
            sx={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", p: 2, touchAction: "none", cursor: scale > 1 ? (panStart.current ? "grabbing" : "grab") : "zoom-in" }}
          >
            <img
              src={authenticatedMediaUrl(lightboxSrc)}
              alt={alt || "Uploaded image"}
              draggable={false}
              style={{ display: "block", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transition: panStart.current ? "none" : "transform 0.15s ease-out", userSelect: "none" }}
            />
          </Box>
        </Box>
      </Dialog>
    </NodeViewWrapper>
  );
};
