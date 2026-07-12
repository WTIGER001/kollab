import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Chip
} from "@mui/material";
import { Trash2, Plus, Link as LinkIcon } from "lucide-react";
import { API_BASE_URL, getApiToken } from "../services/api";

interface IntegrationsManagerProps {
  scope: "system" | "team" | "project" | "user";
  entityId: string;
}

interface Integration {
  id: string;
  scope: string;
  entityId: string;
  provider: string;
  name: string;
  url: string;
  createdAt: string;
}

export const IntegrationsManager: React.FC<IntegrationsManagerProps> = ({ scope, entityId }) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [provider, setProvider] = useState("gitlab");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/integrations/connections?scope=${scope}&entityId=${entityId}`, {
        headers: { Authorization: `Bearer ${getApiToken() || ""}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch integrations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [scope, entityId]);

  const handleAdd = async () => {
    if (!name || !provider) return;
    
    let credentials: Record<string, string> = {};
    if (provider === "gitlab" || provider === "github" || provider === "plane" || provider === "jira-cloud") {
      credentials = { token };
    } else if (provider === "jira-dc") {
      credentials = { username, password };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/integrations/connections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getApiToken() || ""}`
        },
        body: JSON.stringify({
          scope,
          entityId,
          provider,
          name,
          url,
          credentials
        })
      });

      if (res.ok) {
        setIsAddDialogOpen(false);
        // Reset form
        setName("");
        setUrl("");
        setToken("");
        setUsername("");
        setPassword("");
        setProvider("gitlab");
        fetchIntegrations();
      } else {
        alert("Failed to add connection.");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding connection.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this connection?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/integrations/connections/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getApiToken() || ""}` }
      });
      if (res.ok) {
        fetchIntegrations();
      }
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: "var(--text-primary)" }}>
          Connections
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<Plus size={16} />} 
          onClick={() => setIsAddDialogOpen(true)}
          sx={{ textTransform: "none", bgcolor: "var(--primary-color)", color: "#fff", "&:hover": { bgcolor: "var(--primary-dark)" } }}
        >
          Add Connection
        </Button>
      </Box>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : integrations.length === 0 ? (
        <Box sx={{ p: 4, textAlign: "center", border: "1px dashed var(--border-color)", borderRadius: "8px", bgcolor: "var(--panel-color)" }}>
          <LinkIcon size={32} style={{ color: "var(--text-secondary)", marginBottom: "1rem" }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "var(--text-primary)" }}>No Connections Configured</Typography>
          <Typography variant="body2" sx={{ color: "var(--text-secondary)", mt: 1 }}>
            Add integrations to connect Kollab with your external tools.
          </Typography>
        </Box>
      ) : (
        <Table sx={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
          <TableHead sx={{ bgcolor: "var(--panel-color)" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Provider</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>URL</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {integrations.map((conn) => (
              <TableRow key={conn.id}>
                <TableCell sx={{ fontWeight: 500, color: "var(--text-primary)" }}>{conn.name}</TableCell>
                <TableCell>
                  <Chip size="small" label={conn.provider} sx={{ textTransform: "capitalize", fontSize: "11px" }} />
                </TableCell>
                <TableCell sx={{ color: "var(--text-secondary)", fontSize: "13px" }}>{conn.url || "N/A"}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="error" onClick={() => handleDelete(conn.id)}>
                    <Trash2 size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: "var(--text-primary)" }}>Add Connection</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Provider</InputLabel>
              <Select value={provider} label="Provider" onChange={(e) => setProvider(e.target.value)}>
                <MenuItem value="gitlab">GitLab</MenuItem>
                <MenuItem value="jira-cloud">Jira Cloud</MenuItem>
                <MenuItem value="jira-dc">Jira Data Center</MenuItem>
                <MenuItem value="github">GitHub</MenuItem>
                <MenuItem value="plane">Plane (Makeplane)</MenuItem>
              </Select>
            </FormControl>

            <TextField 
              label="Connection Name" 
              placeholder="e.g. Acme Corp GitLab" 
              size="small" 
              fullWidth 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
            
            <TextField 
              label="Instance URL" 
              placeholder="e.g. https://gitlab.example.com (Leave blank for cloud)" 
              size="small" 
              fullWidth 
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
            />

            {(provider === "gitlab" || provider === "github" || provider === "plane" || provider === "jira-cloud") && (
              <TextField 
                label="API Token / Personal Access Token" 
                type="password" 
                size="small" 
                fullWidth 
                value={token} 
                onChange={(e) => setToken(e.target.value)} 
              />
            )}

            {provider === "jira-dc" && (
              <>
                <TextField 
                  label="Username" 
                  size="small" 
                  fullWidth 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                />
                <TextField 
                  label="Password / Token" 
                  type="password" 
                  size="small" 
                  fullWidth 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setIsAddDialogOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button 
            onClick={handleAdd} 
            variant="contained" 
            disabled={!name}
            sx={{ textTransform: "none", bgcolor: "var(--primary-color)", color: "#fff", "&:hover": { bgcolor: "var(--primary-dark)" } }}
          >
            Save Connection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
