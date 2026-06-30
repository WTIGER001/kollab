CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(255) UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    team_id VARCHAR(255) REFERENCES teams(id) ON DELETE CASCADE,
    logo_url TEXT,
    abbreviation VARCHAR(255),
    description TEXT,
    CONSTRAINT unique_team_project_abbreviation UNIQUE (team_id, abbreviation)
);

CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    project_id VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
    team_id VARCHAR(255) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    parent_id VARCHAR(255) REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    embedding vector(768),
    created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    updated_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding vector(768);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS team_id VARCHAR(255) REFERENCES teams(id) ON DELETE CASCADE;
UPDATE documents d SET team_id = p.team_id FROM projects p WHERE d.project_id = p.id AND d.team_id IS NULL;
ALTER TABLE documents ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_documents_team_id ON documents (team_id);

CREATE TABLE IF NOT EXISTS document_versions (
    id VARCHAR(255) PRIMARY KEY,
    document_id VARCHAR(255) REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    version_number INT NOT NULL,
    created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    change_summary VARCHAR(255),
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS team_members (
    team_id VARCHAR(255) REFERENCES teams(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS images (
    id VARCHAR(255) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    original_width INT NOT NULL,
    original_height INT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_themes (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(255),
    light_mode JSONB NOT NULL,
    dark_mode JSONB NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(255) PRIMARY KEY,
    theme_mode VARCHAR(50) NOT NULL DEFAULT 'dark',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed Default Theme
INSERT INTO workspace_themes (id, name, logo_url, light_mode, dark_mode, is_default) VALUES (
    'theme_default',
    'Default Arkloud Theme',
    '',
    '{"primary":"#8b5cf6","secondary":"#6366f1","background":"#f8fafc","paper":"#ffffff","textPrimary":"#0f172a","textSecondary":"#475569","border":"#e2e8f0","accent":"#3b82f6"}',
    '{"primary":"#8b5cf6","secondary":"#6366f1","background":"#0b0c10","paper":"#161824","textPrimary":"#ffffff","textSecondary":"#94a3b8","border":"#1e293b","accent":"#3b82f6"}',
    TRUE
) ON CONFLICT (id) DO NOTHING;


CREATE TABLE IF NOT EXISTS document_views (
    id VARCHAR(255) PRIMARY KEY,
    document_id VARCHAR(255) REFERENCES documents(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    viewed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_views_doc_time ON document_views (document_id, viewed_at);

CREATE TABLE IF NOT EXISTS user_favorites (
    user_id VARCHAR(255) NOT NULL,
    document_id VARCHAR(255) REFERENCES documents(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, document_id)
);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO system_settings (key, value) VALUES 
('audit_retention_policy', 'forever'),
('audit_retention_custom_days', '30'),
('audit_log_destination', 'postgres')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS document_audit_logs (
    id VARCHAR(255) NOT NULL,
    document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS document_audit_logs_default PARTITION OF document_audit_logs DEFAULT;

CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(255) PRIMARY KEY,
    document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    parent_id VARCHAR(255) REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_doc_id ON comments(document_id);

CREATE TABLE IF NOT EXISTS attachments (
    id VARCHAR(255) PRIMARY KEY,
    document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    uploaded_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attachments_document_id ON attachments(document_id);

CREATE TABLE IF NOT EXISTS attachment_previews (
    attachment_id VARCHAR(255) PRIMARY KEY REFERENCES attachments(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    progress INT NOT NULL DEFAULT 0,
    format VARCHAR(10),
    error_message TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    assignee VARCHAR(255) NOT NULL,
    due_date DATE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);

CREATE TABLE IF NOT EXISTS tags (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_tags (
    document_id VARCHAR(255) REFERENCES documents(id) ON DELETE CASCADE,
    tag_id VARCHAR(255) REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_document_tags_doc_id ON document_tags(document_id);


-- Security classifications for ABAC
DO $$ BEGIN
    CREATE TYPE classification_level AS ENUM ('public', 'internal', 'confidential', 'pii');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Extend documents table to track classification and inheritance status
ALTER TABLE documents ADD COLUMN IF NOT EXISTS classification classification_level NOT NULL DEFAULT 'internal';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS inheritance_broken BOOLEAN NOT NULL DEFAULT FALSE;

-- Document sharing links
CREATE TABLE IF NOT EXISTS sharing_links (
    token_hash VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    role_id VARCHAR(50) NOT NULL, -- references roles(id) in go-permissions roles table
    scope VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NULL,
    created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sharing_links_doc ON sharing_links(document_id);

-- User security attributes for ABAC evaluation
CREATE TABLE IF NOT EXISTS user_security_attributes (
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attribute_key VARCHAR(100) NOT NULL,
    attribute_value VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, attribute_key)
);


CREATE TABLE IF NOT EXISTS db_operations_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL,
    row_id VARCHAR(100) NOT NULL,
    row_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION log_db_operation()
RETURNS TRIGGER AS $$
DECLARE
    r_id VARCHAR(100);
    r_data JSONB;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        r_id := OLD.id::VARCHAR(100);
        r_data := to_jsonb(OLD);
    ELSIF (TG_OP = 'UPDATE') THEN
        r_id := NEW.id::VARCHAR(100);
        r_data := to_jsonb(NEW);
    ELSE
        r_id := NEW.id::VARCHAR(100);
        r_data := to_jsonb(NEW);
    END IF;

    INSERT INTO db_operations_log (table_name, action, row_id, row_data)
    VALUES (TG_TABLE_NAME, TG_OP, r_id, r_data);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to key tables
DROP TRIGGER IF EXISTS log_users ON users;
CREATE TRIGGER log_users AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION log_db_operation();

DROP TRIGGER IF EXISTS log_teams ON teams;
CREATE TRIGGER log_teams AFTER INSERT OR UPDATE OR DELETE ON teams FOR EACH ROW EXECUTE FUNCTION log_db_operation();

DROP TRIGGER IF EXISTS log_projects ON projects;
CREATE TRIGGER log_projects AFTER INSERT OR UPDATE OR DELETE ON projects FOR EACH ROW EXECUTE FUNCTION log_db_operation();

DROP TRIGGER IF EXISTS log_documents ON documents;
CREATE TRIGGER log_documents AFTER INSERT OR UPDATE OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION log_db_operation();

DROP TRIGGER IF EXISTS log_comments ON comments;
CREATE TRIGGER log_comments AFTER INSERT OR UPDATE OR DELETE ON comments FOR EACH ROW EXECUTE FUNCTION log_db_operation();

DROP TRIGGER IF EXISTS log_tags ON tags;
CREATE TRIGGER log_tags AFTER INSERT OR UPDATE OR DELETE ON tags FOR EACH ROW EXECUTE FUNCTION log_db_operation();
