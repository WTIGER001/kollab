import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CircularProgress, 
  Tooltip, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton
} from "@mui/material";
import { AtSign, ExternalLink, User, Folder, Users, Home } from "lucide-react";
import { fetchUserMentions } from "../services/api";
import type { Document, Team, Project } from "../services/api";

interface UserMentionsViewProps {
  username: string;
  onNavigate: (documentId: string, teamId: string, projectId: string | null) => void;
  teams: Team[];
  projects: Project[];
}

export const UserMentionsView: React.FC<UserMentionsViewProps> = ({
  username,
  onNavigate,
  teams,
  projects
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMentions = async () => {
    if (!username) return;
    setLoading(true);
    try {
      const data = await fetchUserMentions(username);
      setDocuments(Array.isArray(data) ? (data as unknown as Document[]) : []);
    } catch (err) {
      console.error("Failed to fetch user mentions:", err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMentions();
  }, [username]);

  const handleRowClick = (doc: Document) => {
    const teamArg = (doc as any).teamId?.startsWith("personal_") || (doc as any).teamId === "personal" ? "personal" : (doc as any).teamId;
    const projectArg = doc.projectId || null;
    onNavigate(doc.id, teamArg, projectArg);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return dateString;
    }
  };

  // Group documents
  const personalDocs: Document[] = [];
  const projectGroups: Record<string, { projectName: string; docs: Document[] }> = {};
  const teamGroups: Record<string, { teamName: string; docs: Document[] }> = {};

  documents.forEach((doc) => {
    const teamId = (doc as any).teamId || "";
    const projectId = doc.projectId || "";

    if (!teamId || teamId.startsWith("personal_") || teamId === "personal") {
      personalDocs.push(doc);
    } else if (projectId) {
      const proj = projects.find(p => p.id === projectId);
      const projName = proj ? proj.name : "Project Space";
      if (!projectGroups[projectId]) {
        projectGroups[projectId] = { projectName: projName, docs: [] };
      }
      projectGroups[projectId].docs.push(doc);
    } else {
      const t = teams.find(team => team.id === teamId);
      const teamName = t ? t.name : "Team Space";
      if (!teamGroups[teamId]) {
        teamGroups[teamId] = { teamName: teamName, docs: [] };
      }
      teamGroups[teamId].docs.push(doc);
    }
  });

  const renderTable = (docs: Document[]) => (
    <TableContainer 
      className="glass-card"
      sx={{ 
        border: "1px solid var(--border-color)",
        backgroundColor: "var(--panel-color)",
        borderRadius: 2,
        boxShadow: "none",
        overflow: "hidden",
        mb: 3
      }}
    >
      <Table size="small">
        <TableHead sx={{ backgroundColor: "rgba(255, 255, 255, 0.015)" }}>
          <TableRow sx={{ borderBottom: "1px solid var(--border-color)" }}>
            <TableCell sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: "var(--text-secondary)", py: 1.25 }}>Page Title</TableCell>
            <TableCell sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: "var(--text-secondary)", py: 1.25 }}>Last Updated</TableCell>
            <TableCell sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: "var(--text-secondary)", py: 1.25 }}>Updated By</TableCell>
            <TableCell align="right" sx={{ py: 1.25 }}></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {docs.map((doc) => (
            <TableRow 
              key={doc.id}
              hover
              onClick={() => handleRowClick(doc)}
              sx={{ 
                cursor: "pointer",
                borderBottom: "1px solid var(--border-color)",
                "&:last-child": { borderBottom: 0 },
                "&.MuiTableRow-hover:hover": {
                  backgroundColor: "rgba(139, 92, 246, 0.02)"
                }
              }}
            >
              <TableCell sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, color: "var(--text-primary)", py: 1.5 }}>
                {doc.title || "Untitled"}
              </TableCell>
              <TableCell sx={{ fontFamily: '"Outfit", sans-serif', color: "var(--text-secondary)", py: 1.5 }}>
                {formatDate(doc.updatedAt)}
              </TableCell>
              <TableCell sx={{ fontFamily: '"Outfit", sans-serif', color: "var(--text-secondary)", py: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <User size={14} style={{ color: "var(--text-secondary)" }} />
                  <Typography variant="body2" sx={{ fontFamily: '"Outfit", sans-serif', fontSize: "0.875rem" }}>
                    {doc.updatedBy || doc.createdBy || "System"}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ py: 1 }}>
                <Tooltip title="View page" arrow>
                  <IconButton size="small" sx={{ color: "var(--text-secondary)" }}>
                    <ExternalLink size={16} />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: "auto" }}>
      {/* Header Panel */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <Box 
          sx={{ 
            backgroundColor: "rgba(139, 92, 246, 0.1)", 
            p: 1.5, 
            borderRadius: "12px", 
            border: "1px solid rgba(139, 92, 246, 0.2)",
            display: "flex",
            alignItems: "center"
          }}
        >
          <AtSign size={24} style={{ color: "var(--primary-color)" }} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: "var(--text-primary)" }}>
            My Mentions
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"Outfit", sans-serif' }}>
            All documents where you (@{username}) have been mentioned or tagged, grouped by workspace type
          </Typography>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={36} sx={{ color: "var(--primary-color)" }} />
        </Box>
      ) : documents.length === 0 ? (
        <Card 
          className="glass-card" 
          sx={{ 
            p: 4, 
            textAlign: "center", 
            border: "1px solid var(--border-color)", 
            backgroundColor: "var(--panel-color)",
            borderRadius: 3,
            boxShadow: "none"
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2, opacity: 0.4 }}>
              <AtSign size={48} style={{ color: "var(--text-secondary)" }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: '"Outfit", sans-serif', mb: 1, color: "var(--text-primary)" }}>
              No Mentions Found
            </Typography>
            <Typography variant="body2" sx={{ color: "text.disabled", fontFamily: '"Outfit", sans-serif', maxWidth: 400, mx: "auto" }}>
              When someone mentions you with @{username} in a page, it will appear here.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* 1. PERSONAL MENTIONS */}
          {personalDocs.length > 0 && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, mt: 1 }}>
                <Home size={18} style={{ color: "var(--primary-color)" }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: "var(--text-primary)" }}>
                  Personal Space
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", ml: 1 }}>
                  ({personalDocs.length} {personalDocs.length === 1 ? "mention" : "mentions"})
                </Typography>
              </Box>
              {renderTable(personalDocs)}
            </Box>
          )}

          {/* 2. PROJECT MENTIONS */}
          {Object.keys(projectGroups).length > 0 && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, mt: 2 }}>
                <Folder size={18} style={{ color: "var(--accent-blue, #3b82f6)" }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: "var(--text-primary)" }}>
                  Projects
                </Typography>
              </Box>
              {Object.entries(projectGroups).map(([projId, group]) => (
                <Box key={projId} sx={{ ml: 2, mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontFamily: '"Outfit", sans-serif', color: "var(--text-secondary)", mb: 1 }}>
                    📁 {group.projectName}
                  </Typography>
                  {renderTable(group.docs)}
                </Box>
              ))}
            </Box>
          )}

          {/* 3. TEAM MENTIONS */}
          {Object.keys(teamGroups).length > 0 && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, mt: 2 }}>
                <Users size={18} style={{ color: "var(--accent-purple, #a78bfa)" }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: "var(--text-primary)" }}>
                  Teams
                </Typography>
              </Box>
              {Object.entries(teamGroups).map(([teamId, group]) => (
                <Box key={teamId} sx={{ ml: 2, mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontFamily: '"Outfit", sans-serif', color: "var(--text-secondary)", mb: 1 }}>
                    👥 {group.teamName}
                  </Typography>
                  {renderTable(group.docs)}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};
