import { useState, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { Sidebar } from "./components/Sidebar";
import type { DocumentItem } from "./components/Sidebar";
import { EditorCanvas } from "./components/EditorCanvas";
import { SearchModal } from "./components/SearchModal";
import { Box, Typography, Button } from "@mui/material";
import { Layers, Sparkles } from "lucide-react";
import { 
  fetchTeams, 
  fetchProjects, 
  fetchDocuments, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  setApiToken,
  fetchOIDCConfig,
  fetchUserPreferences,
  updateUserPreferences,
  updateWorkspaceTheme
} from "./services/api";
import type { Team, Project, ColorScheme, WorkspaceTheme } from "./services/api";
import { WorkspaceSettingsDialog } from "./components/WorkspaceSettingsDialog";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

// Helper to find a document recursively in the tree
const findDocById = (docs: DocumentItem[], id: string): DocumentItem | null => {
  for (const doc of docs) {
    if (doc.id === id) return doc;
    if (doc.children) {
      const found = findDocById(doc.children, id);
      if (found) return found;
    }
  }
  return null;
};

// Helper to construct a parent-child tree from a flat array
const buildDocumentTree = (flatDocs: any[]): DocumentItem[] => {
  const map: Record<string, DocumentItem & { parentId: string | null }> = {};
  const roots: DocumentItem[] = [];

  // First pass: instantiate nodes
  flatDocs.forEach(doc => {
    map[doc.id] = {
      id: doc.id,
      title: doc.title,
      isFolder: false,
      content: doc.content,
      children: [],
      parentId: doc.parentId,
    } as any;
  });

  // Second pass: link parents and children
  flatDocs.forEach(doc => {
    const node = map[doc.id];
    if (doc.parentId && map[doc.parentId]) {
      map[doc.parentId].isFolder = true; // folder if it has children
      map[doc.parentId].children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

interface AppProps {
  isMockMode?: boolean;
}

function App({ isMockMode = false }: AppProps) {
  // OIDC context (conditionally evaluated to avoid missing AuthProvider error in mock mode)
  const auth = isMockMode ? null : useAuth();

  // Determine auth state based on mode
  const isAuthenticated = isMockMode ? true : !!auth?.isAuthenticated;
  const username = isMockMode ? "Developer Admin" : auth?.user?.profile.preferred_username || auth?.user?.profile.name || "User";
  const userToken = isMockMode ? "mock-jwt-token" : auth?.user?.id_token || null;

  // App States
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Theme & preferences states
  const [workspaceTheme, setWorkspaceTheme] = useState<WorkspaceTheme | null>(null);
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Fetch installation OIDC & brand configuration (theme settings) on mount
  useEffect(() => {
    fetchOIDCConfig()
      .then((cfg) => {
        if (cfg.theme) {
          setWorkspaceTheme(cfg.theme);
        }
      })
      .catch((err) => console.error("Error fetching OIDC theme config:", err));
  }, []);

  // Fetch logged in user preferences
  useEffect(() => {
    if (isAuthenticated) {
      const t = setTimeout(() => {
        fetchUserPreferences()
          .then((pref) => {
            if (pref && pref.themeMode) {
              setThemeMode(pref.themeMode);
            }
          })
          .catch((err) => console.error("Error fetching user preferences:", err));
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, userToken]);

  // Global search keyboard shortcut (⌘P / Ctrl+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleThemeMode = () => {
    const nextMode = themeMode === "light" ? "dark" : "light";
    setThemeMode(nextMode);

    if (isAuthenticated) {
      updateUserPreferences(nextMode)
        .catch((err) => console.error("Error updating user preferences:", err));
    }
  };

  const handleSaveWorkspaceSettings = (name: string, logoUrl: string, lightMode: ColorScheme, darkMode: ColorScheme) => {
    updateWorkspaceTheme(name, logoUrl, lightMode, darkMode)
      .then((updated) => {
        setWorkspaceTheme(updated);
      })
      .catch((err) => {
        console.error("Failed to save workspace settings:", err);
        alert("Failed to save workspace settings. Make sure you are authorized.");
      });
  };

  const activeColorScheme = themeMode === "light" 
    ? (workspaceTheme?.lightMode || {
        primary: "#8b5cf6",
        secondary: "#3b82f6",
        background: "#f8fafc",
        paper: "#ffffff",
        textPrimary: "#0f172a",
        textSecondary: "#475569",
        border: "#e2e8f0",
        accent: "#3b82f6"
      })
    : (workspaceTheme?.darkMode || {
        primary: "#8b5cf6",
        secondary: "#3b82f6",
        background: "#08090c",
        paper: "#10121a",
        textPrimary: "#f8fafc",
        textSecondary: "#94a3b8",
        border: "rgba(255, 255, 255, 0.06)",
        accent: "#3b82f6"
      });

  // Inject colors into CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary-color", activeColorScheme.primary);
    root.style.setProperty("--secondary-color", activeColorScheme.secondary);
    root.style.setProperty("--bg-color", activeColorScheme.background);
    root.style.setProperty("--panel-color", activeColorScheme.paper);
    root.style.setProperty("--text-primary", activeColorScheme.textPrimary);
    root.style.setProperty("--text-secondary", activeColorScheme.textSecondary);
    root.style.setProperty("--border-color", activeColorScheme.border);
    root.style.setProperty("--accent-color", activeColorScheme.accent);
    root.style.setProperty("--scrollbar-thumb", themeMode === "light" ? "rgba(0, 0, 0, 0.16)" : "rgba(255, 255, 255, 0.16)");
    root.style.setProperty("--scrollbar-thumb-hover", themeMode === "light" ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.3)");
  }, [themeMode, activeColorScheme]);

  // Construct dynamic MUI theme
  const muiTheme = createTheme({
    palette: {
      mode: themeMode,
      primary: {
        main: activeColorScheme.primary,
        light: activeColorScheme.primary,
        dark: activeColorScheme.primary,
        contrastText: "#ffffff",
      },
      secondary: {
        main: activeColorScheme.secondary,
      },
      background: {
        default: activeColorScheme.background,
        paper: activeColorScheme.paper,
      },
      text: {
        primary: activeColorScheme.textPrimary,
        secondary: activeColorScheme.textSecondary,
        disabled: themeMode === "dark" ? "#64748b" : "#94a3b8",
      },
      divider: activeColorScheme.border,
    },
    typography: {
      fontFamily: '"Outfit", "Inter", "system-ui", "-apple-system", sans-serif',
      h1: { fontFamily: '"Outfit", sans-serif', fontWeight: 700 },
      h2: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
      h3: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
      h4: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
      h5: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
      h6: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 500 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)" },
          contained: {
            boxShadow: `0 4px 12px ${activeColorScheme.primary}40`,
            "&:hover": { boxShadow: `0 6px 16px ${activeColorScheme.primary}60` }
          }
        }
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: 8, transition: "all 0.2s ease" } }
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            borderRadius: 10,
            border: `1px solid ${activeColorScheme.border}`,
            backgroundColor: activeColorScheme.paper,
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
            backgroundImage: "none"
          }
        }
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 10,
            border: `1px solid ${activeColorScheme.border}`,
            backgroundColor: activeColorScheme.paper,
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
            backgroundImage: "none"
          }
        }
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: "none" } }
      }
    }
  });

  // Sync token to API client
  useEffect(() => {
    if (isAuthenticated && userToken) {
      setApiToken(userToken);
    } else {
      setApiToken(null);
    }
  }, [isAuthenticated, userToken]);

  // Fetch Teams on successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      fetchTeams()
        .then(data => {
          setTeams(data);
          if (data.length > 0) {
            setSelectedTeamId(data[0].id);
          }
        })
        .catch(err => console.error("Error fetching teams:", err));
    }
  }, [isAuthenticated]);

  // Fetch Projects when Team changes
  useEffect(() => {
    if (isAuthenticated && selectedTeamId) {
      fetchProjects(selectedTeamId)
        .then(data => {
          setProjects(data);
          if (data.length > 0) {
            setSelectedProjectId(data[0].id);
          } else {
            setSelectedProjectId(null);
            setDocuments([]);
            setActiveDocId(null);
          }
        })
        .catch(err => console.error("Error fetching projects:", err));
    }
  }, [isAuthenticated, selectedTeamId]);

  // Fetch Document Tree when Project changes
  useEffect(() => {
    if (isAuthenticated && selectedProjectId) {
      fetchDocuments(selectedProjectId)
        .then(flatDocs => {
          const tree = buildDocumentTree(flatDocs);
          setDocuments(tree);
          if (tree.length > 0) {
            // Find first page file (non-folder) to set active, or fallback to first item
            const firstPage = tree.find(d => !d.isFolder) || tree[0];
            setActiveDocId(firstPage.id);
          } else {
            setActiveDocId(null);
          }
        })
        .catch(err => console.error("Error fetching documents:", err));
    }
  }, [isAuthenticated, selectedProjectId]);

  const activeDoc = activeDocId ? findDocById(documents, activeDocId) : null;

  const handleSelectDoc = (id: string) => {
    const doc = findDocById(documents, id);
    if (doc && !doc.isFolder) {
      setActiveDocId(id);
    }
  };

  const handleAddDoc = (parentId?: string) => {
    if (!selectedProjectId) return;
    const title = parentId ? "Sub Page" : "New Document";

    createDocument(title, selectedProjectId, parentId)
      .then(newDoc => {
        const mappedDoc: DocumentItem = {
          id: newDoc.id,
          title: newDoc.title,
          isFolder: false,
          content: newDoc.content,
          children: []
        };

        // Recalculate tree structure locally
        setDocuments(prev => {
          if (!parentId) {
            return [...prev, mappedDoc];
          }
          const addRecursively = (items: DocumentItem[]): DocumentItem[] => {
            return items.map(item => {
              if (item.id === parentId) {
                return {
                  ...item,
                  isFolder: true,
                  children: item.children ? [...item.children, mappedDoc] : [mappedDoc]
                };
              }
              if (item.children) {
                return {
                  ...item,
                  children: addRecursively(item.children)
                };
              }
              return item;
            });
          };
          return addRecursively(prev);
        });

        setActiveDocId(newDoc.id);
      })
      .catch(err => console.error("Error creating document:", err));
  };

  const handleDeleteDoc = (id: string) => {
    deleteDocument(id)
      .then(() => {
        setDocuments(prev => {
          const filterRecursively = (items: DocumentItem[]): DocumentItem[] => {
            return items
              .filter(item => item.id !== id)
              .map(item => {
                if (item.children) {
                  return {
                    ...item,
                    children: filterRecursively(item.children)
                  };
                }
                return item;
              });
          };
          return filterRecursively(prev);
        });

        if (activeDocId === id) {
          setActiveDocId(null);
        }
      })
      .catch(err => console.error("Error deleting document:", err));
  };

  const handleSaveDoc = (title: string, content: string) => {
    if (!activeDocId) return;
    setIsSaving(true);

    updateDocument(activeDocId, title, content)
      .then(updated => {
        setDocuments(prev => {
          const updateRecursively = (items: DocumentItem[]): DocumentItem[] => {
            return items.map(item => {
              if (item.id === activeDocId) {
                return {
                  ...item,
                  title: updated.title,
                  content: updated.content
                };
              }
              if (item.children) {
                return {
                  ...item,
                  children: updateRecursively(item.children)
                };
              }
              return item;
            });
          };
          return updateRecursively(prev);
        });
      })
      .catch(err => console.error("Error updating document:", err))
      .finally(() => {
        setTimeout(() => {
          setIsSaving(false);
        }, 500);
      });
  };

  const handleLogout = () => {
    if (isMockMode) {
      alert("Mock Mode: Bypassed auth reset.");
    } else {
      auth?.signoutRedirect();
    }
  };

  // Auth Guard Login Screen
  const renderContent = () => {
    if (!isAuthenticated) {
      return (
        <Box sx={{ 
          display: "flex", 
          height: "100vh", 
          width: "100vw", 
          alignItems: "center", 
          justifyContent: "center", 
          bgcolor: "background.default",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Glow Effects */}
          <Box className="accent-glow-purple" sx={{ position: "absolute", top: "40%", left: "40%", transform: "translate(-50%, -50%)" }} />
          <Box className="accent-glow-blue" sx={{ position: "absolute", top: "60%", left: "60%", transform: "translate(-50%, -50%)" }} />

          <Box sx={{ 
            backgroundColor: "background.paper", 
            border: "1px solid rgba(255, 255, 255, 0.05)", 
            p: 6, 
            borderRadius: 4, 
            maxWidth: 420, 
            textAlign: "center", 
            backdropFilter: "blur(20px)",
            boxShadow: "var(--shadow-premium)", 
            zIndex: 10 
          }}>
            {/* Logo */}
            <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
              <Box sx={{ 
                backgroundColor: "rgba(139, 92, 246, 0.1)", 
                border: "1px solid rgba(139, 92, 246, 0.2)",
                p: 2, 
                borderRadius: 3, 
                display: "flex", 
                alignItems: "center"
              }}>
                {workspaceTheme?.logoUrl ? (
                  <Box component="img" src={workspaceTheme.logoUrl} sx={{ width: 32, height: 32, objectFit: "contain" }} />
                ) : (
                  <Layers size={32} style={{ color: "var(--accent-purple)" }} />
                )}
              </Box>
            </Box>

            <Typography variant="h5" sx={{ color: "text.primary", fontWeight: 800, mb: 1, fontFamily: '"Outfit", sans-serif', letterSpacing: "-0.01em" }}>
              Welcome to {workspaceTheme?.name || "Arkollab"}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", display: "block", mb: 4, lineHeight: 1.6, px: 2 }}>
              A premium block-based document workspace. Connect with Logto Single-Sign-On (SSO) to synchronize your team workspaces.
            </Typography>

            <Button
              variant="contained"
              onClick={() => auth?.signinRedirect()}
              sx={{ 
                width: "100%",
                py: 1.5, 
                fontSize: "12px", 
                fontWeight: 700,
                bgcolor: "primary.main",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(139, 92, 246, 0.2)",
                textTransform: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                "&:hover": {
                  bgcolor: "primary.dark",
                  boxShadow: "0 6px 16px rgba(139, 92, 246, 0.3)",
                }
              }}
            >
              <Sparkles size={14} />
              Sign In with Logto SSO
            </Button>
          </Box>
        </Box>
      );
    }

    return (
      <Box sx={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", bgcolor: "background.default", fontFamily: "var(--font-sans)" }}>
        {/* Sidebar Navigation */}
        <Sidebar
          documents={documents}
          activeDocId={activeDocId}
          onSelectDoc={handleSelectDoc}
          onAddDoc={handleAddDoc}
          onDeleteDoc={handleDeleteDoc}
          teams={teams}
          projects={projects}
          selectedTeamId={selectedTeamId}
          selectedProjectId={selectedProjectId}
          onSelectTeam={setSelectedTeamId}
          onSelectProject={setSelectedProjectId}
          username={username}
          onLogout={handleLogout}
          themeMode={themeMode}
          onToggleThemeMode={handleToggleThemeMode}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />

        {/* Main Canvas Workspace */}
        <Box component="main" sx={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {activeDoc ? (
            <EditorCanvas
              key={activeDocId} // Remount editor on switching documents
              activeDocId={activeDocId}
              authToken={userToken}
              initialTitle={activeDoc.title}
              initialContent={activeDoc.content || ""}
              onSave={handleSaveDoc}
              isSaving={isSaving}
            />
          ) : (
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "text.disabled", p: 4, userSelect: "none", position: "relative" }}>
              <Box className="accent-glow-purple" sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
              <Box sx={{ 
                backgroundColor: "rgba(22, 25, 36, 0.4)", 
                border: "1px solid rgba(255, 255, 255, 0.05)", 
                p: 4, 
                borderRadius: 4, 
                maxWidth: 360, 
                textAlign: "center", 
                boxShadow: "var(--shadow-premium)", 
                zIndex: 10 
              }}>
                <Typography variant="subtitle1" sx={{ color: "text.primary", fontWeight: 600, mb: 1, fontFamily: '"Outfit", sans-serif' }}>
                  No Project Page Selected
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 3, lineHeight: 1.5 }}>
                  {selectedProjectId 
                    ? "Create a new document inside this project workspace to begin typing."
                    : "Please select or create a project workspace from the sidebar header dropdowns to start."
                  }
                </Typography>
                <Button
                  variant="contained"
                  disabled={!selectedProjectId}
                  onClick={() => handleAddDoc()}
                  size="small"
                  sx={{ 
                    px: 3, 
                    py: 1, 
                    fontSize: "11px", 
                    fontWeight: 600,
                    bgcolor: "primary.main",
                    "&:hover": {
                      bgcolor: "primary.dark",
                    }
                  }}
                >
                  Create First Page
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      {renderContent()}
      <WorkspaceSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentTheme={workspaceTheme}
        onSave={handleSaveWorkspaceSettings}
      />
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        projectId={selectedProjectId}
        onSelectDoc={handleSelectDoc}
      />
    </ThemeProvider>
  );
}

export default App;
