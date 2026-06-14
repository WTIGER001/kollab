import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Tabs,
  Tab,
  TextField,
  Button,
  Typography,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from "@mui/material";
import { X, PlusCircle } from "lucide-react";
import type { Team } from "../services/api";

interface CreateSpaceDialogProps {
  open: boolean;
  onClose: () => void;
  teams: Team[];
  activeTeamId: string | null;
  onCreateTeam: (name: string, abbreviation: string, description: string) => Promise<void>;
  onCreateProject: (teamId: string, name: string, abbreviation: string, description: string) => Promise<void>;
}

export const CreateSpaceDialog: React.FC<CreateSpaceDialogProps> = ({
  open,
  onClose,
  teams,
  activeTeamId,
  onCreateTeam,
  onCreateProject
}) => {
  const [tabIndex, setTabIndex] = useState(0);
  
  // Team Form State
  const [teamName, setTeamName] = useState("");
  const [teamAbbr, setTeamAbbr] = useState("");
  const [teamDesc, setTeamDesc] = useState("");

  // Project Form State
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectAbbr, setProjectAbbr] = useState("");
  const [projectDesc, setProjectDesc] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default team selection for project tab
  useEffect(() => {
    if (open) {
      setError(null);
      setTeamName("");
      setTeamAbbr("");
      setTeamDesc("");
      
      setProjectName("");
      setProjectAbbr("");
      setProjectDesc("");

      // Exclude personal spaces from parent team selection
      const actualTeams = teams.filter(t => !t.id.startsWith("personal_"));
      if (activeTeamId && !activeTeamId.startsWith("personal_")) {
        setSelectedTeamId(activeTeamId);
      } else if (actualTeams.length > 0) {
        setSelectedTeamId(actualTeams[0].id);
      } else {
        setSelectedTeamId("");
      }
    }
  }, [open, activeTeamId, teams]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
    setError(null);
  };

  const handleCreate = async () => {
    setError(null);
    setLoading(true);
    try {
      if (tabIndex === 0) {
        // Create Team
        if (!teamName.trim() || !teamAbbr.trim()) {
          throw new Error("Space name and abbreviation are required");
        }
        await onCreateTeam(teamName, teamAbbr.toLowerCase().replace(/\s+/g, ""), teamDesc);
      } else {
        // Create Project
        if (!selectedTeamId) {
          throw new Error("Please select a parent Team Space");
        }
        if (!projectName.trim() || !projectAbbr.trim()) {
          throw new Error("Project name and abbreviation are required");
        }
        await onCreateProject(selectedTeamId, projectName, projectAbbr.toLowerCase().replace(/\s+/g, ""), projectDesc);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create space");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate abbreviation suggestions as the user types
  const handleTeamNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTeamName(val);
    setTeamAbbr(val.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12));
  };

  const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setProjectName(val);
    setProjectAbbr(val.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12));
  };

  const actualTeams = teams.filter(t => !t.id.startsWith("personal_"));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            backgroundColor: "background.paper",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--border-color)",
            color: "text.primary",
            borderRadius: 3,
            boxShadow: "var(--shadow-premium)"
          }
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 3, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ p: 0.75, borderRadius: 1.5, backgroundColor: "color-mix(in srgb, var(--primary-color) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)", display: "flex" }}>
            <PlusCircle size={16} style={{ color: "var(--primary-color)" }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', letterSpacing: "-0.01em" }}>
            Create New Space
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "text.disabled", "&:hover": { color: "text.primary" } }}>
          <X size={16} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          sx={{
            borderBottom: "1px solid var(--border-color)",
            px: 2,
            "& .MuiTab-root": {
              color: "text.disabled",
              fontSize: "12.5px",
              fontWeight: 600,
              textTransform: "none",
              py: 2,
              minWidth: 120,
              "&.Mui-selected": { color: "primary.light" }
            },
            "& .MuiTabs-indicator": { backgroundColor: "primary.light" }
          }}
        >
          <Tab label="Team Space" />
          <Tab label="Project" />
        </Tabs>

        <Box sx={{ p: 4 }}>
          {error && (
            <Typography variant="body2" sx={{ color: "error.main", mb: 2, fontWeight: 500 }}>
              {error}
            </Typography>
          )}

          {tabIndex === 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <TextField
                label="Team Space Name"
                placeholder="e.g. Mobile Engineering"
                value={teamName}
                onChange={handleTeamNameChange}
                fullWidth
                slotProps={{
                  inputLabel: { style: { fontSize: "13px" } },
                  htmlInput: { style: { fontSize: "13.5px" } }
                }}
              />

              <TextField
                label="Unique Abbreviation (URL path)"
                placeholder="e.g. mobile"
                value={teamAbbr}
                onChange={(e) => setTeamAbbr(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                fullWidth
                slotProps={{
                  inputLabel: { style: { fontSize: "13px" } },
                  htmlInput: { style: { fontSize: "13.5px" } }
                }}
                helperText="Must be unique system-wide. Used in routes: /teams/{abbr}"
              />

              <TextField
                label="Description"
                placeholder="Describe this team workspace..."
                value={teamDesc}
                onChange={(e) => setTeamDesc(e.target.value)}
                multiline
                rows={3}
                fullWidth
                slotProps={{
                  inputLabel: { style: { fontSize: "13px" } },
                  htmlInput: { style: { fontSize: "13.5px" } }
                }}
              />
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <FormControl fullWidth size="medium">
                <InputLabel sx={{ fontSize: "13px" }}>Parent Team Space</InputLabel>
                <Select
                  value={selectedTeamId}
                  label="Parent Team Space"
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  sx={{ fontSize: "13.5px" }}
                >
                  {actualTeams.map((t) => (
                    <MenuItem key={t.id} value={t.id} sx={{ fontSize: "13.5px" }}>
                      {t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Project Name"
                placeholder="e.g. iOS Development"
                value={projectName}
                onChange={handleProjectNameChange}
                fullWidth
                slotProps={{
                  inputLabel: { style: { fontSize: "13px" } },
                  htmlInput: { style: { fontSize: "13.5px" } }
                }}
              />

              <TextField
                label="Project Abbreviation"
                placeholder="e.g. ios"
                value={projectAbbr}
                onChange={(e) => setProjectAbbr(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                fullWidth
                slotProps={{
                  inputLabel: { style: { fontSize: "13px" } },
                  htmlInput: { style: { fontSize: "13.5px" } }
                }}
                helperText="Must be unique within the selected team. Used in routes: /teams/{team}/p/{abbr}"
              />

              <TextField
                label="Description"
                placeholder="Describe this project space..."
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                multiline
                rows={3}
                fullWidth
                slotProps={{
                  inputLabel: { style: { fontSize: "13px" } },
                  htmlInput: { style: { fontSize: "13.5px" } }
                }}
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0, borderTop: "1px solid var(--border-color)", display: "flex", gap: 1.5 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{
            color: "text.secondary",
            fontSize: "12px",
            fontWeight: 600,
            textTransform: "none",
            "&:hover": { backgroundColor: "action.hover" }
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={loading}
          sx={{
            py: 1,
            px: 3,
            fontSize: "12px",
            fontWeight: 700,
            bgcolor: "primary.main",
            borderRadius: "6px",
            textTransform: "none",
            boxShadow: "0 4px 12px rgba(139, 92, 246, 0.2)",
            "&:hover": { bgcolor: "primary.dark" }
          }}
        >
          {loading ? "Creating..." : tabIndex === 0 ? "Create Team Space" : "Create Project"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
