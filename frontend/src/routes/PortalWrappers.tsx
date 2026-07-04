import { useParams, useNavigate } from "react-router-dom";
import { Typography } from "@mui/material";
import { TeamPortal } from "../components/TeamPortal";
import { ProjectPortal } from "../components/ProjectPortal";
import { ProjectSettingsView } from "../components/ProjectSettingsView";

export function TeamPortalWrapper({ teams, projects }: { teams: any[], projects: any[] }) {
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

export function ProjectPortalWrapper({ teams, projects }: { teams: any[], projects: any[] }) {
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

export function ProjectSettingsWrapper({ teams, projects }: { teams: any[], projects: any[] }) {
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

export function PersonalPortalWrapper({ teams }: { teams: any[], projects: any[] }) {
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
