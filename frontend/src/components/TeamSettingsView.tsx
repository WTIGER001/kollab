import React, { useEffect, useState } from "react";
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Avatar, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton
} from "@mui/material";
import { Users, Save, ArrowLeft, UserPlus, Trash2 } from "lucide-react";
import { 
  fetchTeamUsers, 
  updateTeamSettings, 
  fetchAllUsers, 
  addTeamMember, 
  removeTeamMember 
} from "../services/api";
import type { Team, UserDirectoryItem } from "../services/api";
import { UserAvatar } from "./UserAvatar";
import { TagsManager } from "./TagsManager";

interface TeamSettingsViewProps {
  team: Team;
  onUpdateTeam: (updatedTeam: Team) => void;
  onBack: () => void;
  showToast: (message: string, severity: "success" | "error" | "info" | "warning") => void;
}

export const TeamSettingsView: React.FC<TeamSettingsViewProps> = ({
  team,
  onUpdateTeam,
  onBack,
  showToast
}) => {
  const [name, setName] = useState(team.name);
  const [abbreviation, setAbbreviation] = useState(team.abbreviation || "");
  const [description, setDescription] = useState(team.description || "");
  const [members, setMembers] = useState<{ id: string; username: string }[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // User directory states
  const [allUsers, setAllUsers] = useState<UserDirectoryItem[]>([]);
  const [selectedAddUserId, setSelectedAddUserId] = useState<string>("");

  useEffect(() => {
    fetchAllUsers()
      .then(data => setAllUsers(data))
      .catch(err => console.error("Error fetching user directory:", err));
  }, []);

  useEffect(() => {
    setName(team.name);
    setAbbreviation(team.abbreviation || "");
    setDescription(team.description || "");
    
    setLoadingMembers(true);
    fetchTeamUsers(team.id)
      .then(data => {
        setMembers(data);
        setLoadingMembers(false);
      })
      .catch(err => {
        console.error("Error loading team members:", err);
        setLoadingMembers(false);
      });
  }, [team]);

  const handleAddMember = async () => {
    if (!selectedAddUserId) return;
    try {
      await addTeamMember(team.id, selectedAddUserId);
      showToast("User added to team successfully", "success");
      setSelectedAddUserId("");
      const data = await fetchTeamUsers(team.id);
      setMembers(data);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to add member to team", "error");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeTeamMember(team.id, userId);
      showToast("User removed from team", "success");
      const data = await fetchTeamUsers(team.id);
      setMembers(data);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to remove member from team", "error");
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Team name is required", "error");
      return;
    }
    if (!abbreviation.trim()) {
      showToast("Team abbreviation is required", "error");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateTeamSettings(team.id, name, abbreviation, description);
      onUpdateTeam(updated);
      showToast("Team settings updated successfully", "success");
      // Update URL to match new abbreviation
      const newUrl = `/teams/${updated.abbreviation || updated.id}/_settings`;
      window.history.pushState({}, "", newUrl);
    } catch (err: any) {
      console.error("Failed to update team settings:", err);
      showToast(err.message || "Failed to update team settings", "error");
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
          Back to Portal
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"Outfit", sans-serif', color: "text.primary" }}>
          Team Settings: {team.name}
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
          <Tab label="Members" />
          <Tab label="Tags" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box sx={{ maxWidth: 650 }}>
          <Box component="form" onSubmit={handleSave} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', mb: 1 }}>
              General Details
            </Typography>
            
            <TextField
              label="Team Name"
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
              label="Team Abbreviation / Slug"
              value={abbreviation}
              onChange={(e) => setAbbreviation(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
              fullWidth
              required
              helperText="Used in URL paths (e.g. /teams/eng). Alphanumeric, hyphens and underscores only."
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
      )}

      {tabValue === 1 && (
        <Box sx={{ maxWidth: 650 }}>
          <Box sx={{ 
            display: "flex",
            flexDirection: "column",
            gap: 2
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Users size={18} style={{ color: "var(--accent-blue)" }} />
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>
                Team Members ({members.length})
              </Typography>
            </Box>
            <Divider />

            {/* Add Member Form */}
            <Box sx={{ display: "flex", gap: 1, my: 1 }}>
              <FormControl size="small" fullWidth>
                <InputLabel id="add-member-select-label" sx={{ fontSize: "13px" }}>Select User to Add</InputLabel>
                <Select
                  labelId="add-member-select-label"
                  value={selectedAddUserId}
                  label="Select User to Add"
                  onChange={(e: any) => setSelectedAddUserId(e.target.value)}
                  sx={{ fontSize: "13px", borderRadius: 2 }}
                >
                  {allUsers
                    .filter(u => !members.some(m => m.id === u.id))
                    .map(u => (
                      <MenuItem key={u.id} value={u.id} sx={{ fontSize: "13px" }}>
                        {u.username}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                size="small"
                onClick={handleAddMember}
                disabled={!selectedAddUserId}
                startIcon={<UserPlus size={14} />}
                sx={{ 
                  borderRadius: 2, 
                  textTransform: "none", 
                  fontSize: "12px", 
                  fontWeight: 600,
                  px: 2
                }}
              >
                Add
              </Button>
            </Box>

            <Divider />

            {loadingMembers ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <List sx={{ maxHeight: 400, overflowY: "auto" }} className="scrollbar-thin">
                {members.map((member) => (
                  <ListItem 
                    key={member.id} 
                    disableGutters 
                    sx={{ py: 1 }}
                    secondaryAction={
                      <IconButton 
                        edge="end" 
                        aria-label="remove" 
                        size="small" 
                        onClick={() => handleRemoveMember(member.id)}
                        sx={{ color: "error.main" }}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar sx={{ minWidth: 36 }}>
                      <UserAvatar 
                        displayName={member.username}
                        sx={{ width: 28, height: 28, fontSize: "11px", fontWeight: 700, bgcolor: "primary.light" }}
                      />
                    </ListItemAvatar>
                    <ListItemText 
                      primary={
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 600, color: "text.primary", fontFamily: '"Outfit", sans-serif' }}>
                          {member.username}
                        </Typography>
                      } 
                      secondary={
                        <Typography sx={{ fontSize: "11px", color: "text.disabled" }}>
                          {member.id === "sh4ag0cxowti" || member.id === "mock-user-id" ? "Team Admin" : "Member"}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Box>
      )}

      {tabValue === 2 && (
        <TagsManager />
      )}
    </Box>
  );
};
