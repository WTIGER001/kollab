import React, { useEffect, useState } from "react";
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Avatar, 
  CircularProgress,
  Tabs,
  Tab
} from "@mui/material";
import { Save, ArrowLeft, Image } from "lucide-react";
import { updateProjectSettings } from "../services/api";
import type { Project } from "../services/api";
import { TagsManager } from "./TagsManager";

interface ProjectSettingsViewProps {
  project: Project;
  teamAbbreviationOrId: string;
  onUpdateProject: (updatedProject: Project) => void;
  onBack: () => void;
  showToast: (message: string, severity: "success" | "error" | "info" | "warning") => void;
}

export const ProjectSettingsView: React.FC<ProjectSettingsViewProps> = ({
  project,
  teamAbbreviationOrId,
  onUpdateProject,
  onBack,
  showToast
}) => {
  const [name, setName] = useState(project.name);
  const [abbreviation, setAbbreviation] = useState(project.abbreviation || "");
  const [logoUrl, setLogoUrl] = useState(project.logoUrl || "");
  const [description, setDescription] = useState(project.description || "");
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    setName(project.name);
    setAbbreviation(project.abbreviation || "");
    setLogoUrl(project.logoUrl || "");
    setDescription(project.description || "");
  }, [project]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Project name is required", "error");
      return;
    }
    if (!abbreviation.trim()) {
      showToast("Project abbreviation is required", "error");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProjectSettings(project.id, name, logoUrl, abbreviation, description);
      onUpdateProject(updated);
      showToast("Project settings updated successfully", "success");
      // Update URL to match new abbreviation
      const newUrl = `/teams/${teamAbbreviationOrId}/${updated.abbreviation || updated.id}/_settings`;
      window.history.pushState({}, "", newUrl);
    } catch (err: any) {
      console.error("Failed to update project settings:", err);
      showToast(err.message || "Failed to update project settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ 
      flex: 1, 
      height: "100%", 
      overflowY: "auto", 
      bgcolor: "background.default",
      px: { xs: 2, sm: 3, md: 4 },
      py: 3,
      display: "flex",
      flexDirection: "column",
      gap: 3
    }} className="scrollbar-thin">
      
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={onBack}
          startIcon={<ArrowLeft size={14} />}
          sx={{
            color: "text.secondary",
            borderColor: "var(--border-color)",
            textTransform: "none",
            fontWeight: 600,
            fontSize: "12px",
            fontFamily: '"Outfit", sans-serif',
            "&:hover": {
              borderColor: "primary.main",
              backgroundColor: "color-mix(in srgb, var(--primary-color) 8%, transparent)"
            }
          }}
        >
          Back to Project
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"Outfit", sans-serif', color: "text.primary" }}>
          Project Settings: {project.name}
        </Typography>
      </Box>

      {/* Tabs Selector */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 600,
              fontSize: "13.5px",
              minWidth: 100
            }
          }}
        >
          <Tab label="General" />
          <Tab label="Tags" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "8fr 4fr" }, gap: 4 }}>
          {/* Left Side: Settings Form */}
          <Box>
            <Box component="form" onSubmit={handleSave} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', mb: 1 }}>
                General Details
              </Typography>
              
              <TextField
                label="Project Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    fontFamily: '"Outfit", sans-serif'
                  }
                }}
              />

              <TextField
                label="Project Abbreviation / Slug"
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                fullWidth
                required
                helperText="Used in URL paths (e.g. /teams/eng/wiki). Alphanumeric, hyphens and underscores only."
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    fontFamily: '"Outfit", sans-serif'
                  }
                }}
              />

              <TextField
                label="Logo Image URL"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                fullWidth
                placeholder="https://example.com/logo.png"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    fontFamily: '"Outfit", sans-serif'
                  }
                }}
              />

              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    fontFamily: '"Outfit", sans-serif'
                  }
                }}
              />

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save size={14} />}
                  sx={{
                    px: 3,
                    py: 1,
                    fontWeight: 700,
                    textTransform: "none",
                    fontFamily: '"Outfit", sans-serif',
                    borderRadius: 2
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Right Side: Logo Preview Card */}
          <Box>
            <Box sx={{ 
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2
            }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.secondary", fontFamily: '"Outfit", sans-serif' }}>
                Project Logo Preview
              </Typography>
              <Avatar 
                src={logoUrl || undefined}
                sx={{ 
                  width: 100, 
                  height: 100, 
                  bgcolor: "secondary.main", 
                  fontSize: "36px", 
                  fontWeight: 700,
                  border: "2px solid var(--border-color)",
                  boxShadow: "var(--shadow-premium)"
                }}
              >
                {name.slice(0, 1).toUpperCase()}
              </Avatar>
              {!logoUrl && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.disabled" }}>
                  <Image size={14} />
                  <Typography variant="caption">Using default fallback initials</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      )}

      {tabValue === 1 && (
        <TagsManager />
      )}
    </Box>
  );
};
