import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CircularProgress, 
  Tooltip, 
  Chip,
  Divider
} from "@mui/material";
import { CheckSquare, Square, Calendar, ExternalLink, ListTodo, AlertTriangle } from "lucide-react";
import { fetchTasks } from "../services/api";
import type { Task } from "../services/api";

interface TasksViewProps {
  username: string;
  onNavigate: (documentId: string, teamId: string, projectId: string | null) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ username, onNavigate }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await fetchTasks(username);
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (username) {
      loadTasks();
    }
  }, [username]);

  const handleTaskClick = (task: Task) => {
    const teamArg = task.teamId.startsWith("personal_") ? "personal" : task.teamId;
    onNavigate(task.documentId, teamArg, task.projectId);
  };

  // Group tasks by document
  const groupedTasks = tasks.reduce((groups, task) => {
    const docId = task.documentId;
    if (!groups[docId]) {
      groups[docId] = {
        title: task.docTitle || "Untitled Document",
        tasks: [],
      };
    }
    groups[docId].tasks.push(task);
    return groups;
  }, {} as Record<string, { title: string; tasks: Task[] }>);

  const formatFriendlyDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const getDueDateProps = (task: Task) => {
    if (task.completed || !task.dueDate) return { label: "", color: "default" as const };
    
    const todayStr = new Date().toISOString().split("T")[0];
    const formatted = formatFriendlyDate(task.dueDate);

    if (task.dueDate < todayStr) {
      return { 
        label: `Overdue: ${formatted}`, 
        color: "error" as const,
        icon: <AlertTriangle size={12} style={{ marginRight: 4 }} />
      };
    }
    if (task.dueDate === todayStr) {
      return { 
        label: `Due Today: ${formatted}`, 
        color: "warning" as const,
        icon: <Calendar size={12} style={{ marginRight: 4 }} />
      };
    }
    return { 
      label: `Due: ${formatted}`, 
      color: "secondary" as const,
      icon: <Calendar size={12} style={{ marginRight: 4 }} />
    };
  };

  // Parse task content to highlight @mentions elegantly
  const renderTaskContent = (content: string) => {
    const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(content.substring(lastIndex, matchIndex));
      }
      parts.push(
        <Box 
          key={matchIndex}
          component="span"
          sx={{
            px: 0.75,
            py: 0.15,
            borderRadius: "4px",
            backgroundColor: "rgba(139, 92, 246, 0.15)",
            color: "var(--primary-color)",
            fontWeight: 600,
            fontSize: "11.5px",
            fontFamily: '"Outfit", sans-serif',
            mx: 0.25
          }}
        >
          {match[0]}
        </Box>
      );
      lastIndex = mentionRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  const pendingCount = tasks.filter(t => !t.completed).length;

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: "auto" }}>
      {/* Header Panel */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
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
            <ListTodo size={24} style={{ color: "var(--primary-color)" }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: "var(--text-primary)" }}>
              My Tasks
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"Outfit", sans-serif' }}>
              All tasks assigned to @{username} across documents
            </Typography>
          </Box>
        </Box>
        {tasks.length > 0 && (
          <Chip
            label={`${pendingCount} Pending`}
            sx={{
              fontWeight: 600,
              fontFamily: '"Outfit", sans-serif',
              backgroundColor: pendingCount > 0 ? "rgba(139, 92, 246, 0.12)" : "rgba(34, 197, 94, 0.12)",
              color: pendingCount > 0 ? "var(--primary-color)" : "#22c55e",
              border: pendingCount > 0 ? "1px solid rgba(139, 92, 246, 0.25)" : "1px solid rgba(34, 197, 94, 0.25)",
              borderRadius: "6px"
            }}
          />
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={36} sx={{ color: "var(--primary-color)" }} />
        </Box>
      ) : tasks.length === 0 ? (
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
              <ListTodo size={48} style={{ color: "var(--text-secondary)" }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: '"Outfit", sans-serif', mb: 1, color: "var(--text-primary)" }}>
              No Tasks Assigned
            </Typography>
            <Typography variant="body2" sx={{ color: "text.disabled", fontFamily: '"Outfit", sans-serif', maxWidth: 400, mx: "auto" }}>
              When team members assign tasks to you using @{username} in any document checklist, they will appear here.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {Object.entries(groupedTasks).map(([docId, docGroup]) => (
            <Card 
              key={docId}
              className="glass-card"
              sx={{ 
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--panel-color)",
                borderRadius: 2.5,
                boxShadow: "none",
                overflow: "hidden",
                transition: "all 0.2s ease",
                "&:hover": {
                  boxShadow: "0 8px 30px rgba(0,0,0,0.12)"
                }
              }}
            >
              {/* Document Header Row */}
              <Box 
                sx={{ 
                  px: 3, 
                  py: 1.75, 
                  backgroundColor: "rgba(255, 255, 255, 0.015)", 
                  borderBottom: "1px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.03)"
                  }
                }}
                onClick={() => handleTaskClick(docGroup.tasks[0])}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif', color: "var(--text-primary)" }}>
                    {docGroup.title}
                  </Typography>
                </Box>
                <Tooltip title="Open document" arrow>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <ExternalLink size={14} style={{ color: "var(--text-secondary)", opacity: 0.7 }} />
                  </Box>
                </Tooltip>
              </Box>

              <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                {docGroup.tasks.map((task, index) => {
                  const dateProps = getDueDateProps(task);
                  return (
                    <Box key={task.id}>
                      {index > 0 && <Divider sx={{ borderColor: "var(--border-color)", opacity: 0.5 }} />}
                      <Box 
                        sx={{ 
                          px: 3, 
                          py: 2, 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 2, 
                          cursor: "pointer",
                          backgroundColor: task.completed ? "rgba(0, 0, 0, 0.08)" : "transparent",
                          transition: "background-color 0.15s ease",
                          "&:hover": {
                            backgroundColor: "rgba(139, 92, 246, 0.03)"
                          }
                        }}
                        onClick={() => handleTaskClick(task)}
                      >
                        {/* Status Checkbox Icon */}
                        <Tooltip title={task.completed ? "Completed" : "Pending (Go to document to complete)"} arrow>
                          <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                            {task.completed ? (
                              <CheckSquare size={18} style={{ color: "#22c55e" }} />
                            ) : (
                              <Square size={18} style={{ color: "var(--text-secondary)", opacity: 0.6 }} />
                            )}
                          </Box>
                        </Tooltip>

                        {/* Content text */}
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            flex: 1, 
                            fontFamily: '"Outfit", sans-serif', 
                            color: task.completed ? "text.disabled" : "var(--text-primary)",
                            textDecoration: task.completed ? "line-through" : "none",
                            fontSize: "13px",
                            fontWeight: 500
                          }}
                        >
                          {renderTaskContent(task.content)}
                        </Typography>

                        {/* Due Date Chip */}
                        {task.dueDate && (
                          <Chip
                            size="small"
                            icon={dateProps.icon}
                            label={dateProps.label || formatFriendlyDate(task.dueDate)}
                            color={dateProps.color}
                            variant={task.completed ? "outlined" : "filled"}
                            sx={{
                              fontSize: "10px",
                              fontWeight: 600,
                              fontFamily: '"Outfit", sans-serif',
                              height: 20,
                              borderRadius: "4px",
                              "& .MuiChip-icon": {
                                color: "inherit",
                                marginLeft: "4px"
                              }
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};
