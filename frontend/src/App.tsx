import { useState, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { Sidebar } from "./components/Sidebar";
import type { DocumentItem } from "./components/Sidebar";
import { EditorCanvas } from "./components/EditorCanvas";
import { SearchModal } from "./components/SearchModal";
import { HelpDialog } from "./components/HelpDialog";
import { Box, Typography, Button, Snackbar, Alert, CircularProgress, useMediaQuery } from "@mui/material";
import { Layers, Sparkles, GripVertical, ChevronsLeftRight } from "lucide-react";
import { 
  fetchTeams, 
  fetchProjects, 
  fetchDocuments, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  moveDocument,
  restoreDocument,
  setApiToken,
  setOnUnauthorized,
  fetchOIDCConfig,
  fetchUserPreferences,
  updateUserPreferences,
  updateWorkspaceTheme,
  fetchDocument,
  createTeam,
  createProject,
  fetchSystemSettings,
  updateSystemSettings
} from "./services/api";
import type { Team, Project, ColorScheme, WorkspaceTheme, SystemSettings } from "./services/api";
import { WorkspaceSettingsDialog } from "./components/WorkspaceSettingsDialog";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { TopNavbar } from "./components/TopNavbar";
import { TeamPortal } from "./components/TeamPortal";
import { TeamSettingsView } from "./components/TeamSettingsView";
import { ProjectSettingsView } from "./components/ProjectSettingsView";
import { CreateSpaceDialog } from "./components/CreateSpaceDialog";
import { PersonalSettingsView } from "./components/PersonalSettingsView";
import { FavoritesView } from "./components/FavoritesView";
import { RecentPagesView } from "./components/RecentPagesView";
import { PageAuditView } from "./components/PageAuditView";
import { TrashView } from "./components/TrashView";
import { TasksView } from "./components/TasksView";


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
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      createdBy: doc.createdBy,
      updatedBy: doc.updatedBy,
      deletedAt: doc.deletedAt,
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

const parseLocation = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  
  let teamAbbrOrId: string | null = null;
  let projectAbbrOrId: string | null = null;
  let pageId: string | null = null;
  let isTeamSettings = false;
  let isProjectSettings = false;
  let isPersonalSettings = false;
  let isFavoritesPage = false;
  let isRecentsPage = false;
  let isAuditPage = false;
  let isTrashPage = false;
  let isTasksPage = false;

  if (parts[0] === "my" && parts[1] === "favorites") {
    isFavoritesPage = true;
  } else if (parts[0] === "my" && (parts[1] === "recents" || parts[1] === "recent")) {
    isRecentsPage = true;
  } else if (parts[0] === "my" && parts[1] === "tasks") {
    isTasksPage = true;
  } else if (parts[0] === "teams" && parts[1]) {
    teamAbbrOrId = parts[1];
    
    if (parts[2] === "_settings") {
      isTeamSettings = true;
    } else if (parts[2] === "trash") {
      isTrashPage = true;
    } else if (parts[2] === "p") {
      if (parts[3]) {
        projectAbbrOrId = parts[3];
        if (parts[4] === "_settings") {
          isProjectSettings = true;
        } else if (parts[4] === "trash") {
          isTrashPage = true;
        } else if (parts[4]) {
          pageId = parts[4];
          if (parts[5] === "viewers") {
            isAuditPage = true;
          }
        }
      }
    } else if (parts[2]) {
      pageId = parts[2];
      if (parts[3] === "viewers") {
        isAuditPage = true;
      }
    }
  } else if (parts[0] === "personal") {
    teamAbbrOrId = "personal";
    if (parts[1] === "_settings") {
      isPersonalSettings = true;
    } else if (parts[1] === "trash") {
      isTrashPage = true;
    } else if (parts[1]) {
      pageId = parts[1];
      if (parts[2] === "viewers") {
        isAuditPage = true;
      }
    }
  }

  return { teamAbbrOrId, projectAbbrOrId, pageId, isTeamSettings, isProjectSettings, isPersonalSettings, isFavoritesPage, isRecentsPage, isAuditPage, isTrashPage, isTasksPage };
};

const navigateTo = (
  team: string | null,
  project: string | null,
  page: string | null,
  isSettings = false,
  isTeamSettings = false,
  isFavoritesPage = false,
  isRecentsPage = false,
  isAuditPage = false,
  isTrashPage = false,
  isTasksPage = false
) => {
  let url = "/";
  if (isFavoritesPage) {
    url = "/my/favorites";
  } else if (isRecentsPage) {
    url = "/my/recents";
  } else if (isTasksPage) {
    url = "/my/tasks";
  } else if (team) {
    if (team === "personal" || team.startsWith("personal_")) {
      if (isTrashPage) {
        url = "/personal/trash";
      } else if (isSettings || isTeamSettings) {
        url = "/personal/_settings";
      } else if (page) {
        url = `/personal/${page}${isAuditPage ? "/viewers" : ""}`;
      } else {
        url = "/personal";
      }
    } else if (isTrashPage) {
      if (project) {
        url = `/teams/${team}/p/${project}/trash`;
      } else {
        url = `/teams/${team}/trash`;
      }
    } else if (isTeamSettings) {
      url = `/teams/${team}/_settings`;
    } else if (project) {
      if (isSettings) {
        url = `/teams/${team}/p/${project}/_settings`;
      } else if (page) {
        url = `/teams/${team}/p/${project}/${page}${isAuditPage ? "/viewers" : ""}`;
      } else {
        url = `/teams/${team}/p/${project}`;
      }
    } else {
      if (page) {
        url = `/teams/${team}/${page}${isAuditPage ? "/viewers" : ""}`;
      } else {
        url = `/teams/${team}`;
      }
    }
  }
  window.history.pushState({}, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

interface AppProps {
  isMockMode?: boolean;
}

function App({ isMockMode = false }: AppProps) {
  // OIDC context (conditionally evaluated to avoid missing AuthProvider error in mock mode)
  const auth = isMockMode ? null : useAuth();

  // Determine auth state based on mode
  const isAuthenticated = isMockMode ? true : !!(auth?.isAuthenticated && !auth?.user?.expired);
  const displayName = isMockMode ? "Developer Admin" : auth?.user?.profile.name || auth?.user?.profile.preferred_username || "User";
  const username = isMockMode ? "dev_admin" : auth?.user?.profile.preferred_username || auth?.user?.profile.username || "user";
  const userToken = isMockMode ? "mock-jwt-token" : auth?.user?.id_token || null;

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const projects = allProjects.filter(p => p.teamId === selectedTeamId);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newlyCreatedDocId, setNewlyCreatedDocId] = useState<string | null>(null);

  // Resizable sidebar states
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Responsive / collapsible sidebar states
  const isMobile = useMediaQuery("(max-width:768px)");
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Sync sidebar open state with breakpoint changes
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const startResizing = () => {
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (mouseMoveEvent: MouseEvent) => {
    const newWidth = mouseMoveEvent.clientX;
    if (newWidth >= 180 && newWidth <= 480) {
      setSidebarWidth(newWidth);
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing]);

  // Theme & preferences states
  const [workspaceTheme, setWorkspaceTheme] = useState<WorkspaceTheme | null>(null);
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [welcomeTitle, setWelcomeTitle] = useState("Welcome to Arkollab");
  const [welcomeText, setWelcomeText] = useState("A premium block-based document workspace. Connect with Logto Single-Sign-On (SSO) to synchronize your team workspaces.");
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  
  // Developer Mode state
  const [developerMode, setDeveloperMode] = useState<boolean>(() => {
    return localStorage.getItem("developer_mode") === "true";
  });

  const handleToggleDeveloperMode = (enabled: boolean) => {
    setDeveloperMode(enabled);
    localStorage.setItem("developer_mode", String(enabled));
  };

  const [recentSpaces, setRecentSpaces] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("recent_spaces");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Toast notifications state
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  const showToast = (message: string, severity: "success" | "error" | "info" | "warning" = "info") => {
    setToast({ open: true, message, severity });
  };

  const handleCloseToast = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  // Automatically clean up OIDC session if token expires
  useEffect(() => {
    if (!isMockMode && auth?.isAuthenticated && auth?.user?.expired) {
      auth.removeUser();
    }
  }, [auth?.isAuthenticated, auth?.user?.expired, isMockMode]);

  // Bind the global unauthorized callback
  useEffect(() => {
    if (!isMockMode && auth) {
      setOnUnauthorized(() => {
        showToast("Your session has expired. Redirecting to login...", "error");
        setTimeout(() => {
          auth.removeUser();
        }, 1500);
      });
    }
    return () => {
      setOnUnauthorized(() => {});
    };
  }, [auth, isMockMode]);

  // Fetch installation OIDC & brand configuration (theme settings) on mount
  useEffect(() => {
    fetchOIDCConfig()
      .then((cfg) => {
        if (cfg.theme) {
          setWorkspaceTheme(cfg.theme);
        }
        if (cfg.welcomeTitle) {
          setWelcomeTitle(cfg.welcomeTitle);
        }
        if (cfg.welcomeText) {
          setWelcomeText(cfg.welcomeText);
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

  // Fetch system settings when settings panel is opened
  useEffect(() => {
    if (settingsOpen && isAuthenticated) {
      fetchSystemSettings()
        .then((settings) => {
          setSystemSettings(settings);
        })
        .catch((err) => {
          console.error("Failed to fetch system settings:", err);
        });
    }
  }, [settingsOpen, isAuthenticated]);

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
        showToast("Failed to save workspace settings. Make sure you are authorized.", "error");
      });
  };

  const handleSaveSystemSettings = (settings: SystemSettings) => {
    return updateSystemSettings(settings)
      .then((updated) => {
        setSystemSettings(updated);
        showToast("System settings saved successfully", "success");
      })
      .catch((err) => {
        console.error("Failed to save system settings:", err);
        showToast("Failed to save system settings. Make sure you are authorized.", "error");
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

  // Routing state
  const [routeState, setRouteState] = useState(() => parseLocation(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => {
      setRouteState(parseLocation(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Close sidebar on mobile whenever routeState updates
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [routeState, isMobile]);

  // Fetch Teams on successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      fetchTeams()
        .then(data => {
          setTeams(data);
        })
        .catch(err => console.error("Error fetching teams:", err));
    }
  }, [isAuthenticated]);

  // Resolve active team based on routeState.teamAbbrOrId
  useEffect(() => {
    if (teams.length === 0) return;

    if (routeState.isFavoritesPage || routeState.isRecentsPage || routeState.isTasksPage) {
      if (!selectedTeamId) {
        const defaultTeam = teams[0];
        setSelectedTeamId(defaultTeam.id);
      }
      return;
    }

    const { teamAbbrOrId } = routeState;
    if (teamAbbrOrId) {
      let match = teams.find(t => t.abbreviation === teamAbbrOrId || t.id === teamAbbrOrId);
      if (!match && teamAbbrOrId === "personal") {
        match = teams.find(t => t.id.startsWith("personal_"));
      }

      if (match) {
        setSelectedTeamId(match.id);
      } else {
        const defaultTeam = teams[0];
        navigateTo(defaultTeam.abbreviation || defaultTeam.id, null, null);
      }
    } else {
      const defaultTeam = teams[0];
      navigateTo(defaultTeam.abbreviation || defaultTeam.id, null, null);
    }
  }, [teams, routeState.teamAbbrOrId, routeState.isFavoritesPage, routeState.isRecentsPage]);

  // Fetch all projects on successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects()
        .then(data => {
          setAllProjects(data);
        })
        .catch(err => console.error("Error fetching all projects:", err));
    } else {
      setAllProjects([]);
    }
  }, [isAuthenticated]);

  // Resolve active project based on routeState.projectAbbrOrId
  useEffect(() => {
    if (routeState.isFavoritesPage || routeState.isRecentsPage || routeState.isTasksPage) return;

    if (!selectedTeamId) {
      setSelectedProjectId(null);
      return;
    }
    if (projects.length === 0) return;

    const { projectAbbrOrId } = routeState;
    if (projectAbbrOrId) {
      const match = projects.find(p => p.abbreviation === projectAbbrOrId || p.id === projectAbbrOrId);
      if (match) {
        setSelectedProjectId(match.id);
      } else {
        const activeTeam = teams.find(t => t.id === selectedTeamId);
        if (activeTeam) {
          navigateTo(activeTeam.abbreviation || activeTeam.id, null, null);
        }
      }
    } else {
      setSelectedProjectId(null);
    }
  }, [projects, selectedTeamId, routeState.projectAbbrOrId, routeState.isFavoritesPage, routeState.isRecentsPage]);

  // Track recently accessed spaces
  useEffect(() => {
    if (!selectedTeamId) return;

    let spaceToAdd: any = null;

    if (selectedTeamId.startsWith("personal_")) {
      spaceToAdd = {
        id: selectedTeamId,
        type: "personal",
        name: "Personal Space"
      };
    } else if (selectedProjectId) {
      const project = allProjects.find(p => p.id === selectedProjectId);
      const team = teams.find(t => t.id === selectedTeamId);
      if (project && team) {
        spaceToAdd = {
          id: project.id,
          type: "project",
          name: project.name,
          abbreviation: project.abbreviation,
          teamId: team.id,
          teamAbbreviation: team.abbreviation
        };
      }
    } else {
      const team = teams.find(t => t.id === selectedTeamId);
      if (team) {
        spaceToAdd = {
          id: team.id,
          type: "team",
          name: team.name,
          abbreviation: team.abbreviation
        };
      }
    }

    if (spaceToAdd) {
      setRecentSpaces(prev => {
        const filtered = prev.filter(s => s.id !== spaceToAdd.id);
        const updated = [spaceToAdd, ...filtered].slice(0, 5);
        localStorage.setItem("recent_spaces", JSON.stringify(updated));
        return updated;
      });
    }
  }, [selectedTeamId, selectedProjectId, teams, allProjects]);

  // Reusable document loader
  const refreshDocuments = () => {
    if (isAuthenticated && (selectedProjectId || selectedTeamId)) {
      fetchDocuments(selectedProjectId, selectedTeamId)
        .then(flatDocs => {
          const filteredDocs = flatDocs.filter((d: any) => d.id !== selectedTeamId && d.id !== selectedProjectId);
          const tree = buildDocumentTree(filteredDocs);
          setDocuments(tree);
        })
        .catch(err => console.error("Error fetching documents:", err));
    } else {
      setDocuments([]);
    }
  };

  // Fetch Document Tree when Project or Team changes
  useEffect(() => {
    refreshDocuments();
  }, [isAuthenticated, selectedTeamId, selectedProjectId]);

  // Listen for WebSocket/global document tree update events
  useEffect(() => {
    const handleTreeUpdate = () => {
      refreshDocuments();
    };
    window.addEventListener("document-tree-updated", handleTreeUpdate);
    return () => window.removeEventListener("document-tree-updated", handleTreeUpdate);
  }, [isAuthenticated, selectedTeamId, selectedProjectId]);

  const handleMoveDoc = async (id: string, parentId: string | null) => {
    try {
      await moveDocument(id, parentId);
      refreshDocuments();
      setToast({
        open: true,
        message: "Page moved successfully",
        severity: "success",
      });
    } catch (err: any) {
      console.error("Failed to move document:", err);
      // Clean up backend HTTP error messages if they are JSON or simple strings
      let errorMsg = "Failed to move page";
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === "string") {
        errorMsg = err;
      }
      setToast({
        open: true,
        message: errorMsg,
        severity: "error",
      });
    }
  };

  // Resolve active document based on routeState.pageId and selected project/team
  useEffect(() => {
    if (routeState.isFavoritesPage || routeState.isRecentsPage || routeState.isTasksPage) {
      setActiveDocId(null);
      return;
    }

    const { pageId, isProjectSettings, isTeamSettings, isTrashPage } = routeState;
    if (isProjectSettings || isTeamSettings || isTrashPage) {
      setActiveDocId(null);
      return;
    }

    if (pageId) {
      setActiveDocId(pageId);
    } else if (selectedProjectId) {
      setActiveDocId(selectedProjectId);
    } else if (selectedTeamId) {
      setActiveDocId(selectedTeamId);
    } else {
      setActiveDocId(null);
    }
  }, [selectedTeamId, selectedProjectId, routeState.pageId, routeState.isProjectSettings, routeState.isTeamSettings, routeState.isFavoritesPage, routeState.isRecentsPage, routeState.isTrashPage]);

  // Fetch active document details when activeDocId changes
  useEffect(() => {
    if (isAuthenticated && activeDocId) {
      const cached = findDocById(documents, activeDocId);
      if (cached && cached.content) {
        setActiveDoc(cached);
      } else {
        fetchDocument(activeDocId)
          .then(doc => {
            setActiveDoc({
              id: doc.id,
              title: doc.title,
              content: doc.content || "",
              isFolder: false,
              children: [],
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt,
              createdBy: doc.createdBy,
              updatedBy: doc.updatedBy,
              deletedAt: doc.deletedAt
            });
          })
          .catch(err => {
            console.error("Error fetching active document:", err);
            setActiveDoc(null);
          });
      }
    } else {
      setActiveDoc(null);
    }
  }, [isAuthenticated, activeDocId, documents]);

  // Reset newlyCreatedDocId after navigating away from it
  useEffect(() => {
    if (newlyCreatedDocId && activeDocId !== newlyCreatedDocId) {
      setNewlyCreatedDocId(null);
    }
  }, [activeDocId, newlyCreatedDocId]);

  const activeTeam = teams.find(t => t.id === selectedTeamId);
  const activeProject = projects.find(p => p.id === selectedProjectId);

  const handleSelectTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      navigateTo(team.abbreviation || team.id, null, null);
    }
  };

  const handleSelectProject = (projId: string | null) => {
    if (projId === null) {
      if (activeTeam) {
        navigateTo(activeTeam.abbreviation || activeTeam.id, null, null);
      }
      return;
    }
    const proj = allProjects.find(p => p.id === projId);
    if (proj) {
      const team = teams.find(t => t.id === proj.teamId);
      if (team) {
        navigateTo(team.abbreviation || team.id, proj.abbreviation || proj.id, null);
      }
    }
  };

  const handleCreateTeam = async (name: string, abbreviation: string, description: string) => {
    try {
      const newTeam = await createTeam(name, abbreviation, description);
      setTeams(prev => [...prev, newTeam]);
      showToast("Team space created successfully.", "success");
      navigateTo(newTeam.abbreviation || newTeam.id, null, null);
    } catch (err: any) {
      console.error("Failed to create team:", err);
      showToast("Failed to create team space: " + err.message, "error");
      throw err;
    }
  };

  const handleCreateProject = async (teamId: string, name: string, abbreviation: string, description: string) => {
    try {
      const newProject = await createProject(teamId, name, abbreviation, description, "");
      setAllProjects(prev => [...prev, newProject]);
      showToast("Project space created successfully.", "success");
      const parentTeam = teams.find(t => t.id === teamId);
      if (parentTeam) {
        navigateTo(parentTeam.abbreviation || parentTeam.id, newProject.abbreviation || newProject.id, null);
      }
    } catch (err: any) {
      console.error("Failed to create project:", err);
      showToast("Failed to create project space: " + err.message, "error");
      throw err;
    }
  };

  const handleNavigateFromFavorites = (documentId: string, teamId: string, projectId: string | null) => {
    const team = teams.find(t => t.id === teamId || t.abbreviation === teamId);
    const teamArg = team ? (team.abbreviation || team.id) : teamId;
    
    let projectArg: string | null = null;
    if (projectId) {
      const proj = allProjects.find(p => p.id === projectId || p.abbreviation === projectId);
      projectArg = proj ? (proj.abbreviation || proj.id) : projectId;
    }

    navigateTo(teamArg, projectArg, documentId);
  };

  const handleSelectDoc = (id: string, projectId?: string | null) => {
    if (activeTeam) {
      const resolvedProjectId = projectId !== undefined ? projectId : selectedProjectId;
      navigateTo(
        activeTeam.abbreviation || activeTeam.id,
        resolvedProjectId,
        id
      );
    }
  };

  const handleAddDoc = (parentId?: string) => {
    if (!activeTeam) return;
    const title = "New Page";

    createDocument(title, selectedProjectId, activeTeam.id, parentId)
      .then(newDoc => {
        const mappedDoc: DocumentItem = {
          id: newDoc.id,
          title: newDoc.title,
          isFolder: false,
          content: newDoc.content,
          children: [],
          createdAt: newDoc.createdAt,
          updatedAt: newDoc.updatedAt,
          createdBy: newDoc.createdBy,
          updatedBy: newDoc.updatedBy
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

        // Navigate to the newly created document
        setNewlyCreatedDocId(newDoc.id);
        navigateTo(
          activeTeam.abbreviation || activeTeam.id,
          activeProject ? (activeProject.abbreviation || activeProject.id) : null,
          newDoc.id
        );
        showToast("Page created successfully.", "success");
      })
      .catch(err => {
        console.error("Error creating document:", err);
        showToast("Failed to create page: " + err.message, "error");
      });
  };

  const handleDeleteDoc = (id: string) => {
    // Find the document to check for a parent page
    const docToDelete = findDocById(documents, id);
    const parentId = docToDelete ? docToDelete.parentId : null;

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

        if (activeDocId === id && activeTeam) {
          const projectArg = activeProject ? (activeProject.abbreviation || activeProject.id) : null;
          if (parentId) {
            navigateTo(
              activeTeam.abbreviation || activeTeam.id,
              projectArg,
              parentId
            );
          } else {
            // Navigate to project/team root, which will automatically redirect to first remaining page
            navigateTo(
              activeTeam.abbreviation || activeTeam.id,
              projectArg,
              null
            );
          }
        }
        showToast("Page moved to Trash.", "success");
      })
      .catch(err => {
        console.error("Error deleting document:", err);
        showToast("Failed to delete page: " + err.message, "error");
      });
  };

  const handleRestoreDoc = async (id: string) => {
    return restoreDocument(id)
      .then(async (restored) => {
        showToast("Page restored successfully.", "success");
        // Reload documents list to refresh tree structure
        if (selectedTeamId) {
          const docs = await fetchDocuments(selectedProjectId, selectedTeamId);
          setDocuments(buildDocumentTree(docs));
        }
        // Force refresh active document so we get updated deletedAt
        if (activeDocId === id) {
          setActiveDoc({
            id: restored.id,
            title: restored.title,
            content: restored.content || "",
            isFolder: false,
            children: [],
            createdAt: restored.createdAt,
            updatedAt: restored.updatedAt,
            createdBy: restored.createdBy,
            updatedBy: restored.updatedBy,
            deletedAt: restored.deletedAt
          });
        }
      })
      .catch(err => {
        console.error("Error restoring document:", err);
        showToast("Failed to restore page: " + err.message, "error");
        throw err;
      });
  };

  const handleDeleteDocPermanently = async (id: string) => {
    return deleteDocument(id, true)
      .then(() => {
        showToast("Page permanently deleted.", "success");
        // If the active doc was this one, navigate away
        if (activeDocId === id && activeTeam && activeProject) {
          navigateTo(
            activeTeam.abbreviation || activeTeam.id,
            activeProject.abbreviation || activeProject.id,
            null
          );
        }
      })
      .catch(err => {
        console.error("Error permanently deleting document:", err);
        showToast("Failed to permanently delete page: " + err.message, "error");
        throw err;
      });
  };

  const handleSaveDoc = (title: string, content: string, changeSummary?: string) => {
    if (!activeDocId) return;
    setIsSaving(true);

    updateDocument(activeDocId, title, content, changeSummary)
      .then(updated => {
        setActiveDoc(prev => prev && prev.id === activeDocId ? {
          ...prev,
          title: updated.title,
          content: updated.content || "",
          updatedAt: updated.updatedAt,
          updatedBy: updated.updatedBy
        } : prev);
        setDocuments(prev => {
          const updateRecursively = (items: DocumentItem[]): DocumentItem[] => {
            return items.map(item => {
              if (item.id === activeDocId) {
                return {
                  ...item,
                  title: updated.title,
                  content: updated.content,
                  updatedAt: updated.updatedAt,
                  updatedBy: updated.updatedBy
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
      .catch(err => {
        console.error("Error updating document:", err);
        showToast("Failed to save changes: " + err.message, "error");
      })
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

  const renderMainContent = () => {
    if (routeState.isFavoritesPage) {
      return (
        <FavoritesView
          onNavigate={handleNavigateFromFavorites}
          onUnfavoriteActive={(docId) => {
            window.dispatchEvent(new CustomEvent("unfavorite-active-doc", { detail: { id: docId } }));
          }}
        />
      );
    }

    if (routeState.isRecentsPage) {
      return (
        <RecentPagesView
          onNavigate={handleNavigateFromFavorites}
          teams={teams}
          projects={allProjects}
        />
      );
    }

    if (routeState.isTasksPage) {
      return (
        <TasksView
          username={username}
          onNavigate={handleNavigateFromFavorites}
        />
      );
    }



    if (routeState.isTrashPage) {
      return (
        <TrashView
          teamId={selectedTeamId}
          projectId={selectedProjectId}
          onRestore={handleRestoreDoc}
          onDeletePermanently={handleDeleteDocPermanently}
          navigateTo={navigateTo}
        />
      );
    }

    if (routeState.isTeamSettings && activeTeam) {
      return (
        <TeamSettingsView
          team={activeTeam}
          onUpdateTeam={(updated) => {
            setTeams(prev => prev.map(t => t.id === updated.id ? updated : t));
          }}
          onBack={() => navigateTo(activeTeam.abbreviation || activeTeam.id, null, null)}
          showToast={showToast}
        />
      );
    }

    if (routeState.isProjectSettings && activeProject && activeTeam) {
      return (
        <ProjectSettingsView
          project={activeProject}
          teamAbbreviationOrId={activeTeam.abbreviation || activeTeam.id}
          onUpdateProject={(updated) => {
            setAllProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
          }}
          onBack={() => navigateTo(activeTeam.abbreviation || activeTeam.id, activeProject.abbreviation || activeProject.id, null)}
          showToast={showToast}
        />
      );
    }

    if (routeState.isPersonalSettings && activeTeam) {
      return (
        <PersonalSettingsView
          displayName={displayName}
          username={username}
          themeMode={themeMode}
          onUpdateThemeMode={(mode) => {
            setThemeMode(mode);
            if (isAuthenticated) {
              updateUserPreferences(mode).catch((err) => console.error("Error updating user preferences:", err));
            }
          }}
          onBack={() => navigateTo(activeTeam.abbreviation || activeTeam.id, null, null)}
          personalPagesCount={documents.length}
        />
      );
    }

    if (routeState.isAuditPage && activeDoc) {
      return (
        <PageAuditView
          docId={activeDoc.id}
          docTitle={activeDoc.title}
          selectedTeamName={activeTeam?.name}
          selectedProjectName={activeProject?.name}
          onBack={() => {
            if (activeTeam) {
              navigateTo(
                activeTeam.abbreviation || activeTeam.id,
                activeProject ? (activeProject.abbreviation || activeProject.id) : null,
                activeDoc.id
              );
            }
          }}
        />
      );
    }

    if (activeDocId && (!activeDoc || activeDoc.id !== activeDocId)) {
      return (
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress size={32} />
        </Box>
      );
    }

    if (activeDoc && activeDoc.id === activeDocId) {
      return (
        <EditorCanvas
          key={activeDocId} // Remount editor on switching documents
          activeDocId={activeDocId}
          authToken={userToken}
          initialTitle={activeDoc.title}
          initialContent={activeDoc.content || ""}
          initialEditMode={newlyCreatedDocId === activeDocId && !activeDoc.deletedAt}
          developerMode={developerMode}
          onSave={handleSaveDoc}
          isSaving={isSaving}
          documents={documents}
          selectedTeamName={activeTeam?.name}
          selectedProjectName={activeProject?.name}
          onDeleteDoc={handleDeleteDoc}
          onMoveDoc={handleMoveDoc}
          createdAt={activeDoc.createdAt}
          updatedAt={activeDoc.updatedAt}
          createdBy={activeDoc.createdBy}
          updatedBy={activeDoc.updatedBy}
          deletedAt={activeDoc.deletedAt}
          onRestore={() => handleRestoreDoc(activeDoc.id)}
          onDeletePermanently={() => handleDeleteDocPermanently(activeDoc.id)}
          onSelectDoc={handleSelectDoc}
          isAuditPage={routeState.isAuditPage}
          onNavigateToAudit={() => {
            if (activeTeam) {
              navigateTo(
                activeTeam.abbreviation || activeTeam.id,
                activeProject ? (activeProject.abbreviation || activeProject.id) : null,
                activeDoc.id,
                false,
                false,
                false,
                false,
                true
              );
            }
          }}
          onNavigateToNormal={() => {
            if (activeTeam) {
              navigateTo(
                activeTeam.abbreviation || activeTeam.id,
                activeProject ? (activeProject.abbreviation || activeProject.id) : null,
                activeDoc.id
              );
            }
          }}
        />
      );
    }

    if (!routeState.projectAbbrOrId && activeTeam) {
      return (
        <TeamPortal
          team={activeTeam}
          projects={projects}
          onSelectProject={handleSelectProject}
          navigateTo={navigateTo}
        />
      );
    }

    // Fallback
    return (
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
    );
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
              {welcomeTitle}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", display: "block", mb: 4, lineHeight: 1.6, px: 2 }}>
              {welcomeText}
            </Typography>

            {auth?.error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: "8px", textAlign: "left", fontSize: "12px", fontFamily: '"Outfit", sans-serif' }}>
                Authentication Error: {auth.error.message}
              </Alert>
            )}

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
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden", bgcolor: "background.default", fontFamily: "var(--font-sans)" }}>
        {/* Top Navbar */}
        <TopNavbar
          teams={teams}
          selectedTeamId={selectedTeamId}
          displayName={displayName}
          username={username}
          onLogout={handleLogout}
          themeMode={themeMode}
          onToggleThemeMode={handleToggleThemeMode}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenFavorites={() => navigateTo(null, null, null, false, false, true)}
          onOpenRecents={() => navigateTo(null, null, null, false, false, false, true)}
          onOpenTasks={() => navigateTo(null, null, null, false, false, false, false, false, false, true)}
          developerMode={developerMode}
          onToggleDeveloperMode={handleToggleDeveloperMode}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          isMobile={isMobile}
        />

        {/* Bottom Area: Sidebar + Content */}
        <Box sx={{ display: "flex", flex: 1, height: "calc(100vh - 48px)", overflow: "hidden", position: "relative" }}>
          {/* Sidebar Navigation */}
          {sidebarOpen && (
            <Sidebar
              documents={documents}
              activeDocId={activeDocId}
              onSelectDoc={handleSelectDoc}
              onAddDoc={handleAddDoc}
              onDeleteDoc={handleDeleteDoc}
              onMoveDoc={handleMoveDoc}
              teams={teams}
              projects={allProjects}
              selectedTeamId={selectedTeamId}
              selectedProjectId={selectedProjectId}
              navigateTo={navigateTo}
              width={sidebarWidth}
              recentSpaces={recentSpaces}
              onOpenCreateSpace={() => setCreateSpaceOpen(true)}
              onRestoreDoc={handleRestoreDoc}
              onDeleteDocPermanently={handleDeleteDocPermanently}
              isMobile={isMobile}
              onCloseSidebar={() => setSidebarOpen(false)}
            />
          )}

          {/* Resizable Drag Handle */}
          {!isMobile && sidebarOpen && (
            <Box
              onMouseDown={startResizing}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              sx={{
                width: "4px",
                cursor: "col-resize",
                position: "relative",
                zIndex: 20,
                backgroundColor: isResizing || isHovered ? "var(--primary-color)" : "transparent",
                transition: "background-color 0.15s ease",
                "&:hover": {
                  backgroundColor: "var(--primary-color)",
                },
                // Hit area expander
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: "-4px",
                  right: "-4px",
                },
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Grip Icon */}
              <Box
                sx={{
                  width: "16px",
                  height: "32px",
                  backgroundColor: isResizing || isHovered 
                    ? "var(--primary-color)" 
                    : (themeMode === "light" ? "#ffffff" : "rgba(22, 25, 36, 0.6)"),
                  border: "1px solid",
                  borderColor: isResizing || isHovered 
                    ? "var(--primary-color)" 
                    : (themeMode === "light" ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.08)"),
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isResizing || isHovered 
                    ? "#ffffff" 
                    : (themeMode === "light" ? "rgba(0, 0, 0, 0.45)" : "text.secondary"),
                  cursor: "col-resize",
                  pointerEvents: "none",
                  transition: "all 0.15s ease",
                  boxShadow: themeMode === "light" 
                    ? "0 1px 4px rgba(0, 0, 0, 0.08)" 
                    : "0 1px 4px rgba(0, 0, 0, 0.25)",
                }}
              >
                {isResizing || isHovered ? (
                  <ChevronsLeftRight size={10} />
                ) : (
                  <GripVertical size={10} />
                )}
              </Box>
            </Box>
          )}

          {/* Main Canvas Workspace */}
          <Box component="main" sx={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {renderMainContent()}
          </Box>
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
        systemSettings={systemSettings}
        onSaveSettings={handleSaveSystemSettings}
      />
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        projectId={selectedProjectId}
        onSelectDoc={handleSelectDoc}
      />
      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
      <CreateSpaceDialog
        open={createSpaceOpen}
        onClose={() => setCreateSpaceOpen(false)}
        teams={teams}
        activeTeamId={selectedTeamId}
        onCreateTeam={handleCreateTeam}
        onCreateProject={handleCreateProject}
      />
      {/* FavoritesDialog removed in favor of full-page FavoritesView route */}
      <Snackbar 
        open={toast.open} 
        autoHideDuration={4000} 
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert 
          onClose={handleCloseToast} 
          severity={toast.severity} 
          variant="filled" 
          sx={{ width: "100%", borderRadius: "8px", fontFamily: '"Outfit", sans-serif', fontSize: "12px" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
