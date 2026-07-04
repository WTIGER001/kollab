import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Box, Snackbar, Alert, CircularProgress, Typography, Button } from "@mui/material";
import { Routes, Route, Navigate } from "react-router-dom";

import { MainLayout } from "./layouts/MainLayout";
import { DocumentPage } from "./pages/DocumentPage";

import { TeamPortal } from "./components/TeamPortal";
import { ProjectPortal } from "./components/ProjectPortal";
import { TeamSettingsView } from "./components/TeamSettingsView";
import { ProjectSettingsView } from "./components/ProjectSettingsView";
import { PersonalSettingsView } from "./components/PersonalSettingsView";
import { FavoritesView } from "./components/FavoritesView";
import { RecentPagesView } from "./components/RecentPagesView";
import { PageAuditView } from "./components/PageAuditView";
import { TrashView } from "./components/TrashView";
import { TasksView } from "./components/TasksView";
import { UserMentionsView } from "./components/UserMentionsView";
import { ServerSettingsPage } from "./components/ServerSettingsPage";
import { AdminHelpPage } from "./components/AdminHelpPage";
import { ImageLibraryView } from "./components/ImageLibraryView";

import { TeamsDirectoryView } from "./components/TeamsDirectoryView";
import { SearchPage } from "./pages/SearchPage";
import { HelpDialog } from "./components/HelpDialog";
import { CreateSpaceDialog } from "./components/CreateSpaceDialog";

import { fetchOIDCConfig, setApiToken, setOnUnauthorized, createTeam, createProject } from "./services/api";
import { useAppStore } from "./store/useAppStore";
import { useTeams, useProjects, useSystemSettings } from "./hooks/queries";
import { useQueryClient } from "@tanstack/react-query";

interface AppProps {
  isMockMode?: boolean;
}


// Wrapper to inject router params and global state into TeamPortal
import { useParams, useNavigate } from "react-router-dom";
function TeamPortalWrapper({ teams, projects }: { teams: any[], projects: any[] }) {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const team = teams.find(t => t.id === teamId || t.abbreviation === teamId);
  
  if (!team) return <Typography sx={{ p: 4, color: "text.secondary" }}>Team not found.</Typography>;
  
  const handleNavigate = (t: string | null, p: string | null, page: string | null, isSettings?: boolean, isTeamSettings?: boolean) => {
    if (isTeamSettings) navigate(`/teams/${t}/_settings`);
    else if (isSettings) navigate(`/teams/${t}/p/${p}/_settings`);
    else if (page) {
      if (p) navigate(`/teams/${t}/p/${p}/docs/${page}`);
      else navigate(`/teams/${t}/docs/${page}`);
    } else {
      if (p) navigate(`/teams/${t}/p/${p}`);
      else navigate(`/teams/${t}`);
    }
  };

  return (
    <TeamPortal 
      team={team} 
      projects={projects.filter(p => p.teamId === team.id)} 
      onSelectProject={() => {}} 
      navigateTo={handleNavigate} 
    />
  );
}

function ProjectPortalWrapper({ teams, projects }: { teams: any[], projects: any[] }) {
  const { teamId, projectId } = useParams();
  const navigate = useNavigate();
  
  const team = teams.find(t => t.id === teamId || t.abbreviation === teamId);
  const project = projects.find(p => p.id === projectId || p.abbreviation === projectId);
  
  if (!team) return <Typography sx={{ p: 4, color: "text.secondary" }}>Team not found.</Typography>;
  if (!project) return <Typography sx={{ p: 4, color: "text.secondary" }}>Project not found.</Typography>;
  
  const handleNavigate = (t: string | null, p: string | null, page: string | null, isSettings?: boolean, isTeamSettings?: boolean) => {
    if (isTeamSettings) navigate(`/teams/${t}/_settings`);
    else if (isSettings) navigate(`/teams/${t}/p/${p}/_settings`);
    else if (page) {
      if (p) navigate(`/teams/${t}/p/${p}/docs/${page}`);
      else navigate(`/teams/${t}/docs/${page}`);
    } else {
      if (p) navigate(`/teams/${t}/p/${p}`);
      else navigate(`/teams/${t}`);
    }
  };

  return (
    <ProjectPortal 
      team={team} 
      project={project} 
      navigateTo={handleNavigate} 
    />
  );
}

function ProjectSettingsWrapper({ teams, projects }: { teams: any[], projects: any[] }) {
  const { teamId, projectId } = useParams();
  const navigate = useNavigate();
  
  const team = teams.find(t => t.id === teamId || t.abbreviation === teamId);
  const project = projects.find(p => p.id === projectId || p.abbreviation === projectId);
  
  if (!team || !project) return <Typography sx={{ p: 4, color: "text.secondary" }}>Project not found.</Typography>;

  return (
    <ProjectSettingsView
      project={project}
      teamAbbreviationOrId={team.abbreviation || team.id}
      onUpdateProject={() => {}}
      onBack={() => navigate(`/teams/${team.abbreviation || team.id}/p/${project.abbreviation || project.id}`)}
      showToast={() => {}}
    />
  );
}

function PersonalPortalWrapper({ teams, projects }: { teams: any[], projects: any[] }) {
  const navigate = useNavigate();
  const personalTeam = teams.find(t => t.id.startsWith("personal_"));
  
  if (!personalTeam) return <Typography sx={{ p: 4, color: "text.secondary" }}>Personal space not found.</Typography>;
  
  const handleNavigate = (t: string | null, p: string | null, page: string | null, isSettings?: boolean, isTeamSettings?: boolean) => {
    if (isTeamSettings || isSettings) navigate(`/personal/_settings`);
    else if (page) navigate(`/personal/docs/${page}`);
    else navigate(`/personal`);
  };

  return (
    <TeamPortal 
      team={personalTeam} 
      projects={[]} 
      onSelectProject={() => {}} 
      navigateTo={handleNavigate} 
    />
  );
}

export default function App({ isMockMode = false }: AppProps) {
  const auth = isMockMode ? null : useAuth();
  // We use id_token because Logto free tier does not support API resources, so we can't get a JWT access_token.
  const userToken = isMockMode ? "mock-jwt-token" : auth?.user?.id_token || null;
  setApiToken(userToken);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { themeMode, helpOpen, setHelpOpen, createSpaceOpen, setCreateSpaceOpen } = useAppStore();
  
  // Only enable data fetching when fully authenticated and not currently processing a login/redirect
  const isAuthenticated = isMockMode || (!!auth?.isAuthenticated && !auth?.isLoading && !auth?.activeNavigator && !auth?.error);
  
  const { data: teams = [] } = useTeams({ enabled: isAuthenticated && !!userToken });
  const { data: projects = [] } = useProjects("all", { enabled: isAuthenticated && !!userToken });
  const { data: systemSettings } = useSystemSettings({ enabled: isAuthenticated && !!userToken });

  const [apiAuthError, setApiAuthError] = useState<boolean>(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" | "warning" }>({
    open: false, message: "", severity: "info",
  });

  useEffect(() => {
    if (!isMockMode && auth?.isAuthenticated && auth?.user?.expired) {
      auth.removeUser();
    }
  }, [auth?.isAuthenticated, auth?.user?.expired, isMockMode]);

  useEffect(() => {
    if (!isMockMode && auth) {
      setOnUnauthorized(() => {
        showToast("API rejected token (401). Backend authentication failed.", "error");
        setApiAuthError(true);
      });
    }
    return () => setOnUnauthorized(() => {});
  }, [auth, isMockMode]);

  // Removed automatic signinRedirect to prevent infinite loops when backend rejects valid tokens

  if (!isMockMode && auth?.isLoading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isMockMode && auth?.error) {
    // Automatically recover from fatal OIDC errors (like expired silent renews)
    // by wiping the stale local session and forcing a fresh interactive login.
    setTimeout(() => {
      auth.removeUser().then(() => {
        window.location.href = "/";
      });
    }, 2000);
    
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
        <Typography color="error">Authentication Error: {auth.error.message}</Typography>
        <Typography color="text.secondary">Automatically clearing session and redirecting...</Typography>
        <Button variant="contained" onClick={() => { auth.removeUser(); window.location.href = "/"; }}>
          Force Clear Session
        </Button>
      </Box>
    );
  }

  if (apiAuthError) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
        <Typography variant="h5" color="error">API Authentication Failed</Typography>
        <Typography color="text.secondary">The Go backend rejected your token with a 401 Unauthorized.</Typography>
        <Typography color="text.secondary">Debug Info: isAuthenticated={String(isAuthenticated)}, apiToken={userToken ? userToken.substring(0, 20) + '...' : 'null'}</Typography>
        <Typography color="text.secondary">Please check your Go backend console for "JWT validation failed" to see exactly why it is rejecting the token.</Typography>
        <Button variant="contained" onClick={() => { auth?.removeUser(); window.location.href = "/"; }}>
          Clear Session & Restart
        </Button>
      </Box>
    );
  }

  if (!isMockMode && !auth?.isAuthenticated) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', gap: 2 }}>
        <Typography variant="h5" sx={{ color: 'text.primary' }}>Kollab Login</Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>Please log in to continue.</Typography>
        <Button variant="contained" onClick={() => auth?.signinRedirect({ state: window.location.pathname })}>
          Log In with Logto
        </Button>
      </Box>
    );
  }

  const showToast = (message: string, severity: "success" | "error" | "info" | "warning" = "info") => setToast({ open: true, message, severity });
  const handleCloseToast = () => setToast(prev => ({ ...prev, open: false }));

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
    } else if (projectId) {
      navigate(`/teams/${teamId}/p/${projectId}/docs/${documentId}`);
    } else {
      navigate(`/teams/${teamId}/docs/${documentId}`);
    }
  };

  return (
    <>
      
      <Routes>
        <Route path="/" element={<MainLayout isMockMode={isMockMode} />}>
          <Route index element={<Navigate to="/my/recents" replace />} />
          
          <Route path="search" element={<SearchPage onNavigate={handleGlobalNavigate} />} />
          
          <Route path="my/recents" element={<RecentPagesView onNavigate={handleGlobalNavigate} teams={teams} projects={projects} />} />
          <Route path="my/favorites" element={<FavoritesView onNavigate={handleGlobalNavigate} onUnfavoriteActive={() => {}} />} />
          <Route path="my/tasks" element={<TasksView username="user" onNavigate={handleGlobalNavigate} />} />
          <Route path="my/mentions" element={<UserMentionsView username="user" onNavigate={handleGlobalNavigate} teams={teams} projects={projects} />} />

          <Route path="personal" element={<PersonalPortalWrapper teams={teams} projects={projects} />} />
          <Route path="personal/_test" element={<Box sx={{ p: 10, color: 'white', typography: 'h1' }}>TEST.. I WORK</Box>} />
          <Route path="personal/_settings" element={<PersonalSettingsView displayName="User" username="user" themeMode={themeMode} onUpdateThemeMode={() => {}} onBack={() => {}} personalPagesCount={0} />} />
          <Route path="personal/trash" element={<TrashView teamId={null} projectId={null} onRestore={async () => {}} onDeletePermanently={async () => {}} navigateTo={() => {}} />} />
          <Route path="personal/_images" element={<ImageLibraryView scope="personal" />} />
          <Route path="personal/docs/:docId" element={<DocumentPage isMockMode={isMockMode} />} />
          <Route path="personal/docs/:docId/viewers" element={<PageAuditView docId="docId" docTitle="Title" selectedTeamName="Personal" onBack={() => {}} />} />

          <Route path="teams" element={<TeamsDirectoryView teams={teams} projects={projects} />} />
          <Route path="teams/:teamId" element={<TeamPortalWrapper teams={teams} projects={projects} />} />
          <Route path="teams/:teamId/p/:projectId" element={<ProjectPortalWrapper teams={teams} projects={projects} />} />
          <Route path="teams/:teamId/_settings" element={<TeamSettingsView team={teams[0] as any} onUpdateTeam={() => {}} onBack={() => {}} showToast={showToast} />} />
          <Route path="teams/:teamId/trash" element={<TrashView teamId="mock" projectId={null} onRestore={async () => {}} onDeletePermanently={async () => {}} navigateTo={() => {}} />} />
          <Route path="teams/:teamId/_images" element={<ImageLibraryView scope="team" />} />
          <Route path="teams/:teamId/docs/:docId" element={<DocumentPage isMockMode={isMockMode} />} />
          <Route path="teams/:teamId/docs/:docId/viewers" element={<PageAuditView docId="docId" docTitle="Title" selectedTeamName="Team" onBack={() => {}} />} />

          <Route path="teams/:teamId/p/:projectId/_settings" element={<ProjectSettingsWrapper teams={teams} projects={projects} />} />
          <Route path="teams/:teamId/p/:projectId/trash" element={<TrashView teamId="mock" projectId="mock" onRestore={async () => {}} onDeletePermanently={async () => {}} navigateTo={() => {}} />} />
          <Route path="teams/:teamId/p/:projectId/_images" element={<ImageLibraryView scope="project" />} />
          <Route path="teams/:teamId/p/:projectId/docs/:docId" element={<DocumentPage isMockMode={isMockMode} />} />
          <Route path="teams/:teamId/p/:projectId/docs/:docId/viewers" element={<PageAuditView docId="docId" docTitle="Title" selectedTeamName="Team" onBack={() => {}} />} />
          
          <Route path="_admin/settings" element={<ServerSettingsPage currentTheme={null} onSave={async () => {}} systemSettings={systemSettings!} onSaveSettings={async () => {}} onBack={() => {}} />} />
          <Route path="_admin/help" element={<AdminHelpPage onBack={() => {}} />} />
          
          <Route path="_admin/_images" element={<ImageLibraryView scope="system" />} />
        </Route>
      </Routes>

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <CreateSpaceDialog open={createSpaceOpen} onClose={() => setCreateSpaceOpen(false)} teams={teams} activeTeamId={null} onCreateTeam={handleCreateTeam} onCreateProject={handleCreateProject} />

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={handleCloseToast} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={handleCloseToast} severity={toast.severity} variant="filled" sx={{ width: "100%", borderRadius: "8px" }}>{toast.message}</Alert>
      </Snackbar>
    </>
  );
}
