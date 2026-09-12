import { type FormEvent, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Divider, Stack, Switch, TextField, Typography } from "@mui/material";
import { Edit3, KeyRound, Plus, Trash2, UserRound, X } from "lucide-react";
import { createLocalUser, deleteLocalUser, fetchLocalUsers, setLocalUserActive, setLocalUserPassword, updateLocalUser } from "../services/api";
import type { LocalUser } from "../services/api";

const emptyUser = { username: "", displayName: "", email: "", password: "" };

export const AdminLocalUsersPage = () => {
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [draft, setDraft] = useState(emptyUser);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, Pick<LocalUser, "displayName" | "email">>>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [removalCandidate, setRemovalCandidate] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setUsers(await fetchLocalUsers()); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load users."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const created = await createLocalUser(draft);
      setUsers((current) => [...current, created].sort((a, b) => a.username.localeCompare(b.username)));
      setDraft(emptyUser); setMessage(`Created ${created.username}.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create user."); }
    finally { setSaving(false); }
  };

  const withUserSave = async (id: string, action: () => Promise<void>) => {
    setSavingUserId(id); setError(null);
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : "Could not update user."); } finally { setSavingUserId(null); }
  };

  const toggleUser = async (user: LocalUser) => withUserSave(user.id, async () => {
    await setLocalUserActive(user.id, !user.isActive);
    setUsers((current) => current.map((item) => item.id === user.id ? { ...item, isActive: !item.isActive } : item));
    setMessage(`${user.username} is now ${user.isActive ? "disabled" : "active"}.`);
  });
  const saveProfile = async (user: LocalUser) => withUserSave(user.id, async () => {
    const update = edits[user.id] || { email: user.email, displayName: user.displayName };
    const saved = await updateLocalUser(user.id, update);
    setUsers((current) => current.map((item) => item.id === user.id ? saved : item));
    setEditingUserId(null); setMessage(`Updated ${saved.username}.`);
  });
  const resetPassword = async (user: LocalUser) => withUserSave(user.id, async () => {
    const password = passwords[user.id] || "";
    if (!password) return;
    await setLocalUserPassword(user.id, password);
    setPasswords((current) => ({ ...current, [user.id]: "" }));
    setMessage(`Password reset for ${user.username}.`);
  });
  const removeUser = async (user: LocalUser) => withUserSave(user.id, async () => {
    await deleteLocalUser(user.id);
    setUsers((current) => current.filter((item) => item.id !== user.id));
    setRemovalCandidate(null); setMessage(`Removed ${user.username}.`);
  });

  return <Box sx={{ p: { xs: 2, md: 5 }, maxWidth: 1100, width: "100%", minWidth: 0, flexShrink: 0, overflowWrap: "anywhere", color: "var(--text-primary)" }}>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ ...({ mb: 3 }), justifyContent: "space-between", alignItems: { sm: "center" } }}>
      <Box><Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Users</Typography><Typography sx={{ color: "var(--text-secondary)" }}>Manage local accounts for this server. Account changes take effect immediately.</Typography></Box>
      <Chip icon={<UserRound size={15} />} label={`${users.length} local ${users.length === 1 ? "user" : "users"}`} sx={{ bgcolor: "color-mix(in srgb, var(--primary-color) 12%, transparent)", color: "var(--primary-color)", fontWeight: 700 }} />
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {message && <Alert severity="success" onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message}</Alert>}

    <Box component="form" onSubmit={submit} sx={{ p: { xs: 2, md: 3 }, mb: 4, border: "var(--border-width) var(--border-style) var(--border-color)", borderRadius: "var(--border-radius-card)", bgcolor: "var(--panel-color)", boxShadow: "var(--shadow-elevation)" }}>
      <Stack direction="row" spacing={1} sx={{ ...({ mb: 0.5 }), alignItems: "center" }}><Plus size={18} /><Typography variant="h6" sx={{ fontWeight: 750 }}>Add local user</Typography></Stack>
      <Typography variant="body2" sx={{ color: "var(--text-secondary)", mb: 2.5 }}>Usernames are permanent account IDs. You can edit names and email addresses after creating an account.</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", lg: "1fr 1fr 1fr 1.3fr auto" }, gap: 1.5, alignItems: "start" }}>
        <TextField label="Username" required value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} />
        <TextField label="Display name" value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} />
        <TextField label="Email" type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
        <TextField label="Initial password" required type="password" helperText="12+ chars with upper, lower, and number" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} />
        <Button type="submit" variant="contained" disabled={saving} sx={{ minHeight: 56, bgcolor: "var(--primary-color)", boxShadow: "var(--shadow-button)", textTransform: "none", "&:hover": { bgcolor: "var(--secondary-color)" } }}>{saving ? "Creating…" : "Add user"}</Button>
      </Box>
    </Box>

    <Typography variant="h6" sx={{ fontWeight: 750, mb: 1 }}>Existing users</Typography>
    <Typography variant="body2" sx={{ color: "var(--text-secondary)", mb: 2 }}>Disable an account to block sign-in without removing its account record. Removing an account is permanent and preserves page history without its profile details.</Typography>
    {loading ? <CircularProgress aria-label="Loading users" /> : <Stack spacing={1.5}>{users.map((user) => {
      const isEditing = editingUserId === user.id;
      const edit = edits[user.id] || { displayName: user.displayName, email: user.email };
      const isRemoving = removalCandidate?.id === user.id;
      const isSaving = savingUserId === user.id;
      return <Box key={user.id} sx={{ p: { xs: 2, md: 2.5 }, border: "var(--border-width) var(--border-style) var(--border-color)", borderRadius: "var(--border-radius-card)", bgcolor: "var(--panel-color)", boxShadow: "var(--shadow-elevation)" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}>
          <Box sx={{ minWidth: 0 }}><Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><Typography sx={{ fontWeight: 750 }}>{user.displayName || user.username}</Typography><Chip size="small" label={user.isActive ? "Active" : "Disabled"} sx={{ bgcolor: user.isActive ? "color-mix(in srgb, var(--primary-color) 13%, transparent)" : "var(--glass-bg)", color: user.isActive ? "var(--primary-color)" : "var(--text-secondary)", fontWeight: 700, flexShrink: 0 }} /></Stack><Typography variant="body2" sx={{ color: "var(--text-secondary)" }}>@{user.username}{user.email ? ` · ${user.email}` : ""}</Typography></Box>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}><Typography variant="body2" sx={{ color: "var(--text-secondary)" }}>{user.isActive ? "Enabled" : "Disabled"}</Typography><Switch checked={user.isActive} disabled={isSaving} onChange={() => void toggleUser(user)} slotProps={{ input: { "aria-label": `Set ${user.username} active` } }} /></Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}><Button size="small" startIcon={<Edit3 size={15} />} onClick={() => { setEditingUserId(isEditing ? null : user.id); setEdits((current) => ({ ...current, [user.id]: { displayName: user.displayName, email: user.email } })); }} sx={{ color: "var(--text-primary)", textTransform: "none" }}>{isEditing ? "Close" : "Edit"}</Button><Button size="small" color="error" startIcon={<Trash2 size={15} />} onClick={() => setRemovalCandidate(isRemoving ? null : user)} sx={{ textTransform: "none" }}>Remove</Button></Stack>
        </Stack>
        {isEditing && <><Divider sx={{ my: 2, borderColor: "var(--border-color)" }} /><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr auto" }, gap: 1.5, alignItems: "start" }}><TextField label="Display name" value={edit.displayName} onChange={(event) => setEdits((current) => ({ ...current, [user.id]: { ...edit, displayName: event.target.value } }))} /><TextField label="Email" type="email" value={edit.email} onChange={(event) => setEdits((current) => ({ ...current, [user.id]: { ...edit, email: event.target.value } }))} /><Button variant="contained" disabled={isSaving} onClick={() => void saveProfile(user)} sx={{ minHeight: 56, bgcolor: "var(--primary-color)", textTransform: "none", "&:hover": { bgcolor: "var(--secondary-color)" } }}>{isSaving ? "Saving…" : "Save profile"}</Button></Box></>}
        <Divider sx={{ my: 2, borderColor: "var(--border-color)" }} />
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ alignItems: { md: "center" } }}><KeyRound size={17} /><Typography variant="body2" sx={{ minWidth: 108, color: "var(--text-secondary)" }}>Set new password</Typography><TextField size="small" label="New password" type="password" helperText="12+ chars with upper, lower, and number" value={passwords[user.id] || ""} onChange={(event) => setPasswords((current) => ({ ...current, [user.id]: event.target.value }))} /><Button variant="outlined" disabled={!passwords[user.id] || isSaving} onClick={() => void resetPassword(user)} sx={{ borderColor: "var(--border-color)", color: "var(--text-primary)", textTransform: "none" }}>{isSaving ? "Saving…" : "Reset password"}</Button></Stack>
        {isRemoving && <Alert severity="warning" sx={{ mt: 2 }} action={<Stack direction="row" spacing={1}><Button size="small" color="inherit" startIcon={<X size={14} />} onClick={() => setRemovalCandidate(null)}>Cancel</Button><Button size="small" color="error" disabled={isSaving} onClick={() => void removeUser(user)}>Remove permanently</Button></Stack>}>Remove <strong>{user.username}</strong>? This cannot be undone. You cannot remove the account you are currently signed in with.</Alert>}
      </Box>;
    })}{!users.length && <Box sx={{ p: 3, border: "var(--border-width) var(--border-style) var(--border-color)", borderRadius: "var(--border-radius-card)", bgcolor: "var(--panel-color)" }}><Typography sx={{ color: "var(--text-secondary)" }}>No local users yet.</Typography></Box>}</Stack>}
  </Box>;
};
