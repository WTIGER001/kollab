import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  Button, 
  Avatar, 
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip
} from "@mui/material";
import { 
  Settings, 
  Briefcase, 
  FileText,
  ArrowRight
} from "lucide-react";
import { fetchDocuments } from "../services/api";
import type { Team, Project, Document } from "../services/api";

interface ProjectPortalProps {
  team: Team;
  project: Project;
  navigateTo: (team: string | null, project: string | null, page: string | null, isSettings?: boolean, isTeamSettings?: boolean) => void;
}

export const ProjectPortal: React.FC<ProjectPortalProps> = ({
  team,
  project,
  navigateTo
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    setLoadingDocs(true);
    fetchDocuments(project.id)
      .then(data => {
        setDocuments(data || []);
        setLoadingDocs(false);
      })
      .catch(err => {
        console.error("Error loading project documents:", err);
        setLoadingDocs(false);
      });
  }, [project.id]);

  const handleDocumentClick = (doc: Document) => {
    navigateTo(team.abbreviation || team.id, project.abbreviation || project.id, doc.id);
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
      
      {/* Project Header Portal */}
      <Box sx={{ 
        position: "relative",
        overflow: "hidden"
      }}>
        <Box className="accent-glow-purple" sx={{ position: "absolute", top: "-20%", right: "-10%", width: 300, height: 300 }} />
        
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar 
                src={project.logoUrl || undefined}
                sx={{ bgcolor: "primary.main", width: 44, height: 44, fontSize: "18px", fontWeight: 700 }}
              >
                {!project.logoUrl && <Briefcase size={20} />}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: '"Outfit", sans-serif', color: "text.primary", letterSpacing: "-0.02em" }}>
                  {project.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>
                  Slug: /teams/{team.abbreviation || team.id}/p/{project.abbreviation || project.id}
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 2, maxWidth: 600, lineHeight: 1.6 }}>
              {project.description || "Welcome to the project workspace. Create and manage pages specific to this initiative."}
            </Typography>
          </Box>
          
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigateTo(team.abbreviation || team.id, project.abbreviation || project.id, null, true)}
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
            Project Settings
          </Button>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: "text.primary" }}>
            Project Pages
          </Typography>
        </Box>

        {loadingDocs ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (documents && documents.length > 0) ? (
          <Box sx={{ 
            display: "grid", 
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, 
            gap: 3 
          }}>
            {documents.map((doc) => (
              <Box
                key={doc.id}
                onClick={() => handleDocumentClick(doc)}
                sx={{
                  cursor: "pointer",
                  backgroundColor: "var(--glass-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--border-radius-card)",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  p: 3,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  backdropFilter: "blur(10px)",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    borderColor: "primary.main",
                    boxShadow: "0 12px 24px -10px color-mix(in srgb, var(--primary-color) 30%, transparent)",
                    backgroundColor: "color-mix(in srgb, var(--primary-color) 4%, var(--glass-bg))"
                  }
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "color-mix(in srgb, var(--text-secondary) 15%, transparent)", color: "text.primary" }}>
                    <FileText size={16} />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: "text.primary", lineHeight: 1.2 }}>
                      {doc.title || "Untitled Page"}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: "auto", pt: 1 }}>
                  <Typography variant="caption" sx={{ color: "text.disabled", display: "flex", alignItems: "center", gap: 0.5 }}>
                    ID: {doc.id.substring(0,8)}...
                  </Typography>
                </Box>
                
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "primary.main", fontWeight: 600, fontSize: "12px", mt: 1 }}>
                  Open Page <ArrowRight size={14} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: "center", border: "1px dashed var(--border-color)", bgcolor: "transparent", borderRadius: "var(--border-radius-card)" }}>
            <Typography variant="h6" sx={{ color: "text.secondary", mb: 1, fontFamily: '"Outfit", sans-serif' }}>
              No Pages Yet
            </Typography>
            <Typography variant="body2" sx={{ color: "text.disabled", mb: 3 }}>
              This project doesn't have any pages. Use the sidebar to create your first page.
            </Typography>
          </Box>
        )}
      </Box>

    </Box>
  );
};
