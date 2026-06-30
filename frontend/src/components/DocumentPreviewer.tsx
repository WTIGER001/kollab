import React, { useState, useEffect, useRef } from "react";
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  ButtonGroup, 
  Stack, 
  CircularProgress, 
  LinearProgress,
  IconButton,
  Alert,
  Tooltip,
  List,
  ListItemButton,
  ListItemText
} from "@mui/material";
import { 
  FileText, 
  Presentation, 
  File, 
  Download, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  List as ListIcon,
  Package
} from "lucide-react";
import JSZip from "jszip";
// @ts-ignore
import { renderAsync } from "docx-preview";
import { 
  fetchPreviewStatus, 
  retryPreviewGeneration, 
  getApiToken
} from "../services/api";
import type { PreviewStatus } from "../services/api";
import ThreeDViewer from "./ThreeDViewer";

interface DocumentPreviewerProps {
  attachmentId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  apiBaseUrl: string;
  heightSize: "sm" | "md" | "lg";
  onHeightChange?: (size: "sm" | "md" | "lg") => void;
}

interface SlideData {
  title: string;
  bullets: string[];
  images: string[];
}

export const DocumentPreviewer: React.FC<DocumentPreviewerProps> = ({
  attachmentId,
  filename,
  mimeType,
  fileSize,
  apiBaseUrl,
  heightSize,
  onHeightChange
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [interactive3D, setInteractive3D] = useState(false);

  useEffect(() => {
    setInteractive3D(false);
  }, [attachmentId]);
  
  // DOCX state
  const [docxBuffer, setDocxBuffer] = useState<ArrayBuffer | null>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // PPTX state
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showSlideList, setShowSlideList] = useState(true);

  const [serverPreviewsEnabled, setServerPreviewsEnabled] = useState<boolean | null>(null);

  const objectUrlsRef = useRef<string[]>([]);
  const downloadUrl = `${apiBaseUrl}/api/attachments/${attachmentId}`;

  // Map sizing to pixel heights
  const heightMap = {
    sm: "320px",
    md: "540px",
    lg: "820px"
  };

  const currentHeight = isFullscreen ? "100vh" : heightMap[heightSize];

  // Helper to revoke created URLs and avoid memory leaks
  const clearObjectUrls = () => {
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  };

  // Helper for XML node extraction that is robust to namespace prefixes
  const getElementsByLocalName = (parent: Element | Document, localName: string): Element[] => {
    let elements = parent.getElementsByTagName(localName);
    if (elements.length === 0) {
      elements = parent.getElementsByTagName(`p:${localName}`);
    }
    if (elements.length === 0) {
      elements = parent.getElementsByTagName(`a:${localName}`);
    }
    if (elements.length === 0) {
      const all = parent.getElementsByTagName("*");
      return Array.from(all).filter(el => el.localName === localName);
    }
    return Array.from(elements);
  };

  const [previewStatus, setPreviewStatus] = useState<PreviewStatus | null>(null);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setPreviewStatus(null);
    retryPreviewGeneration(attachmentId)
      .then(() => {
        setServerPreviewsEnabled(null);
      })
      .catch(err => {
        setError(`Failed to trigger retry: ${err.message || err}`);
        setLoading(false);
      });
  };

  const handleUseFallback = () => {
    setError(null);
    setServerPreviewsEnabled(false);
  };

  // Check if server-side PDF/HTML conversion is available and poll progress
  useEffect(() => {
    const isOffice = filename.endsWith(".docx") || filename.endsWith(".doc") || filename.endsWith(".pptx") || filename.endsWith(".ppt");
    const is3D = filename.toLowerCase().endsWith(".stl") || filename.toLowerCase().endsWith(".3mf");
    if ((!isOffice && !is3D) || serverPreviewsEnabled === false) {
      return;
    }

    setLoading(true);
    let intervalId: any = null;

    const checkStatus = () => {
      fetchPreviewStatus(attachmentId)
        .then(status => {
          setPreviewStatus(status);
          setServerPreviewsEnabled(true);

          if (status.status === "completed") {
            setLoading(false);
            setError(null);
            clearInterval(intervalId);
          } else if (status.status === "failed") {
            setLoading(false);
            setError(status.errorMessage || "Preview conversion failed on the server.");
            clearInterval(intervalId);
          } else {
            setLoading(true);
          }
        })
        .catch(err => {
          console.warn("Failed to fetch server preview status, falling back to client-side:", err);
          setServerPreviewsEnabled(false);
          setLoading(false);
          clearInterval(intervalId);
        });
    };

    checkStatus();
    intervalId = setInterval(checkStatus, 2000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [attachmentId, filename, serverPreviewsEnabled]);

  // Fetch document data for DOCX/PPTX parsing
  useEffect(() => {
    if (serverPreviewsEnabled === null || serverPreviewsEnabled === true) {
      return; // If server previews are supported or loading, don't parse client-side
    }

    const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || filename.endsWith(".docx");
    const isPptx = mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || filename.endsWith(".pptx");

    if (!isDocx && !isPptx) {
      return;
    }

    setLoading(true);
    setError(null);
    setDocxBuffer(null);
    clearObjectUrls();
    setSlides([]);
    setCurrentSlideIndex(0);

    fetch(downloadUrl)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load file content: ${res.statusText}`);
        return res.arrayBuffer();
      })
      .then(async (buffer) => {
        if (isDocx) {
          setDocxBuffer(buffer);
        } else if (isPptx) {
          try {
            const parsedSlides = await parsePptxSlides(buffer);
            if (parsedSlides.length === 0) {
              throw new Error("No readable slides found in this presentation.");
            }
            setSlides(parsedSlides);
          } catch (err: any) {
            console.error("PPTX Parsing Error:", err);
            throw new Error(`Failed to parse presentation: ${err.message || err}`);
          }
        }
      })
      .catch(err => {
        setError(err.message || "An error occurred while loading document preview.");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      clearObjectUrls();
    };
  }, [attachmentId, mimeType, filename, serverPreviewsEnabled]);

  // DOCX rendering trigger
  useEffect(() => {
    if (!docxBuffer || !docxContainerRef.current) return;

    docxContainerRef.current.innerHTML = "";
    renderAsync(docxBuffer, docxContainerRef.current, undefined, {
      className: "docx-preview-output",
      inWrapper: false,
      ignoreWidth: true,
      ignoreHeight: true
    }).catch((err: any) => {
      console.error("docx-preview error:", err);
      setError("Failed to render Word document layout.");
    });
  }, [docxBuffer]);

  // PPTX slide parsing logic using JSZip
  const parsePptxSlides = async (buffer: ArrayBuffer): Promise<SlideData[]> => {
    const zip = await JSZip.loadAsync(buffer);
    
    // Find slide files under ppt/slides/
    const slideFiles = Object.keys(zip.files).filter(name => 
      name.startsWith("ppt/slides/slide") && name.endsWith(".xml")
    );

    if (slideFiles.length === 0) return [];

    // Sort slides numerically by index (slide1.xml, slide2.xml...)
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.replace(/[^\d]/g, "")) || 0;
      const numB = parseInt(b.replace(/[^\d]/g, "")) || 0;
      return numA - numB;
    });

    const parsedSlides: SlideData[] = [];
    const parser = new DOMParser();

    for (const slidePath of slideFiles) {
      const xmlText = await zip.files[slidePath].async("text");
      const doc = parser.parseFromString(xmlText, "application/xml");
      
      // 1. Build Slide Relationships Map
      const relsPath = `ppt/slides/_rels/${slidePath.split("/").pop()}.rels`;
      const relsFile = zip.file(relsPath);
      const relsMap: { [key: string]: string } = {};
      
      if (relsFile) {
        try {
          const relsText = await relsFile.async("text");
          const relsDoc = parser.parseFromString(relsText, "application/xml");
          const relationships = getElementsByLocalName(relsDoc, "Relationship");
          for (const rel of relationships) {
            const id = rel.getAttribute("Id");
            const target = rel.getAttribute("Target");
            if (id && target) {
              let resolvedTarget = target;
              if (target.startsWith("../")) {
                resolvedTarget = target.replace("../", "ppt/");
              } else if (!target.startsWith("ppt/")) {
                resolvedTarget = `ppt/${target}`;
              }
              relsMap[id] = resolvedTarget;
            }
          }
        } catch (e) {
          console.warn("Failed to parse slide relationships", e);
        }
      }

      // 2. Extract Text Elements & Shapes
      const shapes = getElementsByLocalName(doc, "sp");
      let slideTitle = "";
      const bullets: string[] = [];

      for (const shape of shapes) {
        const txBody = getElementsByLocalName(shape, "txBody");
        if (txBody.length === 0) continue;

        const nvSpPr = getElementsByLocalName(shape, "nvSpPr");
        let isTitle = false;
        if (nvSpPr.length > 0) {
          const ph = getElementsByLocalName(nvSpPr[0], "ph");
          if (ph.length > 0) {
            const phType = ph[0].getAttribute("type");
            if (phType === "title" || phType === "ctrTitle" || phType === "subTitle") {
              isTitle = true;
            }
          }
        }

        const paragraphs = getElementsByLocalName(txBody[0], "p");
        const shapeTextLines: string[] = [];

        for (const p of paragraphs) {
          const textRuns = getElementsByLocalName(p, "t");
          const lineText = textRuns.map(run => run.textContent || "").join("");
          if (lineText.trim()) {
            shapeTextLines.push(lineText.trim());
          }
        }

        if (shapeTextLines.length === 0) continue;

        if (isTitle) {
          slideTitle = shapeTextLines.join(" ");
        } else {
          if (!slideTitle && shapeTextLines.length === 1 && shapeTextLines[0].length < 60) {
            slideTitle = shapeTextLines[0];
          } else {
            bullets.push(...shapeTextLines);
          }
        }
      }

      if (!slideTitle && bullets.length > 0) {
        slideTitle = bullets.shift() || "Slide";
      }

      // 3. Extract Slide Images
      const slideImages: string[] = [];
      const pics = getElementsByLocalName(doc, "pic");
      for (const pic of pics) {
        const blips = getElementsByLocalName(pic, "blip");
        if (blips.length > 0) {
          const embedId = blips[0].getAttribute("r:embed") || blips[0].getAttribute("embed") || blips[0].getAttribute("r:link") || blips[0].getAttribute("link");
          if (embedId && relsMap[embedId]) {
            const imageZipPath = relsMap[embedId];
            const imgFile = zip.file(imageZipPath);
            if (imgFile) {
              try {
                const blob = await imgFile.async("blob");
                const url = URL.createObjectURL(blob);
                objectUrlsRef.current.push(url);
                slideImages.push(url);
              } catch (e) {
                console.warn("Failed to extract image from zip file:", imageZipPath, e);
              }
            }
          }
        }
      }

      parsedSlides.push({
        title: slideTitle || `Slide ${parsedSlides.length + 1}`,
        bullets: bullets,
        images: slideImages
      });
    }

    return parsedSlides;
  };

  // Keyboard navigation for PPTX slides
  useEffect(() => {
    if (slides.length === 0 || !viewerRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      
      if (e.key === "ArrowRight" || e.key === "Space") {
        e.preventDefault();
        setCurrentSlideIndex(prev => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentSlideIndex(prev => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!viewerRef.current) return;

    if (!document.fullscreenElement) {
      viewerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Fullscreen Request Failed:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Watch for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Determine Type badge and icon
  const getFileTypeDetails = () => {
    const nameLower = filename.toLowerCase();
    if (nameLower.endsWith(".pdf") || mimeType === "application/pdf") {
      return { label: "PDF Document", color: "#ef4444", icon: <File size={16} color="#ef4444" /> };
    }
    if (nameLower.endsWith(".docx") || mimeType.includes("word")) {
      return { label: "Word Document", color: "#3b82f6", icon: <FileText size={16} color="#3b82f6" /> };
    }
    if (nameLower.endsWith(".pptx") || mimeType.includes("presentation")) {
      return { label: "PowerPoint", color: "#f97316", icon: <Presentation size={16} color="#f97316" /> };
    }
    if (nameLower.endsWith(".stl") || nameLower.endsWith(".3mf")) {
      return { label: "3D Model", color: "#10b981", icon: <Package size={16} color="#10b981" /> };
    }
    return { label: "Attachment", color: "#a855f7", icon: <File size={16} color="#a855f7" /> };
  };

  const typeDetails = getFileTypeDetails();

  const handleZoom = (direction: "in" | "out" | "reset") => {
    if (direction === "in") setZoom(z => Math.min(200, z + 10));
    else if (direction === "out") setZoom(z => Math.max(50, z - 10));
    else setZoom(100);
  };

  return (
    <Paper
      ref={viewerRef}
      elevation={0}
      className={`interactive-preview-card ${isFullscreen ? "fullscreen-active" : ""}`}
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: isFullscreen ? "#0b0c10" : "rgba(255, 255, 255, 0.02)",
        backdropFilter: isFullscreen ? "none" : "blur(12px)",
        border: isFullscreen ? "none" : "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: isFullscreen ? "0" : "12px",
        overflow: "hidden",
        boxShadow: isFullscreen ? "none" : "0 8px 32px 0 rgba(0, 0, 0, 0.2)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        height: currentHeight
      }}
    >
      {/* 1. Preview Top Toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.25,
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          bgcolor: "rgba(0, 0, 0, 0.25)",
          zIndex: 10
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0, flex: 1 }}>
          {typeDetails.icon}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              noWrap
              sx={{
                fontWeight: 700,
                color: "text.primary",
                fontSize: "13px",
                fontFamily: '"Outfit", sans-serif'
              }}
            >
              {filename}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "10px",
                fontFamily: '"Outfit", sans-serif',
                display: "block"
              }}
            >
              {typeDetails.label} • {(fileSize / 1024 / 1024).toFixed(2)} MB
            </Typography>
          </Box>
        </Stack>

        {/* Dynamic Controls based on File Format */}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {/* PPTX Pager Controls */}
          {slides.length > 0 && (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mr: 2 }}>
              <IconButton 
                size="small" 
                onClick={() => setCurrentSlideIndex(i => Math.max(0, i - 1))}
                disabled={currentSlideIndex === 0}
                sx={{ color: "text.primary", "&:disabled": { color: "text.disabled" } }}
              >
                <ChevronLeft size={16} />
              </IconButton>
              <Typography variant="body2" sx={{ fontSize: "11.5px", fontWeight: 700, px: 0.5 }}>
                {currentSlideIndex + 1} / {slides.length}
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => setCurrentSlideIndex(i => Math.min(slides.length - 1, i + 1))}
                disabled={currentSlideIndex === slides.length - 1}
                sx={{ color: "text.primary", "&:disabled": { color: "text.disabled" } }}
              >
                <ChevronRight size={16} />
              </IconButton>
              <Tooltip title={showSlideList ? "Hide Outline" : "Show Outline"}>
                <IconButton 
                  size="small" 
                  onClick={() => setShowSlideList(!showSlideList)}
                  sx={{ color: showSlideList ? "var(--primary-color)" : "text.secondary" }}
                >
                  <ListIcon size={15} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}

          {/* DOCX Zoom Controls */}
          {docxBuffer && (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mr: 2 }}>
              <IconButton size="small" onClick={() => handleZoom("out")} sx={{ color: "text.primary" }}>
                <ZoomOut size={15} />
              </IconButton>
              <Typography 
                variant="body2" 
                onClick={() => handleZoom("reset")}
                sx={{ fontSize: "11px", fontWeight: 700, minWidth: 40, textAlign: "center", cursor: "pointer", "&:hover": { color: "primary.light" } }}
              >
                {zoom}%
              </Typography>
              <IconButton size="small" onClick={() => handleZoom("in")} sx={{ color: "text.primary" }}>
                <ZoomIn size={15} />
              </IconButton>
            </Stack>
          )}

          {/* Size Selectors (hidden in fullscreen) */}
          {!isFullscreen && onHeightChange && (
            <ButtonGroup size="small" variant="outlined" sx={{ mr: 1, borderColor: "rgba(255,255,255,0.08)" }}>
              {(["sm", "md", "lg"] as const).map((sz) => (
                <Button
                  key={sz}
                  onClick={() => onHeightChange(sz)}
                  sx={{
                    px: 1,
                    py: 0.25,
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    minWidth: 32,
                    borderColor: "rgba(255,255,255,0.08) !important",
                    bgcolor: heightSize === sz ? "rgba(139, 92, 246, 0.15)" : "transparent",
                    color: heightSize === sz ? "var(--primary-color)" : "text.secondary",
                    "&:hover": {
                      bgcolor: heightSize === sz ? "rgba(139, 92, 246, 0.25)" : "rgba(255,255,255,0.05)"
                    }
                  }}
                >
                  {sz}
                </Button>
              ))}
            </ButtonGroup>
          )}

          {/* Utility Buttons */}
          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton size="small" onClick={toggleFullscreen} sx={{ color: "text.primary" }}>
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Download File">
            <IconButton 
              size="small" 
              component="a" 
              href={downloadUrl} 
              download 
              sx={{ color: "text.primary" }}
            >
              <Download size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* 2. Main Content Viewport */}
      <Box sx={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", bgcolor: "rgba(0,0,0,0.15)" }}>
        {/* Loading Overlay */}
        {(loading || serverPreviewsEnabled === null) && (
          <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.65)", zIndex: 5 }}>
            <Stack spacing={2} sx={{ alignItems: "center", width: "80%", maxWidth: "320px" }}>
              <CircularProgress size={40} sx={{ color: "var(--primary-color)" }} />
              {previewStatus && previewStatus.status !== "completed" && (
                <Box sx={{ width: "100%", mt: 1 }}>
                  <Typography variant="body2" align="center" sx={{ color: "#fff", mb: 1, fontFamily: '"Outfit", sans-serif' }}>
                    {previewStatus.status === "pending" && "Queueing preview task..."}
                    {previewStatus.status === "converting" && "Converting document on server..."}
                    {previewStatus.status === "converting_aspose" && "Converting via Aspose Engine..."}
                    {previewStatus.status === "converting_libreoffice" && "Running LibreOffice Fallback..."}
                    {previewStatus.status === "completed" && "Loading preview..."}
                    {` (${previewStatus.progress}%)`}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={previewStatus.progress} 
                    sx={{ 
                      height: 6, 
                      borderRadius: 3, 
                      bgcolor: "rgba(255,255,255,0.15)",
                      "& .MuiLinearProgress-bar": { bgcolor: "var(--primary-color)", borderRadius: 3 }
                    }} 
                  />
                </Box>
              )}
              {(!previewStatus || previewStatus.status === "completed") && (
                <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"Outfit", sans-serif' }}>
                  Loading preview content...
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        {/* Error Overlay */}
        {error && (
          <Box sx={{ p: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", textAlign: "center" }}>
            <Alert severity="warning" sx={{ mb: 3, maxWidth: "480px", borderRadius: "8px", bgcolor: "rgba(239, 83, 80, 0.1)", border: "1px solid rgba(239, 83, 80, 0.2)", color: "#fff", "& .MuiAlert-icon": { color: "#ef5350" } }}>
              {error}
            </Alert>
            <Stack direction="row" spacing={2} justifyContent="center">
              {serverPreviewsEnabled === true && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleRetry}
                  sx={{
                    textTransform: "none",
                    borderRadius: "8px",
                    bgcolor: "var(--primary-color)",
                    fontFamily: '"Outfit", sans-serif',
                    "&:hover": { bgcolor: "var(--primary-color)" }
                  }}
                >
                  Retry Conversion
                </Button>
              )}
              {serverPreviewsEnabled === true && (filename.endsWith(".docx") || filename.endsWith(".pptx")) && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleUseFallback}
                  sx={{
                    textTransform: "none",
                    borderRadius: "8px",
                    borderColor: "rgba(255,255,255,0.15)",
                    color: "text.primary",
                    fontFamily: '"Outfit", sans-serif',
                    "&:hover": { borderColor: "var(--primary-color)", bgcolor: "rgba(139, 92, 246, 0.1)" }
                  }}
                >
                  Local Fallback Viewer
                </Button>
              )}
              <Button
                variant="outlined"
                size="small"
                component="a"
                href={downloadUrl}
                sx={{
                  textTransform: "none",
                  borderRadius: "8px",
                  borderColor: "rgba(255,255,255,0.15)",
                  color: "text.primary",
                  fontFamily: '"Outfit", sans-serif',
                  "&:hover": { borderColor: "var(--primary-color)", bgcolor: "rgba(139, 92, 246, 0.1)" }
                }}
              >
                Download File
              </Button>
            </Stack>
          </Box>
        )}

        {/* PDF/HTML Previewer (native iframe or server-converted PDF/HTML preview) */}
        {!loading && !error && (
          // 1. Direct PDF file
          (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) ||
          // 2. Server converted preview
          (serverPreviewsEnabled === true && 
           (mimeType.includes("word") || filename.endsWith(".docx") || filename.endsWith(".doc") || mimeType.includes("presentation") || filename.endsWith(".pptx") || filename.endsWith(".ppt")))
        ) && (
          <iframe
            src={
              (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf"))
                ? downloadUrl
                : previewStatus?.format === "html"
                  ? `${apiBaseUrl}/api/attachments/${attachmentId}/preview/view/index.html?token=${encodeURIComponent(getApiToken() || "")}`
                  : `${apiBaseUrl}/api/attachments/${attachmentId}/preview/view/document.pdf?token=${encodeURIComponent(getApiToken() || "")}`
            }
            width="100%"
            height="100%"
            title="Document Preview"
            style={{ border: "none" }}
            allow="fullscreen"
            allowFullScreen={true}
          />
        )}

        {/* 3D Model Previewer (static thumbnail or interactive Three.js viewport) */}
        {!loading && !error && (filename.toLowerCase().endsWith(".stl") || filename.toLowerCase().endsWith(".3mf")) && (
          <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative", bgcolor: "#0f0f13" }}>
            {interactive3D ? (
              <ThreeDViewer downloadUrl={downloadUrl} filename={filename} />
            ) : (
              <Box sx={{ position: "relative", width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <img
                  src={`${apiBaseUrl}/api/attachments/${attachmentId}/preview/view/thumbnail.png?token=${encodeURIComponent(getApiToken() || "")}`}
                  alt="3D Model Thumbnail"
                  style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(0, 0, 0, 0.2)",
                    transition: "background-color 0.2s",
                    "&:hover": { bgcolor: "rgba(0, 0, 0, 0.4)" }
                  }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setInteractive3D(true)}
                    startIcon={<Package size={18} />}
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: "30px",
                      textTransform: "none",
                      fontWeight: 600,
                      boxShadow: "0 10px 20px rgba(0,0,0,0.3)"
                    }}
                  >
                    Load Interactive 3D Model
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* DOCX Previewer */}
        {!loading && !error && serverPreviewsEnabled === false && docxBuffer && (
          <Box 
            sx={{ 
              width: "100%", 
              height: "100%", 
              overflow: "auto", 
              p: 3, 
              display: "flex", 
              justifyContent: "center",
              bgcolor: isFullscreen ? "#1f2023" : "rgba(0,0,0,0.1)"
            }}
          >
            <style>{`
              .docx-preview-container {
                background-color: transparent !important;
                color: #2f3033 !important;
              }
              .docx-preview-container section {
                background-color: #ffffff !important;
                color: #2f3033 !important;
                box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
                margin: 0 auto 24px auto !important;
                padding: 64px 72px !important;
                display: block !important;
                width: 812px !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
              }
              .docx-preview-container section p,
              .docx-preview-container section span,
              .docx-preview-container section h1,
              .docx-preview-container section h2,
              .docx-preview-container section h3,
              .docx-preview-container section h4,
              .docx-preview-container section td,
              .docx-preview-container section th {
                color: #2f3033;
              }
            `}</style>
            <Box
              ref={docxContainerRef}
              className="docx-preview-container"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
                width: "100%",
                backgroundColor: "transparent",
                boxShadow: "none",
                padding: "0",
                fontFamily: "Calibri, Arial, sans-serif",
                minHeight: "100%",
                transition: "transform 0.2s ease"
              }}
            />
          </Box>
        )}

        {/* PPTX Presentation Previewer */}
        {!loading && !error && serverPreviewsEnabled === false && slides.length > 0 && (
          <Box sx={{ display: "flex", width: "100%", height: "100%" }}>
            {/* Outline list */}
            {showSlideList && (
              <Box 
                sx={{ 
                  width: "220px", 
                  borderRight: "1px solid rgba(255,255,255,0.05)", 
                  bgcolor: "rgba(0,0,0,0.2)",
                  overflowY: "auto", 
                  flexShrink: 0 
                }}
              >
                <List dense sx={{ p: 1 }}>
                  {slides.map((slide, idx) => (
                    <ListItemButton
                      key={idx}
                      selected={currentSlideIndex === idx}
                      onClick={() => setCurrentSlideIndex(idx)}
                      sx={{
                        borderRadius: "6px",
                        mb: 0.5,
                        py: 1,
                        borderLeft: currentSlideIndex === idx ? "3px solid var(--primary-color)" : "3px solid transparent",
                        bgcolor: currentSlideIndex === idx ? "rgba(139, 92, 246, 0.1) !important" : "transparent",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.03)" }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" noWrap sx={{ fontWeight: currentSlideIndex === idx ? 700 : 500, fontSize: "12px", color: currentSlideIndex === idx ? "var(--primary-color)" : "text.primary" }}>
                            {slide.title}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ fontSize: "10px", color: "text.secondary" }}>
                            Slide {idx + 1}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Box>
            )}

            {/* Slide Stage */}
            <Box 
              sx={{ 
                flex: 1, 
                display: "flex", 
                flexDirection: "column", 
                justifyContent: "center", 
                alignItems: "center", 
                p: 4, 
                position: "relative",
                bgcolor: "#111215" 
              }}
            >
              {/* Actual Slide Frame */}
              <Box
                sx={{
                  aspectRatio: "16/9",
                  width: "100%",
                  maxWidth: "920px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 12px 48px rgba(0,0,0,0.4)",
                  background: "linear-gradient(135deg, #1f2026 0%, #17181d 100%)",
                  p: 4,
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  overflow: "hidden",
                  userSelect: "none"
                }}
              >
                {/* Slide Header title */}
                <Typography 
                  variant="h5" 
                  sx={{ 
                    color: "#ffffff", 
                    fontWeight: 800, 
                    fontFamily: '"Outfit", sans-serif',
                    fontSize: "24px",
                    lineHeight: 1.25,
                    borderBottom: "2px solid rgba(139, 92, 246, 0.4)",
                    pb: 1.5,
                    mb: 2,
                    letterSpacing: "-0.01em"
                  }}
                >
                  {slides[currentSlideIndex].title}
                </Typography>

                {/* Split layout if there are images */}
                <Box sx={{ flex: 1, display: "flex", gap: 3, overflow: "hidden", minHeight: 0 }}>
                  {/* Left Column: Text */}
                  <Box sx={{ flex: 1.2, overflowY: "auto", pr: 1 }}>
                    {slides[currentSlideIndex].bullets.length > 0 ? (
                      <Stack spacing={1.5}>
                        {slides[currentSlideIndex].bullets.map((bullet, bidx) => (
                          <Stack key={bidx} direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                            <Box 
                              sx={{ 
                                width: "6px", 
                                height: "6px", 
                                borderRadius: "50%", 
                                bgcolor: "var(--primary-color)", 
                                mt: "8px",
                                flexShrink: 0 
                              }} 
                            />
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                color: "rgba(255, 255, 255, 0.85)", 
                                fontFamily: '"Outfit", sans-serif', 
                                fontSize: "14px",
                                fontWeight: 500,
                                lineHeight: 1.45
                              }}
                            >
                              {bullet}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    ) : (
                      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Typography variant="body2" sx={{ color: "text.disabled", fontStyle: "italic", fontSize: "13px" }}>
                          (Slide title slide or empty content)
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Right Column: Images */}
                  {slides[currentSlideIndex].images && slides[currentSlideIndex].images.length > 0 && (
                    <Box 
                      sx={{ 
                        flex: 1, 
                        display: "flex", 
                        flexDirection: "column",
                        gap: 1.5, 
                        justifyContent: "center", 
                        alignItems: "center",
                        overflowY: "auto",
                        borderLeft: "1px solid rgba(255,255,255,0.05)",
                        pl: 3
                      }}
                    >
                      {slides[currentSlideIndex].images.map((imgUrl, imgIdx) => (
                        <Box
                          key={imgIdx}
                          component="img"
                          src={imgUrl}
                          alt={`Slide Image ${imgIdx + 1}`}
                          sx={{
                            maxWidth: "100%",
                            maxHeight: slides[currentSlideIndex].images.length > 1 ? "120px" : "240px",
                            borderRadius: "6px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                            objectFit: "contain",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                              transform: "scale(1.03)",
                              borderColor: "var(--primary-color)"
                            }
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>

                {/* Footer decorations */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, borderTop: "1px solid rgba(255,255,255,0.05)", pt: 1.5 }}>
                  <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px", fontWeight: 600 }}>
                    Kollab Presenter
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "10px", fontWeight: 700 }}>
                    Slide {currentSlideIndex + 1} of {slides.length}
                  </Typography>
                </Box>
              </Box>

              {/* Arrow Keys Navigation Notice */}
              <Typography variant="caption" sx={{ color: "text.disabled", mt: 2, fontSize: "10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Use Left / Right arrow keys to navigate slides
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
};
