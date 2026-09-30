-- Refresh only the untouched, seeded default dark palette. Workspace themes
-- that administrators have customized are intentionally left unchanged.
UPDATE workspace_themes
SET dark_mode = '{"primary":"#8b5cf6","secondary":"#6366f1","background":"#15171c","paper":"#20232b","textPrimary":"#ffffff","textSecondary":"#cbd5e1","border":"#334155","accent":"#3b82f6"}'::jsonb
WHERE id = 'theme_default'
  AND is_default = TRUE
  AND dark_mode = '{"primary":"#8b5cf6","secondary":"#6366f1","background":"#0b0c10","paper":"#161824","textPrimary":"#ffffff","textSecondary":"#94a3b8","border":"#1e293b","accent":"#3b82f6"}'::jsonb;
