import { useEffect, useState, useMemo } from 'react';
import { Box, Button, TextField, Alert, CircularProgress } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { openSharedDocument, setSharedAccess, updateDocument, authenticatedMediaUrl } from '../services/api';
import { sanitizeMarkup } from '../utils/markup';
import { useSession } from '../auth/SessionContext';
import { EditorCanvas } from '../components/EditorCanvas';
import { CommentDrawer } from '../components/CommentDrawer';

type SharedResult = Awaited<ReturnType<typeof openSharedDocument>>;
export function SharedDocumentPage() {
  const { pathname } = useLocation();
  const token = pathname.split('/')[2] || '';
  const navigate = useNavigate();
  const session = useSession();
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState({ password: '', attempt: 0 });
  const [data, setData] = useState<SharedResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setData(null);
    openSharedDocument(token, challenge.password).then(result => {
      if (!active) return;
      setSharedAccess({ documentId: result.document.id, token, password: challenge.password, mediaToken: result.mediaToken });
      setData(result);
    }).catch(err => { if (active) setError(err.message || 'This link is unavailable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; setSharedAccess(null); };
  }, [token, challenge, session.token]);
  const renderedHTML = useMemo(() => {
    if (!data) return '';
    const parsed = new DOMParser().parseFromString(sanitizeMarkup(data.html), 'text/html');
    parsed.querySelectorAll('[src],a[href]').forEach(element => {
      const attribute = element.hasAttribute('src') ? 'src' : 'href';
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, authenticatedMediaUrl(value) || value);
    });
    return parsed.body.innerHTML;
  }, [data]);
  return <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-color)', color: 'var(--text-primary)' }}>
    <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
      <strong>Shared page</strong>
      <Button onClick={() => navigate('/')}>Kollab</Button>
      {!session.token && <Button onClick={() => navigate(`${pathname}?signin=1`)}>Sign in to comment or edit</Button>}
    </Box>
    {loading && <Box sx={{ p: 3 }}><CircularProgress aria-label="Loading shared page" /></Box>}
    {error && <Box component="form" onSubmit={e => { e.preventDefault(); setChallenge({ password, attempt: challenge.attempt + 1 }); }} sx={{ p: 3, maxWidth: 600 }}>
      <Alert severity="warning">{error}</Alert>
      <TextField label="Sharing password" type="password" value={password} onChange={e => setPassword(e.target.value)} sx={{ my: 2 }} />
      <Button type="submit">Open page</Button>
    </Box>}
    {data && (data.canWrite && session.token ? <Box sx={{ height: 'calc(100vh - 72px)', display: 'flex' }}>
      <EditorCanvas key={data.document.id} activeDocId={data.document.id} authToken={session.token}
        initialTitle={data.document.title} initialContent={data.document.content} initialEditMode={false}
        isSaving={saving} documents={[]} onSave={async (title, content) => {
          setSaving(true);
          try { await updateDocument(data.document.id, title, content); }
          catch (err) { setError('Your changes could not be saved. Keep this page open and retry.'); throw err; }
          finally { setSaving(false); }
        }} />
    </Box> : <Box component="article" sx={{ p: 3, maxWidth: 1000, mx: 'auto', '& img': { maxWidth: '100%' }, '& table': { borderCollapse: 'collapse' }, '& td, & th': { border: '1px solid var(--border-color)', p: 1 } }} dangerouslySetInnerHTML={{ __html: renderedHTML }} />)}
    {data?.canComment && session.token && <CommentDrawer documentId={data.document.id} authToken={session.token} currentUserId={session.user?.id} currentUserDisplayName={session.user?.displayName} />}
  </Box>;
}
