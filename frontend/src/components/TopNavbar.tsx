import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip, 
  Avatar, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  Checkbox,
  InputBase
} from "@mui/material";
import { 
  Search, 
  HelpCircle, 
  Sun, 
  Moon, 
  LogOut, 
  ChevronDown, 
  Settings,
  Star,
  Clock,
  ListTodo,
  Menu as MenuIcon,
  AtSign,
  BookOpen
} from "lucide-react";
import type { Team } from "../services/api";
import { UserAvatar } from "./UserAvatar";
import { useNavigate } from "react-router-dom";

interface TopNavbarProps {
  teams: Team[];
  selectedTeamId: string | null;
  displayName: string;
  username: string;
  onLogout: () => void;
  themeMode: "light" | "dark";
  onToggleThemeMode: () => void;
  onOpenHelp: () => void;
  onOpenSettings?: () => void;
  onOpenAdminHelp?: () => void;
  onOpenFavorites?: () => void;
  onOpenRecents?: () => void;
  onOpenTasks?: () => void;
  onOpenMentions?: () => void;
  onOpenNotifications?: () => void;
  activeUsers?: any[];
  developerMode?: boolean;
  onToggleDeveloperMode?: (enabled: boolean) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  isMobile?: boolean;
  isAdminRoute?: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  teams,
  selectedTeamId,
  displayName,
  username,
  onLogout,
  themeMode,
  onToggleThemeMode,
  onOpenHelp,
  onOpenSettings,
  onOpenAdminHelp,
  onOpenFavorites,
  onOpenRecents,
  onOpenTasks,
  onOpenMentions,
  onOpenNotifications,
  activeUsers = [],
  developerMode = false,
  onToggleDeveloperMode,
  onToggleSidebar,
  sidebarOpen,
  isMobile = false,
  isAdminRoute = false,
}) => {
  const navigate = useNavigate();
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (isMobile) navigate('/search');
        else document.getElementById('global-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, navigate]);

  const activeTeam = teams.find(t => t.id === selectedTeamId);

  const handleOpenProfileMenu = (e: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(e.currentTarget);
  };

  const handleCloseProfileMenu = () => {
    setProfileMenuAnchor(null);
  };

  return (
    <Box sx={{
      minHeight: isMobile ? 56 : 48,
      flexShrink: 0,
      width: "100%",
      borderBottom: "1px solid var(--border-color)",
      backgroundColor: "var(--panel-color)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      px: { xs: 1, sm: 2 },
      zIndex: 100,
      backdropFilter: "blur(20px)",
      "& .MuiIconButton-root": { minWidth: isMobile ? 44 : 32, minHeight: isMobile ? 44 : 32 },
    }}>
      {/* Left section: Logo & Navigation */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {/* Toggle Sidebar Button */}
        <IconButton 
          onClick={onToggleSidebar}
          aria-label={`${sidebarOpen ? "Close" : "Open"} ${isAdminRoute ? "admin" : "workspace"} navigation`}
          aria-expanded={sidebarOpen}
          aria-controls="workspace-navigation"
          size="small"
          sx={{ 
            color: "var(--text-secondary)",
            "&:hover": { color: "var(--text-primary)" },
            p: 0.5,
            borderRadius: "6px"
          }}
        >
          <MenuIcon size={18} />
        </IconButton>

        {/* Brand Logo */}
        <Box 
          component="button"
          type="button"
          aria-label={isAdminRoute ? "Server settings" : "Workspace home"}
          onClick={() => {
            navigate(isAdminRoute ? '/_admin/settings' : activeTeam ? `/teams/${activeTeam.abbreviation || activeTeam.id}` : '/my/recents');
          }}
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 1, 
            cursor: "pointer",
            border: 0, background: "transparent", p: 0, minHeight: 44,
            "&:hover": { opacity: 0.95 }
          }}
        >
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center" 
          }}>
            <img src="/kollab.svg" alt="Kollab Logo" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          </Box>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 800, 
              fontFamily: '"Outfit", sans-serif', 
              letterSpacing: "-0.02em", 
              color: "var(--text-primary)",
              display: { xs: isAdminRoute ? "block" : "none", sm: "block" }
            }}
          >
            {isAdminRoute ? "Admin" : "Kollab"}
          </Typography>
        </Box>
      </Box>

      {/* Middle section: Global Search Box */}
      <Box sx={{ flex: 1, minWidth: 0, maxWidth: 320, mx: 4, display: isMobile ? "none" : "block" }}>
        <Box 
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 1, 
            px: 1.5, 
            py: 0.5, 
            borderRadius: 1.5, 
            backgroundColor: "var(--bg-color)", 
            border: "1px solid var(--border-color)",
            color: "text.secondary",
            "&:focus-within": {
              borderColor: "var(--primary-color)",
              boxShadow: "0 0 0 2px color-mix(in srgb, var(--primary-color) 15%, transparent)",
            },
            transition: "all 0.15s ease",
          }}
        >
          <Search size={13} style={{ color: "var(--text-muted)" }} />
          <InputBase
            placeholder="Search pages…"
            inputProps={{
              id: "global-search-input",
              "aria-label": "global search",
              onKeyDown: (e) => {
                if (e.key === "Enter") {
                  const query = (e.target as HTMLInputElement).value;
                  if (query.trim()) {
                    // Navigate directly instead of firing onOpenSearch
                    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                  }
                }
              }
            }}
            sx={{
              flex: 1,
              color: "text.primary",
              fontSize: "13px",
              fontFamily: '"Outfit", sans-serif',
              "& .MuiInputBase-input::placeholder": {
                color: "text.disabled",
                opacity: 1,
              }
            }}
          />
          <Box component="kbd" sx={{ 
            fontSize: "9px", 
            px: 0.75, 
            py: 0.15, 
            backgroundColor: "var(--panel-color)", 
            border: "1px solid var(--border-color)",
            borderRadius: 0.5, 
            color: "text.disabled",
            fontFamily: "monospace"
          }}>
            ⌘P
          </Box>
        </Box>
      </Box>

      {/* Right section: Presence, Settings & Profile */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {/* Presence Users List */}
        {activeUsers.length > 0 && (
          <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: -0.5, mr: 1 }}>
            {activeUsers.slice(0, 3).map((user, idx) => (
              <Tooltip key={user.userId || idx} title={user.username || "Active User"}>
                <UserAvatar 
                  displayName={user.username || "Active User"}
                  sx={{ 
                    width: 22, 
                    height: 22, 
                    fontSize: "9px", 
                    fontWeight: 700, 
                    border: "2px solid var(--panel-color)",
                    bgcolor: user.color || "primary.main" 
                  }}
                />
              </Tooltip>
            ))}
            {activeUsers.length > 3 && (
              <Avatar sx={{ width: 22, height: 22, fontSize: "9px", fontWeight: 700, border: "2px solid var(--panel-color)", bgcolor: "grey.700" }}>
                +{activeUsers.length - 3}
              </Avatar>
            )}
          </Box>
        )}

        {/* Search Icon Button - Visible only on mobile */}
        <IconButton 
          size="small" 
          onClick={() => navigate('/search')}
          aria-label="Search pages"
          sx={{ 
            color: "text.secondary", 
            "&:hover": { color: "text.primary" },
            display: isMobile ? "inline-flex" : "none"
          }}
        >
          <Search size={16} />
        </IconButton>

        {/* Help Center Icon */}
        <Tooltip title="Help & User Guide" arrow>
          <IconButton 
            size="small" 
            onClick={onOpenHelp} 
            sx={{ 
              color: "text.secondary", 
              "&:hover": { color: "text.primary" },
              display: { xs: "none", sm: "inline-flex" } 
            }}
          >
            <HelpCircle size={16} />
          </IconButton>
        </Tooltip>

        {/* Light/Dark Toggle */}
        <Tooltip title={themeMode === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"} arrow>
          <IconButton 
            size="small" 
            onClick={onToggleThemeMode} 
            sx={{ 
              color: "text.secondary", 
              "&:hover": { color: "text.primary" },
              display: { xs: "none", sm: "inline-flex" } 
            }}
          >
            {themeMode === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </IconButton>
        </Tooltip>

        {/* User Profile Dropdown Menu */}
        <Box 
          component="button"
          type="button"
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={Boolean(profileMenuAnchor)}
          onClick={handleOpenProfileMenu}
          sx={{ 
            display: "flex", 
            border: 0, background: "transparent", minHeight: 44,
            alignItems: "center", 
            gap: 1, 
            cursor: "pointer",
            ml: 1,
            p: 0.25,
            pr: 1,
            borderRadius: "20px",
            "&:hover": { backgroundColor: "color-mix(in srgb, var(--text-primary) 4%, transparent)" }
          }}
        >
          <UserAvatar 
            displayName={displayName}
            sx={{ width: 24, height: 24, fontSize: "10px", fontWeight: 700, bgcolor: "primary.main" }}
          />
          <Typography sx={{ display: { xs: "none", sm: "block" }, fontSize: "11.5px", fontWeight: 600, color: "var(--text-primary)", fontFamily: '"Outfit", sans-serif', maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </Typography>
          <ChevronDown size={11} style={{ color: "var(--text-secondary)" }} />
        </Box>
        <Menu
          anchorEl={profileMenuAnchor}
          open={Boolean(profileMenuAnchor)}
          onClose={handleCloseProfileMenu}
          slotProps={{
            paper: {
              sx: {
                width: 240,
                maxWidth: "calc(100vw - 24px)",
                mt: 0.5,
                boxShadow: "var(--shadow-elevation)",
                "& .MuiMenuItem-root": { minHeight: 44 },
                border: "1px solid var(--border-color)",
                bgcolor: "var(--panel-color)",
              }
            }
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" sx={{ color: "text.disabled", display: "block", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" }}>
              User Profile
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", mt: 0.5, fontFamily: '"Outfit", sans-serif' }}>
              {displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "11px", fontFamily: '"Outfit", sans-serif' }}>
              @{username}
            </Typography>
          </Box>
          <Divider sx={{ my: 0.5 }} />
          
          {/* Mobile Theme/Help Center Links */}
          <Box sx={{ display: { xs: "block", sm: "none" } }}>
            <MenuItem 
              onClick={() => {
                handleCloseProfileMenu();
                onToggleThemeMode();
              }}
              sx={{ py: 1, fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                {themeMode === "light" ? <Moon size={14} /> : <Sun size={14} />}
              </ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>
                {themeMode === "light" ? "Dark Mode" : "Light Mode"}
              </Typography>} />
            </MenuItem>

            <MenuItem 
              onClick={() => {
                handleCloseProfileMenu();
                onOpenHelp();
              }}
              sx={{ py: 1, fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}><HelpCircle size={14} /></ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>Help & Guide</Typography>} />
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
          </Box>
          


          {onOpenFavorites && (
            <MenuItem 
              onClick={() => {
                handleCloseProfileMenu();
                onOpenFavorites();
              }}
              sx={{ py: 1, fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}><Star size={14} style={{ color: "#fbbf24" }} /></ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>Favorite Pages</Typography>} />
            </MenuItem>
          )}

          {onOpenRecents && (
            <MenuItem 
              onClick={() => {
                handleCloseProfileMenu();
                onOpenRecents();
              }}
              sx={{ py: 1, fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}><Clock size={14} style={{ color: "#3b82f6" }} /></ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>Recent Pages</Typography>} />
            </MenuItem>
          )}

          {onOpenTasks && (
            <MenuItem 
              onClick={() => {
                handleCloseProfileMenu();
                onOpenTasks();
              }}
              sx={{ py: 1, fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}><ListTodo size={14} style={{ color: "#10b981" }} /></ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>My Tasks</Typography>} />
            </MenuItem>
          )}

          {onOpenMentions && (
            <MenuItem 
              onClick={() => {
                handleCloseProfileMenu();
                onOpenMentions();
              }}
              sx={{ py: 1, fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}><AtSign size={14} style={{ color: "#8b5cf6" }} /></ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>My Mentions</Typography>} />
            </MenuItem>
          )}

          {onOpenNotifications && (
            <MenuItem onClick={() => { handleCloseProfileMenu(); onOpenNotifications(); }} sx={{ py: 1, fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>
              <ListItemIcon sx={{ minWidth: 28 }}><BookOpen size={14} style={{ color: "var(--primary-color)" }} /></ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>Notifications</Typography>} />
            </MenuItem>
          )}



          {onOpenSettings && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem 
                onClick={() => {
                  handleCloseProfileMenu();
                  onOpenSettings();
                }}
                sx={{ py: 1, fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}
              >
                <ListItemIcon sx={{ minWidth: 28 }}><Settings size={14} /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>Server Settings</Typography>} />
              </MenuItem>
              <MenuItem 
                onClick={() => {
                  handleCloseProfileMenu();
                  if (onOpenAdminHelp) onOpenAdminHelp();
                }}
                sx={{ py: 1, fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}
              >
                <ListItemIcon sx={{ minWidth: 28 }}><BookOpen size={14} /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>Server Admin Guide</Typography>} />
              </MenuItem>
            </>
          )}

          <MenuItem 
            onClick={(e) => {
              e.stopPropagation(); // Keep dropdown open during toggle click
              if (onToggleDeveloperMode) {
                onToggleDeveloperMode(!developerMode);
              }
            }}
            sx={{ py: 1, fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              <Checkbox 
                checked={developerMode}
                size="small"
                sx={{ 
                  p: 0, 
                  color: "text.secondary", 
                  "&.Mui-checked": { color: "var(--primary-color)" } 
                }}
              />
            </ListItemIcon>
            <ListItemText primary={<Typography sx={{ fontSize: "13px", fontFamily: '"Outfit", sans-serif' }}>Developer Mode</Typography>} />
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />
          <MenuItem 
            onClick={() => {
              handleCloseProfileMenu();
              onLogout();
            }}
            sx={{ py: 1, color: "error.main", fontSize: "13px", fontFamily: '"Outfit", sans-serif', "&:hover": { bgcolor: "rgba(239, 68, 68, 0.05)" } }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}><LogOut size={14} style={{ color: "inherit" }} /></ListItemIcon>
            <ListItemText primary={<Typography sx={{ fontSize: "13px", fontFamily: '"Outfit", sans-serif', color: "inherit" }}>Log Out</Typography>} />
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};
