import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Snackbar, Alert } from "@mui/material";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import { MainLayout } from "./layouts/MainLayout";
import { DocumentPage } from "./pages/DocumentPage";
import { TemplatePage } from "./pages/TemplatePage";

import { TeamSettingsView } from "./components/TeamSettingsView";
import { PersonalSettingsView } from "./components/PersonalSettingsView";
import { FavoritesView } from "./components/FavoritesView";
import { RecentPagesView } from "./components/RecentPagesView";
import { PageAuditView } from "./components/PageAuditView";
import { TrashView } from "./components/TrashView";
import { TasksView } from "./components/TasksView";
import { UserMentionsView } from "./components/UserMentionsView";
import { NotificationsView } from "./components/NotificationsView";
import { ServerSettingsPage } from "./components/ServerSettingsPage";
import { AdminHelpPage } from "./components/AdminHelpPage";
import { AdminLocalUsersPage } from "./components/AdminLocalUsersPage";
import { ImageLibraryView } from "./components/ImageLibraryView";
import { TemplateLibraryView } from "./components/TemplateLibraryView";
import { TeamsDirectoryView } from "./components/TeamsDirectoryView";
import { SearchPage } from "./pages/SearchPage";
import { HelpDialog } from "./components/HelpDialog";
import { CreateSpaceDialog } from "./components/CreateSpaceDialog";

import { setApiToken, setOnUnauthorized, createTeam, createProject, updateSystemSettings, loginLocal, setupInitialLocalAdmin } from "./services/api";
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
  authMode?: "oidc" | "local";
  localSetupRequired?: boolean;
  localToken?: string | null;
  onLocalToken?: (token: string | null) => void;
  authLoginButtonText?: string;
}

export default function App({ isMockMode = false, welcomeTitle, welcomeText, authLogoUrl, authLogoSize, legalDisclaimer, authLoginButtonText, authMode = "oidc", localSetupRequired = false, localToken = null, onLocalToken }: AppProps) {
	const auth = useAuth();
  
  // Try to grab token if authenticatedo free tier does not support API resources, so we can't get a JWT access_token.
  const userToken = isMockMode ? "mock-jwt-token" : authMode === "local" ? localToken : auth?.user?.id_token || null;
  setApiToken(userToken);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { themeMode, helpOpen, setHelpOpen, createSpaceOpen, setCreateSpaceOpen } = useAppStore();
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
  
  const { data: teams = [] } = useTeams({ enabled: isAuthenticated && !!userToken });
  const { data: projects = [] } = useProjects("all", { enabled: isAuthenticated && !!userToken });
  const { data: systemSettings } = useSystemSettings({ enabled: isAuthenticated && !!userToken });

  const [apiAuthError, setApiAuthError] = useState<boolean>(false);

  useEffect(() => {
    if (!isMockMode && auth) {
      setOnUnauthorized(() => {
        showToast("API rejected token (401). Backend authentication failed.", "error");
        setApiAuthError(true);
      });
    }
    return () => setOnUnauthorized(() => {});
  }, [auth, isMockMode, showToast]);

  const handleCreateTeam = async (name: string, abbreviation: string, description: string) => {
    await createTeam(name, abbreviation, description);
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    showToast("Team space created successfully.", "success");
  };

  const handleCreateProject = async (teamId: string, name: string, abbreviation: string, description: string) => {
    await createProject(teamId, name, abbreviation, description, "");
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    showToast("Project space created successfully.", "success");
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
        authMode={authMode}
        localSetupRequired={localSetupRequired}
        localToken={localToken}
        onLocalLogin={handleLocalLogin}
        onInitialAdminSetup={handleInitialAdminSetup}
  };

  return (
    <>
      <AuthGuard
        isMockMode={isMockMode}
        welcomeTitle={welcomeTitle}
        welcomeText={welcomeText}
        authLogoUrl={authLogoUrl}
        authLogoSize={authLogoSize}
        legalDisclaimer={legalDisclaimer}
        authLoginButtonText={authLoginButtonText}
        apiAuthError={apiAuthError}
      >
        <Routes>
          <Route path="/" element={<MainLayout isMockMode={isMockMode} />}>
            <Route index element={<Navigate to="/my/recents" replace />} />
            
            <Route path="search" element={<SearchPage onNavigate={handleGlobalNavigate} />} />
            
            <Route path="my/recents" element={<RecentPagesView onNavigate={handleGlobalNavigate} teams={teams} projects={projects} />} />
            <Route path="my/favorites" element={<FavoritesView onNavigate={handleGlobalNavigate} onUnfavoriteActive={() => {}} />} />
            <Route path="my/tasks" element={<TasksView username="user" onNavigate={handleGlobalNavigate} />} />
            <Route path="my/mentions" element={<UserMentionsView username="user" onNavigate={handleGlobalNavigate} teams={teams} projects={projects} />} />
            <Route path="my/notifications" element={<NotificationsView onOpenDocument={handleGlobalNavigate} />} />

            <Route path="personal" element={<PersonalPortalWrapper teams={teams} projects={projects} />} />
            <Route path="personal/_test" element={<div style={{ padding: '40px', color: 'white' }}>TEST.. I WORK</div>} />
            <Route path="personal/_settings" element={<PersonalSettingsWrapper />} />
            <Route path="personal/trash" element={<TrashView teamId={null} projectId={null} onRestore={async () => {}} onDeletePermanently={async () => {}} navigateTo={() => {}} />} />
            <Route path="personal/_images" element={<ImageLibraryView scope="personal" />} />
            <Route path="personal/_templates" element={<TemplateLibraryView scope="personal" />} />
            <Route path="personal/template/:templateId" element={<TemplatePage isMockMode={isMockMode} />} />
            <Route path="personal/docs/:docId" element={<DocumentPage isMockMode={isMockMode} />} />
            <Route path="personal/docs/:docId/viewers" element={<PageAuditView docId="docId" docTitle="Title" selectedTeamName="Personal" onBack={() => {}} />} />

            <Route path="teams" element={<TeamsDirectoryView teams={teams} projects={projects} />} />
            <Route path="teams/:teamId" element={<TeamPortalWrapper teams={teams} projects={projects} />} />
            <Route path="teams/:teamId/p/:projectId" element={<ProjectPortalWrapper teams={teams} projects={projects} />} />
            <Route path="teams/:teamId/_settings" element={<TeamSettingsWrapper teams={teams} />} />
            <Route path="teams/:teamId/trash" element={<TrashView teamId="mock" projectId={null} onRestore={async () => {}} onDeletePermanently={async () => {}} navigateTo={() => {}} />} />
            <Route path="teams/:teamId/_images" element={<ImageLibraryView scope="team" />} />
            <Route path="teams/:teamId/_templates" element={<TemplateLibraryView scope="team" />} />
            <Route path="teams/:teamId/template/:templateId" element={<TemplatePage isMockMode={isMockMode} />} />
            <Route path="teams/:teamId/docs/:docId" element={<DocumentPage isMockMode={isMockMode} />} />
            <Route path="teams/:teamId/docs/:docId/viewers" element={<PageAuditView docId="docId" docTitle="Title" selectedTeamName="Team" onBack={() => {}} />} />

            <Route path="teams/:teamId/p/:projectId/_settings" element={<ProjectSettingsWrapper teams={teams} projects={projects} />} />
            <Route path="teams/:teamId/p/:projectId/trash" element={<TrashView teamId="mock" projectId="mock" onRestore={async () => {}} onDeletePermanently={async () => {}} navigateTo={() => {}} />} />
            <Route path="teams/:teamId/p/:projectId/_images" element={<ImageLibraryView scope="project" />} />
            <Route path="teams/:teamId/p/:projectId/_templates" element={<TemplateLibraryView scope="team" />} />
            <Route path="_admin/users" element={authMode === "local" ? <AdminLocalUsersPage /> : <Navigate to="/_admin/settings" replace />} />
            <Route path="teams/:teamId/p/:projectId/template/:templateId" element={<TemplatePage isMockMode={isMockMode} />} />
            <Route path="teams/:teamId/p/:projectId/docs/:docId" element={<DocumentPage isMockMode={isMockMode} />} />
            <Route path="teams/:teamId/p/:projectId/docs/:docId/viewers" element={<PageAuditView docId="docId" docTitle="Title" selectedTeamName="Team" onBack={() => {}} />} />
            
            <Route path="_admin/settings" element={<ServerSettingsPage currentTheme={null} onSave={async () => {}} systemSettings={systemSettings!} onSaveSettings={async (settings) => { await updateSystemSettings(settings); queryClient.invalidateQueries({ queryKey: ['systemSettings'] }); }} onBack={() => {}} showToast={showToast} />} />
            <Route path="_admin/help" element={<AdminHelpPage onBack={() => {}} />} />
            
            <Route path="_admin/_images" element={<ImageLibraryView scope="system" />} />
            <Route path="_admin/_templates" element={<TemplateLibraryView scope="system" />} />
            <Route path="_admin/template/:templateId" element={<TemplatePage isMockMode={isMockMode} />} />
          </Route>
        </Routes>
      </AuthGuard>

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <CreateSpaceDialog open={createSpaceOpen} onClose={() => setCreateSpaceOpen(false)} teams={teams} activeTeamId={null} onCreateTeam={handleCreateTeam} onCreateProject={handleCreateProject} />

      <Snackbar open={toastOpen} autoHideDuration={4000} onClose={hideToast} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={hideToast} severity={toastSeverity} variant="filled" sx={{ width: "100%", borderRadius: "8px" }}>{toastMessage}</Alert>
      </Snackbar>
    </>
  );
}
