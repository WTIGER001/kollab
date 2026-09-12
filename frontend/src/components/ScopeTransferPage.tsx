import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/SessionContext';
import { useAllProjects, useTeams } from '../hooks/queries';
import { exportScopeArchive, fetchAllUsers, fetchTeamUsers, importScopeArchive, previewScopeArchive } from '../services/api';
import type { ScopeImportOptions, ScopeImportResult, ScopePreview } from '../services/api';
import './ScopeTransferPage.css';

const initial: ScopeImportOptions = { name: '', abbreviation: '', teamId: '', teamName: '', teamAbbreviation: '', ownerId: '', userMap: {} };
export function ScopeTransferPage() {
  const { user } = useSession();
  const cache = useQueryClient();
  const { data: teams = [] } = useTeams();
  const { data: projects = [] } = useAllProjects();
  const { data: users = [], error: usersError } = useQuery({ queryKey: ['transferUsers'], queryFn: fetchAllUsers, enabled: !!user?.isAdmin });
  const [kind, setKind] = useState<'team' | 'project'>('team');
  const [source, setSource] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ScopePreview | null>(null);
  const [options, setOptions] = useState<ScopeImportOptions>(initial);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScopeImportResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const selection = useRef(0);
  const { data: teamUsers = [], isPending: teamUsersPending, error: teamUsersError } = useQuery({ queryKey: ['transferTeamUsers', options.teamId], queryFn: () => fetchTeamUsers(options.teamId), enabled: !!options.teamId });
  const sharedTeams = teams.filter(team => !team.id.startsWith('personal_'));
  const sources = kind === 'team' ? sharedTeams : projects.filter(project => sharedTeams.some(team => team.id === project.teamId));
  const eligibleOwners = options.teamId ? users.filter(local => teamUsers.some(member => member.id === local.id)) : users;
  const rootNameConflict = preview?.kind === 'team'
    ? sharedTeams.some(team => team.name.toLowerCase() === options.name.trim().toLowerCase() || team.abbreviation?.toLowerCase() === options.abbreviation.toLowerCase())
    : options.teamId && projects.some(project => project.teamId === options.teamId && (project.name.toLowerCase() === options.name.trim().toLowerCase() || project.abbreviation?.toLowerCase() === options.abbreviation.toLowerCase()));
  const parentConflict = preview?.kind === 'project' && !options.teamId && sharedTeams.some(team => team.name.toLowerCase() === options.teamName.trim().toLowerCase() || team.abbreviation?.toLowerCase() === options.teamAbbreviation.toLowerCase());
  const needsParent = preview?.kind === 'project' && !options.teamId;
  const validAbbreviation = (value: string) => /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value);
  const canImport = !!file && !!preview && !!options.name.trim() && validAbbreviation(options.abbreviation) && eligibleOwners.some(owner => owner.id === options.ownerId) && (!needsParent || (!!options.teamName.trim() && validAbbreviation(options.teamAbbreviation))) && !rootNameConflict && !parentConflict && !usersError && (!options.teamId || (!teamUsersPending && !teamUsersError)) && confirmed;
  const change = (patch: Partial<ScopeImportOptions>) => { setOptions(old => ({ ...old, ...patch })); setConfirmed(false); setError(''); };
  const choose = async (next: File | null) => {
    const version = ++selection.current;
    setFile(next); setPreview(null); setResult(null); setError(''); setConfirmed(false); setOptions(initial);
    if (!next) return;
    if (next.size > 256 * 1024 * 1024) { setError('Choose an archive smaller than 256 MiB.'); return; }
    setBusy('preview');
    try {
      const report = await previewScopeArchive(next);
      if (version !== selection.current) return;
      setPreview(report); setOptions({ ...initial, name: report.name, abbreviation: report.abbreviation, teamName: report.teamName, teamAbbreviation: report.teamAbbreviation, ownerId: user?.id || '' });
    } catch (err) { if (version === selection.current) setError(err instanceof Error ? err.message : String(err)); }
    finally { if (version === selection.current) setBusy(''); }
  };
  const download = async () => {
    setBusy('export'); setError('');
    try { const blob = await exportScopeArchive(kind, source); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `kollab-${kind}-transfer.zip`; a.click(); URL.revokeObjectURL(url); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(''); }
  };
  const restore = async () => {
    if (!file || !canImport || busy) return;
    setBusy('import'); setError('');
    try { const imported = await importScopeArchive(file, options); setResult(imported); await cache.invalidateQueries({ queryKey: ['teams'] }); await cache.invalidateQueries({ queryKey: ['projects'] }); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); setConfirmed(false); }
    finally { setBusy(''); }
  };
  if (!user?.isAdmin) return <main className="scope-transfer"><h1>Team & project transfer</h1><p>Server administrator access is required.</p></main>;
  return <main className="scope-transfer">
    <header><p className="scope-eyebrow">Server settings / Backup & sync</p><h1>Team & project transfer</h1><p>Move a team or project between Kollab servers, or restore it as a new space. Existing spaces stay intact.</p><Link to="/_admin/settings/backups">Full-server backup & sync</Link></header>
    {error && <p role="alert" className="scope-notice">{error}</p>}
    {(usersError || teamUsersError) && <p role="alert">Unable to load local users or team members. Reload this page before importing.</p>}
    {result ? <section aria-label="Import complete"><h2>Import complete</h2><p>Created a new {preview?.kind} with {result.pages} pages.</p><Link to={result.projectId ? `/teams/${result.teamId}/p/${result.projectId}` : `/teams/${result.teamId}`}>Open imported {preview?.kind}</Link><button onClick={() => { setResult(null); setPreview(null); setFile(null); setConfirmed(false); }}>Import another archive</button></section> : <>
      <section aria-labelledby="export-heading"><h2 id="export-heading">Export a team or project</h2><p>A team archive includes its projects. Archives include pages (including trash), history, comments, files, images, tags, and page lifecycle data. Team archives also include team templates and image libraries.</p><div className="scope-fields">
        <label>Archive type<select value={kind} disabled={!!busy} onChange={e => { setKind(e.target.value as 'team' | 'project'); setSource(''); }}><option value="team">Team and its projects</option><option value="project">One project</option></select></label>
        <label>Source {kind}<select value={source} disabled={!!busy} onChange={e => setSource(e.target.value)}><option value="">Choose {kind}</option>{sources.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div><button disabled={!source || !!busy} onClick={() => void download()}>{busy === 'export' ? 'Creating archive…' : 'Download transfer ZIP'}</button></section>
      <section aria-labelledby="import-heading"><h2 id="import-heading">Import as a new team or project</h2><p>Upload a transfer ZIP exported above. You can start here even when the destination team does not exist. Full-server backups use the separate full-server restore screen.</p>
        <label className="scope-upload">Transfer archive (.zip, up to 256 MiB)<input type="file" accept=".zip" disabled={!!busy} onChange={e => void choose(e.target.files?.[0] || null)} /></label>
        {busy === 'preview' && <p role="status">Checking archive and files…</p>}
        {preview && <><div className="scope-notice"><h3>Archive preview: {preview.name}</h3><p>{preview.kind === 'team' ? 'Team' : 'Project'} · {preview.counts.documents || 0} pages · {preview.counts.projects || 0} projects · {preview.counts.document_versions || 0} versions · {preview.counts.comments || 0} comments · {preview.files} files</p><p>Exported {new Date(preview.createdAt).toLocaleString()}</p></div>
          <fieldset disabled={!!busy}><legend>Destination</legend><div className="scope-fields">
            <label>New {preview.kind} name<input maxLength={255} value={options.name} onChange={e => change({ name: e.target.value })} /></label>
            <label>New {preview.kind} abbreviation<input maxLength={64} value={options.abbreviation} onChange={e => change({ abbreviation: e.target.value })} /></label>
            {preview.kind === 'project' && <label>Parent team<select value={options.teamId} onChange={e => change({ teamId: e.target.value, ownerId: '', userMap: {} })}><option value="">Create a new team</option>{sharedTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}
            {needsParent && <><label>New parent team name<input maxLength={255} value={options.teamName} onChange={e => change({ teamName: e.target.value })} /></label><label>New parent team abbreviation<input maxLength={64} value={options.teamAbbreviation} onChange={e => change({ teamAbbreviation: e.target.value })} /></label></>}
          </div><p>Abbreviations use 1–64 letters, numbers, underscores or hyphens, starting with a letter or number.</p>
          {(rootNameConflict || parentConflict) && <p role="alert">This name or abbreviation is already in use. Choose a different destination name and abbreviation.</p>}
          </fieldset>
          <fieldset disabled={!!busy}><legend>Ownership & members</legend><label>Local owner<select value={options.ownerId} onChange={e => change({ ownerId: e.target.value })}><option value="">Choose a local owner</option>{eligibleOwners.map(local => <option key={local.id} value={local.id}>{local.displayName || local.username}</option>)}</select></label>
          <p>The importing administrator is also added to newly created teams. Unmapped authors are assigned to the local owner. Unmapped members are omitted. Mapped members receive editor access; source permissions and sharing links are not imported. Pages inherit destination access. {options.teamId && 'The owner and mapped members must already belong to the selected team.'}</p>
          {preview.users.map(sourceUser => <label key={sourceUser.id}>{sourceUser.name || sourceUser.username} ({sourceUser.member ? 'member / author' : 'author'})<select aria-label={`Map ${sourceUser.username}`} value={options.userMap[sourceUser.id] || ''} onChange={e => change({ userMap: { ...options.userMap, [sourceUser.id]: e.target.value } })}><option value="">Use owner for authorship; omit membership</option>{(sourceUser.member ? eligibleOwners : users).map(local => <option key={local.id} value={local.id}>{local.displayName || local.username}</option>)}</select></label>)}
          </fieldset>
          <p>Imported pages, files and internal links receive new IDs. Account credentials, integrations, sharing links, watches, favorites and audit logs are excluded. Links outside the archive and task assignee text may need updating. Existing tags with matching names are reused. Attachment previews can be regenerated after import.</p>
          <label className="scope-confirm"><input type="checkbox" checked={confirmed} disabled={!!busy} onChange={e => setConfirmed(e.target.checked)} />I have reviewed the destination and access settings for this new {preview.kind}.</label>
          <button disabled={!canImport || !!busy} onClick={() => void restore()}>{busy === 'import' ? 'Importing…' : `Create ${preview.kind} & import`}</button>
        </>}
      </section>
    </>}
  </main>;
}
