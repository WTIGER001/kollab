import React, { useEffect, useState, useRef } from "react";
import {
  Paper,
  Box,
  InputBase,
  IconButton,
  Chip,
  Typography,
  Button,
} from "@mui/material";
import { Sparkles, Send, RotateCcw, Check, Trash2, X } from "lucide-react";

interface AIPromptBarProps {
  editor: any;
  open: boolean;
  onClose: () => void;
}

type AIStatus = "idle" | "generating" | "completed";

export const AIPromptBar: React.FC<AIPromptBarProps> = ({ editor, open, onClose }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<AIStatus>("idle");

  // Selection caching states
  const [isRefineMode, setIsRefineMode] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [originalRange, setOriginalRange] = useState<{ from: number; to: number } | null>(null);
  const [generatedRange, setGeneratedRange] = useState<{ from: number; to: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const streamTimerRef = useRef<any>(null);

  const MOCK_RESPONSES: Record<string, string> = {
    summarize:
      "Here is a summary of the key highlights:\n\n• Project Arkollab is designed as a modular, block-based, collaborative wiki alternative.\n• Built using React + Tiptap for a premium distraction-free frontend, backed by a Go service architecture.\n• Embeds pgvector-powered semantic search and agentic Wasm tools directly inside editor canvases.",
    spelling:
      "This version has been refined for grammatical correctness, sentence flow, and consistent professional formatting.",
    longer:
      "Arkollab shifts away from traditional document editing toward a block-based modular canvas. Features include a distraction-free slate where selection and floating context menus replace heavy persistent toolbars. It integrates search-as-you-type command interfaces to insert layouts or macros, and provides inline AI prompt shortcuts to summarize or rewrite text. This context-aware generation ensures that edits blend seamlessly into the existing page structures.",
    shorter:
      "Arkollab is a block-based collaborative canvas. It features a clean distraction-free editor, slash commands for modular plugins, and inline context-aware AI text generation.",
    write:
      "Certainly! Here is a drafted section based on your prompt:\n\n### Overview & Vision\nArkollab serves as a developer-friendly wiki replacement. By combining structured ProseMirror state management with a local AI vector indexing pipeline, documents are automatically indexed on save. Users can run semantic search queries to find matching documents instantly.",
  };

  const getResponseText = (userPrompt: string): string => {
    const query = userPrompt.toLowerCase();
    if (query.includes("summar") || query.includes("condense") || query.includes("shorter")) {
      return MOCK_RESPONSES.shorter;
    }
    if (query.includes("longer") || query.includes("expand") || query.includes("elaborate")) {
      return MOCK_RESPONSES.longer;
    }
    if (query.includes("spell") || query.includes("grammar") || query.includes("fix") || query.includes("correct")) {
      return MOCK_RESPONSES.spelling;
    }
    if (query.includes("write") || query.includes("draft") || query.includes("create") || query.includes("intro")) {
      return MOCK_RESPONSES.write;
    }
    return MOCK_RESPONSES.write;
  };

  const updatePosition = () => {
    if (!editor || !open) return;

    const { selection } = editor.state;
    const { $from } = selection;

    try {
      const rect = editor.view.coordsAtPos($from.pos);
      if (rect) {
        setPosition({
          top: rect.bottom + window.scrollY + 8,
          // Align near selection center and clamp to screen size
          left: Math.max(16, Math.min(window.innerWidth - 380, rect.left + window.scrollX - 20)),
        });
      }
    } catch (e) {
      console.error("Error updating AI prompt bar position", e);
    }
  };

  // Run position calculation when menu opens or selection changes
  useEffect(() => {
    if (open) {
      updatePosition();
      setStatus("idle");
      setPrompt("");

      // Cache current selection details
      const { selection } = editor.state;
      if (selection.from !== selection.to) {
        setIsRefineMode(true);
        setOriginalText(editor.state.doc.textBetween(selection.from, selection.to));
        setOriginalRange({ from: selection.from, to: selection.to });
      } else {
        setIsRefineMode(false);
        setOriginalText("");
        setOriginalRange(null);
      }

      // Focus prompt bar input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);

      editor.on("selectionUpdate", updatePosition);
    }

    return () => {
      editor.off("selectionUpdate", updatePosition);
    };
  }, [open, editor]);

  // Clean up streaming intervals on unmount
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, []);

  if (!open || !position) return null;

  const handleStartGeneration = (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt;
    if (!activePrompt.trim()) return;

    setStatus("generating");

    // Retrieve selected range
    const { selection } = editor.state;
    let startPos = selection.from;

    // If in selection mode, delete the selection to insert new text
    if (isRefineMode && originalRange) {
      editor.chain().focus().deleteSelection().run();
      startPos = originalRange.from;
    }

    const responseText = getResponseText(activePrompt);
    const words = responseText.split(" ");
    let currentWordIdx = 0;

    // Streaming word interval simulation
    streamTimerRef.current = setInterval(() => {
      if (currentWordIdx < words.length) {
        const nextWord = words[currentWordIdx] + " ";
        editor.chain().focus().insertContent(nextWord).run();
        currentWordIdx++;
      } else {
        // Stream completed
        if (streamTimerRef.current) {
          clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
        }
        const endPos = editor.state.selection.from;
        setGeneratedRange({ from: startPos, to: endPos });
        setStatus("completed");
      }
    }, 45); // 45ms per word (~300 words/min streaming animation)
  };

  const handleKeep = () => {
    onClose();
  };

  const handleDiscard = () => {
    if (generatedRange) {
      // Delete all generated text
      editor
        .chain()
        .focus()
        .deleteRange({ from: generatedRange.from, to: generatedRange.to })
        .run();

      // If selection refinement, restore the original text
      if (isRefineMode && originalText) {
        editor.chain().focus().insertContentAt(generatedRange.from, originalText).run();
      }
    }
    onClose();
  };

  const handleTryAgain = () => {
    if (generatedRange) {
      // Clear last generated content
      editor
        .chain()
        .focus()
        .deleteRange({ from: generatedRange.from, to: generatedRange.to })
        .run();

      // Restart stream
      handleStartGeneration();
    }
  };

  const handleChipClick = (chipPrompt: string) => {
    setPrompt(chipPrompt);
    handleStartGeneration(chipPrompt);
  };

  return (
    <Paper
      elevation={8}
      sx={{
        position: "absolute",
        top: position.top,
        left: position.left,
        zIndex: 1100,
        width: 360,
        backgroundColor: "rgba(16, 18, 26, 0.95)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(139, 92, 246, 0.2)",
        borderRadius: 2,
        boxShadow: "0 16px 48px rgba(0, 0, 0, 0.5)",
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      {status === "idle" && (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Sparkles size={14} style={{ color: "var(--accent-purple)" }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.disabled", textTransform: "uppercase", fontSize: "9px" }}>
              {isRefineMode ? "Refining Selected Text" : "Ask AI Assistant"}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <IconButton size="small" onClick={onClose} sx={{ color: "text.disabled" }}>
              <X size={14} />
            </IconButton>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              backgroundColor: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 1.5,
              px: 1.5,
              py: 0.5,
            }}
          >
            <InputBase
              inputRef={inputRef}
              fullWidth
              placeholder={isRefineMode ? "Rewrite this section..." : "Ask AI to write anything..."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleStartGeneration();
                }
                if (e.key === "Escape") {
                  onClose();
                }
              }}
              sx={{ color: "text.primary", fontSize: "12.5px" }}
            />
            <IconButton
              size="small"
              onClick={() => handleStartGeneration()}
              sx={{ color: "var(--accent-purple)" }}
            >
              <Send size={13} />
            </IconButton>
          </Box>

          {/* Quick Option Chips */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {isRefineMode ? (
              <>
                <Chip
                  label="Summarize"
                  size="small"
                  onClick={() => handleChipClick("Summarize selection")}
                  sx={{ fontSize: "10px", backgroundColor: "rgba(255,255,255,0.04)", color: "text.secondary", "&:hover": { backgroundColor: "rgba(139,92,246,0.15)", color: "primary.light" } }}
                />
                <Chip
                  label="Improve Writing"
                  size="small"
                  onClick={() => handleChipClick("Improve selected text")}
                  sx={{ fontSize: "10px", backgroundColor: "rgba(255,255,255,0.04)", color: "text.secondary", "&:hover": { backgroundColor: "rgba(139,92,246,0.15)", color: "primary.light" } }}
                />
                <Chip
                  label="Make Shorter"
                  size="small"
                  onClick={() => handleChipClick("Make selection shorter")}
                  sx={{ fontSize: "10px", backgroundColor: "rgba(255,255,255,0.04)", color: "text.secondary", "&:hover": { backgroundColor: "rgba(139,92,246,0.15)", color: "primary.light" } }}
                />
              </>
            ) : (
              <>
                <Chip
                  label="Draft Intro"
                  size="small"
                  onClick={() => handleChipClick("Write a quick introduction")}
                  sx={{ fontSize: "10px", backgroundColor: "rgba(255,255,255,0.04)", color: "text.secondary", "&:hover": { backgroundColor: "rgba(139,92,246,0.15)", color: "primary.light" } }}
                />
                <Chip
                  label="Expand Draft"
                  size="small"
                  onClick={() => handleChipClick("Write a longer description")}
                  sx={{ fontSize: "10px", backgroundColor: "rgba(255,255,255,0.04)", color: "text.secondary", "&:hover": { backgroundColor: "rgba(139,92,246,0.15)", color: "primary.light" } }}
                />
              </>
            )}
          </Box>
        </>
      )}

      {status === "generating" && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.5 }}>
          <Sparkles size={15} style={{ color: "var(--accent-purple)" }} className="pulse-animation" />
          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "12px", fontStyle: "italic" }}>
            AI Assistant is writing...
          </Typography>
        </Box>
      )}

      {status === "completed" && (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Sparkles size={12} style={{ color: "var(--accent-purple)" }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.disabled", fontSize: "9px" }}>
              Generation Done
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Button
              size="small"
              variant="text"
              startIcon={<Check size={11} />}
              onClick={handleKeep}
              sx={{ color: "primary.light", fontSize: "10.5px", textTransform: "none", py: 0.25 }}
            >
              Keep
            </Button>
            <Button
              size="small"
              variant="text"
              startIcon={<RotateCcw size={11} />}
              onClick={handleTryAgain}
              sx={{ color: "text.secondary", fontSize: "10.5px", textTransform: "none", py: 0.25 }}
            >
              Regen
            </Button>
            <Button
              size="small"
              variant="text"
              startIcon={<Trash2 size={11} />}
              onClick={handleDiscard}
              sx={{ color: "error.light", fontSize: "10.5px", textTransform: "none", py: 0.25 }}
            >
              Discard
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};
