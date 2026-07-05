import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import { getTemplates } from "../services/api";
import type { Template } from "../services/api";
import { FileText, Grid as GridIcon } from "lucide-react";

interface TemplateGalleryModalProps {
  open: boolean;
  onClose: () => void;
  teamId?: string;
  onSelectTemplate: (template: Template | null) => void;
}

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  open,
  onClose,
  teamId,
  onSelectTemplate,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("page");

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open, teamId, activeTab]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getTemplates({ templateType: activeTab, teamId });
      setTemplates(data || []);
    } catch (err) {
      console.error("Failed to load templates", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Template Gallery</DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab label="Page Templates" value="page" icon={<FileText size={16} />} iconPosition="start" />
          <Tab label="Block Snippets" value="block" icon={<GridIcon size={16} />} iconPosition="start" />
        </Tabs>
      </Box>

      <DialogContent sx={{ minHeight: "300px", bgcolor: "var(--bg-color)" }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : templates.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column" gap={2}>
            <Typography color="text.secondary">No templates found.</Typography>
          </Box>
        ) : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {templates.map((tpl) => (
              <Grid item xs={12} sm={6} md={4} key={tpl.id}>
                <Card 
                  sx={{ 
                    cursor: "pointer", 
                    height: "100%",
                    "&:hover": { borderColor: "var(--primary-color)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
                    border: "1px solid var(--border-color)",
                    transition: "all 0.2s",
                    bgcolor: "var(--panel-color)",
                  }}
                  onClick={() => onSelectTemplate(tpl)}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ color: "var(--text-primary)", mb: 1 }}>{tpl.title}</Typography>
                    <Typography variant="body2" sx={{ color: "var(--text-secondary)" }}>
                      {tpl.description || "No description"}
                    </Typography>
                    <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                      <Typography variant="caption" sx={{ 
                        px: 1, py: 0.5, 
                        bgcolor: "var(--bg-color)", 
                        border: "1px solid var(--border-color)", 
                        borderRadius: "4px",
                        color: "var(--text-secondary)",
                        textTransform: "capitalize"
                      }}>
                        {tpl.scope}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: "1px solid var(--border-color)" }}>
        <Button onClick={onClose} sx={{ color: "var(--text-primary)" }}>Cancel</Button>
        <Button onClick={() => onSelectTemplate(null)} variant="contained" sx={{ bgcolor: "var(--primary-color)" }}>
          Blank Document
        </Button>
      </DialogActions>
    </Dialog>
  );
};
