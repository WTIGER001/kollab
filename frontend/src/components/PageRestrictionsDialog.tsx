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
  Checkbox,
  FormControlLabel,
  Stack,
  IconButton,
  Divider,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import { Shield, ShieldAlert, ShieldCheck, UserPlus, Trash2, Users, User, Info } from "lucide-react";
import { 
  fetchDocumentPermissions, 
  addPermissionGrant, 
  deletePermissionGrant, 
  updatePermissionSettings,
  fetchTeams,
  fetchTeamUsers
} from "../services/api";

interface PageRestrictionsDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
}

interface TeamInfo {
  id: string;
  name: string;
  abbreviation: string;
}

interface UserInfo {
  id: string;
  username: string;
}

export const PageRestrictionsDialog: React.FC<PageRestrictionsDialogProps> = ({
  open,
  onClose,
  documentId,
  documentTitle
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Document permissions state
  const [classification, setClassification] = useState<"public" | "internal" | "confidential" | "pii">("internal");
  const [inheritanceBroken, setInheritanceBroken] = useState<boolean>(false);
  const [projectId, setProjectId] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [grants, setGrants] = useState<any[]>([]);

  // Form states for adding new grants
  const [granteeType, setGranteeType] = useState<"user" | "group">("group");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("builtin.wiki.document.viewer");

  // Directories list data
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [teamUsers, setTeamUsers] = useState<UserInfo[]>([]);

  const loadPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDocumentPermissions(documentId);
      setClassification(data.classification);
      setInheritanceBroken(data.inheritanceBroken);
      setProjectId(data.projectId);
      setTeamId(data.teamId);
      setGrants(data.grants || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load permissions.");
    } finally {
      setLoading(false);
    }
  };

  const loadDirectories = async () => {
    try {
      const teamList = await fetchTeams();
      setTeams(teamList);
    } catch (err) {
      console.error("Failed to load teams", err);
    }
  };

  useEffect(() => {
    if (open) {
      loadPermissions();
      loadDirectories();
      setSuccess(null);
    }
  }, [open, documentId]);

  useEffect(() => {
    if (selectedTeamId && granteeType === "user") {
      fetchTeamUsers(selectedTeamId)
        .then(users => {
          setTeamUsers(users);
          setSelectedUserId("");
        })
        .catch(err => console.error(err));
    } else {
      setTeamUsers([]);
      setSelectedUserId("");
    }
  }, [selectedTeamId, granteeType]);

  const handleUpdateSettings = async () => {
    setError(null);
    setSuccess(null);
    try {
      await updatePermissionSettings(documentId, classification, inheritanceBroken);
      setSuccess("Permissions settings updated successfully.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update settings.");
    }
  };

  const handleAddGrant = async () => {
    setError(null);
    setSuccess(null);
    const targetId = granteeType === "group" ? selectedTeamId : selectedUserId;
    if (!targetId) {
      setError("Please select a grantee (user or team).");
      return;
    }

    try {
      await addPermissionGrant(documentId, granteeType, targetId, selectedRoleId);
      setSuccess(`Explicit ${selectedRoleId.split(".").pop()} role granted.`);
      setSelectedTeamId("");
      setSelectedUserId("");
      loadPermissions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to add permission grant.");
    }
  };

  const handleDeleteGrant = async (grantId: number) => {
    setError(null);
    setSuccess(null);
    try {
      await deletePermissionGrant(documentId, grantId);
      setSuccess("Revoked permission grant.");
      loadPermissions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to delete grant.");
    }
  };

  const handleTeamRoleChange = async (newRole: string) => {
    setError(null);
    setSuccess(null);
    const existingTeamGrant = grants.find(g => g.granteeType === "group" && g.granteeId === teamId);
    
    try {
      if (newRole === "inherit" || newRole === "none") {
        if (existingTeamGrant) {
          await deletePermissionGrant(documentId, existingTeamGrant.id);
        }
        setSuccess("Updated default team access level.");
      } else {
        if (existingTeamGrant) {
          await deletePermissionGrant(documentId, existingTeamGrant.id);
        }
        await addPermissionGrant(documentId, "group", teamId, newRole);
        setSuccess(`Updated default team access level to ${getRoleFriendlyName(newRole)}.`);
      }
      loadPermissions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update team access level.");
    }
  };

  const handleGrantRoleChange = async (grant: any, newRoleId: string) => {
    setError(null);
    setSuccess(null);
    try {
      await deletePermissionGrant(documentId, grant.id);
      await addPermissionGrant(documentId, grant.granteeType, grant.granteeId, newRoleId);
      setSuccess(`Role updated to ${getRoleFriendlyName(newRoleId)}.`);
      loadPermissions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update role.");
    }
  };

  const getRoleFriendlyName = (roleId: string) => {
    const parts = roleId.split(".");
    const name = parts[parts.length - 1];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const getTeamRoleValue = () => {
    const existingTeamGrant = grants.find(g => g.granteeType === "group" && g.granteeId === teamId);
    if (existingTeamGrant) {
      return existingTeamGrant.roleId;
    }
    return grants.length > 0 ? "none" : "inherit";
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
          border: "1px solid var(--border-color, #e5e7eb)",
          backgroundColor: "var(--panel-color, #ffffff)",
          color: "var(--text-color, #1f2937)",
          p: 1
        }
      }}
    >
      <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: "18px", pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <Shield size={20} className="primary-icon" style={{ color: "var(--primary-color)" }} />
        Page Access & Restrictions
      </DialogTitle>
      
      <DialogContent>
        {loading && grants.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={30} />
          </Box>
        ) : (
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

            {/* Title display */}
            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "13px" }}>
              Manage access settings and explicit role customizations for <strong>{documentTitle}</strong>.
            </Typography>

            {/* General settings & classification */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "var(--border-color, #e5e7eb)", bgcolor: "var(--paper-color, #fafafa)" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, fontSize: "13px", display: "flex", alignItems: "center", gap: 0.5 }}>
                <ShieldCheck size={16} /> Security Classification & Inheritance
              </Typography>
              <Stack spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="classification-select-label">Classification Tag</InputLabel>
                  <Select
                    labelId="classification-select-label"
                    value={classification}
                    label="Classification Tag"
                    onChange={(e: any) => setClassification(e.target.value)}
                    sx={{ fontSize: "13px" }}
                  >
                    <MenuItem value="public" sx={{ fontSize: "13px" }}>Public (Anyone can access)</MenuItem>
                    <MenuItem value="internal" sx={{ fontSize: "13px" }}>Internal (All staff read-access)</MenuItem>
                    <MenuItem value="confidential" sx={{ fontSize: "13px" }}>Confidential (Confidential clearance required)</MenuItem>
                    <MenuItem value="pii" sx={{ fontSize: "13px" }}>PII / Restricted (MFA + PII clearance required)</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!inheritanceBroken}
                      onChange={(e) => setInheritanceBroken(!e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontSize: "13px", fontWeight: 500 }}>Inherit access from parent pages</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>When checked, users with permissions on ancestor pages also see this page.</Typography>
                    </Box>
                  }
                />

                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={handleUpdateSettings}
                  sx={{ alignSelf: "flex-end", borderRadius: 1.5, textTransform: "none", fontSize: "12px" }}
                >
                  Save Settings
                </Button>
              </Stack>
            </Paper>

            {/* Table of active permissions */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: "13px" }}>
                Who has access
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, borderColor: "var(--border-color, #e5e7eb)" }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: "var(--paper-color, #fafafa)" }}>
                    <TableRow>
                      <TableCell sx={{ fontSize: "11px", fontWeight: 600 }}>Name / Group</TableCell>
                      <TableCell sx={{ fontSize: "11px", fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ fontSize: "11px", fontWeight: 600 }}>Access Level</TableCell>
                      <TableCell align="right" sx={{ fontSize: "11px", fontWeight: 600 }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Row 1: All Team / Project Users */}
                    <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Users size={16} style={{ color: "var(--primary-color)" }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontSize: "13px", fontWeight: 600 }}>
                              All Team / Project Users
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                              Default access for containing team
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontSize: "12px", color: "text.secondary" }}>
                        Group
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" variant="standard" sx={{ m: 1, minWidth: 120 }}>
                          <Select
                            value={getTeamRoleValue()}
                            onChange={(e) => handleTeamRoleChange(e.target.value)}
                            sx={{ fontSize: "12px" }}
                          >
                            <MenuItem value="inherit" sx={{ fontSize: "12px" }}>Inherit (View & Edit)</MenuItem>
                            <MenuItem value="builtin.wiki.document.viewer" sx={{ fontSize: "12px" }}>Viewer (Read only)</MenuItem>
                            <MenuItem value="builtin.wiki.document.commenter" sx={{ fontSize: "12px" }}>Commenter (Read & Comment)</MenuItem>
                            <MenuItem value="builtin.wiki.document.editor" sx={{ fontSize: "12px" }}>Editor (Read & Write)</MenuItem>
                            <MenuItem value="builtin.wiki.document.manager" sx={{ fontSize: "12px" }}>Manager (Share & Edit)</MenuItem>
                            <MenuItem value="none" sx={{ fontSize: "12px" }}>No Access (Restricted)</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell align="right">
                        {/* No actions for default team row */}
                      </TableCell>
                    </TableRow>

                    {/* Custom user / group grants */}
                    {grants
                      .filter(g => !(g.granteeType === "group" && g.granteeId === teamId))
                      .map((g) => (
                        <TableRow key={g.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {g.granteeType === "user" ? (
                                <User size={16} style={{ color: "text.secondary" }} />
                              ) : (
                                <Users size={16} style={{ color: "text.secondary" }} />
                              )}
                              <Typography variant="body2" sx={{ fontSize: "13px", fontWeight: 600 }}>
                                {g.granteeId}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ fontSize: "12px", color: "text.secondary" }}>
                            {g.granteeType === "user" ? "User" : "Group"}
                          </TableCell>
                          <TableCell>
                            <FormControl size="small" variant="standard" sx={{ m: 1, minWidth: 120 }}>
                              <Select
                                value={g.roleId}
                                onChange={(e) => handleGrantRoleChange(g, e.target.value)}
                                sx={{ fontSize: "12px" }}
                              >
                                <MenuItem value="builtin.wiki.document.viewer" sx={{ fontSize: "12px" }}>Viewer (Read only)</MenuItem>
                                <MenuItem value="builtin.wiki.document.commenter" sx={{ fontSize: "12px" }}>Commenter (Read & Comment)</MenuItem>
                                <MenuItem value="builtin.wiki.document.editor" sx={{ fontSize: "12px" }}>Editor (Read & Write)</MenuItem>
                                <MenuItem value="builtin.wiki.document.manager" sx={{ fontSize: "12px" }}>Manager (Share & Edit)</MenuItem>
                                <MenuItem value="builtin.wiki.document.owner" sx={{ fontSize: "12px" }}>Owner (Full Owner)</MenuItem>
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteGrant(g.id)} 
                              sx={{ color: "error.main" }}
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Add direct grant */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "var(--border-color, #e5e7eb)" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, fontSize: "13px", display: "flex", alignItems: "center", gap: 0.5 }}>
                <UserPlus size={16} /> Grant Direct Access
              </Typography>
              <Stack spacing={2}>
                <Tabs
                  value={granteeType}
                  onChange={(_, value) => {
                    setGranteeType(value);
                    setSelectedTeamId("");
                    setSelectedUserId("");
                  }}
                  variant="fullWidth"
                  sx={{ minHeight: "36px", height: "36px", mb: 1, "& .MuiTab-root": { minHeight: "36px", height: "36px", fontSize: "12px", textTransform: "none" } }}
                >
                  <Tab label="Team (Group)" value="group" icon={<Users size={14} />} iconPosition="start" />
                  <Tab label="Individual User" value="user" icon={<User size={14} />} iconPosition="start" />
                </Tabs>

                <FormControl size="small" fullWidth>
                  <InputLabel id="team-select-label">Select Team</InputLabel>
                  <Select
                    labelId="team-select-label"
                    value={selectedTeamId}
                    label="Select Team"
                    onChange={(e: any) => setSelectedTeamId(e.target.value)}
                    sx={{ fontSize: "13px" }}
                  >
                    {teams.map(t => (
                      <MenuItem key={t.id} value={t.id} sx={{ fontSize: "13px" }}>{t.name} ({t.abbreviation})</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {granteeType === "user" && (
                  <FormControl size="small" fullWidth disabled={!selectedTeamId}>
                    <InputLabel id="user-select-label">Select User</InputLabel>
                    <Select
                      labelId="user-select-label"
                      value={selectedUserId}
                      label="Select User"
                      onChange={(e: any) => setSelectedUserId(e.target.value)}
                      sx={{ fontSize: "13px" }}
                    >
                      {teamUsers.map(u => (
                        <MenuItem key={u.id} value={u.id} sx={{ fontSize: "13px" }}>{u.username}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <FormControl size="small" fullWidth>
                  <InputLabel id="role-select-label">Select Role</InputLabel>
                  <Select
                    labelId="role-select-label"
                    value={selectedRoleId}
                    label="Select Role"
                    onChange={(e: any) => setSelectedRoleId(e.target.value)}
                    sx={{ fontSize: "13px" }}
                  >
                    <MenuItem value="builtin.wiki.document.viewer" sx={{ fontSize: "13px" }}>Viewer (Can only read)</MenuItem>
                    <MenuItem value="builtin.wiki.document.commenter" sx={{ fontSize: "13px" }}>Commenter (Can read and write comments)</MenuItem>
                    <MenuItem value="builtin.wiki.document.editor" sx={{ fontSize: "13px" }}>Editor (Can read and write/edit)</MenuItem>
                    <MenuItem value="builtin.wiki.document.manager" sx={{ fontSize: "13px" }}>Manager (Can edit, share, and delete)</MenuItem>
                    <MenuItem value="builtin.wiki.document.owner" sx={{ fontSize: "13px" }}>Owner (Full admin ownership)</MenuItem>
                  </Select>
                </FormControl>

                <Button 
                  variant="contained" 
                  size="small" 
                  onClick={handleAddGrant}
                  disabled={granteeType === "user" ? !selectedUserId : !selectedTeamId}
                  sx={{ alignSelf: "flex-end", borderRadius: 1.5, textTransform: "none", fontSize: "12px", px: 2 }}
                >
                  Add Grant
                </Button>
              </Stack>
            </Paper>
          </Stack>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} size="small" variant="contained" sx={{ textTransform: "none", borderRadius: 1.5 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
