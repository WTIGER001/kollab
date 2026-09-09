-- Page lifecycle data is separate from collaborative document JSON so it can
-- be queried and marked stale without causing editor writes.
CREATE TABLE IF NOT EXISTS document_reviews (
    document_id VARCHAR(255) PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
    review_status VARCHAR(32) NOT NULL DEFAULT 'draft'
        CHECK (review_status IN ('draft', 'in_review', 'approved', 'stale')),
    next_review_at TIMESTAMPTZ,
    updated_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_reviews_due
    ON document_reviews (next_review_at)
    WHERE next_review_at IS NOT NULL;
