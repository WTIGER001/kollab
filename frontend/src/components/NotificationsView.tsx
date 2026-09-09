import React, { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { Bell } from "lucide-react";
import { fetchDocument, fetchNotifications, markNotificationRead } from "../services/api";
import type { DocumentNotification } from "../services/api";

interface NotificationsViewProps {
  onOpenDocument: (documentId: string, teamId: string, projectId: string | null) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onOpenDocument }) => {
  const [notifications, setNotifications] = useState<DocumentNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications().then(setNotifications).catch(() => setNotifications([])).finally(() => setLoading(false));
  }, []);

  const openNotification = async (notification: DocumentNotification) => {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
      } catch {
        // Opening the referenced page still works if the read-state request fails.
      }
    }
    const document = await fetchDocument(notification.documentId);
    onOpenDocument(document.id, document.teamId, document.projectId || null);
  };

  return <Box sx={{ flex: 1, overflow: "auto", p: { xs: 2, md: 4 }, backgroundColor: "var(--bg-color)" }}>
    <Box sx={{ maxWidth: 860, mx: "auto" }}>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 3 }}><Bell size={20} color="var(--primary-color)" /><Typography variant="h5" sx={{ color: "var(--text-primary)", fontWeight: 700 }}>Notifications</Typography></Box>
      {loading ? <CircularProgress /> : notifications.length === 0 ? <Paper variant="outlined" sx={{ p: 3, backgroundColor: "var(--panel-color)", borderColor: "var(--border-color)" }}><Typography sx={{ color: "var(--text-secondary)" }}>You are all caught up.</Typography></Paper> : <Box sx={{ display: "grid", gap: 1 }}>
        {notifications.map((notification) => <Paper key={notification.id} variant="outlined" sx={{ p: 2, backgroundColor: notification.isRead ? "var(--panel-color)" : "var(--glass-bg)", borderColor: "var(--border-color)", display: "flex", gap: 2, justifyContent: "space-between", alignItems: "center" }}>
          <Box><Typography sx={{ color: "var(--text-primary)", fontWeight: notification.isRead ? 500 : 700, fontSize: "14px" }}>A watched page was updated: {notification.documentTitle}</Typography><Typography sx={{ color: "var(--text-secondary)", fontSize: "12px" }}>{new Date(notification.createdAt).toLocaleString()}</Typography></Box>
          <Button size="small" onClick={() => openNotification(notification)} sx={{ color: "var(--primary-color)", textTransform: "none" }}>Open page</Button>
        </Paper>)}
      </Box>}
    </Box>
  </Box>;
};
