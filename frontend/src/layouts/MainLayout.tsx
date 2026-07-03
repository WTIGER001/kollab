import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Box, useMediaQuery } from '@mui/material';
import { GripVertical, ChevronsLeftRight } from 'lucide-react';
import { TopNavbar } from '../components/TopNavbar';
import { Sidebar } from '../components/Sidebar';
import { useAppStore } from '../store/useAppStore';
import { useTeams, useAllProjects, useDocuments } from '../hooks/queries';
import { useDocumentTree } from '../hooks/useDocumentTree';
import { getLegacyNavigateFn } from '../utils/navigation';
import { useAuth } from 'react-oidc-context';
import { createDocument, deleteDocument, moveDocument, restoreDocument } from '../services/api';

// Temporary mock for recent spaces until we move it to store/query
const recentSpaces: any[] = JSON.parse(localStorage.getItem('recent_spaces') || '[]');

export const MainLayout: React.FC<{ isMockMode?: boolean }> = ({ isMockMode }) => {
  const navigate = useNavigate();
  const legacyNavigate = getLegacyNavigateFn(navigate);
  const { teamId, projectId, docId } = useParams();
  const location = useLocation();
  
  const { data: teams = [] } = useTeams();
  const { data: allProjects = [] } = useAllProjects();
  
  // Resolve correct IDs from the route params
  let actualTeamId = teamId === 'personal' ? null : teamId;
  
  // If the route is /personal, use the personal team ID
  const isPersonalRoute = location.pathname === '/personal' || location.pathname.startsWith('/personal/');
  if (isPersonalRoute) {
    const personalTeam = teams.find(t => t.id.startsWith('personal_'));
    if (personalTeam) {
      actualTeamId = personalTeam.id;
    }
  }
  
  const { data: flatDocs, refetch: refetchDocs } = useDocuments(projectId, actualTeamId);
  const filteredDocs = (flatDocs || []).filter(d => d.id !== actualTeamId && d.id !== projectId);
  const documentsTree = useDocumentTree(filteredDocs);
  
  const auth = isMockMode ? null : useAuth();
  const displayName = isMockMode ? "Developer Admin" : auth?.user?.profile.name || auth?.user?.profile.preferred_username || "User";
  const username = isMockMode ? "dev_admin" : auth?.user?.profile.preferred_username || auth?.user?.profile.username || "user";

  const {
    sidebarOpen,
    themeMode,
    toggleThemeMode,
    setSearchOpen,
    setHelpOpen,
    developerMode,
    toggleDeveloperMode,
    toggleSidebar,
    setSidebarOpen,
    sidebarWidth,
    setSidebarWidth,
    setCreateSpaceOpen
  } = useAppStore();

  const isMobile = useMediaQuery("(max-width:768px)");
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
      const parent = parentId || (projectId ? projectId : actualTeamId);
      if (!parent) return; // Cannot create document without a team or project context
      const newDoc = await createDocument("Untitled Document", projectId || null, actualTeamId, parent);
      refetchDocs();
      legacyNavigate(actualTeamId, projectId || null, newDoc.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    await deleteDocument(id);
    refetchDocs();
    legacyNavigate(actualTeamId, projectId || null, null);
  };

  const handleMoveDoc = async (id: string, parentId: string | null) => {
    await moveDocument(id, parentId);
    refetchDocs();
  };

  const handleRestoreDoc = async (id: string) => {
    await restoreDocument(id);
    refetchDocs();
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
        onOpenSearch={() => setSearchOpen(true)}
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
            onSelectDoc={(id) => legacyNavigate(actualTeamId, projectId || null, id)}
            onAddDoc={handleAddDoc}
            onDeleteDoc={handleDeleteDoc}
            onMoveDoc={handleMoveDoc}
            teams={teams}
            projects={allProjects}
            selectedTeamId={actualTeamId}
            selectedProjectId={projectId || null}
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
                backgroundColor: isResizing || isHovered ? "var(--primary-color)" : (themeMode === "light" ? "#ffffff" : "rgba(22, 25, 36, 0.6)"),
                border: "1px solid", borderColor: isResizing || isHovered ? "var(--primary-color)" : (themeMode === "light" ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.08)"),
                borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center",
                color: isResizing || isHovered ? "#ffffff" : (themeMode === "light" ? "rgba(0, 0, 0, 0.45)" : "text.secondary"),
                cursor: "col-resize", pointerEvents: "none", transition: "all 0.15s ease",
                boxShadow: themeMode === "light" ? "0 1px 4px rgba(0, 0, 0, 0.08)" : "0 1px 4px rgba(0, 0, 0, 0.25)",
              }}
            >
              {isResizing || isHovered ? <ChevronsLeftRight size={10} /> : <GripVertical size={10} />}
            </Box>
          </Box>
        )}

        {/* Main Canvas Workspace */}
        <Box component="main" sx={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};
