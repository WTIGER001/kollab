-- Project page-properties macro data into a queryable, normalized index. The
-- document's Tiptap JSON remains the source of truth and replaces this index on
-- each successful page save.
CREATE TABLE IF NOT EXISTS document_properties (
    document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    property_key TEXT NOT NULL,
    property_value TEXT NOT NULL DEFAULT '',
    value_type TEXT NOT NULL DEFAULT 'text',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (document_id, property_key)
);

CREATE INDEX IF NOT EXISTS idx_document_properties_key_value
    ON document_properties (property_key, property_value);
