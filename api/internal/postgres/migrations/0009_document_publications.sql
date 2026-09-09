CREATE TABLE IF NOT EXISTS document_publications (
    document_id VARCHAR(255) PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
    version_id VARCHAR(255) NOT NULL REFERENCES document_versions(id) ON DELETE RESTRICT,
    published_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_publications_version ON document_publications(version_id);
