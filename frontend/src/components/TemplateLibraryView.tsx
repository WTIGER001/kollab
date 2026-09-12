import React, { useState, useEffect } from "react";
import {
  Box, Typography, Card, CardContent, Grid, IconButton, Button,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Tooltip, Stack, Chip
} from "@mui/material";
import { Plus, Trash2, Edit2, FileText, Grid as GridIcon } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { getTemplates, createTemplate, deleteTemplate } from "../services/api";
import type { Template, TemplateScope, TemplateType } from "../services/api";
import { useTeams } from "../hooks/queries";

interface TemplateLibraryViewProps {
  scope: TemplateScope;
}

export const TemplateLibraryView: React.FC<TemplateLibraryViewProps> = ({ scope }) => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { data: teams = [] } = useTeams();
  
  let actualTeamId = teamId === 'personal' ? undefined : teamId;
  const activeTeam = teams.find(t => t.id === actualTeamId || t.abbreviation === actualTeamId);
  actualTeamId = activeTeam?.id || actualTeamId;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    templateType: TemplateType;
  }>({
    title: "",
    description: "",
    templateType: "page"
  });

  useEffect(() => {
    loadTemplates();
  }, [scope, actualTeamId]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getTemplates({ scope, teamId: actualTeamId });
      setTemplates(data || []);
    } catch (err) {
      console.error("Failed to load templates", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      title: "",
      description: "",
      templateType: "page"
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const navigateToTemplate = (id: string) => {
    navigate(window.location.pathname.replace('/_templates', `/template/${id}`));
  };

  const handleSave = async () => {
    try {
      const created = await createTemplate({
        ...formData,
        content: '{"type":"doc","content":[{"type":"paragraph"}]}', // Default empty content
        scope,
        teamId: actualTeamId,
      });
      setTemplates([created, ...templates]);
      handleCloseDialog();
      navigateToTemplate(created.id);
    } catch (err) {
      console.error("Failed to save template", err);
      alert("Failed to save template.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      try {
        await deleteTemplate(id);
        setTemplates(templates.filter(t => t.id !== id));
      } catch (err) {
        console.error("Failed to delete template", err);
        alert("Failed to delete template.");
      }
    }
  };

  return (
    <Box sx={{ p: 4, height: "100%", overflowY: "auto", bgcolor: "var(--bg-color)" }} className="scrollbar-thin">
      <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2, mb: 4 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ color: "var(--text-primary)", fontWeight: 600, mb: 1, fontFamily: '"Outfit", sans-serif' }}>
            {scope === "system" ? "System" : scope === "team" ? "Team" : "Personal"} Templates
          </Typography>
          <Typography variant="body1" sx={{ color: "var(--text-secondary)" }}>
            Manage reusable page templates and block snippets for this scope.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => handleOpenDialog()}
          sx={{ 
            bgcolor: "var(--primary-color)", 
            color: "#fff",
            textTransform: "none",
            flexShrink: 0,
            whiteSpace: "nowrap",
            height: "fit-content",
            alignSelf: { xs: "flex-start", sm: "center" },
            "&:hover": { bgcolor: "var(--accent-color)" } 
          }}
        >
          Create Template
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : templates.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography color="text.secondary">No templates found in this scope.</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {templates.map(tpl => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tpl.id}>
              <Card sx={{ 
                height: "100%", 
                display: "flex", 
                flexDirection: "column",
                bgcolor: "var(--panel-color)",
                border: "1px solid var(--border-color)"
              }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                    <Chip 
                      icon={tpl.templateType === "page" ? <FileText size={14} /> : <GridIcon size={14} />} 
                      label={tpl.templateType === "page" ? "Page" : "Block"} 
                      size="small" 
                      variant="outlined"
                    />
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => navigateToTemplate(tpl.id)}>
                          <Edit2 size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(tpl.id)} color="error">
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                  <Typography variant="h6" sx={{ color: "var(--text-primary)", mb: 1 }}>
                    {tpl.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "var(--text-secondary)" }}>
                    {tpl.description || "No description provided."}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create Template</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.templateType}
                label="Type"
                onChange={(e) => setFormData({ ...formData, templateType: e.target.value as TemplateType })}
              >
                <MenuItem value="page">Page Template</MenuItem>
                <MenuItem value="block">Block Snippet</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSave} 
            disabled={!formData.title.trim()}
            sx={{ bgcolor: "var(--primary-color)" }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
