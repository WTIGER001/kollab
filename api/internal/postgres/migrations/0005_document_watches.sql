-- Explicit per-page subscriptions. A later notification pipeline can resolve
-- these subscriptions without changing the watch contract.
CREATE TABLE IF NOT EXISTS document_watches (
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_document_watches_document
    ON document_watches (document_id);
