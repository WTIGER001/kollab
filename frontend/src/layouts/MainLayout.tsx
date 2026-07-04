import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Box, useMediaQuery, Fab } from '@mui/material';
import { GripVertical, ChevronsLeftRight } from 'lucide-react';
import { TopNavbar } from '../components/TopNavbar';
import { Sidebar } from '../components/Sidebar';
import { useAppStore } from '../store/useAppStore';
import { useTeams, useAllProjects, useDocuments } from '../hooks/queries';
import { useDocumentTree } from '../hooks/useDocumentTree';
import { getLegacyNavigateFn } from '../utils/navigation';
import { useAuth } from 'react-oidc-context';
import { createDocument, deleteDocument, moveDocument, restoreDocument, updateDocument } from '../services/api';
import { presets } from '../theme/presets';
import { useRecentSpacesStore } from '../store/useRecentSpacesStore';

export const MainLayout: React.FC<{ isMockMode?: boolean }> = ({ isMockMode }) => {
  const navigate = useNavigate();
  const legacyNavigate = getLegacyNavigateFn(navigate);
  const { teamId, projectId, docId } = useParams();
  const location = useLocation();
  
  const { data: teams = [] } = useTeams();
  const { data: allProjects = [] } = useAllProjects();
  
  // Resolve correct IDs from the route params
  let actualTeamId = teamId === 'personal' ? null : teamId;
  let actualProjectId = projectId || null;
  
  if (teamId && teamId !== 'personal') {
    const matchedTeam = teams.find(t => t.id === teamId || t.abbreviation === teamId);
    if (matchedTeam) {
      actualTeamId = matchedTeam.id;
    }
  }

  if (projectId && actualTeamId) {
    const matchedProject = allProjects.find(p => (p.id === projectId || p.abbreviation === projectId) && p.teamId === actualTeamId);
    if (matchedProject) {
      actualProjectId = matchedProject.id;
    }
  }
  
  // If the route is /personal, use the personal team ID
  const isPersonalRoute = location.pathname === '/personal' || location.pathname.startsWith('/personal/');
  if (isPersonalRoute) {
    const personalTeam = teams.find(t => t.id.startsWith('personal_'));
    if (personalTeam) {
      actualTeamId = personalTeam.id;
    }
  }
  
  const { data: flatDocs, refetch: refetchDocs } = useDocuments(actualProjectId, actualTeamId);
  const filteredDocs = (flatDocs || []).filter(d => d.id !== actualTeamId && d.id !== projectId);
  const documentsTree = useDocumentTree(filteredDocs);
  
  const auth = isMockMode ? null : useAuth();
  const displayName = isMockMode ? "Developer Admin" : auth?.user?.profile.name || auth?.user?.profile.preferred_username || "User";
  const username = isMockMode ? "dev_admin" : auth?.user?.profile.preferred_username || auth?.user?.profile.username || "user";

  const {
    sidebarOpen,
    themeMode,
    toggleThemeMode,
    setHelpOpen,
    developerMode,
    toggleDeveloperMode,
    toggleSidebar,
    setSidebarOpen,
    sidebarWidth,
    setSidebarWidth,
    setCreateSpaceOpen,
    activeThemeId,
    setActiveThemeId
  } = useAppStore();

  const isMobile = useMediaQuery("(max-width:768px)");
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const { recentSpaces, syncSpaces } = useRecentSpacesStore();

  useEffect(() => {
    if (teams.length > 0 || allProjects.length > 0) {
      syncSpaces(teams, allProjects);
    }
  }, [teams, allProjects, syncSpaces]);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile, setSidebarOpen]);

  const startResizing = () => setIsResizing(true);
  const stopResizing = () => setIsResizing(false);
  
  const resize = (mouseMoveEvent: MouseEvent) => {
    const newWidth = mouseMoveEvent.clientX;
    if (newWidth >= 180 && newWidth <= 480) {
      setSidebarWidth(newWidth);
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      return () => {
        window.removeEventListener("mousemove", resize);
        window.removeEventListener("mouseup", stopResizing);
      };
    }
  }, [isResizing]);

  // Mutation wrappers to trigger a query refetch instead of mutating state
  const handleAddDoc = async (parentId?: string) => {
    try {
      const parent = parentId || (actualProjectId ? actualProjectId : actualTeamId);
      if (!parent) return; // Cannot create document without a team or project context
      const newDoc = await createDocument("Untitled Document", actualProjectId || null, actualTeamId, parent);
      refetchDocs();
      legacyNavigate(actualTeamId, actualProjectId || null, newDoc.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    await deleteDocument(id);
    refetchDocs();
    legacyNavigate(actualTeamId, actualProjectId || null, null);
  };

  const handleMoveDoc = async (id: string, parentId: string | null) => {
    await moveDocument(id, parentId);
    refetchDocs();
  };

  const handleRestoreDoc = async (id: string) => {
    await restoreDocument(id);
    refetchDocs();
  };

  const handleImportMarkdown = async (parentId: string | undefined, title: string, markdown: string) => {
    try {
      const parent = parentId || (actualProjectId ? actualProjectId : actualTeamId);
      if (!parent) return;

      const newDoc = await createDocument(title, actualProjectId || null, actualTeamId, parent);
      
      const contentJSON = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "macroBlock",
            attrs: {
              type: "markdown-paste",
              config: {
                markdown: markdown
              }
            }
          }
        ]
      });

      await updateDocument(newDoc.id, title, contentJSON);

      refetchDocs();
      legacyNavigate(actualTeamId, actualProjectId || null, newDoc.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDocPermanently = async (id: string) => {
    await deleteDocument(id, true);
    refetchDocs();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden", bgcolor: "background.default", fontFamily: "var(--font-sans)" }}>
      {/* Top Navbar */}
      <TopNavbar
        teams={teams}
        selectedTeamId={actualTeamId}
        displayName={displayName}
        username={username as string}
        onLogout={() => auth?.signoutRedirect()}
        themeMode={themeMode}
        onToggleThemeMode={toggleThemeMode}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenSettings={() => legacyNavigate("_admin", null, null)}
        onOpenAdminHelp={() => legacyNavigate("_admin_help", null, null)}
        onOpenFavorites={() => legacyNavigate(null, null, null, false, false, true)}
        onOpenRecents={() => legacyNavigate(null, null, null, false, false, false, true)}
        onOpenTasks={() => legacyNavigate(null, null, null, false, false, false, false, false, false, true)}
        onOpenMentions={() => legacyNavigate(null, null, null, false, false, false, false, false, false, false, true)}
        developerMode={developerMode}
        onToggleDeveloperMode={toggleDeveloperMode}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        isMobile={isMobile}
      />

      {/* Bottom Area: Sidebar + Content */}
      <Box sx={{ display: "flex", flex: 1, height: "calc(100vh - 48px)", overflow: "hidden", position: "relative" }}>
        {/* Sidebar Navigation */}
        {sidebarOpen && (
          <Sidebar
            documents={documentsTree}
            activeDocId={docId || null}
            onSelectDoc={(id) => legacyNavigate(actualTeamId, actualProjectId, id)}
            onAddDoc={handleAddDoc}
            onImportMarkdown={handleImportMarkdown}
            onDeleteDoc={handleDeleteDoc}
            onMoveDoc={handleMoveDoc}
            teams={teams}
            projects={allProjects}
            selectedTeamId={actualTeamId}
            selectedProjectId={actualProjectId}
            navigateTo={legacyNavigate}
            width={sidebarWidth}
            recentSpaces={recentSpaces}
            onOpenCreateSpace={() => setCreateSpaceOpen(true)}
            onRestoreDoc={handleRestoreDoc}
            onDeleteDocPermanently={handleDeleteDocPermanently}
            isMobile={isMobile}
            onCloseSidebar={() => setSidebarOpen(false)}
          />
        )}

        {/* Resizable Drag Handle */}
        {!isMobile && sidebarOpen && (
          <Box
            onMouseDown={startResizing}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            sx={{
              width: "4px",
              cursor: "col-resize",
              position: "relative",
              zIndex: 20,
              backgroundColor: isResizing || isHovered ? "var(--primary-color)" : "transparent",
              transition: "background-color 0.15s ease",
              "&:hover": { backgroundColor: "var(--primary-color)" },
              "&::before": { content: '""', position: "absolute", top: 0, bottom: 0, left: "-4px", right: "-4px" },
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Box
              sx={{
                width: "16px", height: "32px",
                backgroundColor: isResizing || isHovered ? "var(--primary-color)" : "var(--glass-bg)",
                border: "1px solid", borderColor: isResizing || isHovered ? "var(--primary-color)" : "var(--glass-border)",
                borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center",
                color: isResizing || isHovered ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: "col-resize", pointerEvents: "none", transition: "all 0.15s ease",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {isResizing || isHovered ? <ChevronsLeftRight size={10} /> : <GripVertical size={10} />}
            </Box>
          </Box>
        )}

        {/* Main Canvas Workspace */}
        <Box component="main" sx={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};
