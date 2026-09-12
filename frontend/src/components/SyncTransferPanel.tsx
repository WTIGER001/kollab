import { useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { downloadSyncExport, importSyncPackage, SyncConflictError } from '../services/api';
import type { SyncConflict } from '../services/api';

const outlinedAction = { color: 'var(--text-primary)', borderColor: 'var(--border-color)', borderRadius: 'var(--border-radius-button)' };
const primaryAction = { ...outlinedAction, bgcolor: 'var(--primary-color)', color: 'var(--primary-contrast)', boxShadow: 'var(--shadow-button)', '&:hover': { bgcolor: 'var(--primary-color)', filter: 'brightness(1.08)' } };
const noticeStyle = { mt: 2, bgcolor: 'var(--panel-color)', color: 'var(--text-primary)', border: 'var(--border-width) solid var(--border-color)', '& .MuiAlert-icon': { color: 'var(--accent-color)' } };

export function SyncTransferPanel() {
  const [cursor, setCursor] = useState('0');
  const [file, setFile] = useState<File | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState<SyncConflict | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const runImport = async (selected: File, choices: Record<string, string>) => {
    setBusy(true); setError(''); setMessage(''); setConflict(null);
    const form = new FormData(); form.append('sync', selected); form.append('resolutions', JSON.stringify(choices));
    try {
      const result = await importSyncPackage(form);
      setMessage(result.message || 'Sync ZIP imported successfully.'); setFile(null); setResolutions({});
    } catch (failure) {
      if (failure instanceof SyncConflictError && failure.conflict) setConflict(failure.conflict);
      else setError(failure instanceof Error ? failure.message : 'Import failed.');
    } finally { setBusy(false); }
  };
  const resolve = (choice: string) => {
    if (!file || !conflict) return;
    const next = { ...resolutions, [conflict.id]: choice }; setResolutions(next); void runImport(file, next);
  };
  const exportPackage = async () => {
    setBusy(true); setError('');
    try {
      const blob = await downloadSyncExport(cursor); const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `kollab_sync_since_${cursor}.zip`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Export failed.'); }
    finally { setBusy(false); }
  };
  return <Box>
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Bidirectional Air-Gap Sync</Typography>
    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
      Exchange signed packages in either direction. Use 0 for a complete update, or the last exported operation ID for an incremental update.
      Duplicate and older records are ignored. Conflicts stop the entire import for review; no changes are applied until they are resolved.
    </Typography>
    <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <TextField id="sync-since-id" label="Since Operation ID" type="number" size="small" value={cursor} onChange={event => setCursor(event.target.value)} sx={{ width: 180, '& .MuiInputBase-root': { color: 'var(--text-primary)' }, '& .MuiInputLabel-root': { color: 'var(--text-secondary)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-color)' } }} />
      <Button variant="contained" sx={primaryAction} disabled={busy || !/^\d+$/.test(cursor)} onClick={() => void exportPackage()}>Export Sync ZIP</Button>
      <Button component="label" variant="outlined" sx={outlinedAction} disabled={busy}>Import Sync ZIP
        <input type="file" accept=".zip" aria-label="Sync package" hidden onChange={event => {
          const selected = event.target.files?.[0]; event.target.value = ''; if (!selected) return;
          setFile(selected); setResolutions({}); void runImport(selected, {});
        }} />
      </Button>
    </Stack>
    {busy && <Typography role="status" sx={{ mt: 2 }}>Checking and applying synchronization package…</Typography>}
    {message && <Alert severity="success" sx={noticeStyle}>{message}</Alert>}
    {error && <Alert severity="error" sx={noticeStyle}>{error}</Alert>}
    {conflict && <Box sx={{ mt: 3, p: 2, bgcolor: 'var(--panel-color)', color: 'var(--text-primary)', border: 'var(--border-width) solid var(--border-color)', borderRadius: 'var(--border-radius-card)' }}>
      <Alert severity="warning" sx={noticeStyle}>Conflicting changes in {conflict.table}. Nothing has been imported.</Alert>
      <Typography sx={{ mt: 2, overflowWrap: 'anywhere' }}>{conflict.key}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, my: 2 }}>
        {[{ title: 'This installation', value: conflict.local, deleted: conflict.localDeleted }, { title: 'Incoming installation', value: conflict.incoming, deleted: conflict.incomingDeleted }].map(side => <Box key={side.title}>
          <Typography sx={{ fontWeight: 700 }}>{side.title}{side.deleted ? ' — deleted' : ''}</Typography>
          <Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', overflow: 'auto', maxHeight: 300, p: 1, bgcolor: 'var(--bg-color)', color: 'var(--text-primary)' }}>{JSON.stringify(side.value, null, 2)}</Box>
        </Box>)}
      </Box>
      <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
        <Button disabled={busy} sx={outlinedAction} variant="outlined" onClick={() => resolve('keep-local')}>Keep this installation’s version</Button>
        <Button disabled={busy} sx={outlinedAction} variant="outlined" onClick={() => resolve('use-incoming')}>Use incoming version</Button>
        <Button disabled={busy} sx={outlinedAction} onClick={() => { setConflict(null); setFile(null); setResolutions({}); }}>Cancel import</Button>
      </Stack>
      <Typography variant="caption" sx={{ display: 'block', mt: 2 }}>Each choice applies only to the conflict shown. Additional conflicts will be presented separately. Resolved database versions and losing file versions are retained for administrator recovery.</Typography>
    </Box>}
  </Box>;
}
