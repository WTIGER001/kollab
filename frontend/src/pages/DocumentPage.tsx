import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, CircularProgress } from '@mui/material';
import { EditorCanvas } from '../components/EditorCanvas';
import { CommentDrawer } from '../components/CommentDrawer';
import { fetchDocument, fetchDocumentCapabilities, updateDocument, deleteDocument, moveDocument } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/SessionContext';
import { useToastStore } from '../store/useToastStore';
import { useTeams, useAllProjects, useDocuments } from '../hooks/queries';
import { useDocumentTree } from '../hooks/useDocumentTree';
import { getLegacyNavigateFn } from '../utils/navigation';

export const DocumentPage: React.FC<{ isMockMode?: boolean }> = ({ isMockMode }) => {
  const { teamId, projectId, docId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const legacyNavigate = getLegacyNavigateFn(navigate);
  const queryClient = useQueryClient();

  const { developerMode } = useAppStore();
  
	const { token, user } = useSession();
  const { showToast } = useToastStore();
  const userToken = isMockMode ? "mock-jwt-token" : token;

  const { data: teams = [] } = useTeams();
  const { data: allProjects = [] } = useAllProjects();
  
  // Resolve actual team ID
  let actualTeamId: string | null = teamId === 'personal' ? null : teamId || null;
  const isPersonalRoute = location.pathname.startsWith('/personal');
  if (isPersonalRoute) {
    const personalTeam = teams.find(t => t.id.startsWith('personal_'));
    if (personalTeam) actualTeamId = personalTeam.id;
  }
  
  const activeTeam = teams.find(t => t.id === actualTeamId || t.abbreviation === actualTeamId);
  const activeProject = allProjects.find(p => (p.id === projectId || p.abbreviation === projectId) && p.teamId === activeTeam?.id);
  actualTeamId = activeTeam?.id || actualTeamId;
  const actualProjectId = activeProject?.id || projectId;

  const { data: flatDocs } = useDocuments(actualProjectId, actualTeamId);
  const filteredDocs = (flatDocs || []).filter(d => d.id !== actualTeamId && d.id !== projectId);
  const documents = useDocumentTree(filteredDocs);

  const { data: activeDoc, isLoading, error } = useQuery({
    queryKey: ['document', docId],
    queryFn: () => fetchDocument(docId!),
    enabled: !!docId,
  });

  const { data: capabilities } = useQuery({ queryKey: ['documentCapabilities', activeDoc?.id, userToken], queryFn: () => fetchDocumentCapabilities(activeDoc!.id), enabled: !!activeDoc?.id });

  // Automatically replace URL address bar if navigating via alias or old ID
  useEffect(() => {
    if (activeDoc && docId) {
      let urlChanged = false;
      const preferredDocId = activeDoc.slug || activeDoc.id;
      const preferredTeamId = activeTeam?.abbreviation || activeTeam?.id;
      const preferredProjectId = activeProject?.abbreviation || activeProject?.id;
      
      const currentUrl = new URL(window.location.href);
      const pathParts = currentUrl.pathname.split('/');
      
      // Assuming docId is the last part of the path
      if (docId !== preferredDocId && pathParts[pathParts.length - 1] === docId) {
        pathParts[pathParts.length - 1] = preferredDocId;
        urlChanged = true;
      }
      
      if (teamId && preferredTeamId && teamId !== preferredTeamId) {
        const teamIndex = pathParts.indexOf('teams') + 1;
        if (teamIndex > 0 && pathParts[teamIndex] === teamId) {
          pathParts[teamIndex] = preferredTeamId;
          urlChanged = true;
        }
      }

      if (projectId && preferredProjectId && projectId !== preferredProjectId) {
        const pIndex = pathParts.indexOf('p') + 1;
        if (pIndex > 0 && pathParts[pIndex] === projectId) {
          pathParts[pIndex] = preferredProjectId;
          urlChanged = true;
        }
      }

      if (urlChanged) {
        currentUrl.pathname = pathParts.join('/');
        window.history.replaceState(null, "", currentUrl.toString());
      }
    }
  }, [activeDoc, docId, teamId, projectId, activeTeam, activeProject]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveDoc = async (id: string, title: string, content: string) => {
    setIsSaving(true);
    try {
      await updateDocument(id, title, content);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', id] });
    } catch (err) {
      showToast("Could not save. Your changes have not been saved.", "error");
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    await deleteDocument(id);
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    legacyNavigate(actualTeamId, projectId || null, null);
  };

  const handleMoveDoc = async (id: string, parentId: string | null) => {
    await moveDocument(id, parentId);
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  };

  if (error) return <Box sx={{ p: 3, color: "var(--text-primary)" }}>This page could not be loaded. Check your access and try again.</Box>;

  if (isLoading || !activeDoc) {
    return (
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", width: "100%", height: "100%" }}>
      <EditorCanvas
        key={activeDoc.id} // Remount editor on switching documents
        activeDocId={activeDoc.id}
        authToken={userToken}
        initialTitle={activeDoc.title}
        initialContent={activeDoc.content || ""}
        initialEditMode={false}
        canEdit={isMockMode || !!capabilities?.write}
        developerMode={developerMode}
        onSave={(title, content) => handleSaveDoc(activeDoc.id, title, content)}
        isSaving={isSaving}
        documents={documents}
        selectedTeamName={activeTeam?.name}
        selectedProjectName={activeProject?.name}
        selectedTeamId={actualTeamId || undefined}
        selectedProjectId={actualProjectId}
        teams={teams}
        projects={allProjects}
        onDeleteDoc={capabilities?.delete ? handleDeleteDoc : undefined}
        onMoveDoc={capabilities?.write ? handleMoveDoc : undefined}
        createdAt={activeDoc.createdAt}
        updatedAt={activeDoc.updatedAt}
        createdBy={activeDoc.createdBy}
        updatedBy={activeDoc.updatedBy}
        deletedAt={activeDoc.deletedAt}
      />
      {userToken && capabilities?.comment && <CommentDrawer
        documentId={activeDoc.id} 
        authToken={userToken} 
        currentUserId={user?.id}
        currentUserDisplayName={user?.displayName || user?.username}
      />}
    </Box>
  );
};
