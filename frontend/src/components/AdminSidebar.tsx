import { Box, Button, Divider, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { ArrowLeft, ArchiveRestore, BadgeCheck, BookOpen, DatabaseBackup, FileArchive, FileText, Image, LogIn, Paintbrush, Plug, Settings2, ShieldCheck, Users, X } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

interface AdminSidebarProps {
  authMode: "oidc" | "local";
  onClose?: () => void;
}
interface AdminNavItem {
  label: string;
  description: string;
  href: string;
  icon: typeof Settings2;
}
const settingsItems: AdminNavItem[] = [
  { label: "General", description: "Workspace defaults", href: "/_admin/settings", icon: Settings2 },
  { label: "Appearance", description: "Theme and branding", href: "/_admin/settings/appearance", icon: Paintbrush },
  { label: "Authentication", description: "Sign-in screen", href: "/_admin/settings/authentication", icon: LogIn },
  { label: "Audit & retention", description: "Data lifecycle", href: "/_admin/settings/retention", icon: ArchiveRestore },
  { label: "Document previews", description: "Document conversion", href: "/_admin/settings/previews", icon: FileArchive },
  { label: "Backup & sync", description: "Export and restore", href: "/_admin/settings/backups", icon: DatabaseBackup },
  { label: "Integrations", description: "Connected services", href: "/_admin/settings/integrations", icon: Plug },
];
const resourceItems: AdminNavItem[] = [
  { label: "System images", description: "Shared image library", href: "/_admin/_images", icon: Image },
  { label: "System templates", description: "Reusable pages and blocks", href: "/_admin/_templates", icon: FileText },
  { label: "Cloud backups (preview)", description: "Azure prototype", href: "/_admin/backups", icon: BadgeCheck },
  { label: "Admin guide", description: "Configuration and recovery", href: "/_admin/help", icon: BookOpen },
];

export const AdminSidebar = ({ authMode, onClose }: AdminSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const items = authMode === "local"
    ? [...settingsItems.slice(0, 3), { label: "Users", description: "Local accounts", href: "/_admin/users", icon: Users }, ...settingsItems.slice(3)]
    : settingsItems;
  const isSelected = (href: string) => location.pathname === href ||
    (href === "/_admin/_templates" && location.pathname.startsWith("/_admin/template/"));

  return (
    <Box component="nav" aria-label="Server settings navigation" sx={{
      width: "100%", height: "100%", flexShrink: 0, overflowY: "auto", overscrollBehavior: "contain",
      bgcolor: "var(--panel-color)", color: "var(--text-primary)",
      borderRight: "var(--border-width) var(--border-style) var(--border-color)", px: 1.5, py: 2,
    }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Button startIcon={<ArrowLeft size={16} />} onClick={() => { navigate("/my/recents"); onClose?.(); }}
          sx={{ color: "var(--text-secondary)", textTransform: "none", justifyContent: "flex-start", px: 1, minHeight: 44 }}>
          Back to workspace
        </Button>
        {onClose && <IconButton aria-label="Close admin navigation" onClick={onClose} sx={{ color: "var(--text-secondary)", minWidth: 44, minHeight: 44 }}><X size={20} /></IconButton>}
      </Box>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", px: 1, mb: 2.5 }}>
        <Box sx={{ display: "grid", placeItems: "center", p: 0.75, borderRadius: "var(--border-radius-button)", bgcolor: "color-mix(in srgb, var(--primary-color) 12%, transparent)", color: "var(--primary-color)" }}><ShieldCheck size={18} /></Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "15px" }}>Server settings</Typography>
          <Typography variant="caption" sx={{ color: "var(--text-secondary)" }}>Administration</Typography>
        </Box>
      </Box>
      {[{ label: "Configuration", items }, { label: "Resources", items: resourceItems }].map((group, index) => <Box key={group.label}>
        {index > 0 && <Divider sx={{ my: 2, borderColor: "var(--border-color)" }} />}
        <Typography variant="overline" sx={{ px: 1, color: "var(--text-secondary)", fontWeight: 700, fontSize: "11px", letterSpacing: "0.08em" }}>{group.label}</Typography>
        <List disablePadding sx={{ mt: 0.75 }}>
          {group.items.map((item) => {
            const Icon = item.icon;
            return <ListItemButton key={item.href} component={NavLink} to={item.href} end selected={isSelected(item.href)} onClick={() => onClose?.()}
              sx={{ minHeight: 48, borderRadius: "var(--border-radius-button)", mb: 0.5, px: 1, py: 0.8,
                "&.Mui-selected": { bgcolor: "color-mix(in srgb, var(--primary-color) 14%, transparent)", color: "var(--primary-color)" },
                "&.Mui-selected:hover": { bgcolor: "color-mix(in srgb, var(--primary-color) 18%, transparent)" },
                "&:hover": { bgcolor: "var(--glass-bg)" },
              }}>
              <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}><Icon size={18} /></ListItemIcon>
              <ListItemText primary={item.label} secondary={item.description} slotProps={{ primary: { sx: { fontSize: "13px", fontWeight: 700 } }, secondary: { sx: { fontSize: "11px", color: "var(--text-secondary)" } } }} />
            </ListItemButton>;
          })}
        </List>
      </Box>)}
    </Box>
  );
};
