import { authenticatedMediaUrl } from "../services/api";
import React, { useEffect, useState } from "react";
import { 
  Box, 
  Typography, 
  Avatar, 
  Button, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Divider} from "@mui/material";
import { 
  Settings, 
  Users, 
  ArrowRight,
  Briefcase
} from "lucide-react";
import { fetchTeamUsers } from "../services/api";
import type { Team, Project } from "../services/api";
import { UserAvatar } from "./UserAvatar";
import { useAppStore } from "../store/useAppStore";

interface TeamPortalProps {
  team: Team;
  projects: Project[];
  onSelectProject: (id: string) => void;
  navigateTo: (team: string | null, project: string | null, page: string | null, isSettings?: boolean, isTeamSettings?: boolean) => void;
}

export const TeamPortal: React.FC<TeamPortalProps> = ({
  team,
  projects,
  onSelectProject,
  navigateTo
}) => {
  const openCreateSpace = useAppStore((state) => state.openCreateSpace);
  const [members, setMembers] = useState<{ id: string; username: string }[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    setLoadingMembers(true);
    fetchTeamUsers(team.id)
      .then(data => {
        setMembers(data);
        setLoadingMembers(false);
      })
      .catch(err => {
        console.error("Error loading team members:", err);
        setLoadingMembers(false);
      });
  }, [team.id]);

  const handleProjectClick = (proj: Project) => {
    onSelectProject(proj.id);
    navigateTo(team.abbreviation || team.id, proj.abbreviation || proj.id, null);
  };

  return (
    <Box sx={{ 
      flex: 1, 
      height: "100%", 
      overflowY: "auto", 
      bgcolor: "background.default",
      px: { xs: 2, sm: 3, md: 4 },
      py: 3,
      display: "flex",
      flexDirection: "column",
      gap: 4
    }} className="scrollbar-thin">
      
      {/* Team Header Portal */}
      <Box sx={{ 
        position: "relative",
        overflow: "hidden"
      }}>
        <Box className="accent-glow-purple" sx={{ position: "absolute", top: "-20%", right: "-10%", width: 300, height: 300 }} />
        
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar 
                src={authenticatedMediaUrl(team.logoUrl || undefined)}
                variant={team.logoUrl ? "square" : "circular"}
                sx={{ 
                  bgcolor: team.logoUrl ? "transparent" : "primary.main", 
                  width: 44, 
                  height: 44, 
                  fontSize: "18px", 
                  fontWeight: 700,
                  "& img": { objectFit: "contain" }
                }}
              >
                {!team.logoUrl && team.name.slice(0, 2).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: '"Outfit", sans-serif', color: "text.primary", letterSpacing: "-0.02em" }}>
                  {team.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>
                  Slug: /teams/{team.abbreviation || team.id}
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 2, maxWidth: 600, lineHeight: 1.6 }}>
              {team.description || "Welcome to the team workspace. Collaborate on projects, write specifications, and share knowledge."}
            </Typography>
          </Box>
          
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigateTo(team.abbreviation || team.id, null, null, false, true)}
            startIcon={<Settings size={14} />}
            sx={{
              color: "text.secondary",
              borderColor: "var(--border-color)",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "12px",
              fontFamily: '"Outfit", sans-serif',
              "&:hover": {
                borderColor: "primary.main",
                backgroundColor: "color-mix(in srgb, var(--primary-color) 8%, transparent)"
              }
            }}
          >
            Team Settings
          </Button>
        </Box>
      </Box>

      {/* Layout: Projects on left, Members directory on right */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 4, flex: 1 }}>
        {/* Left Side: Projects Grid */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: "text.primary" }}>
              Projects ({projects.length})
            </Typography>
          </Box>
          
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            {projects.map((proj) => (
              <Box 
                key={proj.id}
                onClick={() => handleProjectClick(proj)}
                sx={{ 
                  height: "100%",
                  cursor: "pointer",
                  backgroundColor: "transparent",
                  border: "1px solid var(--border-color)",
                  borderRadius: 'var(--border-radius-card)',
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  p: 3,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 2,
                  "&:hover": {
                    borderColor: "primary.main",
                    backgroundColor: "color-mix(in srgb, var(--primary-color) 4%, transparent)"
                  }
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar 
                      src={authenticatedMediaUrl(proj.logoUrl || undefined)}
                      variant={proj.logoUrl ? "square" : "circular"}
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        bgcolor: proj.logoUrl ? "transparent" : "secondary.main", 
                        fontSize: "12px", 
                        fontWeight: 700,
                        "& img": { objectFit: "contain" }
                      }}
                    >
                      {!proj.logoUrl && <Briefcase size={16} />}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: "text.primary", lineHeight: 1.2 }}>
                        {proj.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>
                        /{proj.abbreviation || proj.id}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "12.5px", lineHeight: 1.5, height: 45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {proj.description || "No description provided for this project workspace."}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "primary.main", fontWeight: 600, fontSize: "12px", mt: 1 }}>
                  Open Project <ArrowRight size={12} />
                </Box>
              </Box>
            ))}
            {projects.length === 0 && (
              <Box sx={{ p: { xs: 3, sm: 4 }, textAlign: "center", border: "1px dashed var(--border-color)", bgcolor: "var(--glass-bg)", gridColumn: "1 / -1", borderRadius: "var(--border-radius-card)" }}>
                <Typography variant="h6" sx={{ color: "text.primary", fontWeight: 700, fontFamily: '"Outfit", sans-serif', mb: 1 }}>
                  Your team is ready for its first project
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420, mx: "auto", mb: 2.5, lineHeight: 1.6 }}>
                  Projects give an initiative its own pages, settings, and a clear home in the sidebar.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Briefcase size={15} />}
                  onClick={() => openCreateSpace({ initialTab: 1, teamId: team.id })}
                  sx={{ textTransform: "none", fontFamily: '"Outfit", sans-serif', fontWeight: 700, borderRadius: "var(--border-radius-button)", boxShadow: "var(--shadow-button)" }}
                >
                  Create a project
                </Button>
              </Box>
            )}
          </Box>
        </Box>
 
        {/* Right Side: Member Directory */}
        <Box sx={{ 
          display: "flex",
          flexDirection: "column",
          gap: 2,
          height: "100%",
          maxHeight: 400
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Users size={16} style={{ color: "var(--accent-blue)" }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: "text.primary" }}>
              Team Members ({members.length})
            </Typography>
          </Box>
          <Divider />
          
          {loadingMembers ? (
            <Typography variant="caption" sx={{ color: "text.disabled", display: "block", textAlign: "center", py: 4 }}>
              Loading roster...
            </Typography>
          ) : (
            <List sx={{ flex: 1, overflowY: "auto" }} className="scrollbar-thin">
              {members.map((member) => (
                <ListItem key={member.id} disableGutters sx={{ py: 1 }}>
                  <ListItemAvatar sx={{ minWidth: 36 }}>
                    <UserAvatar 
                      displayName={member.username}
                      sx={{ width: 26, height: 26, fontSize: "10px", fontWeight: 700, bgcolor: "primary.light" }}
                    />
                  </ListItemAvatar>
                  <ListItemText 
                    primary={
                      <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "text.primary", fontFamily: '"Outfit", sans-serif' }}>
                        {member.username}
                      </Typography>
                    } 
                    secondary={
                      <Typography sx={{ fontSize: "11px", color: "text.disabled" }}>
                        Member
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Box>
    </Box>
  );
};
