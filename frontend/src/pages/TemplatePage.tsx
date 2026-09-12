import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, CircularProgress, Typography, IconButton } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { EditorCanvas } from '../components/EditorCanvas';
import { getTemplate, updateTemplate } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/SessionContext';
import { useToastStore } from '../store/useToastStore';

export const TemplatePage: React.FC<{ isMockMode?: boolean }> = ({ isMockMode }) => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { developerMode } = useAppStore();
  
	const { token } = useSession();
  const { showToast } = useToastStore();
  const userToken = isMockMode ? "mock-jwt-token" : token;

  const { data: activeTemplate, isLoading, error } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => getTemplate(templateId!),
    enabled: !!templateId,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveTemplate = async (title: string, content: string) => {
    if (!activeTemplate) return;
    setIsSaving(true);
    try {
      await updateTemplate(activeTemplate.id, { 
        ...activeTemplate,
        title, 
        content 
      });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', activeTemplate.id] });
    } catch (err) {
      showToast("Could not save. Your changes have not been saved.", "error");
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (error) return <Box sx={{ p: 3, color: "var(--text-primary)" }}>This page could not be loaded. Check your access and try again.</Box>;

  if (isLoading || !activeTemplate) {
    return (
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      {/* Template Header Banner to indicate it's a template being edited */}
      <Box sx={{ 
        px: 2, 
        py: 1, 
        bgcolor: "var(--panel-color)", 
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        gap: 2
      }}>
        <IconButton size="small" onClick={handleBack}>
          <ArrowLeft size={16} />
        </IconButton>
        <Typography variant="body2" sx={{ color: "var(--text-secondary)", fontWeight: 500 }}>
          Editing {activeTemplate.templateType === "page" ? "Page Template" : "Block Snippet"} ({activeTemplate.scope})
        </Typography>
      </Box>
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        <EditorCanvas
          key={activeTemplate.id} // Remount editor on switching templates
          activeDocId={`template_${activeTemplate.id}`} // Prefix to avoid collision with documents
          authToken={userToken}
          initialTitle={activeTemplate.title}
          initialContent={activeTemplate.content || ""}
          initialEditMode={true} // Default to edit mode for templates
          developerMode={developerMode}
          onSave={(title, content) => handleSaveTemplate(title, content)}
          isSaving={isSaving}
          createdAt={activeTemplate.createdAt}
        />
      </Box>
    </Box>
  );
};
