-- Commit the readable document projection with the accepted CRDT revision.
-- NULL preserves compatibility for state written before this migration.
ALTER TABLE collaborative_states ADD COLUMN content TEXT;
ALTER TABLE collaborative_states ADD CONSTRAINT collaborative_content_valid
 CHECK (content IS NULL OR (length(content) <= 16777216 AND content::jsonb->>'type' = 'doc'));
