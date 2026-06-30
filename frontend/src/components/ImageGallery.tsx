import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogContent,
  Tooltip,
} from "@mui/material";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Download,
} from "lucide-react";
import type { Attachment } from "../services/api";

interface ImageGalleryProps {
  attachments: Attachment[];
  apiBaseUrl: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  attachments,
  apiBaseUrl,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Filter image attachments
  const images = attachments.filter(
    (att) =>
      att.mimeType.startsWith("image/") ||
      /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(att.filename)
  );

  if (images.length === 0) {
    return null;
  }

  const handlePrev = () => {
    setLightboxIndex((prev) => (prev !== null ? (prev - 1 + images.length) % images.length : null));
  };

  const handleNext = () => {
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % images.length : null));
  };

  return (
    <Box
      sx={{
        mt: 3,
        border: "1px solid var(--border-color)",
        borderRadius: "12px",
        bgcolor: "var(--paper-color)",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Header Panel */}
      <Box
        onClick={() => setIsExpanded(!isExpanded)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2.5,
          py: 1.75,
          cursor: "pointer",
          borderBottom: isExpanded ? "1px solid var(--border-color)" : "none",
          transition: "background-color 0.2s",
          "&:hover": { bgcolor: "rgba(255, 255, 255, 0.02)" },
        }}
      >
        <ImageIcon size={18} style={{ color: "var(--primary-color)" }} />
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: "14px",
            fontFamily: '"Outfit", sans-serif',
            color: "var(--text-primary)",
            flexGrow: 1,
          }}
        >
          Image Gallery ({images.length})
        </Typography>
        <IconButton size="small" sx={{ color: "var(--text-secondary)" }}>
          <ChevronRight
            size={18}
            style={{
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </IconButton>
      </Box>

      {/* Expanded Grid View */}
      {isExpanded && (
        <Box
          sx={{
            p: 2.5,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: 2,
          }}
        >
          {images.map((img, idx) => {
            const url = `${apiBaseUrl}/api/attachments/${img.id}`;
            return (
              <Box
                key={img.id}
                onClick={() => setLightboxIndex(idx)}
                sx={{
                  position: "relative",
                  aspectRatio: "1/1",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer",
                  bgcolor: "rgba(0,0,0,0.2)",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "scale(1.04)",
                    borderColor: "var(--primary-color)",
                    boxShadow: "0 6px 16px rgba(139, 92, 246, 0.2)",
                    "& .img-overlay": { opacity: 1 },
                  },
                }}
              >
                <img
                  src={url}
                  alt={img.filename}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  loading="lazy"
                />
                {/* Overlay details */}
                <Box
                  className="img-overlay"
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    bgcolor: "rgba(0,0,0,0.65)",
                    p: 1,
                    opacity: 0,
                    transition: "opacity 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "10px",
                    }}
                  >
                    {img.filename}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Fullscreen Lightbox Carousel */}
      <Dialog
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        maxWidth="md"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: "blur(12px)",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
            },
          },
          paper: {
            sx: {
              bgcolor: "transparent",
              boxShadow: "none",
              overflow: "visible",
              m: 0,
            },
          },
        }}
      >
        <DialogContent
          sx={{
            position: "relative",
            p: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "85vh",
          }}
        >
          {/* Top Info / Controls Bar */}
          {lightboxIndex !== null && (
            <Box
              sx={{
                position: "absolute",
                top: -48,
                left: 16,
                right: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "#fff",
                zIndex: 10,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                {images[lightboxIndex].filename} ({lightboxIndex + 1} of {images.length})
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Tooltip title="Download original file">
                  <IconButton
                    component="a"
                    href={`${apiBaseUrl}/api/attachments/${images[lightboxIndex].id}`}
                    download
                    sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.08)", "&:hover": { bgcolor: "rgba(255,255,255,0.15)" } }}
                  >
                    <Download size={18} />
                  </IconButton>
                </Tooltip>
                <IconButton
                  onClick={() => setLightboxIndex(null)}
                  sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.08)", "&:hover": { bgcolor: "rgba(255,255,255,0.15)" } }}
                >
                  <X size={18} />
                </IconButton>
              </Box>
            </Box>
          )}

          {/* Nav: Prev */}
          <IconButton
            onClick={handlePrev}
            sx={{
              position: "absolute",
              left: -64,
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.06)",
              display: { xs: "none", md: "inline-flex" },
              "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
            }}
          >
            <ChevronLeft size={24} />
          </IconButton>

          {/* Image Stage */}
          {lightboxIndex !== null && (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <img
                src={`${apiBaseUrl}/api/attachments/${images[lightboxIndex].id}`}
                alt={images[lightboxIndex].filename}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: "8px",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                }}
              />
            </Box>
          )}

          {/* Nav: Next */}
          <IconButton
            onClick={handleNext}
            sx={{
              position: "absolute",
              right: -64,
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.06)",
              display: { xs: "none", md: "inline-flex" },
              "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
            }}
          >
            <ChevronRight size={24} />
          </IconButton>

          {/* Swipe indicator helper for mobile */}
          <Box sx={{ display: { xs: "flex", md: "none" }, gap: 4, mt: 2 }}>
            <IconButton onClick={handlePrev} sx={{ color: "#fff" }}>
              <ChevronLeft size={20} />
            </IconButton>
            <IconButton onClick={handleNext} sx={{ color: "#fff" }}>
              <ChevronRight size={20} />
            </IconButton>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
