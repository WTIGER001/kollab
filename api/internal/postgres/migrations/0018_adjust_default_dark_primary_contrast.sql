-- The softened default palette is already established by 0017. Darken only
-- that exact, untouched palette so contained primary actions can use white
-- text with WCAG AA contrast.
UPDATE workspace_themes
SET dark_mode = '{"primary":"#5b5bd6","secondary":"#6366f1","background":"#15171c","paper":"#20232b","textPrimary":"#ffffff","textSecondary":"#cbd5e1","border":"#334155","accent":"#3b82f6"}'::jsonb
WHERE id = 'theme_default'
  AND is_default = TRUE
  AND dark_mode = '{"primary":"#8b5cf6","secondary":"#6366f1","background":"#15171c","paper":"#20232b","textPrimary":"#ffffff","textSecondary":"#cbd5e1","border":"#334155","accent":"#3b82f6"}'::jsonb;
