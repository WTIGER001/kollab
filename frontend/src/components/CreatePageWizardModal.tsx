import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
} from "@mui/material";
import { FileText } from "lucide-react";
import { getTemplates } from "../services/api";
import type { Template, Team, Project } from "../services/api";
import { useDocuments } from "../hooks/queries";
import { useDocumentTree } from "../hooks/useDocumentTree";
import { getMoveCandidates } from "./Sidebar";

const firstStartTemplates: Template[] = [
  {
    id: "first-start-project-brief",
    title: "Project Brief",
    description: "Clarify the goal, scope, owners, and first milestones.",
    content: JSON.stringify({ type: "doc", content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Project brief" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Goal" }] },
      { type: "paragraph", content: [{ type: "text", text: "What outcome are we trying to create?" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Scope" }] },
      { type: "paragraph", content: [{ type: "text", text: "What is included, and what is intentionally out of scope?" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Milestones" }] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "First milestone" }] }] }] },
    ] }),
    scope: "system",
    templateType: "page",
    createdAt: "",
  },
  {
    id: "first-start-meeting-notes",
    title: "Meeting Notes",
    description: "Capture decisions, discussion points, and follow-ups.",
    content: JSON.stringify({ type: "doc", content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Meeting notes" }] },
      { type: "paragraph", content: [{ type: "text", text: "Date: " }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Discussion" }] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Topic" }] }] }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Decisions" }] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Decision" }] }] }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Next steps" }] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Owner — action — due date" }] }] }] },
    ] }),
    scope: "system",
    templateType: "page",
    createdAt: "",
  },
  {
    id: "first-start-team-wiki",
    title: "Team Wiki",
    description: "Create a practical home for team context and links.",
    content: JSON.stringify({ type: "doc", content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Team wiki" }] },
      { type: "paragraph", content: [{ type: "text", text: "A shared starting point for this team." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What we do" }] },
      { type: "paragraph", content: [{ type: "text", text: "Describe the team’s purpose and responsibilities." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Useful links" }] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Add a useful link" }] }] }] },
    ] }),
    scope: "system",
    templateType: "page",
    createdAt: "",
  },
];

interface CreatePageWizardModalProps {
  open: boolean;
  onClose: () => void;
  teams: Team[];
  projects: Project[];
  currentTeamId: string | null;
  currentProjectId: string | null;
  onConfirm: (template: Template | null, title: string, parentId: string | null, projectId?: string, teamId?: string) => Promise<void>;
}

export const CreatePageWizardModal: React.FC<CreatePageWizardModalProps> = ({
  open,
  onClose,
  teams,
  projects,
  currentTeamId,
  currentProjectId,
  onConfirm,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null | "blank">(null);
  
  // Step 2 state
  const defaultSpace = currentProjectId ? `project:${currentProjectId}` : (currentTeamId ? `team:${currentTeamId}` : "");
  const [selectedSpace, setSelectedSpace] = useState<string>(defaultSpace);
  const [title, setTitle] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update default space if current context changes
  useEffect(() => {
    if (open) {
      setSelectedSpace(currentProjectId ? `project:${currentProjectId}` : (currentTeamId ? `team:${currentTeamId}` : ""));
      setStep(1);
      setSelectedTemplate(null);
      setTitle("");
      setSelectedParentId("");
    }
  }, [open, currentProjectId, currentTeamId]);

  useEffect(() => {
    if (open && step === 1) {
      loadTemplates();
    }
  }, [open, step]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getTemplates({ templateType: "page" });
      setTemplates(data || []);
    } catch (err) {
      console.error("Failed to load templates", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (selectedTemplate !== "blank" && selectedTemplate !== null) {
      setTitle(selectedTemplate.title);
    } else {
      setTitle("");
    }
    setStep(2);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const isProject = selectedSpace.startsWith("project:");
      const selectedProjId = isProject ? selectedSpace.substring(8) : undefined;
      const selectedTId = !isProject ? selectedSpace.substring(5) : undefined;
      
      const finalTemplate = selectedTemplate === "blank" ? null : selectedTemplate;
      
      await onConfirm(
        finalTemplate,
        title || "Untitled Document",
        selectedParentId === "" ? null : selectedParentId,
        selectedProjId,
        selectedTId
      );
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tree logic for Step 2
  const isProject = selectedSpace.startsWith("project:");
  const selectedProjId = isProject ? selectedSpace.substring(8) : null;
  const selectedTId = !isProject ? selectedSpace.substring(5) : null;
  
  const { data: fetchedDocs } = useDocuments(selectedProjId, selectedTId);
  const tree = useDocumentTree(fetchedDocs);
  const candidates = getMoveCandidates(tree, "");

  const renderTemplatesGroup = (groupName: string, items: Template[]) => {
    if (items.length === 0 && groupName !== "System") return null;

    return (
      <Box sx={{ mb: 4 }} key={groupName}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontFamily: '"Outfit", sans-serif', color: "text.secondary", fontWeight: 600 }}>
          {groupName} Templates
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
          {groupName === "System" && (
            <Box>
              <Card
                sx={{
                  border: selectedTemplate === "blank" ? "2px solid var(--primary-color)" : "1px solid var(--border-color)",
                  boxShadow: selectedTemplate === "blank" ? "0 0 0 4px rgba(111, 66, 193, 0.1)" : "none",
                  backgroundColor: "var(--glass-bg)",
                  height: "120px",
                  width: "100%",
                }}
              >
                <CardActionArea onClick={() => setSelectedTemplate("blank")} sx={{ height: "100%" }}>
                  <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1 }}>
                      <FileText size={20} style={{ color: "var(--text-secondary)", marginRight: "8px", flexShrink: 0, marginTop: "2px" }} />
                      <Typography variant="subtitle1" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, lineHeight: 1.2 }}>
                        Blank Page
                      </Typography>
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: "text.secondary", 
                        fontFamily: '"Outfit", sans-serif',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      Start fresh with an empty document.
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Box>
          )}
          
          {items.map(t => (
            <Box key={t.id}>
              <Card
                sx={{
                  border: (selectedTemplate !== "blank" && selectedTemplate?.id === t.id) ? "2px solid var(--primary-color)" : "1px solid var(--border-color)",
                  boxShadow: (selectedTemplate !== "blank" && selectedTemplate?.id === t.id) ? "0 0 0 4px rgba(111, 66, 193, 0.1)" : "none",
                  backgroundColor: "var(--glass-bg)",
                  height: "120px",
                  width: "100%",
                }}
              >
                <CardActionArea onClick={() => setSelectedTemplate(t)} sx={{ height: "100%" }}>
                  <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1 }}>
                      <FileText size={20} style={{ color: "var(--primary-color)", marginRight: "8px", flexShrink: 0, marginTop: "2px" }} />
                      <Typography variant="subtitle1" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, lineHeight: 1.2 }}>
                        {t.title}
                      </Typography>
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: "text.secondary", 
                        fontFamily: '"Outfit", sans-serif',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {t.description || "No description provided."}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Box>
          ))}
        </Box>
        <Divider sx={{ mt: 3, borderColor: "var(--border-color)" }} />
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth={step === 1 ? "md" : "sm"} fullWidth>
      <DialogTitle sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700 }}>
        Create Page
      </DialogTitle>
      <DialogContent sx={{ minHeight: "300px" }}>
        {step === 1 && (
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ mb: 3, color: "text.secondary", fontFamily: '"Outfit", sans-serif' }}>
              Choose a template to start with, or select Blank Page to start from scratch.
            </Typography>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                {renderTemplatesGroup("Start Here", firstStartTemplates)}
                {renderTemplatesGroup("System", templates.filter(t => t.scope === "system"))}
                {renderTemplatesGroup("Team", templates.filter(t => t.scope === "team"))}
                {renderTemplatesGroup("Project", templates.filter(() => false))}
                {renderTemplatesGroup("Personal", templates.filter(t => t.scope === "personal"))}
              </Box>
            )}
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              label="Page Title"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Document"
              autoFocus slotProps={{ input: {
                sx: { fontFamily: '"Outfit", sans-serif' }
              }, inputLabel: {
                sx: { fontFamily: '"Outfit", sans-serif' }
              } }}
            />

            <FormControl fullWidth size="small">
              <InputLabel id="space-select-label" sx={{ fontFamily: '"Outfit", sans-serif' }}>
                Destination Space
              </InputLabel>
              <Select
                labelId="space-select-label"
                value={selectedSpace}
                label="Destination Space"
                onChange={(e) => {
                  setSelectedSpace(e.target.value as string);
                  setSelectedParentId(""); // Reset parent when space changes
                }}
                sx={{ fontFamily: '"Outfit", sans-serif' }}
              >
                {teams.map(t => (
                  <MenuItem key={`team:${t.id}`} value={`team:${t.id}`} sx={{ fontFamily: '"Outfit", sans-serif' }}>
                    {t.id.startsWith("personal_") ? "👤 Personal Space" : `🏢 Team: ${t.name}`}
                  </MenuItem>
                ))}
                {projects.map(p => (
                  <MenuItem key={`project:${p.id}`} value={`project:${p.id}`} sx={{ fontFamily: '"Outfit", sans-serif' }}>
                    🎯 Project: {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="parent-select-label" sx={{ fontFamily: '"Outfit", sans-serif' }}>
                New Parent Page
              </InputLabel>
              <Select
                labelId="parent-select-label"
                value={selectedParentId}
                label="New Parent Page"
                onChange={(e) => setSelectedParentId(e.target.value as string)}
                sx={{ fontFamily: '"Outfit", sans-serif' }}
              >
                <MenuItem value="" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>
                  📁 Top Level (Root)
                </MenuItem>
                {candidates.map((c) => (
                  <MenuItem
                    key={c.id}
                    value={c.id}
                    sx={{
                      fontFamily: '"Outfit", sans-serif',
                      pl: c.depth * 2 + 2,
                    }}
                  >
                    {"\u00A0".repeat(c.depth * 2)} 📄 {c.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {step === 1 ? (
          <>
            <Button onClick={onClose} sx={{ fontFamily: '"Outfit", sans-serif', textTransform: "none", color: "text.secondary" }}>
              Cancel
            </Button>
            <Button 
              onClick={handleNext} 
              disabled={selectedTemplate === null}
              variant="contained" 
              sx={{ fontFamily: '"Outfit", sans-serif', textTransform: "none", backgroundColor: "var(--primary-color)", color: "#fff" }}
            >
              Next
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setStep(1)} sx={{ fontFamily: '"Outfit", sans-serif', textTransform: "none", color: "text.secondary" }}>
              Back
            </Button>
            <Button 
              onClick={handleFinish} 
              disabled={isSubmitting}
              variant="contained" 
              sx={{ fontFamily: '"Outfit", sans-serif', textTransform: "none", backgroundColor: "var(--primary-color)", color: "#fff" }}
            >
              Finish
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
