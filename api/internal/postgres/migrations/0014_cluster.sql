-- Transient, installation-local coordination is never transferred in archives.
CREATE TABLE cluster_control (
 id BOOLEAN PRIMARY KEY DEFAULT true CHECK(id),
 epoch TEXT NOT NULL DEFAULT gen_random_uuid()::text,
 tree_version BIGINT NOT NULL DEFAULT 0,
 media_key TEXT NOT NULL DEFAULT (gen_random_uuid()::text || gen_random_uuid()::text)
);
INSERT INTO cluster_control(id) VALUES(true);
CREATE TABLE cluster_presence (
 connection_id TEXT PRIMARY KEY,
 instance_id TEXT NOT NULL,
 document_id TEXT NOT NULL,
 user_id TEXT NOT NULL,
 username TEXT NOT NULL,
 color TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 anchor INTEGER NOT NULL DEFAULT 0,
 cursor_version BIGINT NOT NULL DEFAULT 0,
 seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cluster_presence_document ON cluster_presence(document_id,seen_at);
