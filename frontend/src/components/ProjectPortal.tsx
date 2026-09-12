import { authenticatedMediaUrl } from "../services/api";
import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  Button, 
  Avatar, 
  CircularProgress} from "@mui/material";
import { 
  Settings, 
  Briefcase, 
  FileText,
  ArrowRight,
  CheckCircle2,
  Circle,
  UserPlus,
  X,
} from "lucide-react";
import { fetchDocuments } from "../services/api";
import type { Team, Project, Document } from "../services/api";
import { useAppStore } from "../store/useAppStore";

interface ProjectPortalProps {
  team: Team;
  project: Project;
  navigateTo: (team: string | null, project: string | null, page: string | null, isSettings?: boolean, isTeamSettings?: boolean) => void;
  onManageMembers: () => void;
}

export const ProjectPortal: React.FC<ProjectPortalProps> = ({
  team,
  project,
  navigateTo,
  onManageMembers,
}) => {
  const setCreatePageOpen = useAppStore((state) => state.setCreatePageOpen);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [setupDismissed, setSetupDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(`kollab:onboarding-dismissed:${project.id}`) === "true";
  });

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

  const dismissSetup = () => {
    setSetupDismissed(true);
    window.localStorage.setItem(`kollab:onboarding-dismissed:${project.id}`, "true");
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
                src={authenticatedMediaUrl(project.logoUrl || undefined)}
                variant={project.logoUrl ? "square" : "circular"}
                sx={{ 
                  bgcolor: project.logoUrl ? "transparent" : "primary.main", 
                  width: 44, 
                  height: 44, 
                  fontSize: "18px", 
                  fontWeight: 700,
                  "& img": { objectFit: "contain" }
                }}
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
        {!loadingDocs && documents.length > 0 && !setupDismissed && (
          <Box sx={{ p: { xs: 2.25, sm: 3 }, border: "1px solid color-mix(in srgb, var(--primary-color) 28%, var(--border-color))", borderRadius: "var(--border-radius-card)", backgroundColor: "color-mix(in srgb, var(--primary-color) 6%, var(--glass-bg))" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ color: "text.primary", fontWeight: 800, fontFamily: '"Outfit", sans-serif', mb: 0.5 }}>
                  Nice start — your project has its first page
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.55 }}>
                  Keep the momentum with one more page or bring a teammate into the workspace.
                </Typography>
              </Box>
              <Button aria-label="Dismiss project setup" onClick={dismissSetup} size="small" sx={{ minWidth: 0, p: 0.5, color: "text.secondary", "&:hover": { color: "text.primary", backgroundColor: "color-mix(in srgb, var(--text-primary) 6%, transparent)" } }}><X size={16} /></Button>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.25, mb: 2.25 }}>
              {[
                { title: "Project created", detail: "Your shared home is ready.", complete: true },
                { title: "First page written", detail: "Your work now has a starting point.", complete: true },
                { title: "Invite teammates", detail: "Add people when you are ready.", complete: false },
              ].map((step) => (
                <Box key={step.title} sx={{ display: "flex", gap: 1, p: 1.25, borderRadius: "var(--border-radius-card)", backgroundColor: "var(--glass-bg)" }}>
                  {step.complete ? <CheckCircle2 size={16} style={{ color: "var(--primary-color)", flexShrink: 0, marginTop: 2 }} /> : <Circle size={16} style={{ color: "var(--text-secondary)", flexShrink: 0, marginTop: 2 }} />}
                  <Box>
                    <Typography sx={{ color: "text.primary", fontSize: "12.5px", fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>{step.title}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.4 }}>{step.detail}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
            <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap" }}>
              <Button variant="contained" onClick={() => setCreatePageOpen(true)} startIcon={<FileText size={14} />} sx={{ textTransform: "none", fontFamily: '"Outfit", sans-serif', fontWeight: 700, borderRadius: "var(--border-radius-button)", boxShadow: "var(--shadow-button)" }}>Create another page</Button>
              <Button variant="outlined" onClick={onManageMembers} startIcon={<UserPlus size={14} />} sx={{ color: "text.primary", borderColor: "var(--border-color)", textTransform: "none", fontFamily: '"Outfit", sans-serif', fontWeight: 700, borderRadius: "var(--border-radius-button)", "&:hover": { borderColor: "var(--primary-color)", backgroundColor: "color-mix(in srgb, var(--primary-color) 8%, transparent)" } }}>Manage team members</Button>
            </Box>
          </Box>
        )}
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
          <Box sx={{ p: { xs: 3, sm: 5 }, textAlign: "center", border: "1px dashed var(--border-color)", bgcolor: "var(--glass-bg)", borderRadius: "var(--border-radius-card)" }}>
            <Box sx={{ width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 1.5, borderRadius: "50%", color: "var(--primary-color)", bgcolor: "color-mix(in srgb, var(--primary-color) 12%, transparent)" }}>
              <FileText size={20} />
            </Box>
            <Typography variant="h6" sx={{ color: "text.primary", mb: 1, fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}>
              Your project is ready for its first page
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.5, maxWidth: 420, mx: "auto", lineHeight: 1.6 }}>
              Start from a blank page or choose a template. Your page will appear here and in the sidebar automatically.
            </Typography>
            <Button
              variant="contained"
              startIcon={<FileText size={15} />}
              onClick={() => setCreatePageOpen(true)}
              sx={{ textTransform: "none", fontFamily: '"Outfit", sans-serif', fontWeight: 700, borderRadius: "var(--border-radius-button)", boxShadow: "var(--shadow-button)" }}
            >
              Create your first page
            </Button>
          </Box>
        )}
      </Box>

    </Box>
  );
};
