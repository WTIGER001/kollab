import React from "react";
import {
  Box,
  Typography,
  Dialog,
  IconButton,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  X,
  Clock,
  Users,
  Type,
  BarChart2,
  FileText,
} from "lucide-react";
import type { DocumentAnalytics } from "../../services/api";

export interface EditorAnalyticsDialogProps {
  analyticsOpen: boolean;
  setAnalyticsOpen: (val: boolean) => void;
  loadingAnalytics: boolean;
  analyticsData: DocumentAnalytics | null;
  getDocumentStats: () => any;
  LegendItem: React.FC<{ color: string; label: string; count: number }>;
  uniqueActiveUsers: any[];
}

export const EditorAnalyticsDialog: React.FC<EditorAnalyticsDialogProps> = ({
  analyticsOpen,
  setAnalyticsOpen,
  loadingAnalytics,
  analyticsData,
  getDocumentStats,
  LegendItem,
  uniqueActiveUsers,
}) => {
  return (
    <Dialog
      open={analyticsOpen}
      onClose={() => setAnalyticsOpen(false)}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "blur(4px)",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
          },
        },
        paper: {
          className: "glass-card",
          sx: {
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--panel-color)",
            color: "text.primary",
            borderRadius: "12px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            p: 3,
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "8px",
              backgroundColor: "rgba(139, 92, 246, 0.12)",
              color: "var(--primary-color)",
            }}
          >
            <BarChart2 size={18} />
          </Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}
          >
            Page Analytics
          </Typography>
        </Box>
        <IconButton
          onClick={() => setAnalyticsOpen(false)}
          sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
        >
          <X size={18} />
        </IconButton>
      </Box>

      {/* Dialog Content */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Grid of KPI Cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 2,
          }}
        >
          {/* Words */}
          <Box
            data-testid="kpi-words"
            sx={{
              p: 1.75,
              borderRadius: "8px",
              backgroundColor: "action.hover",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: "#8b5cf6",
              }}
            >
              <FileText size={16} />
              <Typography
                variant="caption"
                sx={{ color: "text.disabled", fontWeight: 600 }}
              >
                Words
              </Typography>
            </Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}
            >
              {getDocumentStats().words}
            </Typography>
          </Box>

          {/* Characters */}
          <Box
            data-testid="kpi-chars"
            sx={{
              p: 1.75,
              borderRadius: "8px",
              backgroundColor: "action.hover",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: "#06b6d4",
              }}
            >
              <Type size={16} />
              <Typography
                variant="caption"
                sx={{ color: "text.disabled", fontWeight: 600 }}
              >
                Chars
              </Typography>
            </Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}
            >
              {getDocumentStats().characters}
            </Typography>
          </Box>

          {/* Est. Read Time */}
          <Box
            data-testid="kpi-read-time"
            sx={{
              p: 1.75,
              borderRadius: "8px",
              backgroundColor: "action.hover",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: "#10b981",
              }}
            >
              <Clock size={16} />
              <Typography
                variant="caption"
                sx={{ color: "text.disabled", fontWeight: 600 }}
              >
                Read Time
              </Typography>
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                fontFamily: '"Outfit", sans-serif',
                display: "flex",
                alignItems: "baseline",
                gap: 0.5,
              }}
            >
              {getDocumentStats().readTime}{" "}
              <Typography
                variant="caption"
                sx={{
                  fontSize: "10px",
                  color: "text.secondary",
                  fontWeight: 600,
                }}
              >
                min
              </Typography>
            </Typography>
          </Box>

          {/* Online Users */}
          <Box
            data-testid="kpi-online"
            sx={{
              p: 1.75,
              borderRadius: "8px",
              backgroundColor: "action.hover",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: "#f59e0b",
              }}
            >
              <Users size={16} />
              <Typography
                variant="caption"
                sx={{ color: "text.disabled", fontWeight: 600 }}
              >
                Online
              </Typography>
            </Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, fontFamily: '"Outfit", sans-serif' }}
            >
              {uniqueActiveUsers.length || 1}
            </Typography>
          </Box>
        </Box>

        {/* Block Composition Bar Chart */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: "9.5px",
              color: "text.disabled",
              letterSpacing: "0.05em",
            }}
          >
            Content Composition
          </Typography>

          {/* Horizontal Stacked Bar */}
          <Box
            sx={{
              height: 10,
              borderRadius: "5px",
              width: "100%",
              backgroundColor: "action.hover",
              display: "flex",
              overflow: "hidden",
            }}
          >
            {/* Paragraphs */}
            {getDocumentStats().blocks.paragraphs > 0 && (
              <Tooltip
                title={`Paragraphs: ${getDocumentStats().blocks.paragraphs}`}
              >
                <Box
                  sx={{
                    width: `${(getDocumentStats().blocks.paragraphs / ((Object.values(getDocumentStats().blocks) as number[]).reduce((a: any, b: any) => a + b, 0) || 1)) * 100}%`,
                    height: "100%",
                    backgroundColor: "#a78bfa",
                  }}
                />
              </Tooltip>
            )}
            {/* Headings */}
            {getDocumentStats().blocks.headings > 0 && (
              <Tooltip
                title={`Headings: ${getDocumentStats().blocks.headings}`}
              >
                <Box
                  sx={{
                    width: `${(getDocumentStats().blocks.headings / ((Object.values(getDocumentStats().blocks) as number[]).reduce((a: any, b: any) => a + b, 0) || 1)) * 100}%`,
                    height: "100%",
                    backgroundColor: "#38bdf8",
                  }}
                />
              </Tooltip>
            )}
            {/* Tables */}
            {getDocumentStats().blocks.tables > 0 && (
              <Tooltip title={`Tables: ${getDocumentStats().blocks.tables}`}>
                <Box
                  sx={{
                    width: `${(getDocumentStats().blocks.tables / ((Object.values(getDocumentStats().blocks) as number[]).reduce((a: any, b: any) => a + b, 0) || 1)) * 100}%`,
                    height: "100%",
                    backgroundColor: "#34d399",
                  }}
                />
              </Tooltip>
            )}
            {/* Tasks */}
            {getDocumentStats().blocks.tasks > 0 && (
              <Tooltip title={`Tasks: ${getDocumentStats().blocks.tasks}`}>
                <Box
                  sx={{
                    width: `${(getDocumentStats().blocks.tasks / ((Object.values(getDocumentStats().blocks) as number[]).reduce((a: any, b: any) => a + b, 0) || 1)) * 100}%`,
                    height: "100%",
                    backgroundColor: "#facc15",
                  }}
                />
              </Tooltip>
            )}
            {/* Callouts */}
            {getDocumentStats().blocks.callouts > 0 && (
              <Tooltip
                title={`Callout Panels: ${getDocumentStats().blocks.callouts}`}
              >
                <Box
                  sx={{
                    width: `${(getDocumentStats().blocks.callouts / ((Object.values(getDocumentStats().blocks) as number[]).reduce((a: any, b: any) => a + b, 0) || 1)) * 100}%`,
                    height: "100%",
                    backgroundColor: "#fb923c",
                  }}
                />
              </Tooltip>
            )}
            {/* Images */}
            {getDocumentStats().blocks.images > 0 && (
              <Tooltip title={`Images: ${getDocumentStats().blocks.images}`}>
                <Box
                  sx={{
                    width: `${(getDocumentStats().blocks.images / ((Object.values(getDocumentStats().blocks) as number[]).reduce((a: any, b: any) => a + b, 0) || 1)) * 100}%`,
                    height: "100%",
                    backgroundColor: "#f472b6",
                  }}
                />
              </Tooltip>
            )}
            {/* Status / Dates */}
            {getDocumentStats().blocks.statuses +
              getDocumentStats().blocks.dates >
              0 && (
              <Tooltip
                title={`Status/Date Chips: ${getDocumentStats().blocks.statuses + getDocumentStats().blocks.dates}`}
              >
                <Box
                  sx={{
                    width: `${((getDocumentStats().blocks.statuses + getDocumentStats().blocks.dates) / ((Object.values(getDocumentStats().blocks) as number[]).reduce((a: any, b: any) => a + b, 0) || 1)) * 100}%`,
                    height: "100%",
                    backgroundColor: "#94a3b8",
                  }}
                />
              </Tooltip>
            )}
          </Box>

          {/* Legend Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 1,
              mt: 0.5,
            }}
          >
            <LegendItem
              color="#a78bfa"
              label="Paragraphs"
              count={getDocumentStats().blocks.paragraphs}
            />
            <LegendItem
              color="#38bdf8"
              label="Headings"
              count={getDocumentStats().blocks.headings}
            />
            <LegendItem
              color="#34d399"
              label="Tables"
              count={getDocumentStats().blocks.tables}
            />
            <LegendItem
              color="#facc15"
              label="Tasks"
              count={getDocumentStats().blocks.tasks}
            />
            <LegendItem
              color="#fb923c"
              label="Callouts"
              count={getDocumentStats().blocks.callouts}
            />
            <LegendItem
              color="#f472b6"
              label="Media"
              count={getDocumentStats().blocks.images}
            />
            <LegendItem
              color="#94a3b8"
              label="Chips"
              count={
                getDocumentStats().blocks.statuses +
                getDocumentStats().blocks.dates
              }
            />
          </Box>
        </Box>

        {/* Traffic Sparklines (Last 7 Days) */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                textTransform: "uppercase",
                fontSize: "9.5px",
                color: "text.disabled",
                letterSpacing: "0.05em",
              }}
            >
              Page Views & Visitors (Last 7 Days)
            </Typography>
            {!loadingAnalytics && analyticsData && (
              <Typography
                variant="caption"
                sx={{
                  color:
                    (analyticsData.trendPercentage ?? 0) >= 0
                      ? "#10b981"
                      : "#ef4444",
                  fontWeight: 600,
                  fontSize: "10.5px",
                }}
              >
                {(analyticsData.trendPercentage ?? 0) >= 0
                  ? `+${(analyticsData.trendPercentage ?? 0).toFixed(0)}%`
                  : `${(analyticsData.trendPercentage ?? 0).toFixed(0)}%`}{" "}
                this week
              </Typography>
            )}
          </Box>

          {loadingAnalytics ? (
            <Box
              sx={{
                height: 150,
                borderRadius: "8px",
                backgroundColor: "rgba(0, 0, 0, 0.15)",
                border: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
              }}
            >
              <CircularProgress
                size={24}
                sx={{ color: "var(--primary-color)" }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Loading traffic trend...
              </Typography>
            </Box>
          ) : !analyticsData ? (
            <Box
              sx={{
                height: 150,
                borderRadius: "8px",
                backgroundColor: "rgba(0, 0, 0, 0.15)",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                Failed to load traffic analytics.
              </Typography>
            </Box>
          ) : (
            (() => {
              const history = analyticsData.history || [];
              const maxVal = Math.max(
                ...history.map((h) => Math.max(h.views, h.uniqueVisitors)),
                10,
              );

              const viewsPoints = history.map((pt, i) => {
                const x = 10 + i * 80;
                const y = 106 - (pt.views / maxVal) * 86;
                return { x, y };
              });

              const visitorsPoints = history.map((pt, i) => {
                const x = 10 + i * 80;
                const y = 106 - (pt.uniqueVisitors / maxVal) * 86;
                return { x, y };
              });

              const viewsPath =
                viewsPoints.length > 0
                  ? `M ${viewsPoints.map((p) => `${p.x} ${p.y}`).join(" L ")}`
                  : "";
              const visitorsPath =
                visitorsPoints.length > 0
                  ? `M ${visitorsPoints.map((p) => `${p.x} ${p.y}`).join(" L ")}`
                  : "";

              const viewsAreaPath =
                viewsPoints.length > 0
                  ? `M 10 120 L ${viewsPoints.map((p) => `${p.x} ${p.y}`).join(" L ")} L 490 120 Z`
                  : "";
              const visitorsAreaPath =
                visitorsPoints.length > 0
                  ? `M 10 120 L ${visitorsPoints.map((p) => `${p.x} ${p.y}`).join(" L ")} L 490 120 Z`
                  : "";

              const formatDateLabel = (dateStr: string, isToday: boolean) => {
                if (isToday) return "Today";
                const parts = dateStr.split("-");
                if (parts.length === 3) {
                  const months = [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ];
                  const monthIdx = parseInt(parts[1], 10) - 1;
                  const day = parseInt(parts[2], 10);
                  if (monthIdx >= 0 && monthIdx < 12) {
                    return `${months[monthIdx]} ${day}`;
                  }
                }
                return dateStr;
              };

              return (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: "8px",
                    backgroundColor: "rgba(0, 0, 0, 0.15)",
                    border: "1px solid var(--border-color)",
                    position: "relative",
                  }}
                >
                  <svg
                    viewBox="0 0 500 120"
                    style={{ width: "100%", height: "110px", display: "block" }}
                  >
                    <defs>
                      <linearGradient
                        id="viewsGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--primary-color)"
                          stopOpacity="0.4"
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--primary-color)"
                          stopOpacity="0.0"
                        />
                      </linearGradient>
                      <linearGradient
                        id="visitorsGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#06b6d4"
                          stopOpacity="0.4"
                        />
                        <stop
                          offset="100%"
                          stopColor="#06b6d4"
                          stopOpacity="0.0"
                        />
                      </linearGradient>
                    </defs>

                    <line
                      x1="0"
                      y1="20"
                      x2="500"
                      y2="20"
                      stroke="rgba(255,255,255,0.03)"
                      strokeWidth="1"
                    />
                    <line
                      x1="0"
                      y1="55"
                      x2="500"
                      y2="55"
                      stroke="rgba(255,255,255,0.03)"
                      strokeWidth="1"
                    />
                    <line
                      x1="0"
                      y1="90"
                      x2="500"
                      y2="90"
                      stroke="rgba(255,255,255,0.03)"
                      strokeWidth="1"
                    />

                    {viewsAreaPath && (
                      <path d={viewsAreaPath} fill="url(#viewsGrad)" />
                    )}
                    {visitorsAreaPath && (
                      <path d={visitorsAreaPath} fill="url(#visitorsGrad)" />
                    )}

                    {viewsPath && (
                      <path
                        d={viewsPath}
                        fill="none"
                        stroke="var(--primary-color)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          filter:
                            "drop-shadow(0 2px 8px rgba(139, 92, 246, 0.4))",
                        }}
                      />
                    )}

                    {visitorsPath && (
                      <path
                        d={visitorsPath}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          filter:
                            "drop-shadow(0 2px 8px rgba(6, 182, 212, 0.4))",
                        }}
                      />
                    )}

                    {viewsPoints.length > 0 && (
                      <circle
                        cx={viewsPoints[viewsPoints.length - 1].x}
                        cy={viewsPoints[viewsPoints.length - 1].y}
                        r="4"
                        fill="var(--primary-color)"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}
                    {visitorsPoints.length > 0 && (
                      <circle
                        cx={visitorsPoints[visitorsPoints.length - 1].x}
                        cy={visitorsPoints[visitorsPoints.length - 1].y}
                        r="3.5"
                        fill="#06b6d4"
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    )}

                    {history.map((pt, idx) => {
                      const x = 10 + idx * 80;
                      const isLast = idx === history.length - 1;
                      const textX = isLast ? x - 18 : x - 12;
                      return (
                        <text
                          key={idx}
                          x={textX}
                          y="118"
                          fill="rgba(255,255,255,0.3)"
                          fontSize="8.5"
                          fontFamily='"Outfit", sans-serif'
                        >
                          {formatDateLabel(pt.date, isLast)}
                        </text>
                      );
                    })}
                  </svg>

                  <Box sx={{ display: "flex", gap: 3, mt: 1, px: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: "var(--primary-color)",
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: "text.primary", fontWeight: 600 }}
                      >
                        {analyticsData.totalViews.toLocaleString()}{" "}
                        <span
                          style={{
                            color: "var(--text-secondary)",
                            fontWeight: 500,
                          }}
                        >
                          Views
                        </span>
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: "#06b6d4",
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: "text.primary", fontWeight: 600 }}
                      >
                        {analyticsData.totalVisitors.toLocaleString()}{" "}
                        <span
                          style={{
                            color: "var(--text-secondary)",
                            fontWeight: 500,
                          }}
                        >
                          Unique Visitors
                        </span>
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })()
          )}
        </Box>
      </Box>
    </Dialog>
  );
};
