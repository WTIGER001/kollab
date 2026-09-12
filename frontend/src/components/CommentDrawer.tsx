import { API_BASE_URL, getSharedHeaders } from "../services/api";
import React, { useEffect, useState } from "react";
import { Drawer, Box, Typography, IconButton, TextField, Button, CircularProgress, useMediaQuery } from "@mui/material";
import { useSystemSettings } from "../hooks/queries";
import { X, MessageSquare, Send, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserAvatar } from "./UserAvatar";

interface Comment {
  id: string;
  documentId: string;
  parentId?: string;
  anchorId?: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

interface CommentDrawerProps {
  documentId: string;
  authToken: string;
  currentUserId?: string;
  currentUserDisplayName?: string;
}

const fetchComments = async (docId: string, token: string): Promise<Comment[]> => {
  const res = await fetch(`${API_BASE_URL}/api/documents/${docId}/comments`, {
    headers: { "Authorization": `Bearer ${token}`, ...getSharedHeaders(docId) }
  });
  if (!res.ok) throw new Error("Failed to load comments");
  return res.json();
};

const postComment = async ({ docId, parentId, anchorId, content, token, createdByName }: { docId: string, parentId?: string, anchorId?: string, content: string, token: string, createdByName?: string }) => {
  const res = await fetch(`${API_BASE_URL}/api/documents/${docId}/comments`, {
    method: "POST",
    headers: { 
      ...getSharedHeaders(docId),
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ parentId, anchorId, content, createdByName }),
  });
  if (!res.ok) throw new Error("Failed to post comment");
  return res.json();
};

const deleteComment = async ({ commentId, token }: { commentId: string, token: string }) => {
  const res = await fetch(`${API_BASE_URL}/api/comments/${commentId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to delete comment");
};

export const CommentDrawer: React.FC<CommentDrawerProps> = ({ documentId, authToken, currentUserId, currentUserDisplayName }) => {
  const isMobile = useMediaQuery("(max-width:899.95px)");
  const { data: systemSettings } = useSystemSettings({ enabled: false });
  const [open, setOpen] = useState(false);
  const [activeAnchorId, setActiveAnchorId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", documentId],
    queryFn: () => fetchComments(documentId, authToken),
    enabled: !!documentId && !!authToken,
  });

  useEffect(() => {
    const handleOpenDrawer = (e: Event) => {
      const customEvent = e as CustomEvent;
      setOpen(true);
      if (customEvent.detail?.commentId) {
        setActiveAnchorId(customEvent.detail.commentId);
      }
    };
    
    const handleSpanClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('.inline-comment-anchor')) {
        const anchorId = target.getAttribute('data-comment-id');
        if (anchorId) {
          setOpen(true);
          setActiveAnchorId(anchorId);
        }
      }
    };

    document.addEventListener("open-comment-drawer", handleOpenDrawer);
    document.addEventListener("click", handleSpanClick);
    
    return () => {
      document.removeEventListener("open-comment-drawer", handleOpenDrawer);
      document.removeEventListener("click", handleSpanClick);
    };
  }, []);

  // Sync highlight states in the DOM when activeAnchorId changes
  useEffect(() => {
    document.querySelectorAll('.inline-comment-anchor').forEach(el => {
      el.classList.remove('active');
      if (el.getAttribute('data-comment-id') === activeAnchorId) {
        el.classList.add('active');
      }
    });
  }, [activeAnchorId]);

  const mutation = useMutation({
    mutationFn: postComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", documentId] });
      setNewCommentText("");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", documentId] });
    }
  });

  const handlePost = () => {
    if (!newCommentText.trim()) return;
    mutation.mutate({
      docId: documentId,
      anchorId: activeAnchorId || undefined,
      content: newCommentText,
      token: authToken,
      createdByName: currentUserDisplayName
    });
  };

  const safeComments = comments || [];
  const activeComments = safeComments.filter(c => c.anchorId === activeAnchorId);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => setOpen(false)}
      variant={isMobile ? "temporary" : "persistent"}
      sx={{
        width: isMobile ? 0 : open ? 320 : 0,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: isMobile ? "min(360px, 100vw)" : 320,
          boxSizing: "border-box",
          bgcolor: "var(--bg-color)",
          borderLeft: "1px solid var(--border-color)",
          position: isMobile ? "fixed" : "relative",
          top: 0,
          height: "100%",
          pt: isMobile ? `calc(env(safe-area-inset-top) + ${systemSettings?.classificationBannerEnabled ? 26 : 0}px)` : 0,
          pb: isMobile ? "env(safe-area-inset-bottom)" : 0,
          color: "var(--text-primary)",
          "& .MuiIconButton-root": { minWidth: 44, minHeight: 44 },
        }
      }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MessageSquare size={18} />
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600 }}>Comments</Typography>
        </Box>
        <IconButton aria-label="Close comments" size="small" onClick={() => { setOpen(false); setActiveAnchorId(null); }}>
          <X size={18} />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress size={24} /></Box>
        ) : !activeAnchorId ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
            Select highlighted text in the document to view its comments, or highlight new text to start a discussion.
          </Typography>
        ) : activeComments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
            No comments here yet. Be the first to start a discussion!
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {activeComments.map(comment => (
              <Box key={comment.id} sx={{ display: "flex", gap: 1.5, "&:hover .delete-btn": { opacity: 1 } }}>
                <UserAvatar displayName={comment.createdByName} />
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                        {comment.createdByName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(comment.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    {currentUserId === comment.createdBy && (
                      <IconButton
                        size="small"
                        className="delete-btn"
                        onClick={() => {
                          deleteMutation.mutate({ commentId: comment.id, token: authToken });
                          if (activeComments.length === 1) {
                            document.dispatchEvent(new CustomEvent("remove-comment-mark", { detail: { anchorId: activeAnchorId } }));
                            setActiveAnchorId(null);
                            setOpen(false);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {comment.content}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {activeAnchorId && (
        <Box sx={{ p: 2, borderTop: "1px solid var(--border-color)", bgcolor: "var(--panel-color)" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Reply..."
              variant="outlined"
              value={newCommentText}
              onChange={e => setNewCommentText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handlePost();
                }
              }}
              multiline
              maxRows={4}
              sx={{ "& .MuiOutlinedInput-root": { bgcolor: "var(--bg-color)" } }}
            />
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={handlePost}
              disabled={!newCommentText.trim() || mutation.isPending}
              sx={{ minWidth: 40, p: 1 }}
            >
              <Send size={16} />
            </Button>
          </Box>
        </Box>
      )}
    </Drawer>
  );
};
