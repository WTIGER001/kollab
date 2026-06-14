CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    team_id VARCHAR(255) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    project_id VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
    parent_id VARCHAR(255) REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    embedding vector(768)
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding vector(768);

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

-- Seed Teams
INSERT INTO teams (id, name) VALUES 
('team_arkloud', 'Arkloud'),
('team_eng', 'Engineering'),
('team_mkt', 'Marketing')
ON CONFLICT (id) DO NOTHING;

-- Seed Users
INSERT INTO users (id, username, password_hash) VALUES
('sh4ag0cxowti', 'sh4ag0cxowti', '$2a$10$UnXg804xZ0s9p4lBqG09Nu9c3zF1mQJqQ7j3x9y9z9.8h8g8g8g8g'),
('mock-user-id', 'mock-user', '$2a$10$UnXg804xZ0s9p4lBqG09Nu9c3zF1mQJqQ7j3x9y9z9.8h8g8g8g8g')
ON CONFLICT (id) DO NOTHING;

-- Seed Team Members
INSERT INTO team_members (team_id, user_id) VALUES
('team_arkloud', 'sh4ag0cxowti'),
('team_eng', 'mock-user-id')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Seed Projects
INSERT INTO projects (id, name, team_id) VALUES 
('proj_arkollab_test', 'Arkollab Test', 'team_arkloud'),
('proj_wiki', 'Engineering Wiki', 'team_eng'),
('proj_roadmap', 'Product Roadmap', 'team_eng'),
('proj_campaign', 'Summer Launch 2026', 'team_mkt')
ON CONFLICT (id) DO NOTHING;

-- Seed Documents
INSERT INTO documents (id, title, content, project_id, parent_id, created_at, updated_at) VALUES 
('doc_welcome_arkloud', 'Welcome to Arkollab Test Workspace', '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Welcome to your Arkloud Workspace!"}]},{"type":"paragraph","content":[{"type":"text","text":"This workspace is backed by Logto OIDC authentication and PostgreSQL. Create pages, layouts, and document tables."}]}]}', 'proj_arkollab_test', NULL, NOW(), NOW()),
('doc_welcome_eng', 'Welcome to Engineering Wiki', '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Welcome to the Engineering Wiki!"}]},{"type":"paragraph","content":[{"type":"text","text":"This is the collaborative home for all our software design specifications, API endpoints, and architectures. Use the ''/'' command to insert templates, status indicator widgets, and column layouts."}]}]}', 'proj_wiki', NULL, NOW(), NOW()),
('doc_guides_eng', 'Developer Style Guides', '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Coding Guidelines"}]},{"type":"paragraph","content":[{"type":"text","text":"Please follow clean architecture principles, write Go code that compiles cleanly, and ensure frontend layouts follow modern responsive design patterns."}]}]}', 'proj_wiki', NULL, NOW() - INTERVAL '2 hours', NOW()),
('doc_welcome_roadmap', 'Product Roadmap Overview', '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Product Roadmap Q3/Q4"}]},{"type":"paragraph","content":[{"type":"text","text":"Below is our roadmap schedule mapping out critical features, database models, and target deployments."}]}]}', 'proj_roadmap', NULL, NOW(), NOW()),
('doc_welcome_mkt', 'Summer Launch 2026', '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Summer Launch Campaign Kickoff"}]},{"type":"paragraph","content":[{"type":"text","text":"Review our key assets, marketing target audiences, and press releases for the upcoming launch event."}]}]}', 'proj_campaign', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
