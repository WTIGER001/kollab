-- Keep migration history queries fast as the schema evolves over the lifetime
-- of a production installation.
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at
    ON schema_migrations (applied_at);
