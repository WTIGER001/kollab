import { useEffect, useState, lazy, Suspense } from "react";
import { useAuth } from "react-oidc-context";
import { Snackbar, Alert } from "@mui/material";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

import { SessionContext } from "./auth/SessionContext";
import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser, fetchOIDCConfig } from "./services/api";
import { TrashRoute, PageAuditRoute } from "./routes/UtilityRoutes";
import { MainLayout } from "./layouts/MainLayout";

import { FavoritesView } from "./components/FavoritesView";
import { RecentPagesView } from "./components/RecentPagesView";
import { TasksView } from "./components/TasksView";
import { UserMentionsView } from "./components/UserMentionsView";
import { NotificationsView } from "./components/NotificationsView";
import { ServerSettingsPage } from "./components/ServerSettingsPage";
import { AdminHelpPage } from "./components/AdminHelpPage";
import { ScopeTransferPage } from "./components/ScopeTransferPage";
import { AdminBackupsPage } from "./components/AdminBackupsPage";
import { AdminLocalUsersPage } from "./components/AdminLocalUsersPage";
import { ConfluenceImportPage } from "./components/import/ConfluenceImportPage";
import { ImageLibraryView } from "./components/ImageLibraryView";
import { TemplateLibraryView } from "./components/TemplateLibraryView";
import { TeamsDirectoryView } from "./components/TeamsDirectoryView";
import { SearchPage } from "./pages/SearchPage";
import { HelpDialog } from "./components/HelpDialog";
import { CreateSpaceDialog } from "./components/CreateSpaceDialog";

import { setApiToken, setOnUnauthorized, createTeam, createProject, updateSystemSettings, updateWorkspaceTheme, loginLocal, setupInitialLocalAdmin } from "./services/api";
import { useAppStore } from "./store/useAppStore";
import { useToastStore } from "./store/useToastStore";
import { useTeams, useProjects, useSystemSettings } from "./hooks/queries";
import { useQueryClient } from "@tanstack/react-query";

import { TeamPortalWrapper, ProjectPortalWrapper, ProjectSettingsWrapper, PersonalPortalWrapper, TeamSettingsWrapper, PersonalSettingsWrapper } from "./routes/PortalWrappers";
import { AuthGuard } from "./components/AuthGuard";

interface AppProps {
  isMockMode?: boolean;
  welcomeTitle?: string;
  welcomeText?: string;
  authLogoUrl?: string;
  authLogoSize?: string;
  legalDisclaimer?: string;
  authLoginButtonText?: string;
  authMode?: "oidc" | "local";
  localSetupRequired?: boolean;
  localToken?: string | null;
  onLocalToken?: (token: string | null) => void;
}

export default function App({ isMockMode = false, welcomeTitle, welcomeText, authLogoUrl, authLogoSize, legalDisclaimer, authLoginButtonText, authMode = "local", localSetupRequired = false, localToken = null, onLocalToken }: AppProps) {
	const auth = useAuth();
  
  // API calls use the access token issued for Kollab's API resource. ID tokens
  // prove sign-in to the SPA and must never be forwarded to an API as bearer tokens.
  const userToken = isMockMode ? "mock-jwt-token" : authMode === "local" ? localToken : auth?.user?.access_token || null;
  setApiToken(userToken);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    helpOpen,
    setHelpOpen,
    createSpaceOpen,
    setCreateSpaceOpen,
    createSpaceInitialTab,
    createSpaceTeamId,
    openCreateSpace,
  } = useAppStore();
  const { open: toastOpen, message: toastMessage, severity: toastSeverity, showToast, hideToast } = useToastStore();
  
  // Only enable data fetching when fully authenticated and not currently processing a login/redirect
  const isAuthenticated = isMockMode || (authMode === "local" ? !!localToken : !!auth?.isAuthenticated && !auth?.isLoading && !auth?.activeNavigator && !auth?.error);
  const handleLocalLogin = async (username: string, password: string) => {
    const result = await loginLocal(username, password);
    setApiToken(result.token);
    onLocalToken?.(result.token);
  };
  const handleInitialAdminSetup = async (user: { username: string; password: string; email: string; displayName: string }) => {
    const result = await setupInitialLocalAdmin(user);
    setApiToken(result.token);
    onLocalToken?.(result.token);
  };
  
  const { data: workspaceConfig } = useQuery({ queryKey: ["oidcConfig"], queryFn: fetchOIDCConfig });
  const { data: currentUser = null } = useQuery({ queryKey: ['currentUser', userToken], queryFn: fetchCurrentUser, enabled: isAuthenticated && !!userToken });
  const logout = () => {
    setApiToken(null); onLocalToken?.(null); queryClient.clear(); setApiAuthError(false);
    if (authMode === 'oidc') void auth.signoutRedirect();
  };
  const { data: teams = [] } = useTeams({ enabled: isAuthenticated && !!userToken });
  const { data: projects = [] } = useProjects("all", { enabled: isAuthenticated && !!userToken });
  const { data: systemSettings } = useSystemSettings({ enabled: !!currentUser?.isAdmin });

  const [apiAuthError, setApiAuthError] = useState<boolean>(false);

  useEffect(() => {
    if (!isMockMode) {
      setOnUnauthorized(() => {
        showToast("API rejected token (401). Backend authentication failed.", "error");
        setApiAuthError(true);
        if (authMode === "local") { onLocalToken?.(null); setApiToken(null); queryClient.clear(); }
      });
    }
    return () => setOnUnauthorized(() => {});
  }, [auth, isMockMode, showToast]);

  const handleCreateTeam = async (name: string, abbreviation: string, description: string) => {
    const team = await createTeam(name, abbreviation, description);
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    showToast("Team space created successfully.", "success");
    navigate(`/teams/${team.abbreviation || team.id}`);
    return team;
  };

  const handleCreateProject = async (teamId: string, name: string, abbreviation: string, description: string) => {
    const project = await createProject(teamId, name, abbreviation, description, "");
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    showToast("Project space created successfully.", "success");
    const team = teams.find((candidate) => candidate.id === teamId);
    navigate(`/teams/${team?.abbreviation || teamId}/p/${project.abbreviation || project.id}`);
    return project;
  };

  const handleGlobalNavigate = (documentId: string, teamId: string, projectId: string | null) => {
    if (teamId === "personal" || teamId.startsWith("personal_")) {
      navigate(`/personal/docs/${documentId}`);
    } else {
      const team = teams.find(t => t.id === teamId);
      const tId = team?.abbreviation || teamId;
      if (projectId) {
        const project = projects.find(p => p.id === projectId);
        const pId = project?.abbreviation || projectId;
        navigate(`/teams/${tId}/p/${pId}/docs/${documentId}`);
      } else {
        navigate(`/teams/${tId}/docs/${documentId}`);
      }
    }
  };

  if (location.pathname.startsWith('/share/') && !new URLSearchParams(location.search).has('signin')) {
    return <SessionContext.Provider value={{ token: userToken, user: currentUser, logout }}><Suspense fallback={<div role="status">Loading shared page…</div>}><SharedDocumentPage /></Suspense></SessionContext.Provider>;
  }

  return (
    <SessionContext.Provider value={{ token: userToken, user: currentUser, logout }}>
      <AuthGuard
        isMockMode={isMockMode}
        authMode={authMode}
        localSetupRequired={localSetupRequired}
        localToken={localToken}
        onLocalLogin={handleLocalLogin}
        onInitialAdminSetup={handleInitialAdminSetup}
        welcomeTitle={welcomeTitle}
        welcomeText={welcomeText}
        authLogoUrl={authLogoUrl}
        authLogoSize={authLogoSize}
        legalDisclaimer={legalDisclaimer}
        authLoginButtonText={authLoginButtonText}
        apiAuthError={apiAuthError}
      >
        <Suspense fallback={<div role="status">Loading workspace…</div>}>
        <Routes>
          <Route path="/share/:token" element={<Navigate to={location.pathname} replace />} />
          <Route path="/" element={<MainLayout isMockMode={isMockMode} authMode={authMode} />}>
            <Route index element={<Navigate to="/my/recents" replace />} />
            
            <Route path="search" element={<SearchPage onNavigate={handleGlobalNavigate} />} />
            
            <Route
              path="my/recents"
              element={
                <RecentPagesView
                  onNavigate={handleGlobalNavigate}
                  teams={teams}
                  projects={projects}
                  onCreateSpace={() => openCreateSpace()}
                  onOpenPersonalSpace={() => navigate("/personal")}
                  onOpenSharedSpace={() => {
                    const team = teams.find((candidate) => !candidate.id.startsWith("personal_"));
                    if (team) navigate(`/teams/${team.abbreviation || team.id}`);
                  }}
                />
              }
            />
            <Route path="my/favorites" element={<FavoritesView onNavigate={handleGlobalNavigate} onUnfavoriteActive={() => {}} />} />
            <Route path="my/tasks" element={<TasksView username={currentUser?.username || ""} onNavigate={handleGlobalNavigate} />} />
            <Route path="my/mentions" element={<UserMentionsView username={currentUser?.username || ""} onNavigate={handleGlobalNavigate} teams={teams} projects={projects} />} />
            <Route path="my/notifications" element={<NotificationsView onOpenDocument={handleGlobalNavigate} />} />

            <Route path="personal" element={<PersonalPortalWrapper teams={teams} projects={projects} />} />
            <Route path="personal/_settings" element={<PersonalSettingsWrapper />} />
            <Route path="personal/trash" element={<TrashRoute />} />
            <Route path="personal/_images" element={<ImageLibraryView scope="personal" />} />
            <Route path="personal/_templates" element={<TemplateLibraryView scope="personal" />} />
            <Route path="personal/template/:templateId" element={<TemplatePage isMockMode={isMockMode} />} />
            <Route path="personal/docs/:docId" element={<DocumentPage isMockMode={isMockMode} />} />
            <Route path="personal/docs/:docId/viewers" element={<PageAuditRoute />} />

            <Route path="teams" element={<TeamsDirectoryView teams={teams} projects={projects} />} />
            <Route path="teams/:teamId" element={<TeamPortalWrapper teams={teams} projects={projects} />} />
            <Route path="teams/:teamId/p/:projectId" element={<ProjectPortalWrapper teams={teams} projects={projects} />} />
            <Route path="teams/:teamId/_settings" element={<TeamSettingsWrapper teams={teams} />} />
            <Route path="teams/:teamId/trash" element={<TrashRoute />} />
            <Route path="teams/:teamId/_images" element={<ImageLibraryView scope="team" />} />
            <Route path="teams/:teamId/_templates" element={<TemplateLibraryView scope="team" />} />
            <Route path="teams/:teamId/template/:templateId" element={<TemplatePage isMockMode={isMockMode} />} />
            <Route path="teams/:teamId/docs/:docId" element={<DocumentPage isMockMode={isMockMode} />} />
            <Route path="teams/:teamId/docs/:docId/viewers" element={<PageAuditRoute />} />

            <Route path="teams/:teamId/p/:projectId/_settings" element={<ProjectSettingsWrapper teams={teams} projects={projects} />} />
            <Route path="teams/:teamId/p/:projectId/trash" element={<TrashRoute />} />
            <Route path="teams/:teamId/p/:projectId/_images" element={<ImageLibraryView scope="project" />} />
            <Route path="teams/:teamId/p/:projectId/_templates" element={<TemplateLibraryView scope="team" />} />
            <Route path="teams/:teamId/p/:projectId/template/:templateId" element={<TemplatePage isMockMode={isMockMode} />} />
            <Route path="teams/:teamId/p/:projectId/docs/:docId" element={<DocumentPage isMockMode={isMockMode} />} />
            <Route path="teams/:teamId/p/:projectId/docs/:docId/viewers" element={<PageAuditRoute />} />
            
            <Route path="_admin/settings" element={<ServerSettingsPage currentTheme={workspaceConfig?.theme || null} onSave={async (name, logoUrl, lightMode, darkMode) => { await updateWorkspaceTheme(name, logoUrl, lightMode, darkMode); queryClient.invalidateQueries({ queryKey: ["oidcConfig"] }); }} systemSettings={systemSettings!} onSaveSettings={async (settings) => { await updateSystemSettings(settings); queryClient.invalidateQueries({ queryKey: ['systemSettings'] }); }} onBack={() => navigate('/my/recents')} showToast={showToast} />} />
            <Route path="_admin/settings/appearance" element={<ServerSettingsPage section="appearance" currentTheme={workspaceConfig?.theme || null} onSave={async (name, logoUrl, lightMode, darkMode) => { await updateWorkspaceTheme(name, logoUrl, lightMode, darkMode); queryClient.invalidateQueries({ queryKey: ["oidcConfig"] }); }} systemSettings={systemSettings!} onSaveSettings={async (settings) => { await updateSystemSettings(settings); queryClient.invalidateQueries({ queryKey: ['systemSettings'] }); }} onBack={() => navigate('/my/recents')} showToast={showToast} />} />
            <Route path="_admin/settings/authentication" element={<ServerSettingsPage section="authentication" currentTheme={workspaceConfig?.theme || null} onSave={async (name, logoUrl, lightMode, darkMode) => { await updateWorkspaceTheme(name, logoUrl, lightMode, darkMode); queryClient.invalidateQueries({ queryKey: ["oidcConfig"] }); }} systemSettings={systemSettings!} onSaveSettings={async (settings) => { await updateSystemSettings(settings); queryClient.invalidateQueries({ queryKey: ['systemSettings'] }); }} onBack={() => navigate('/my/recents')} showToast={showToast} />} />
            <Route path="_admin/settings/retention" element={<ServerSettingsPage section="retention" currentTheme={workspaceConfig?.theme || null} onSave={async (name, logoUrl, lightMode, darkMode) => { await updateWorkspaceTheme(name, logoUrl, lightMode, darkMode); queryClient.invalidateQueries({ queryKey: ["oidcConfig"] }); }} systemSettings={systemSettings!} onSaveSettings={async (settings) => { await updateSystemSettings(settings); queryClient.invalidateQueries({ queryKey: ['systemSettings'] }); }} onBack={() => navigate('/my/recents')} showToast={showToast} />} />
            <Route path="_admin/settings/previews" element={<ServerSettingsPage section="previews" currentTheme={workspaceConfig?.theme || null} onSave={async (name, logoUrl, lightMode, darkMode) => { await updateWorkspaceTheme(name, logoUrl, lightMode, darkMode); queryClient.invalidateQueries({ queryKey: ["oidcConfig"] }); }} systemSettings={systemSettings!} onSaveSettings={async (settings) => { await updateSystemSettings(settings); queryClient.invalidateQueries({ queryKey: ['systemSettings'] }); }} onBack={() => navigate('/my/recents')} showToast={showToast} />} />
            <Route path="_admin/settings/backups" element={<ServerSettingsPage section="backups" currentTheme={workspaceConfig?.theme || null} onSave={async (name, logoUrl, lightMode, darkMode) => { await updateWorkspaceTheme(name, logoUrl, lightMode, darkMode); queryClient.invalidateQueries({ queryKey: ["oidcConfig"] }); }} systemSettings={systemSettings!} onSaveSettings={async (settings) => { await updateSystemSettings(settings); queryClient.invalidateQueries({ queryKey: ['systemSettings'] }); }} onBack={() => navigate('/my/recents')} showToast={showToast} />} />
            <Route path="_admin/settings/integrations" element={<ServerSettingsPage section="integrations" currentTheme={workspaceConfig?.theme || null} onSave={async (name, logoUrl, lightMode, darkMode) => { await updateWorkspaceTheme(name, logoUrl, lightMode, darkMode); queryClient.invalidateQueries({ queryKey: ["oidcConfig"] }); }} systemSettings={systemSettings!} onSaveSettings={async (settings) => { await updateSystemSettings(settings); queryClient.invalidateQueries({ queryKey: ['systemSettings'] }); }} onBack={() => navigate('/my/recents')} showToast={showToast} />} />
            <Route path="_admin/help" element={<AdminHelpPage onBack={() => navigate("/_admin/settings")} />} />
            <Route path="_admin/transfers" element={<ScopeTransferPage />} />
            <Route path="_admin/backups" element={<AdminBackupsPage />} />
            <Route path="_admin/users" element={authMode === "local" ? <AdminLocalUsersPage /> : <Navigate to="/_admin/settings" replace />} />
            <Route path="import/confluence" element={<ConfluenceImportPage />} />
            
            <Route path="_admin/_images" element={<ImageLibraryView scope="system" />} />
            <Route path="_admin/_templates" element={<TemplateLibraryView scope="system" />} />
            <Route path="_admin/template/:templateId" element={<TemplatePage isMockMode={isMockMode} />} />
          </Route>
        </Routes>
        </Suspense>
      </AuthGuard>

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <CreateSpaceDialog
        open={createSpaceOpen}
        onClose={() => setCreateSpaceOpen(false)}
        teams={teams}
        activeTeamId={createSpaceTeamId}
        initialTab={createSpaceInitialTab}
        onCreateTeam={handleCreateTeam}
        onCreateProject={handleCreateProject}
      />

      <Snackbar open={toastOpen} autoHideDuration={4000} onClose={hideToast} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={hideToast} severity={toastSeverity} variant="filled" sx={{ width: "100%", borderRadius: "8px" }}>{toastMessage}</Alert>
      </Snackbar>
    </SessionContext.Provider>
  );
}

const DocumentPage = lazy(() => import("./pages/DocumentPage").then(module => ({ default: module.DocumentPage })));

const TemplatePage = lazy(() => import("./pages/TemplatePage").then(module => ({ default: module.TemplatePage })));

const SharedDocumentPage = lazy(() => import("./pages/SharedDocumentPage").then(module => ({ default: module.SharedDocumentPage })));
