import { FormEvent, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack, Switch, TextField, Typography } from "@mui/material";
import { createLocalUser, fetchLocalUsers, setLocalUserActive, setLocalUserPassword } from "../services/api";
import type { LocalUser } from "../services/api";

const emptyUser = { username: "", displayName: "", email: "", password: "" };

export const AdminLocalUsersPage = () => {
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [draft, setDraft] = useState(emptyUser);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setUsers(await fetchLocalUsers()); } catch (err) { setError(err instanceof Error ? err.message : "Could not load users."); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const created = await createLocalUser(draft);
      setUsers((current) => [...current, created].sort((a, b) => a.username.localeCompare(b.username)));
      setDraft(emptyUser); setMessage(`Created ${created.username}.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create user."); } finally { setSaving(false); }
  };
  const toggleUser = async (user: LocalUser) => {
    setError(null);
    try { await setLocalUserActive(user.id, !user.isActive); setUsers((current) => current.map((item) => item.id === user.id ? { ...item, isActive: !item.isActive } : item)); setMessage(`${user.username} is now ${user.isActive ? "disabled" : "active"}.`); } catch (err) { setError(err instanceof Error ? err.message : "Could not update user."); }
  };
  const resetPassword = async (user: LocalUser) => {
    const password = passwords[user.id] || ""; if (!password) return; setError(null);
    try { await setLocalUserPassword(user.id, password); setPasswords((current) => ({ ...current, [user.id]: "" })); setMessage(`Password reset for ${user.username}.`); } catch (err) { setError(err instanceof Error ? err.message : "Could not reset password."); }
  };

  return <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: "auto", color: "var(--text-primary)" }}>
    <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Local users</Typography>
    <Typography sx={{ color: "var(--text-secondary)", mb: 3 }}>Accounts managed by Kollab for this local deployment. Changes take effect immediately.</Typography>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {message && <Alert severity="success" onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message}</Alert>}
    <Box component="form" onSubmit={submit} sx={{ p: 3, mb: 4, border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-card)", bgcolor: "var(--panel-color)" }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Create user</Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField label="Username" required value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} />
        <TextField label="Display name" value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} />
        <TextField label="Email" type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
        <TextField label="Initial password" required type="password" helperText="12+ chars, uppercase, lowercase, number" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} />
        <Button type="submit" variant="contained" disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
      </Stack>
    </Box>
    <Typography variant="h6" sx={{ mb: 2 }}>Existing users</Typography>
    {loading ? <CircularProgress /> : <Stack spacing={2}>{users.map((user) => <Box key={user.id} sx={{ p: 2, border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-card)", bgcolor: "var(--panel-color)" }}>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} justifyContent="space-between" spacing={2}>
        <Box><Typography sx={{ fontWeight: 700 }}>{user.displayName || user.username}</Typography><Typography variant="body2" sx={{ color: "var(--text-secondary)" }}>{user.username}{user.email ? ` · ${user.email}` : ""}</Typography></Box>
        <Stack direction="row" alignItems="center"><Typography variant="body2">Active</Typography><Switch checked={user.isActive} onChange={() => void toggleUser(user)} inputProps={{ "aria-label": `Set ${user.username} active` }} /></Stack>
        <Stack direction="row" spacing={1}><TextField size="small" label="New password" type="password" value={passwords[user.id] || ""} onChange={(event) => setPasswords((current) => ({ ...current, [user.id]: event.target.value }))} /><Button variant="outlined" onClick={() => void resetPassword(user)} disabled={!passwords[user.id]}>Reset</Button></Stack>
      </Stack>
    </Box>)}{!users.length && <Typography sx={{ color: "var(--text-secondary)" }}>No local users yet.</Typography>}</Stack>}
  </Box>;
};
