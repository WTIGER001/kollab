import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box } from '@mui/material';
import { useTeams, useAllProjects } from '../hooks/queries';
import { restoreDocument, deleteDocument, fetchDocument } from '../services/api';
import { TrashView } from '../components/TrashView';
import { PageAuditView } from '../components/PageAuditView';
import { useToastStore } from '../store/useToastStore';
import { useSession } from '../auth/SessionContext';

export function TrashRoute() {
  const { teamId, projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { showToast } = useToastStore();
  const { data: teams = [], isLoading } = useTeams();
  const { data: projects = [] } = useAllProjects();
  const personal = location.pathname.startsWith('/personal');
  const team = teams.find(t => personal ? t.id === `personal_${user?.id}` : t.id === teamId || t.abbreviation === teamId);
  const project = projects.find(p => p.teamId === team?.id && (p.id === projectId || p.abbreviation === projectId));
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['documents'] }); void queryClient.invalidateQueries({ queryKey: ['recentDocuments'] }); };
  const mutate = async (id: string, permanent: boolean) => {
    try {
      if (permanent) await deleteDocument(id, true); else await restoreDocument(id);
      refresh(); showToast(permanent ? 'Page permanently deleted' : 'Page restored', 'success');
    } catch (error) { showToast('The page could not be changed. Try again.', 'error'); throw error; }
  };
  if (isLoading) return <Box sx={{ p: 3 }}>Loading space…</Box>;
  if (!team || (projectId && !project)) return <Box sx={{ p: 3 }}>Space not found.</Box>;
  return <TrashView teamId={team.id} projectId={project?.id || null}
    onRestore={id => mutate(id, false)} onDeletePermanently={id => mutate(id, true)}
    navigateTo={() => navigate(personal ? '/personal' : project ? `/teams/${team.abbreviation || team.id}/p/${project.abbreviation || project.id}` : `/teams/${team.abbreviation || team.id}`)} />;
}

export function PageAuditRoute() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { data: document, error } = useQuery({ queryKey: ['document', docId], queryFn: () => fetchDocument(docId!), enabled: !!docId });
  if (error) return <Box sx={{ p: 3 }}>This page is unavailable.</Box>;
  if (!document) return <Box sx={{ p: 3 }}>Loading page…</Box>;
  return <PageAuditView docId={document.id} docTitle={document.title} onBack={() => navigate(-1)} />;
}
