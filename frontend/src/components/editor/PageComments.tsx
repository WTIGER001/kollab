import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Divider,
  TextField,
  Button,
  CircularProgress,
  InputBase,
} from "@mui/material";
import {
  MessageSquare,
  MoreHorizontal,
  Reply,
  ThumbsUp,
  Heart,
  Send,
} from "lucide-react";
import {
  fetchComments,
  createComment,
  updateComment,
  deleteComment,
} from "../../services/api";
import type { Comment } from "../../services/api";
import { UserAvatar } from "../UserAvatar";

const parseJwt = (token: string) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export interface PageCommentsProps {
  docId: string;
  authToken?: string | null;
  readOnly?: boolean;
}

export const PageComments: React.FC<PageCommentsProps> = ({
  docId,
  authToken,
  readOnly = false,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [likesState, setLikesState] = useState<
    Record<string, { count: number; liked: boolean }>
  >({});

  const decoded = authToken ? parseJwt(authToken) : null;
  const currentUserId = decoded ? decoded.sub || decoded.user_id : "";
  const currentUserDisplayName = decoded
    ? decoded.name || decoded.username || decoded.preferred_username || "You"
    : "You";

  const loadComments = async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const data = await fetchComments(docId);
      const sorted = [...(data || [])].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setComments(sorted);

      const initialLikes: Record<string, { count: number; liked: boolean }> =
        {};
      sorted.forEach((c) => {
        const count = c.id.charCodeAt(0) % 4;
        initialLikes[c.id] = { count, liked: false };
      });
      setLikesState(initialLikes);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
    setNewCommentText("");
    setReplyToId(null);
    setReplyText("");
    setEditingCommentId(null);
  }, [docId]);

  const handleCreateComment = async () => {
    if (!newCommentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await createComment(docId, null, newCommentText);
      setComments((prev) => [...prev, created]);
      setNewCommentText("");
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReply = async (parentId: string) => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await createComment(docId, parentId, replyText);
      setComments((prev) => [...prev, created]);
      setReplyText("");
      setReplyToId(null);
    } catch (err) {
      console.error("Failed to post reply:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async (id: string) => {
    if (!editText.trim()) return;
    try {
      const updated = await updateComment(id, editText);
      setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingCommentId(null);
    } catch (err) {
      console.error("Failed to edit comment:", err);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?"))
      return;
    try {
      await deleteComment(id);
      setComments((prev) =>
        prev.filter((c) => c.id !== id && c.parentId !== id),
      );
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const handleToggleLike = (id: string) => {
    setLikesState((prev) => {
      const current = prev[id] || { count: 0, liked: false };
      const nextLiked = !current.liked;
      const nextCount = nextLiked
        ? current.count + 1
        : Math.max(0, current.count - 1);
      return {
        ...prev,
        [id]: { count: nextCount, liked: nextLiked },
      };
    });
  };

  const topLevelComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parentId === parentId);

  const formatCommentDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading && comments.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress
          size={24}
          sx={{ color: "var(--primary-color, #8b5cf6)" }}
        />
      </Box>
    );
  }

  const renderCommentItem = (comment: Comment, isReply = false) => {
    const isEditingThis = editingCommentId === comment.id;
    const isAuthor = comment.createdBy === currentUserId;
    const likesInfo = likesState[comment.id] || { count: 0, liked: false };

    return (
      <Box
        key={comment.id}
        sx={{
          display: "flex",
          gap: 2,
          ml: isReply ? 6 : 0,
          mt: 2,
          pb: 2,
          borderBottom: isReply ? "none" : "1px solid var(--border-color)",
          "&:last-child": {
            borderBottom: "none",
          },
        }}
      >
        <UserAvatar
          displayName={comment.createdByName}
          sx={{
            bgcolor: isAuthor
              ? "var(--primary-color, #8b5cf6)"
              : "var(--border-color, #e2e8f0)",
            color: isAuthor ? "#fff" : "text.primary",
            width: 32,
            height: 32,
            fontSize: "12px",
            fontWeight: 700,
            border: "1px solid var(--border-color)",
          }}
        />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography
              sx={{
                color: "var(--primary-color, #8b5cf6)",
                fontWeight: 600,
                fontSize: "13px",
                fontFamily: '"Outfit", sans-serif',
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              {comment.createdByName}
            </Typography>
            <Typography
              sx={{
                color: "text.secondary",
                fontSize: "11px",
                fontFamily: '"Outfit", sans-serif',
                opacity: 0.8,
              }}
            >
              {formatCommentDate(comment.createdAt)}
            </Typography>
          </Box>

          {isEditingThis ? (
            <Box
              sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}
            >
              <InputBase
                multiline
                rows={2}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                sx={{
                  width: "100%",
                  p: 1.5,
                  borderRadius: 2,
                  fontSize: "13.5px",
                  border: "1px solid var(--primary-color, #8b5cf6)",
                  backgroundColor: "background.paper",
                  fontFamily: "inherit",
                  color: "text.primary",
                }}
              />
              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button
                  size="small"
                  onClick={() => setEditingCommentId(null)}
                  sx={{
                    textTransform: "none",
                    fontSize: "12px",
                    fontFamily: '"Outfit", sans-serif',
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleUpdateComment(comment.id)}
                  sx={{
                    textTransform: "none",
                    fontSize: "12px",
                    fontFamily: '"Outfit", sans-serif',
                    bgcolor: "var(--primary-color, #8b5cf6)",
                    boxShadow: "none",
                    "&:hover": {
                      bgcolor: "var(--primary-dark)",
                      boxShadow: "none",
                    },
                  }}
                >
                  Save
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography
              sx={{
                color: "text.primary",
                fontSize: "13.5px",
                mt: 1,
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            >
              {comment.content}
            </Typography>
          )}

          {!isEditingThis && (
            <Box sx={{ display: "flex", gap: 2, mt: 1, alignItems: "center" }}>
              {!readOnly && (
                <Typography
                  variant="caption"
                  onClick={() => {
                    setReplyToId(comment.id);
                    setReplyText("");
                  }}
                  sx={{
                    cursor: "pointer",
                    color: "text.secondary",
                    fontSize: "11px",
                    fontWeight: 500,
                    userSelect: "none",
                    "&:hover": { color: "var(--primary-color, #8b5cf6)" },
                  }}
                >
                  Reply
                </Typography>
              )}

              {isAuthor && !readOnly && (
                <>
                  <Typography
                    variant="caption"
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditText(comment.content);
                    }}
                    sx={{
                      cursor: "pointer",
                      color: "text.secondary",
                      fontSize: "11px",
                      fontWeight: 500,
                      userSelect: "none",
                      "&:hover": { color: "var(--primary-color, #8b5cf6)" },
                    }}
                  >
                    Edit
                  </Typography>

                  <Typography
                    variant="caption"
                    onClick={() => handleDeleteComment(comment.id)}
                    sx={{
                      cursor: "pointer",
                      color: "text.secondary",
                      fontSize: "11px",
                      fontWeight: 500,
                      userSelect: "none",
                      "&:hover": { color: "var(--error-color, #ef4444)" },
                    }}
                  >
                    Delete
                  </Typography>
                </>
              )}

              <Typography
                variant="caption"
                onClick={() => handleToggleLike(comment.id)}
                sx={{
                  cursor: "pointer",
                  color: likesInfo.liked
                    ? "var(--primary-color, #8b5cf6)"
                    : "text.secondary",
                  fontSize: "11px",
                  fontWeight: likesInfo.liked ? 700 : 500,
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  "&:hover": { color: "var(--primary-color, #8b5cf6)" },
                }}
              >
                Like {likesInfo.count > 0 && `(${likesInfo.count})`}
              </Typography>
            </Box>
          )}

          {replyToId === comment.id && !readOnly && (
            <Box
              sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}
            >
              <InputBase
                multiline
                rows={2}
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                sx={{
                  width: "100%",
                  p: 1.5,
                  borderRadius: 2,
                  fontSize: "13.5px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "background.paper",
                  fontFamily: "inherit",
                  color: "text.primary",
                }}
              />
              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button
                  size="small"
                  onClick={() => setReplyToId(null)}
                  sx={{
                    textTransform: "none",
                    fontSize: "12px",
                    fontFamily: '"Outfit", sans-serif',
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disabled={!replyText.trim() || submitting}
                  onClick={() =>
                    handleCreateReply(isReply ? comment.parentId! : comment.id)
                  }
                  sx={{
                    textTransform: "none",
                    fontSize: "12px",
                    fontFamily: '"Outfit", sans-serif',
                    bgcolor: "var(--primary-color, #8b5cf6)",
                    boxShadow: "none",
                    "&:hover": {
                      bgcolor: "var(--primary-dark)",
                      boxShadow: "none",
                    },
                  }}
                >
                  Reply
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  const totalCount = comments.length;

  return (
    <Box sx={{ mt: 5, mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
        <Typography
          variant="h6"
          sx={{
            fontSize: "16px",
            fontWeight: 700,
            color: "text.primary",
            fontFamily: '"Outfit", sans-serif',
          }}
        >
          {totalCount} Comment{totalCount !== 1 ? "s" : ""}
        </Typography>
      </Box>

      <Divider sx={{ mb: 2, borderColor: "var(--border-color)" }} />

      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {topLevelComments.map((parent) => (
          <Box key={parent.id}>
            {renderCommentItem(parent, false)}
            {getReplies(parent.id).map((reply) =>
              renderCommentItem(reply, true),
            )}
          </Box>
        ))}

        {totalCount === 0 && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              py: 2,
              fontStyle: "italic",
              fontSize: "13px",
              fontFamily: '"Outfit", sans-serif',
            }}
          >
            No comments yet. Be the first to share your thoughts!
          </Typography>
        )}
      </Box>

      {!readOnly ? (
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mt: 4,
            pt: 3,
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <UserAvatar
            displayName={currentUserDisplayName}
            sx={{
              bgcolor: "var(--primary-color, #8b5cf6)",
              color: "#fff",
              width: 36,
              height: 36,
              fontSize: "13px",
              fontWeight: 700,
            }}
          />
          <Box
            sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}
          >
            <InputBase
              multiline
              rows={2}
              placeholder="Write a comment..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              sx={{
                width: "100%",
                p: 2,
                borderRadius: 2.5,
                fontSize: "14px",
                border: "1px solid var(--border-color)",
                backgroundColor: "background.paper",
                fontFamily: "inherit",
                color: "text.primary",
                transition: "border-color 0.2s",
                "&:focus-within": {
                  borderColor: "var(--primary-color, #8b5cf6)",
                },
              }}
            />
            {newCommentText.trim() && (
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  disabled={submitting}
                  onClick={handleCreateComment}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    fontFamily: '"Outfit", sans-serif',
                    bgcolor: "var(--primary-color, #8b5cf6)",
                    boxShadow: "none",
                    "&:hover": {
                      bgcolor: "var(--primary-dark)",
                      boxShadow: "none",
                    },
                  }}
                >
                  Post Comment
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: "action.disabledBackground",
            border: "1px dashed var(--border-color)",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              textAlign: "center",
              fontStyle: "italic",
              fontSize: "13px",
            }}
          >
            Comments are disabled in read-only mode or when the page is in the
            Trash Bin.
          </Typography>
        </Box>
      )}
    </Box>
  );
};
