-- Idempotency ledger scoped to an archive digest and import target. Source paths
-- avoid title-based collisions and preserve safe retry behavior.
CREATE TABLE IF NOT EXISTS confluence_import_records (
    archive_sha256 CHAR(64) NOT NULL,
    source_path TEXT NOT NULL,
    team_id VARCHAR(255) NOT NULL DEFAULT '',
    project_id VARCHAR(255) NOT NULL DEFAULT '',
    document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (archive_sha256, source_path, team_id, project_id)
);
