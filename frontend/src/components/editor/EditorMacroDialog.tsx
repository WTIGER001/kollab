import React from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  IconButton,
  InputBase,
  Tooltip,
  DialogTitle,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Search,
  X,
  Star,
  Type,
  Columns2,
  Info,
  ListTodo,
  Layers,
} from "lucide-react";

export interface EditorMacroDialogProps {
  macroSelectorOpen: boolean;
  setMacroSelectorOpen: (val: boolean) => void;
  macroSearchQuery: string;
  setMacroSearchQuery: (val: string) => void;
  activeCategoryTab: string;
  setActiveCategoryTab: (val: string) => void;
  commands: any[];
  toggleFavorite: (id: string, e?: React.MouseEvent) => void;
  favorites: string[];
  editor: any;
}

export const EditorMacroDialog: React.FC<EditorMacroDialogProps> = ({
  macroSelectorOpen,
  setMacroSelectorOpen,
  macroSearchQuery,
  setMacroSearchQuery,
  activeCategoryTab,
  setActiveCategoryTab,
  commands,
  toggleFavorite,
  favorites,
  editor,
}) => {
  return (
    <Dialog
      open={macroSelectorOpen}
      onClose={() => setMacroSelectorOpen(false)}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          className: "glass-card",
          sx: {
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--panel-color)",
            color: "var(--text-primary)",
            borderRadius: "16px",
            boxShadow: "var(--shadow-premium)",
            overflow: "hidden",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: '"Outfit", sans-serif',
          fontWeight: 800,
          pb: 1.5,
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, fontFamily: '"Outfit", sans-serif' }}
        >
          Insert Macro or Block
        </Typography>
        <IconButton
          size="small"
          onClick={() => setMacroSelectorOpen(false)}
          sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
        >
          <X size={18} />
        </IconButton>
      </DialogTitle>

      {/* Search Bar at the Top */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 3,
          py: 1.5,
          borderBottom: "1px solid var(--border-color)",
          backgroundColor: "rgba(0, 0, 0, 0.1)",
        }}
      >
        <Search size={16} style={{ color: "var(--primary-color)" }} />
        <InputBase
          value={macroSearchQuery}
          onChange={(e) => setMacroSearchQuery(e.target.value)}
          placeholder="Search macros by name or description..."
          fullWidth
          sx={{
            color: "text.primary",
            fontSize: "13.5px",
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 500,
            "& input::placeholder": { color: "text.disabled", opacity: 0.6 },
          }}
        />
        {macroSearchQuery && (
          <IconButton
            size="small"
            onClick={() => setMacroSearchQuery("")}
            sx={{ p: 0.25, color: "text.secondary" }}
          >
            <X size={14} />
          </IconButton>
        )}
      </Box>

      <DialogContent sx={{ p: 0, height: 480, display: "flex" }}>
        {/* Vertical Category Tabs */}
        {!macroSearchQuery && (
          <Tabs
            orientation="vertical"
            value={activeCategoryTab}
            onChange={(e, val) => setActiveCategoryTab(val)}
            variant="scrollable"
            sx={{
              borderRight: "1px solid var(--border-color)",
              minWidth: 180,
              backgroundColor: "action.hover",
              "& .MuiTabs-indicator": {
                left: 0,
                right: "auto",
                backgroundColor: "var(--primary-color)",
                width: 3,
              },
              "& .MuiTab-root": {
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 600,
                fontSize: "13px",
                textTransform: "none",
                alignItems: "flex-start",
                textAlign: "left",
                py: 2,
                px: 2.5,
                color: "text.secondary",
                minHeight: 48,
                justifyContent: "flex-start",
                borderBottom: "var(--border-color)",
                "&.Mui-selected": {
                  color: "var(--primary-color)",
                  backgroundColor: "rgba(139, 92, 246, 0.05)",
                },
                "&:hover": {
                  color: "text.primary",
                  backgroundColor: "action.hover",
                },
              },
            }}
          >
            <Tab
              label="Text & Lists"
              value="text"
              icon={<Type size={16} />}
              iconPosition="start"
            />
            <Tab
              label="Layout & Media"
              value="layout"
              icon={<Columns2 size={16} />}
              iconPosition="start"
            />
            <Tab
              label="Callouts & Details"
              value="callouts"
              icon={<Info size={16} />}
              iconPosition="start"
            />
            <Tab
              label="Task & Status"
              value="tasks"
              icon={<ListTodo size={16} />}
              iconPosition="start"
            />
            <Tab
              label="Advanced Macros"
              value="advanced"
              icon={<Layers size={16} />}
              iconPosition="start"
            />
          </Tabs>
        )}

        {/* Macro Cards Grid */}
        <Box
          sx={{
            flex: 1,
            p: 3,
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            alignContent: "start",
            gap: 1.5,
            backgroundColor: "rgba(0, 0, 0, 0.05)",
          }}
          className="scrollbar-thin"
        >
          {commands
            .filter((cmd) => {
              const matchesSearch =
                cmd.label
                  .toLowerCase()
                  .includes(macroSearchQuery.toLowerCase()) ||
                cmd.description
                  .toLowerCase()
                  .includes(macroSearchQuery.toLowerCase());
              if (macroSearchQuery) {
                return matchesSearch;
              }
              return cmd.category === activeCategoryTab;
            })
            .map((cmd) => {
              const isFav = favorites.includes(cmd.id);
              return (
                <Box
                  key={cmd.id}
                  onClick={() => {
                    cmd.action(editor);
                    setMacroSelectorOpen(false);
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 2,
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--panel-color)",
                    cursor: "pointer",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      borderColor: "var(--primary-color)",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                      transform: "translateY(-1px)",
                      backgroundColor: "rgba(139, 92, 246, 0.02)",
                      "& .macro-icon-box": {
                        backgroundColor: "rgba(139, 92, 246, 0.15)",
                        borderColor: "rgba(139, 92, 246, 0.3)",
                      },
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      flex: 1,
                    }}
                  >
                    {/* Macro Icon Container */}
                    <Box
                      className="macro-icon-box"
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "action.hover",
                        border: "1px solid var(--border-color)",
                        color: "text.primary",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {cmd.icon}
                    </Box>
                    {/* Title & Description Card */}
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          color: "text.primary",
                          fontFamily: '"Outfit", sans-serif',
                          fontSize: "13.5px",
                        }}
                      >
                        {cmd.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", fontSize: "11.5px" }}
                      >
                        {cmd.description}
                      </Typography>
                    </Box>
                  </Box>
                  {/* Star Favorite Toggle */}
                  <Tooltip
                    title={
                      isFav
                        ? "Remove from Favorites"
                        : "Pin to Toolbar Favorites"
                    }
                    arrow
                  >
                    <IconButton
                      size="small"
                      onClick={(e) => toggleFavorite(cmd.id, e)}
                      sx={{
                        color: isFav ? "#fbbf24" : "text.disabled",
                        "&:hover": {
                          color: "#fbbf24",
                          backgroundColor: "rgba(251, 191, 36, 0.08)",
                        },
                      }}
                    >
                      <Star size={16} fill={isFav ? "#fbbf24" : "none"} />
                    </IconButton>
                  </Tooltip>
                </Box>
              );
            })}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
