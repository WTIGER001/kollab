import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Box, Drawer, useMediaQuery } from '@mui/material';
import { GripVertical, ChevronsLeftRight } from 'lucide-react';
import { TopNavbar } from '../components/TopNavbar';
import { Sidebar } from '../components/Sidebar';
import { ClassificationBanner } from '../components/ClassificationBanner';
import { useAppStore } from '../store/useAppStore';
import { useTeams, useAllProjects, useDocuments, useSystemSettings } from '../hooks/queries';
import { useDocumentTree } from '../hooks/useDocumentTree';
import { getLegacyNavigateFn } from '../utils/navigation';
import { useSession } from '../auth/SessionContext';
import { createDocument, deleteDocument, moveDocument, restoreDocument, updateDocument } from '../services/api';
import { useRecentSpacesStore } from '../store/useRecentSpacesStore';
import { useToastStore } from '../store/useToastStore';
import { CreatePageWizardModal } from '../components/CreatePageWizardModal';
import { AdminSidebar } from '../components/AdminSidebar';
import type { Template } from '../services/api';
import { resolveDocumentParent } from '../utils/documentCreation';
import { useQueryClient } from '@tanstack/react-query';

export const MainLayout: React.FC<{ isMockMode?: boolean; authMode?: "oidc" | "local" }> = ({ isMockMode, authMode = "oidc" }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const legacyNavigate = getLegacyNavigateFn(navigate);
  const { teamId, projectId, docId } = useParams();
  const location = useLocation();
  
  const { data: teams = [] } = useTeams();
  const { data: allProjects = [] } = useAllProjects();
  const { user, logout } = useSession();
  const { data: systemSettings } = useSystemSettings({ enabled: !!user?.isAdmin });

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [pendingParentId, setPendingParentId] = useState<string | undefined>(undefined);
  
  // Resolve correct IDs from the route params
  let actualTeamId: string | null = teamId === 'personal' ? null : teamId || null;
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
  const isAdminRoute = location.pathname.startsWith('/_admin');
  if (isPersonalRoute) {
    const personalTeam = teams.find(t => t.id.startsWith('personal_'));
    if (personalTeam) {
      actualTeamId = personalTeam.id;
    }
  }
  
  const { data: flatDocs, refetch: refetchDocs } = useDocuments(actualProjectId, actualTeamId);
  const filteredDocs = (flatDocs || []).filter(d => d.id !== actualTeamId && d.id !== projectId);
  const documentsTree = useDocumentTree(filteredDocs);
  

  const displayName = isMockMode ? "Developer Admin" : user?.displayName || user?.username || "User";
  const username = isMockMode ? "dev_admin" : user?.username || "user";

  const {
    sidebarOpen,
    themeMode,
    toggleThemeMode,
    setHelpOpen,
    developerMode,
    toggleDeveloperMode,
    toggleSidebar,
    sidebarWidth,
    setSidebarWidth,
    openCreateSpace,
    createPageOpen,
    setCreatePageOpen  } = useAppStore();

  const isMobile = useMediaQuery("(max-width:899.95px)");
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [adminNavigationOpen, setAdminNavigationOpen] = useState(true);
  const desktopNavigationOpen = isAdminRoute ? adminNavigationOpen : sidebarOpen;
  const navigationOpen = isMobile ? mobileNavigationOpen : desktopNavigationOpen;
  const closeMobileNavigation = () => setMobileNavigationOpen(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const { recentSpaces, syncSpaces } = useRecentSpacesStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    if (teams.length > 0 || allProjects.length > 0) {
      syncSpaces(teams, allProjects);
    }
  }, [teams, allProjects, syncSpaces]);

  useEffect(() => {
    setMobileNavigationOpen(false);
  }, [location.key, isMobile]);

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
  const handleAddDoc = (parentId?: string, bypassWizard?: boolean) => {
    if (bypassWizard) {
      void executeAddDoc(null, "Untitled Document", parentId || null).catch(() => undefined);
    } else {
      setPendingParentId(parentId);
      setTemplateModalOpen(true);
    }
  };

  const executeAddDoc = async (
    template: Template | null,
    customTitle?: string,
    customParentId?: string | null,
    customProjectId?: string,
    customTeamId?: string
  ) => {
    try {
      const pId = customProjectId !== undefined ? customProjectId : actualProjectId;
      const tId = customTeamId !== undefined ? customTeamId : actualTeamId;

      if (!pId && !tId) {
        throw new Error("Choose a team or project before creating a page.");
      }

      // A top-level page must have no document parent. Team and project IDs are
      // space identifiers, not document IDs, and cannot be used as parent_id.
      const parent = resolveDocumentParent(customParentId, pendingParentId);
      
      const title = customTitle || (template ? template.title : "Untitled Document");
      const content = template ? template.content : undefined;
      
      const newDoc = await createDocument(title, pId || null, tId || "", parent, undefined, content);
      await queryClient.invalidateQueries({ queryKey: ['documents', pId || null, tId || null] });
      setTemplateModalOpen(false);
      setCreatePageOpen(false);
      setPendingParentId(undefined);
      showToast("Page created.", "success");
      legacyNavigate(tId, pId || null, newDoc.id);
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : "Could not create the page. Please try again.", "error");
      throw e;
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
      const parent = parentId || null;
      if (!actualTeamId) return;

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

  if (isAdminRoute && !isMockMode && !user?.isAdmin) return <Box sx={{ p: 3 }}>Administrator access is required for this page.</Box>;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100dvh", width: "100%", overflow: "hidden", bgcolor: "var(--bg-color)", fontFamily: "var(--font-sans)" }}>
      {/* Classification Security Banner */}
      <ClassificationBanner systemSettings={systemSettings} />

      {/* Top Navbar */}
      <TopNavbar
        teams={teams}
        selectedTeamId={actualTeamId}
        displayName={displayName}
        username={username as string}
        onLogout={() => logout()}
        themeMode={themeMode}
        onToggleThemeMode={toggleThemeMode}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenSettings={() => legacyNavigate("_admin", null, null)}
        onOpenAdminHelp={() => legacyNavigate("_admin_help", null, null)}
        onOpenFavorites={() => legacyNavigate(null, null, null, false, false, true)}
        onOpenRecents={() => legacyNavigate(null, null, null, false, false, false, true)}
        onOpenTasks={() => legacyNavigate(null, null, null, false, false, false, false, false, false, true)}
        onOpenMentions={() => legacyNavigate(null, null, null, false, false, false, false, false, false, false, true)}
        onOpenNotifications={() => navigate("/my/notifications")}
        developerMode={developerMode}
        onToggleDeveloperMode={toggleDeveloperMode}
        sidebarOpen={navigationOpen}
        onToggleSidebar={() => isMobile ? setMobileNavigationOpen(!mobileNavigationOpen) : isAdminRoute ? setAdminNavigationOpen(!adminNavigationOpen) : toggleSidebar()}
        isMobile={isMobile}
        isAdminRoute={isAdminRoute}
      />

      {/* Bottom Area: Sidebar + Content */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden", position: "relative" }}>
        {/* Sidebar Navigation */}
        <Drawer
          variant={isMobile ? "temporary" : "persistent"}
          open={navigationOpen}
          onClose={closeMobileNavigation}
          slotProps={{ paper: { id: "workspace-navigation", sx: {
            position: isMobile ? "fixed" : "relative",
            width: isMobile ? "min(320px, calc(100vw - 32px))" : isAdminRoute ? 264 : sidebarWidth,
            maxWidth: "100%", height: "100%", overflow: "hidden",
            bgcolor: "var(--panel-color)", color: "var(--text-primary)",
            border: 0, boxShadow: isMobile ? "var(--shadow-elevation)" : "none",
            pt: isMobile ? `calc(env(safe-area-inset-top) + ${systemSettings?.classificationBannerEnabled ? 26 : 0}px)` : 0,
            pb: isMobile ? "env(safe-area-inset-bottom)" : 0,
          } }, backdrop: { sx: { bgcolor: "color-mix(in srgb, var(--text-primary) 35%, transparent)" } } }}
          sx={{ flexShrink: 0, display: !isMobile && !navigationOpen ? "none" : undefined }}
        >
        {isAdminRoute ? (
          <AdminSidebar authMode={authMode} onClose={isMobile ? closeMobileNavigation : undefined} />
        ) : (
          <Sidebar
            documents={documentsTree}
            activeDocId={docId || null}
            onSelectDoc={(id) => { closeMobileNavigation(); legacyNavigate(actualTeamId, actualProjectId, id); }}
            onAddDoc={handleAddDoc}
            onImportMarkdown={handleImportMarkdown}
            onDeleteDoc={handleDeleteDoc}
            onMoveDoc={handleMoveDoc}
            teams={teams}
            projects={allProjects}
            selectedTeamId={actualTeamId}
            selectedProjectId={actualProjectId}
            navigateTo={(...args) => { closeMobileNavigation(); legacyNavigate(...args); }}
            width={sidebarWidth}
            recentSpaces={recentSpaces}
            onOpenCreateSpace={() => openCreateSpace()}
            onRestoreDoc={handleRestoreDoc}
            onDeleteDocPermanently={handleDeleteDocPermanently}
            isMobile={isMobile}
            onCloseSidebar={closeMobileNavigation}
          />
        )}
        </Drawer>

        {/* Resizable Drag Handle */}
        {!isAdminRoute && !isMobile && sidebarOpen && (
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
        <Box component="main" sx={{ flex: 1, minWidth: 0, minHeight: 0, height: "100%", display: "flex", flexDirection: "column", overflow: "auto", position: "relative", overscrollBehavior: "contain" }}>
          <Outlet />
        </Box>
      </Box>

      <CreatePageWizardModal
        open={templateModalOpen || createPageOpen}
        onClose={() => {
          setTemplateModalOpen(false);
          setCreatePageOpen(false);
        }}
        teams={teams}
        projects={allProjects}
        currentTeamId={actualTeamId}
        currentProjectId={actualProjectId || null}
        onConfirm={executeAddDoc}
      />
    </Box>
  );
};
