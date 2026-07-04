import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, CircularProgress } from '@mui/material';
import { EditorCanvas } from '../components/EditorCanvas';
import { CommentDrawer } from '../components/CommentDrawer';
import { fetchDocument, updateDocument, deleteDocument, moveDocument } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from 'react-oidc-context';
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
  
  const auth = isMockMode ? null : useAuth();
  const userToken = isMockMode ? "mock-jwt-token" : auth?.user?.id_token || null;

  const { data: teams = [] } = useTeams();
  const { data: allProjects = [] } = useAllProjects();
  
  // Resolve actual team ID
  let actualTeamId = teamId === 'personal' ? null : teamId;
  const isPersonalRoute = location.pathname.startsWith('/personal');
  if (isPersonalRoute) {
    const personalTeam = teams.find(t => t.id.startsWith('personal_'));
    if (personalTeam) actualTeamId = personalTeam.id;
  }
  
  const activeTeam = teams.find(t => t.id === actualTeamId || t.abbreviation === actualTeamId);
  const activeProject = allProjects.find(p => p.id === projectId || p.abbreviation === projectId);

  const { data: flatDocs } = useDocuments(projectId, actualTeamId);
  const filteredDocs = (flatDocs || []).filter(d => d.id !== actualTeamId && d.id !== projectId);
  const documents = useDocumentTree(filteredDocs);

  const { data: activeDoc, isLoading } = useQuery({
    queryKey: ['document', docId],
    queryFn: () => fetchDocument(docId!),
    enabled: !!docId,
  });

  // Automatically replace URL address bar if navigating via alias or old ID
  useEffect(() => {
    if (activeDoc && docId) {
      const preferredIdentifier = activeDoc.slug || activeDoc.id;
      if (docId !== preferredIdentifier) {
        const currentUrl = new URL(window.location.href);
        const pathParts = currentUrl.pathname.split('/');
        // Assuming docId is the last part of the path
        if (pathParts[pathParts.length - 1] === docId) {
          pathParts[pathParts.length - 1] = preferredIdentifier;
          currentUrl.pathname = pathParts.join('/');
          window.history.replaceState(null, "", currentUrl.toString());
        }
      }
    }
  }, [activeDoc, docId]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveDoc = async (id: string, title: string, content: string) => {
    setIsSaving(true);
    try {
      await updateDocument(id, title, content);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', id] });
    } catch (err) {
      console.error(err);
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
        developerMode={developerMode}
        onSave={(title, content) => handleSaveDoc(activeDoc.id, title, content)}
        isSaving={isSaving}
        documents={documents}
        selectedTeamName={activeTeam?.name}
        selectedProjectName={activeProject?.name}
        onDeleteDoc={handleDeleteDoc}
        onMoveDoc={handleMoveDoc}
        createdAt={activeDoc.createdAt}
        updatedAt={activeDoc.updatedAt}
        createdBy={activeDoc.createdBy}
        updatedBy={activeDoc.updatedBy}
        deletedAt={activeDoc.deletedAt}
      />
      <CommentDrawer 
        documentId={activeDoc.id} 
        authToken={userToken} 
        currentUserId={auth?.user?.profile.sub}
        currentUserDisplayName={auth?.user?.profile.name || auth?.user?.profile.preferred_username}
      />
    </Box>
  );
};
