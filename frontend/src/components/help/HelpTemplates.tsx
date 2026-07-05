import React from "react";
import { Box, Typography, Stack, Divider } from "@mui/material";
import { FileText, Grid } from "lucide-react";

export const HelpTemplates: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, color: "var(--text-primary)", mb: 1, fontFamily: '"Outfit", sans-serif' }}>
        Templates & Snippets
      </Typography>
      <Typography variant="body1" sx={{ color: "var(--text-secondary)", mb: 4, lineHeight: 1.6 }}>
        Streamline your workflow using standardized layouts and reusable block snippets.
      </Typography>

      <Stack spacing={4}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
            <FileText size={20} color="var(--primary-color)" />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "var(--text-primary)" }}>Page Templates</Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: "var(--text-secondary)", mb: 2, lineHeight: 1.6 }}>
            Page Templates provide a complete starting point for a new document. They can include pre-defined headers, tables, layouts, and placeholder text to guide creators on what to write.
          </Typography>
          <Typography variant="body2" sx={{ color: "var(--text-primary)", fontWeight: 500 }}>How to use:</Typography>
          <Typography variant="body2" sx={{ color: "var(--text-secondary)", mt: 1, pl: 2, borderLeft: "2px solid var(--border-color)" }}>
            When creating a new page via the "+" icon in the sidebar, click the dropdown to "Open Template Gallery", or click the "Create Document" button to open the gallery directly.
          </Typography>
        </Box>

        <Divider sx={{ borderColor: "var(--border-color)", opacity: 0.5 }} />

        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
            <Grid size={20} color="var(--primary-color)" />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "var(--text-primary)" }}>Block Snippets</Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: "var(--text-secondary)", mb: 2, lineHeight: 1.6 }}>
            Block Snippets are smaller, reusable chunks of content that you can insert into any existing document. Perfect for a recurring status update table or a specific callout panel format.
          </Typography>
          <Typography variant="body2" sx={{ color: "var(--text-primary)", fontWeight: 500 }}>How to use:</Typography>
          <Typography variant="body2" sx={{ color: "var(--text-secondary)", mt: 1, pl: 2, borderLeft: "2px solid var(--border-color)" }}>
            Type <strong>/</strong> in the editor to open the slash command menu. Browse the "Snippets" section or type the name of your snippet to insert it directly at your cursor.
          </Typography>
        </Box>
        
        <Divider sx={{ borderColor: "var(--border-color)", opacity: 0.5 }} />

        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "var(--text-primary)", mb: 2 }}>Template Scopes</Typography>
          <Typography variant="body2" sx={{ color: "var(--text-secondary)", mb: 2, lineHeight: 1.6 }}>
            Templates are organized by scope:
            <br/><br/>
            • <strong>System:</strong> Built-in templates available to everyone on the server.<br/>
            • <strong>Team:</strong> Templates created for a specific team, available only to members.<br/>
            • <strong>Personal:</strong> Private templates available only to you.
          </Typography>
          <Typography variant="body2" sx={{ color: "var(--text-primary)", fontWeight: 500 }}>Managing Templates:</Typography>
          <Typography variant="body2" sx={{ color: "var(--text-secondary)", mt: 1, pl: 2, borderLeft: "2px solid var(--border-color)" }}>
            You can create, edit, and delete templates by visiting the <strong>Template Library</strong> accessible from the project/team menu in the sidebar.
          </Typography>
        </Box>

      </Stack>
    </Box>
  );
};
