import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  InputAdornment
} from "@mui/material";
import { Link2, Plus, Trash2, Copy, Check, Eye, EyeOff, Lock, Calendar } from "lucide-react";
import { 
  fetchShareLinks, 
  createShareLink, 
  deleteShareLink 
} from "../services/api";

interface SharingLinksDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
}

export const SharingLinksDialog: React.FC<SharingLinksDialogProps> = ({
  open,
  onClose,
  documentId,
  documentTitle
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [links, setLinks] = useState<any[]>([]);

  // Form states
  const [scope, setScope] = useState<"anyone" | "organization">("anyone");
  const [roleId, setRoleId] = useState<string>("builtin.wiki.document.viewer");
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Newly generated link state
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const loadLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchShareLinks(documentId);
      setLinks(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load sharing links.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadLinks();
      setGeneratedLink(null);
      setCopied(false);
      setSuccess(null);
      setPassword("");
    }
  }, [open, documentId]);

  const handleCreateLink = async () => {
    setError(null);
    setSuccess(null);
    setGeneratedLink(null);
    try {
      // Map document role to shorter role name or full template role ID
      const result = await createShareLink(documentId, roleId, scope, password || undefined, expiresInDays > 0 ? expiresInDays : undefined);
      
      const shareUrl = `${window.location.origin}/share/${result.token}`;
      setGeneratedLink(shareUrl);
      setSuccess("Sharing link generated successfully!");
      loadLinks();
      setPassword("");
    } catch (err: any) {
      setError(err?.message || "Failed to create sharing link.");
    }
  };

  const handleDeleteLink = async (tokenHash: string) => {
    setError(null);
    setSuccess(null);
    try {
      await deleteShareLink(documentId, tokenHash);
      setSuccess("Sharing link deleted.");
      loadLinks();
    } catch (err: any) {
      setError(err?.message || "Failed to delete link.");
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRoleFriendlyName = (role: string) => {
    const parts = role.split(".");
    const name = parts[parts.length - 1];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          border: "1px solid var(--border-color)",
          backgroundColor: "var(--panel-color)",
          color: "var(--text-primary)",
          p: 1
        }
      }}
    >
      <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: "18px", pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <Link2 size={20} className="primary-icon" style={{ color: "var(--primary-color)" }} />
        Document Link Sharing
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ fontSize: "12px", borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ fontSize: "12px", borderRadius: 2 }}>
              {success}
            </Alert>
          )}

          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "13px" }}>
            Generate and manage access links for <strong>{documentTitle}</strong>.
          </Typography>

          {/* Generated link copy box */}
          {generatedLink && (
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: 2, 
                bgcolor: "rgba(16, 185, 129, 0.08)", 
                border: "1px solid rgba(16, 185, 129, 0.2)",
                display: "flex",
                flexDirection: "column",
                gap: 1
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#065f46", fontSize: "12px" }}>
                Copy Sharing Link
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  value={generatedLink}
                  inputProps={{ readOnly: true, style: { fontSize: "12px", fontFamily: 'monospace' } }}
                  sx={{ bgcolor: "background.paper" }}
                />
                <Button 
                  variant="contained" 
                  color="success"
                  onClick={handleCopyLink}
                  sx={{ minWidth: "100px", textTransform: "none", borderRadius: 1.5 }}
                  startIcon={copied ? <Check size={16} /> : <Copy size={16} />}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              </Box>
            </Box>
          )}

          {/* Form to create new link */}
          <Box sx={{ p: 2.5, borderRadius: 2, border: "1px solid var(--border-color)", bgcolor: "var(--bg-color)" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, fontSize: "13px", display: "flex", alignItems: "center", gap: 0.5 }}>
              <Plus size={16} /> Generate New Sharing Link
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="scope-select-label">Scope</InputLabel>
                  <Select
                    labelId="scope-select-label"
                    value={scope}
                    label="Scope"
                    onChange={(e: any) => setScope(e.target.value)}
                    sx={{ fontSize: "13px" }}
                  >
                    <MenuItem value="anyone" sx={{ fontSize: "13px" }}>Anyone with the link</MenuItem>
                    <MenuItem value="organization" sx={{ fontSize: "13px" }}>Organization members only</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="role-select-label">Access Level</InputLabel>
                  <Select
                    labelId="role-select-label"
                    value={roleId}
                    label="Access Level"
                    onChange={(e: any) => setRoleId(e.target.value)}
                    sx={{ fontSize: "13px" }}
                  >
                     <MenuItem value="builtin.wiki.document.viewer" sx={{ fontSize: "13px" }}>Viewer (Read only)</MenuItem>
                     <MenuItem value="builtin.wiki.document.commenter" sx={{ fontSize: "13px" }}>Commenter (Read & Comment)</MenuItem>
                     <MenuItem value="builtin.wiki.document.editor" sx={{ fontSize: "13px" }}>Editor (Read & Write)</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: "flex", gap: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="expires-select-label">Expiration (TTL)</InputLabel>
                  <Select
                    labelId="expires-select-label"
                    value={expiresInDays}
                    label="Expiration (TTL)"
                    onChange={(e: any) => setExpiresInDays(Number(e.target.value))}
                    sx={{ fontSize: "13px" }}
                  >
                    <MenuItem value={1} sx={{ fontSize: "13px" }}>1 Day</MenuItem>
                    <MenuItem value={7} sx={{ fontSize: "13px" }}>7 Days</MenuItem>
                    <MenuItem value={30} sx={{ fontSize: "13px" }}>30 Days</MenuItem>
                    <MenuItem value={0} sx={{ fontSize: "13px" }}>Never</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Password (Optional)"
                  size="small"
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    style: { fontSize: "13px" },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>

              <Button
                variant="contained"
                size="small"
                onClick={handleCreateLink}
                sx={{ alignSelf: "flex-end", borderRadius: 1.5, textTransform: "none", fontSize: "12px", px: 3 }}
              >
                Generate Link
              </Button>
            </Stack>
          </Box>

          {/* List existing links */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: "13px" }}>
              Active Sharing Links
            </Typography>
            <Divider sx={{ mb: 1 }} />
            {loading && links.length === 0 ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={20} />
              </Box>
            ) : links.length === 0 ? (
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(255,255,255,0.01)", border: "1px dashed var(--border-color)", textAlign: "center" }}>
                <Typography variant="body2" sx={{ fontSize: "12px", color: "text.secondary" }}>
                  No active share links. Generate a link above to share this document.
                </Typography>
              </Box>
            ) : (
              <List dense sx={{ width: "100%", bgcolor: "var(--bg-color)", borderRadius: 2, border: "1px solid var(--border-color)" }}>
                {links.map((link) => (
                  <ListItem key={link.tokenHash} sx={{ py: 1 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontSize: "13px", fontWeight: 600 }}>
                            {link.scope === "anyone" ? "Anyone with link" : "Organization only"}
                          </Typography>
                          <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: "rgba(37, 99, 235, 0.08)", color: "primary.main", fontWeight: 500, fontSize: "10px" }}>
                            {getRoleFriendlyName(link.roleId)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 0.25 }}>
                            <Calendar size={12} />
                            Expires: {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : "Never"}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 0.25 }}>
                            <Lock size={12} />
                            Hash: {link.tokenHash.substring(0, 10)}...
                          </Typography>
                        </Stack>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" aria-label="delete" size="small" onClick={() => handleDeleteLink(link.tokenHash)} sx={{ color: "error.main" }}>
                        <Trash2 size={16} />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Stack>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} size="small" variant="outlined" sx={{ textTransform: "none", borderRadius: 1.5 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
