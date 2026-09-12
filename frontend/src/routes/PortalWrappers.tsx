import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/SessionContext';
import { useAppStore } from '../store/useAppStore';
import { useToastStore } from '../store/useToastStore';
import { useDocuments } from '../hooks/queries';
import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Typography } from "@mui/material";
import { TeamPortal } from "../components/TeamPortal";
import { ProjectPortal } from "../components/ProjectPortal";
import { ProjectSettingsView } from "../components/ProjectSettingsView";
import { TeamSettingsView } from "../components/TeamSettingsView";
import { PersonalSettingsView } from "../components/PersonalSettingsView";

export function TeamPortalWrapper({ teams, projects }: { teams: any[], projects: any[] }) {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const team = teams.find(t => t.id === teamId || t.abbreviation === teamId);
  
  useEffect(() => {
    if (team && teamId && team.abbreviation && team.abbreviation !== teamId) {
      const currentUrl = new URL(window.location.href);
      const pathParts = currentUrl.pathname.split('/');
      const teamIndex = pathParts.indexOf('teams') + 1;
      if (teamIndex > 0 && pathParts[teamIndex] === teamId) {
        pathParts[teamIndex] = team.abbreviation;
        currentUrl.pathname = pathParts.join('/');
        window.history.replaceState(null, "", currentUrl.toString());
      }
    }
  }, [team, teamId]);
  
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

export function TeamSettingsWrapper({ teams }: { teams: any[] }) {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();
  
  const team = teams.find(t => t.id === teamId || t.abbreviation === teamId);
  
  useEffect(() => {
    if (team && teamId && team.abbreviation && team.abbreviation !== teamId) {
      const currentUrl = new URL(window.location.href);
      const pathParts = currentUrl.pathname.split('/');
      const teamIndex = pathParts.indexOf('teams') + 1;
      if (teamIndex > 0 && pathParts[teamIndex] === teamId) {
        pathParts[teamIndex] = team.abbreviation;
        currentUrl.pathname = pathParts.join('/');
        window.history.replaceState(null, "", currentUrl.toString());
      }
    }
  }, [team, teamId]);
  
  if (!team) return <Typography sx={{ p: 4, color: "text.secondary" }}>Team not found.</Typography>;

  return (
    <TeamSettingsView
      team={team}
      onUpdateTeam={() => { void queryClient.invalidateQueries({ queryKey: ['teams'] }); }}
      onBack={() => navigate(`/teams/${team.abbreviation || team.id}`)}
      showToast={showToast}
      initialTab={new URLSearchParams(location.search).get("tab") === "members" ? 1 : 0}
    />
  );
}

export function ProjectPortalWrapper({ teams, projects }: { teams: any[], projects: any[] }) {
  const { teamId, projectId } = useParams();
  const navigate = useNavigate();
  
  const team = teams.find(t => t.id === teamId || t.abbreviation === teamId);
  const project = projects.find(p => p.id === projectId || p.abbreviation === projectId);
  
  useEffect(() => {
    let urlChanged = false;
    const currentUrl = new URL(window.location.href);
    const pathParts = currentUrl.pathname.split('/');
    
    if (team && teamId && team.abbreviation && team.abbreviation !== teamId) {
      const teamIndex = pathParts.indexOf('teams') + 1;
      if (teamIndex > 0 && pathParts[teamIndex] === teamId) {
        pathParts[teamIndex] = team.abbreviation;
        urlChanged = true;
      }
    }
    if (project && projectId && project.abbreviation && project.abbreviation !== projectId) {
      const pIndex = pathParts.indexOf('p') + 1;
      if (pIndex > 0 && pathParts[pIndex] === projectId) {
        pathParts[pIndex] = project.abbreviation;
        urlChanged = true;
      }
    }
    if (urlChanged) {
      currentUrl.pathname = pathParts.join('/');
      window.history.replaceState(null, "", currentUrl.toString());
    }
  }, [team, teamId, project, projectId]);
  
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
      onManageMembers={() => navigate(`/teams/${team.abbreviation || team.id}/_settings?tab=members`)}
    />
  );
}

export function ProjectSettingsWrapper({ teams, projects }: { teams: any[], projects: any[] }) {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();
  const { teamId, projectId } = useParams();
  const navigate = useNavigate();
  
  const team = teams.find(t => t.id === teamId || t.abbreviation === teamId);
  const project = projects.find(p => p.id === projectId || p.abbreviation === projectId);
  
  useEffect(() => {
    let urlChanged = false;
    const currentUrl = new URL(window.location.href);
    const pathParts = currentUrl.pathname.split('/');
    
    if (team && teamId && team.abbreviation && team.abbreviation !== teamId) {
      const teamIndex = pathParts.indexOf('teams') + 1;
      if (teamIndex > 0 && pathParts[teamIndex] === teamId) {
        pathParts[teamIndex] = team.abbreviation;
        urlChanged = true;
      }
    }
    if (project && projectId && project.abbreviation && project.abbreviation !== projectId) {
      const pIndex = pathParts.indexOf('p') + 1;
      if (pIndex > 0 && pathParts[pIndex] === projectId) {
        pathParts[pIndex] = project.abbreviation;
        urlChanged = true;
      }
    }
    if (urlChanged) {
      currentUrl.pathname = pathParts.join('/');
      window.history.replaceState(null, "", currentUrl.toString());
    }
  }, [team, teamId, project, projectId]);
  
  if (!team || !project) return <Typography sx={{ p: 4, color: "text.secondary" }}>Project not found.</Typography>;

  return (
    <ProjectSettingsView
      project={project}
      teamAbbreviationOrId={team.abbreviation || team.id}
      onUpdateProject={() => { void queryClient.invalidateQueries({ queryKey: ['projects'] }); }}
      onBack={() => navigate(`/teams/${team.abbreviation || team.id}/p/${project.abbreviation || project.id}`)}
      showToast={showToast}
    />
  );
}

export function PersonalPortalWrapper({ teams }: { teams: any[], projects: any[] }) {
  const navigate = useNavigate();
  const personalTeam = teams.find(t => t.id.startsWith("personal_"));
  
  if (!personalTeam) return <Typography sx={{ p: 4, color: "text.secondary" }}>Personal space not found.</Typography>;
  
  const handleNavigate = (_t: string | null, _p: string | null, page: string | null, isSettings?: boolean, isTeamSettings?: boolean) => {
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

export function PersonalSettingsWrapper() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { themeMode, setThemeMode } = useAppStore();
  const { data: pages = [] } = useDocuments(null, user ? `personal_${user.id}` : null);
  return (
    <PersonalSettingsView 
      displayName={user?.displayName || user?.username || ""}
      username={user?.username || ""}
      themeMode={themeMode}
      onUpdateThemeMode={setThemeMode}
      onBack={() => navigate(`/personal`)} 
      personalPagesCount={pages.length}
    />
  );
}
