-- Seed Teams
INSERT INTO teams (id, name, abbreviation, description) VALUES 
('team_arkloud', 'Arkloud', 'arkloud', 'Main organization workspace'),
('team_eng', 'Engineering', 'eng', 'Engineering & Development department'),
('team_mkt', 'Marketing', 'mkt', 'Brand & Launch campaign team')
ON CONFLICT (id) DO NOTHING;

-- Seed Users
INSERT INTO users (id, username, password_hash, display_name, email) VALUES
('sh4ag0cxowti', 'sh4ag0cxowti', '$2a$10$UnXg804xZ0s9p4lBqG09Nu9c3zF1mQJqQ7j3x9y9z9.8h8g8g8g8g', 'John Bauer', 'john.bauerii@gmail.com'),
('mock-user-id', 'mock-user', '$2a$10$UnXg804xZ0s9p4lBqG09Nu9c3zF1mQJqQ7j3x9y9z9.8h8g8g8g8g', 'Mock User', 'mock-user@example.com')
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    email = EXCLUDED.email;

-- Seed Team Members
INSERT INTO team_members (team_id, user_id) VALUES
('team_arkloud', 'sh4ag0cxowti'),
('team_eng', 'mock-user-id')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Seed Projects
INSERT INTO projects (id, name, team_id, logo_url, abbreviation, description) VALUES 
('proj_arkollab_test', 'Arkollab Test', 'team_arkloud', '', 'arkollab', 'Arkollab team collaborative testing sandbox'),
('proj_wiki', 'Engineering Wiki', 'team_eng', '', 'wiki', 'Technical specifications and style guides'),
('proj_roadmap', 'Product Roadmap', 'team_eng', '', 'roadmap', 'Product roadmap timeline and schedule'),
('proj_campaign', 'Summer Launch 2026', 'team_mkt', '', 'campaign', 'Summer launch assets and press releases')
ON CONFLICT (id) DO NOTHING;

-- Seed Documents
INSERT INTO documents (id, title, content, project_id, team_id, parent_id, created_at, updated_at, created_by, updated_by) VALUES 
('doc_welcome_arkloud', 'Welcome to Arkollab Test Workspace', '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Welcome to your Arkloud Workspace!"}]},{"type":"paragraph","content":[{"type":"text","text":"This workspace is backed by Logto OIDC authentication and PostgreSQL. Create pages, layouts, and document tables."}]}]}', 'proj_arkollab_test', 'team_arkloud', NULL, NOW(), NOW(), 'sh4ag0cxowti', 'sh4ag0cxowti'),
('doc_welcome_eng', 'Welcome to Engineering Wiki', '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Welcome to the Engineering Wiki!"}]},{"type":"paragraph","content":[{"type":"text","text":"This is the collaborative home for all our software design specifications, API endpoints, and architectures. Use the ''/'' command to insert templates, status indicator widgets, and column layouts."}]}]}', 'proj_wiki', 'team_eng', NULL, NOW(), NOW(), 'sh4ag0cxowti', 'sh4ag0cxowti'),
('doc_guides_eng', 'Developer Style Guides', '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Coding Guidelines"}]},{"type":"paragraph","content":[{"type":"text","text":"Please follow clean architecture principles, write Go code that compiles cleanly, and ensure frontend layouts follow modern responsive design patterns."}]}]}', 'proj_wiki', 'team_eng', NULL, NOW() - INTERVAL '2 hours', NOW(), 'sh4ag0cxowti', 'sh4ag0cxowti'),
('doc_welcome_roadmap', 'Product Roadmap Overview', '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Product Roadmap Q3/Q4"}]},{"type":"paragraph","content":[{"type":"text","text":"Below is our roadmap schedule mapping out critical features, database models, and target deployments."}]}]}', 'proj_roadmap', 'team_eng', NULL, NOW(), NOW(), 'sh4ag0cxowti', 'sh4ag0cxowti'),
('doc_welcome_mkt', 'Summer Launch 2026', '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Summer Launch Campaign Kickoff"}]},{"type":"paragraph","content":[{"type":"text","text":"Review our key assets, marketing target audiences, and press releases for the upcoming launch event."}]}]}', 'proj_campaign', 'team_mkt', NULL, NOW(), NOW(), 'sh4ag0cxowti', 'sh4ag0cxowti')
ON CONFLICT (id) DO NOTHING;

-- Seed Tags
INSERT INTO tags (id, name, description, color) VALUES
('tag_engineering', 'engineering', 'Technical designs and software engineering docs', '#3b82f6'),
('tag_tutorial', 'tutorial', 'Step-by-step learning guides', '#10b981'),
('tag_meeting', 'meeting-notes', 'Notes and action items from sync meetings', '#8b5cf6')
ON CONFLICT (id) DO NOTHING;

-- Seed Document Tags
INSERT INTO document_tags (document_id, tag_id) VALUES
('doc_guides_eng', 'tag_engineering'),
('doc_guides_eng', 'tag_tutorial'),
('doc_welcome_roadmap', 'tag_meeting')
ON CONFLICT (document_id, tag_id) DO NOTHING;

