import {
  Box,
  Select,
  MenuItem,
  Divider,
  Tooltip,
  IconButton,
  Typography,
  Menu,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  SquareTerminal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Grid3X3,
  Layout,
  Columns2,
  Columns3,
  Sparkles,
  Plus,
  Underline,
  Highlighter,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Link2} from "lucide-react";

export const EditorToolbar = ({
  editor,
  isEditing,
  previewVersion,
  isTitleFocused,
  getHeadingValue,
  handleHeadingChange,
  setTableCreatorOpen,
  layoutMenuAnchor,
  setLayoutMenuAnchor,
  setAiPromptOpen,
  favorites,
  commands,
  setMacroSearchQuery,
  setMacroSelectorOpen,
  onInsertLinkClick,
}: any) => {
  if (!editor || !isEditing || previewVersion) return null;
  return (
    <>
      {/* Formatting Quick Toolbar */}
      {editor && isEditing && !previewVersion && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 0.75,
            color: "text.secondary",
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: "var(--panel-color)",
            px: { xs: 2, sm: 3, md: 4 },
            pt: 1,
            pb: 1,
            borderBottom: "1px solid var(--border-color)",
            pointerEvents: isTitleFocused ? "none" : "auto",
            opacity: isTitleFocused ? 0.35 : 1,
            transition: "all 0.15s ease",
          }}
        >
          <Select
            value={getHeadingValue()}
            onChange={handleHeadingChange}
            size="small"
            variant="outlined"
            sx={{
              height: 32,
              minWidth: 120,
              fontSize: "13px",
              fontFamily: '"Outfit", sans-serif',
              fontWeight: 500,
              color: "text.primary",
              backgroundColor: "action.hover",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--border-color)",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--primary-color)",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--primary-color)",
              },
              "& .MuiSelect-select": {
                py: 0.5,
                px: 1.5,
                display: "flex",
                alignItems: "center",
              },
            }}
            MenuProps={
              {
                slotProps: {
                  paper: {
                    sx: {
                      backgroundColor: "var(--panel-color)",
                      border: "1px solid var(--border-color)",
                      boxShadow: "var(--shadow-premium)",
                      backgroundImage: "none",
                      "& .MuiMenuItem-root": {
                        fontSize: "13px",
                        fontFamily: '"Outfit", sans-serif',
                        "&:hover": {
                          backgroundColor: "color-mix(in srgb, var(--primary-color) 8%, transparent)",
                        },
                        "&.Mui-selected": {
                          backgroundColor: "color-mix(in srgb, var(--primary-color) 12%, transparent)",
                          color: "var(--primary-color)",
                          "&:hover": {
                            backgroundColor: "color-mix(in srgb, var(--primary-color) 18%, transparent)",
                          },
                        },
                      },
                    },
                  },
                },
              } as any
            }
          >
            <MenuItem value="paragraph">Normal</MenuItem>
            <MenuItem value="h1">Heading 1</MenuItem>
            <MenuItem value="h2">Heading 2</MenuItem>
            <MenuItem value="h3">Heading 3</MenuItem>
            <MenuItem value="h4">Heading 4</MenuItem>
            <MenuItem value="h5">Heading 5</MenuItem>
            <MenuItem value="h6">Heading 6</MenuItem>
          </Select>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 0.5, height: 16, alignSelf: "center" }}
          />

          {/* Typography Group */}
          <Tooltip title="Bold" arrow>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleBold().run()}
              sx={{
                color: editor.isActive("bold") ? "primary.light" : "inherit",
                backgroundColor: editor.isActive("bold")
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <Bold size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Italic" arrow>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              sx={{
                color: editor.isActive("italic") ? "primary.light" : "inherit",
                backgroundColor: editor.isActive("italic")
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <Italic size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Strikethrough" arrow>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              sx={{
                color: editor.isActive("strike") ? "primary.light" : "inherit",
                backgroundColor: editor.isActive("strike")
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <Strikethrough size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Underline" arrow>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              sx={{
                color: editor.isActive("underline") ? "primary.light" : "inherit",
                backgroundColor: editor.isActive("underline")
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <Underline size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Highlight" arrow>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              sx={{
                color: editor.isActive("highlight") ? "primary.light" : "inherit",
                backgroundColor: editor.isActive("highlight")
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <Highlighter size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Subscript" arrow>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              sx={{
                color: editor.isActive("subscript") ? "primary.light" : "inherit",
                backgroundColor: editor.isActive("subscript")
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <SubscriptIcon size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Superscript" arrow>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              sx={{
                color: editor.isActive("superscript") ? "primary.light" : "inherit",
                backgroundColor: editor.isActive("superscript")
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <SuperscriptIcon size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Insert Link" arrow>
            <IconButton
              size="small"
              onClick={onInsertLinkClick}
              sx={{
                color: editor.isActive("link") ? "primary.light" : "inherit",
                backgroundColor: editor.isActive("link")
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <Link2 size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Inline Code" arrow>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleCode().run()}
              sx={{
                color: editor.isActive("code") ? "primary.light" : "inherit",
                backgroundColor: editor.isActive("code")
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <Code size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Code Block" arrow>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              sx={{
                color: editor.isActive("codeBlock")
                  ? "primary.light"
                  : "inherit",
                backgroundColor: editor.isActive("codeBlock")
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <SquareTerminal size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Blockquote" arrow>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              sx={{
                color: editor.isActive("blockquote")
                  ? "primary.light"
                  : "inherit",
                backgroundColor: editor.isActive("blockquote")
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <Quote size={15} />
            </IconButton>
          </Tooltip>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 0.5, height: 16, alignSelf: "center" }}
          />

          {/* Alignment Group */}
          <Tooltip title="Align Left" arrow>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              sx={{
                color: editor.isActive({ textAlign: "left" })
                  ? "primary.light"
                  : "inherit",
                backgroundColor: editor.isActive({ textAlign: "left" })
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <AlignLeft size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Align Center" arrow>
            <IconButton
              size="small"
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              sx={{
                color: editor.isActive({ textAlign: "center" })
                  ? "primary.light"
                  : "inherit",
                backgroundColor: editor.isActive({ textAlign: "center" })
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <AlignCenter size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Align Right" arrow>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              sx={{
                color: editor.isActive({ textAlign: "right" })
                  ? "primary.light"
                  : "inherit",
                backgroundColor: editor.isActive({ textAlign: "right" })
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <AlignRight size={15} />
            </IconButton>
          </Tooltip>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 0.5, height: 16, alignSelf: "center" }}
          />

          {/* Lists */}
          <Tooltip title="Bullet List" arrow>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              sx={{
                color: editor.isActive("bulletList")
                  ? "primary.light"
                  : "inherit",
                backgroundColor: editor.isActive("bulletList")
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <List size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Numbered List" arrow>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              sx={{
                color: editor.isActive("orderedList")
                  ? "primary.light"
                  : "inherit",
                backgroundColor: editor.isActive("orderedList")
                  ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                  : "transparent",
              }}
            >
              <ListOrdered size={15} />
            </IconButton>
          </Tooltip>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 0.5, height: 16, alignSelf: "center" }}
          />

          {/* Insert Complex Components */}
          <Tooltip title="Insert Table" arrow>
            <IconButton
              size="small"
              onClick={() => setTableCreatorOpen(true)}
              sx={{
                color: "inherit",
                "&:hover": {
                  color: "primary.light",
                  backgroundColor: "action.hover",
                },
              }}
            >
              <Grid3X3 size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Insert Column Layout" arrow>
            <IconButton
              size="small"
              onClick={(e) => setLayoutMenuAnchor(e.currentTarget)}
              sx={{
                color: "inherit",
                "&:hover": {
                  color: "primary.light",
                  backgroundColor: "action.hover",
                },
              }}
            >
              <Layout size={15} />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={layoutMenuAnchor}
            open={Boolean(layoutMenuAnchor)}
            onClose={() => setLayoutMenuAnchor(null)}
            slotProps={{
              paper: {
                sx: {
                  backgroundColor: "background.paper",
                  border: "1px solid var(--border-color)",
                  color: "text.primary",
                },
              },
            }}
          >
            <MenuItem
              onClick={() => {
                const pos = editor.state.selection.from;
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "layoutSection",
                    attrs: { layout: "twocol" },
                    content: [
                      {
                        type: "layoutColumn",
                        content: [{ type: "paragraph" }],
                      },
                      {
                        type: "layoutColumn",
                        content: [{ type: "paragraph" }],
                      },
                    ],
                  })
                  .setTextSelection(pos + 3)
                  .run();
                setLayoutMenuAnchor(null);
              }}
            >
              <ListItemIcon sx={{ color: "text.secondary" }}>
                <Columns2 size={14} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2">2 Columns (50/50)</Typography>
                }
              />
            </MenuItem>
            <MenuItem
              onClick={() => {
                const pos = editor.state.selection.from;
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "layoutSection",
                    attrs: { layout: "threecol" },
                    content: [
                      {
                        type: "layoutColumn",
                        content: [{ type: "paragraph" }],
                      },
                      {
                        type: "layoutColumn",
                        content: [{ type: "paragraph" }],
                      },
                      {
                        type: "layoutColumn",
                        content: [{ type: "paragraph" }],
                      },
                    ],
                  })
                  .setTextSelection(pos + 3)
                  .run();
                setLayoutMenuAnchor(null);
              }}
            >
              <ListItemIcon sx={{ color: "text.secondary" }}>
                <Columns3 size={14} />
              </ListItemIcon>
              <ListItemText
                primary={<Typography variant="body2">3 Columns</Typography>}
              />
            </MenuItem>
            <MenuItem
              onClick={() => {
                const pos = editor.state.selection.from;
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "layoutSection",
                    attrs: { layout: "asymmetric-left" },
                    content: [
                      {
                        type: "layoutColumn",
                        content: [{ type: "paragraph" }],
                      },
                      {
                        type: "layoutColumn",
                        content: [{ type: "paragraph" }],
                      },
                    ],
                  })
                  .setTextSelection(pos + 3)
                  .run();
                setLayoutMenuAnchor(null);
              }}
            >
              <ListItemIcon sx={{ color: "text.secondary" }}>
                <Layout size={14} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2">Columns (70/30)</Typography>
                }
              />
            </MenuItem>
            <MenuItem
              onClick={() => {
                const pos = editor.state.selection.from;
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "layoutSection",
                    attrs: { layout: "asymmetric-right" },
                    content: [
                      {
                        type: "layoutColumn",
                        content: [{ type: "paragraph" }],
                      },
                      {
                        type: "layoutColumn",
                        content: [{ type: "paragraph" }],
                      },
                    ],
                  })
                  .setTextSelection(pos + 3)
                  .run();
                setLayoutMenuAnchor(null);
              }}
            >
              <ListItemIcon sx={{ color: "text.secondary" }}>
                <Layout size={14} style={{ transform: "scaleX(-1)" }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2">Columns (30/70)</Typography>
                }
              />
            </MenuItem>
          </Menu>

          <Tooltip title="Ask AI Assistant" arrow>
            <IconButton
              size="small"
              onClick={() => setAiPromptOpen(true)}
              sx={{
                color: "inherit",
                "&:hover": {
                  color: "primary.light",
                  backgroundColor: "action.hover",
                },
              }}
            >
              <Sparkles size={15} />
            </IconButton>
          </Tooltip>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 0.5, height: 16, alignSelf: "center" }}
          />

          {/* Dynamically Render Favorited Macros */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              flexWrap: "nowrap",
              overflow: "hidden",
              flexShrink: 1,
            }}
          >
            {favorites.map((favId: string) => {
              const cmd = commands.find((c: { id: string }) => c.id === favId);
              if (!cmd) return null;

              const isActive = () => {
                if (cmd.id === "bullet") return editor.isActive("bulletList");
                if (cmd.id === "number") return editor.isActive("orderedList");
                if (cmd.id === "code") return editor.isActive("codeBlock");
                if (cmd.id === "task-list") return editor.isActive("taskList");
                return false;
              };

              return (
                <Tooltip key={cmd.id} title={cmd.label} arrow>
                  <IconButton
                    size="small"
                    onClick={() => cmd.action(editor)}
                    sx={{
                      color: isActive() ? "primary.light" : "inherit",
                      backgroundColor: isActive()
                        ? "color-mix(in srgb, var(--primary-color) 10%, transparent)"
                        : "transparent",
                      flexShrink: 0,
                      "&:hover": {
                        color: "primary.light",
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    {cmd.icon}
                  </IconButton>
                </Tooltip>
              );
            })}
          </Box>

          {/* Always-visible Plus Button to choose macros */}
          <Tooltip title="Add macro or block..." arrow>
            <IconButton
              size="small"
              onClick={() => {
                setMacroSearchQuery("");
                setMacroSelectorOpen(true);
              }}
              sx={{
                color: "primary.light",
                backgroundColor: "color-mix(in srgb, var(--primary-color) 8%, transparent)",
                border: "1px dashed color-mix(in srgb, var(--primary-color) 30%, transparent)",
                flexShrink: 0,
                ml: 0.5,
                "&:hover": {
                  backgroundColor: "color-mix(in srgb, var(--primary-color) 15%, transparent)",
                  borderColor: "var(--primary-color)",
                },
              }}
            >
              <Plus size={15} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </>
  );
};
