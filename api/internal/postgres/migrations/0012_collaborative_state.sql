CREATE TABLE collaborative_states (
 document_id VARCHAR(255) PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
 version BIGINT NOT NULL CHECK(version > 0),
 update_data TEXT NOT NULL CHECK(length(update_data) <= 16777216),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
