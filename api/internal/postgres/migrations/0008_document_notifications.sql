CREATE TABLE IF NOT EXISTS document_notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_title TEXT NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_notifications_user_created ON document_notifications (user_id, created_at DESC);
