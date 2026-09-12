import { authenticatedMediaUrl } from "../services/api";
import React, { useMemo } from 'react';
import { Box, Typography, Avatar, Divider, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { Team, Project } from '../services/api';

interface TeamsDirectoryViewProps {
  teams: Team[];
  projects: Project[];
}

export const TeamsDirectoryView: React.FC<TeamsDirectoryViewProps> = ({ teams, projects }) => {
  const navigate = useNavigate();

  // Filter out personal workspaces and sort alphabetically
  const directoryTeams = useMemo(() => {
    return teams
      .filter(t => !t.id.startsWith('personal_'))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  const handleTeamClick = (team: Team) => {
    navigate(`/teams/${team.abbreviation || team.id}`);
  };

  const handleProjectClick = (e: React.MouseEvent, team: Team, project: Project) => {
    e.stopPropagation();
    navigate(`/teams/${team.abbreviation || team.id}/p/${project.abbreviation || project.id}`);
  };

  return (
    <Box sx={{ 
      flex: 1, 
      height: '100%', 
      overflowY: 'auto', 
      bgcolor: 'background.default',
      px: { xs: 2, sm: 4, md: 6 },
      py: 4,
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }} className="scrollbar-thin">
      
      {/* Header */}
      <Box sx={{ position: 'relative', overflow: 'hidden', mb: 2 }}>
        <Box className="accent-glow-blue" sx={{ position: 'absolute', top: '-50%', left: '-10%', width: 300, height: 300 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, position: 'relative', zIndex: 2 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: '"Outfit", sans-serif', color: 'text.primary', letterSpacing: '-0.02em' }}>
            Organization Directory
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 600, lineHeight: 1.6 }}>
            Browse all teams and projects across the organization. Select a team to view its portal or jump directly into a project.
          </Typography>
        </Box>
      </Box>

      {/* Directory List */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2
      }}>
        {directoryTeams.map((team, index) => {
          const teamProjects = projects.filter(p => p.teamId === team.id);
          
          return (
            <React.Fragment key={team.id}>
              {index > 0 && <Divider sx={{ my: 2 }} />}
              <Box
                sx={{
                  py: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  transition: 'background-color 0.2s'
                }}
              >
                {/* Team Header Row */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Avatar sx={{ 
                    bgcolor: 'primary.main', 
                    width: 44, 
                    height: 44, 
                    fontSize: '18px', 
                    fontWeight: 700 
                  }}>
                    {team.name.slice(0, 2).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: 'text.primary', cursor: 'pointer', '&:hover': { color: 'primary.main', textDecoration: 'underline' } }} onClick={() => handleTeamClick(team)}>
                          {team.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Users size={14} style={{ color: 'var(--text-secondary)' }} />
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            /{team.abbreviation || team.id}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Tooltip title="Open Team Portal" placement="left">
                        <IconButton size="small" onClick={() => handleTeamClick(team)} sx={{ color: 'primary.main' }}>
                          <ArrowUpRight size={18} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, lineHeight: 1.6 }}>
                      {team.description || "No description provided."}
                    </Typography>
                  </Box>
                </Box>

                {/* Projects List (Indented) */}
                {teamProjects.length > 0 && (
                  <Box sx={{ 
                    ml: { xs: 2, sm: 7 }, 
                    mt: 2,
                    pl: 2, 
                    borderLeft: '2px solid color-mix(in srgb, var(--border-color) 50%, transparent)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5
                  }}>
                    {teamProjects.map(proj => (
                      <Box 
                        key={proj.id} 
                        onClick={(e) => handleProjectClick(e, team, proj)}
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 2, 
                          p: 1.5, 
                          borderRadius: 'var(--border-radius-card)',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          border: '1px solid transparent',
                          '&:hover': {
                            backgroundColor: 'color-mix(in srgb, var(--primary-color) 4%, transparent)',
                            borderColor: 'color-mix(in srgb, var(--primary-color) 10%, transparent)'
                          }
                        }}
                      >
                        <Avatar 
                          src={authenticatedMediaUrl(proj.logoUrl || undefined)}
                          sx={{ 
                            bgcolor: 'color-mix(in srgb, var(--text-secondary) 15%, transparent)', 
                            color: 'text.primary',
                            width: 32, 
                            height: 32, 
                            fontSize: '12px', 
                            fontWeight: 700 
                          }}
                        >
                          {!proj.logoUrl && <Briefcase size={16} />}
                        </Avatar>
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.5, sm: 2 } }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap', minWidth: 150 }}>
                            {proj.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {proj.description || `Workspace for ${proj.name}`}
                          </Typography>
                        </Box>
                        <ArrowRight size={16} style={{ color: 'var(--text-disabled)' }} />
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </React.Fragment>
          );
        })}

        {directoryTeams.length === 0 && (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>No Teams Found</Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              There are currently no collaborative teams in the organization.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

