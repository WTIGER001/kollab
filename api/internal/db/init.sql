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
    parent_id VARCHAR(255) REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    updated_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;

-- Seed Teams
INSERT INTO teams (id, name, abbreviation, description) VALUES 
('team_eng', 'Engineering', 'eng', 'Engineering & Development department'),
('team_mkt', 'Marketing', 'mkt', 'Brand & Launch campaign team')
ON CONFLICT (id) DO NOTHING;

-- Seed Projects
INSERT INTO projects (id, name, team_id, logo_url, abbreviation, description) VALUES 
('proj_wiki', 'Engineering Wiki', 'team_eng', '', 'wiki', 'Technical specifications and style guides'),
('proj_roadmap', 'Product Roadmap', 'team_eng', '', 'roadmap', 'Product roadmap timeline and schedule'),
('proj_campaign', 'Summer Launch 2026', 'team_mkt', '', 'campaign', 'Summer launch assets and press releases')
ON CONFLICT (id) DO NOTHING;

-- Seed Documents
INSERT INTO documents (id, title, content, project_id, parent_id, created_at, updated_at) VALUES 
('doc_welcome_eng', 'Welcome to Engineering Wiki', '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Welcome to the Engineering Wiki!"}]},{"type":"paragraph","content":[{"type":"text","text":"This is the collaborative home for all our software design specifications, API endpoints, and architectures. Use the ''/'' command to insert templates, status indicator widgets, and column layouts."}]}]}', 'proj_wiki', NULL, NOW(), NOW()),
('doc_guides_eng', 'Developer Style Guides', '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Coding Guidelines"}]},{"type":"paragraph","content":[{"type":"text","text":"Please follow clean architecture principles, write Go code that compiles cleanly, and ensure frontend layouts follow modern responsive design patterns."}]}]}', 'proj_wiki', NULL, NOW() - INTERVAL '2 hours', NOW()),
('doc_welcome_roadmap', 'Product Roadmap Overview', '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Product Roadmap Q3/Q4"}]},{"type":"paragraph","content":[{"type":"text","text":"Below is our roadmap schedule mapping out critical features, database models, and target deployments."}]}]}', 'proj_roadmap', NULL, NOW(), NOW()),
('doc_welcome_mkt', 'Summer Launch 2026', '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Summer Launch Campaign Kickoff"}]},{"type":"paragraph","content":[{"type":"text","text":"Review our key assets, marketing target audiences, and press releases for the upcoming launch event."}]}]}', 'proj_campaign', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

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
