import { Box, Button, Divider, List, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { ArrowLeft, ArchiveRestore, BadgeCheck, DatabaseBackup, FileArchive, LogIn, Paintbrush, Plug, Settings2, ShieldCheck, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface AdminSidebarProps {
  authMode: "oidc" | "local";
  onClose?: () => void;
}

interface AdminNavItem {
  label: string;
  description?: string;
  href: string;
  icon: typeof Settings2;
}

const settingsItems: AdminNavItem[] = [
  { label: "General", description: "Workspace defaults", href: "/_admin/settings", icon: Settings2 },
  { label: "Appearance", description: "Theme and branding", href: "/_admin/settings/appearance", icon: Paintbrush },
  { label: "Authentication", description: "Sign-in screen", href: "/_admin/settings/authentication", icon: LogIn },
  { label: "Audit & retention", description: "Data lifecycle", href: "/_admin/settings/retention", icon: ArchiveRestore },
  { label: "Document previews", description: "Aspose service", href: "/_admin/settings/previews", icon: FileArchive },
  { label: "Backup & sync", description: "Export and restore", href: "/_admin/settings/backups", icon: DatabaseBackup },
  { label: "Integrations", description: "Connected services", href: "/_admin/settings/integrations", icon: Plug },
];

export const AdminSidebar = ({ authMode, onClose }: AdminSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const items = authMode === "local"
    ? [...settingsItems.slice(0, 3), { label: "Users", description: "Local accounts", href: "/_admin/users", icon: Users }, ...settingsItems.slice(3)]
    : settingsItems;

  const isSelected = (href: string) => href === "/_admin/settings"
    ? location.pathname === href
    : location.pathname === href;

  const go = (href: string) => {
    navigate(href);
    onClose?.();
  };

  return (
    <Box
      component="aside"
      aria-label="Server settings navigation"
      sx={{
        width: 264,
        flexShrink: 0,
        overflowY: "auto",
        bgcolor: "var(--panel-color)",
        borderRight: "var(--border-width) var(--border-style) var(--border-color)",
        px: 1.5,
        py: 2,
      }}
    >
      <Button
        startIcon={<ArrowLeft size={16} />}
        onClick={() => go("/my/recents")}
        sx={{ color: "var(--text-secondary)", textTransform: "none", justifyContent: "flex-start", px: 1, mb: 2 }}
      >
        Back to workspace
      </Button>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", px: 1, mb: 2.5 }}>
        <Box sx={{ display: "grid", placeItems: "center", p: 0.75, borderRadius: "var(--border-radius-button)", bgcolor: "color-mix(in srgb, var(--primary-color) 12%, transparent)", color: "var(--primary-color)" }}>
          <ShieldCheck size={18} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "15px", color: "var(--text-primary)" }}>Server settings</Typography>
          <Typography variant="caption" sx={{ color: "var(--text-secondary)" }}>Administration</Typography>
        </Box>
      </Box>
      <Typography variant="overline" sx={{ px: 1, color: "var(--text-secondary)", fontWeight: 700, fontSize: "10px", letterSpacing: "0.08em" }}>
        Configuration
      </Typography>
      <List disablePadding sx={{ mt: 0.75 }}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.href}
              selected={isSelected(item.href)}
              onClick={() => go(item.href)}
              sx={{ borderRadius: "var(--border-radius-button)", mb: 0.5, px: 1, py: 0.8, "&.Mui-selected": { bgcolor: "color-mix(in srgb, var(--primary-color) 14%, transparent)", color: "var(--primary-color)" }, "&.Mui-selected:hover": { bgcolor: "color-mix(in srgb, var(--primary-color) 18%, transparent)" }, "&:hover": { bgcolor: "var(--glass-bg)" } }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}><Icon size={17} /></ListItemIcon>
              <ListItemText primary={item.label} secondary={item.description} slotProps={{ primary: { sx: { fontSize: "13px", fontWeight: 700 } }, secondary: { sx: { fontSize: "11px", color: "var(--text-secondary)" } } }} />
            </ListItemButton>
          );
        })}
      </List>
      <Divider sx={{ my: 2, borderColor: "var(--border-color)" }} />
      <List disablePadding>
        <ListItemButton selected={location.pathname === "/_admin/backups"} onClick={() => go("/_admin/backups")} sx={{ borderRadius: "var(--border-radius-button)", px: 1, "&.Mui-selected": { bgcolor: "color-mix(in srgb, var(--primary-color) 14%, transparent)", color: "var(--primary-color)" } }}>
          <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}><BadgeCheck size={17} /></ListItemIcon>
          <ListItemText primary="Cloud backups (preview)" secondary="Azure configuration" slotProps={{ primary: { sx: { fontSize: "13px", fontWeight: 700 } }, secondary: { sx: { fontSize: "11px", color: "var(--text-secondary)" } } }} />
        </ListItemButton>
      </List>
    </Box>
  );
};
