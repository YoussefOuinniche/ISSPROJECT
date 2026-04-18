-- ============================================================
-- SkillPulse - Full Database Schema + Seed Data
-- Run this against your PostgreSQL / Supabase database
--
-- DATABASE OWNERSHIP NOTE:
-- This file is the root schema authority for the legacy Backend + AI services.
-- Apply structural changes here first, then align service queries/models.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                   VARCHAR(255) UNIQUE NOT NULL,
    password_hash           VARCHAR(255),
    full_name               VARCHAR(255),
    role                    VARCHAR(20) NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
    refresh_token           TEXT,
    reset_password_token    TEXT,
    reset_password_expires  TIMESTAMP,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain              VARCHAR(100),
    title               VARCHAR(255),
    experience_level    VARCHAR(50),   -- 'junior', 'mid', 'senior', 'lead'
    bio                 TEXT,
    explicit_skills     JSONB DEFAULT '[]'::jsonb,
    explicit_target_role VARCHAR(255),
    explicit_education  TEXT,
    explicit_experience TEXT,
    explicit_preferences JSONB DEFAULT '{}'::jsonb,
    last_analysis_at    TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id)
);

-- ============================================================
-- 3. SKILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    category    VARCHAR(100),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 4. USER_SKILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_skills (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id            UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level   VARCHAR(50) DEFAULT 'beginner',  -- 'beginner', 'intermediate', 'advanced', 'expert'
    years_of_experience NUMERIC(4,1) DEFAULT 0,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, skill_id)
);

-- ============================================================
-- 5. SKILL_GAPS
-- ============================================================
CREATE TABLE IF NOT EXISTS skill_gaps (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain      VARCHAR(100),
    skill_name  VARCHAR(255) NOT NULL,
    skill_id    UUID REFERENCES skills(id) ON DELETE SET NULL,
    gap_level   INTEGER CHECK (gap_level BETWEEN 1 AND 5),
    reason      TEXT,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 6. TRENDS
-- ============================================================
CREATE TABLE IF NOT EXISTS trends (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain      VARCHAR(100),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    source      VARCHAR(255),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 7. TREND_SKILLS  (junction: which skills relate to a trend)
-- ============================================================
CREATE TABLE IF NOT EXISTS trend_skills (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trend_id        UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
    skill_id        UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    relevance_score NUMERIC(3,2) DEFAULT 1.00,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE (trend_id, skill_id)
);

-- ============================================================
-- 8. RECOMMENDATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS recommendations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(100),          -- e.g. 'skill', 'trend', 'course'
    title       VARCHAR(255),
    content     TEXT,
    skill_name  VARCHAR(255),
    skill_id    UUID REFERENCES skills(id) ON DELETE SET NULL,
    trend_title VARCHAR(255),
    trend_id    UUID REFERENCES trends(id) ON DELETE SET NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 9. AI CHAT
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id
    ON ai_chat_sessions (user_id);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id
    ON ai_chat_messages (session_id);

-- ============================================================
-- 10. USER_AI_PROFILE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_ai_profile (
    user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ============================================================
-- 11. SKILL_TRENDS
-- ============================================================
CREATE TABLE IF NOT EXISTS skill_trends (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill         VARCHAR(255) NOT NULL,
    demand_score  NUMERIC(5,2) NOT NULL,
    trend         VARCHAR(10) NOT NULL CHECK (trend IN ('up', 'down', 'stable')),
    window_start  TIMESTAMP NOT NULL,
    source_count  INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE (skill, window_start)
);

CREATE INDEX IF NOT EXISTS idx_skill_trends_window_start
    ON skill_trends (window_start DESC);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['users','profiles','skills','user_skills','skill_gaps','trends','recommendations']
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I;
             CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
            t, t, t, t
        );
    END LOOP;
END;
$$;

-- ============================================================
-- ============================================================
--  SEED DATA
-- ============================================================
-- ============================================================

-- ============================================================
-- SEED: Skills
-- ============================================================
INSERT INTO skills (id, name, category) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Python',              'Programming'),
    ('10000000-0000-0000-0000-000000000002', 'JavaScript',          'Programming'),
    ('10000000-0000-0000-0000-000000000003', 'TypeScript',          'Programming'),
    ('10000000-0000-0000-0000-000000000004', 'React',               'Frontend'),
    ('10000000-0000-0000-0000-000000000005', 'Node.js',             'Backend'),
    ('10000000-0000-0000-0000-000000000006', 'PostgreSQL',          'Database'),
    ('10000000-0000-0000-0000-000000000007', 'Docker',              'DevOps'),
    ('10000000-0000-0000-0000-000000000008', 'Machine Learning',    'AI/ML'),
    ('10000000-0000-0000-0000-000000000009', 'Deep Learning',       'AI/ML'),
    ('10000000-0000-0000-0000-000000000010', 'Data Analysis',       'Data Science'),
    ('10000000-0000-0000-0000-000000000011', 'SQL',                 'Database'),
    ('10000000-0000-0000-0000-000000000012', 'Git',                 'DevOps'),
    ('10000000-0000-0000-0000-000000000013', 'REST API Design',     'Backend'),
    ('10000000-0000-0000-0000-000000000014', 'GraphQL',             'Backend'),
    ('10000000-0000-0000-0000-000000000015', 'Kubernetes',          'DevOps'),
    ('10000000-0000-0000-0000-000000000016', 'AWS',                 'Cloud'),
    ('10000000-0000-0000-0000-000000000017', 'Azure',               'Cloud'),
    ('10000000-0000-0000-0000-000000000018', 'Cybersecurity',       'Security'),
    ('10000000-0000-0000-0000-000000000019', 'Agile / Scrum',       'Management'),
    ('10000000-0000-0000-0000-000000000020', 'Communication',       'Soft Skills')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED: Users
--
--  Regular users  →  password : SkillPulse@2026!
--                    bcrypt hash (cost 10) shown below
--
--  ADMIN account  →  email    : admin@skillpulse.io
--                    password : Adm!n@SP#2026
--                    bcrypt hash (cost 12) shown below
-- ============================================================
INSERT INTO users (id, email, password_hash, full_name, role) VALUES
    -- ── The four team members ────────────────────────────────────
    ('20000000-0000-0000-0000-000000000001', 'omar.tentouch@skillpulse.io',    '$2b$10$CfnFCxSeWrKkONM1Vl1E.uoYuHUxOl98M7iMZXk7aBrnP.piTku.O', 'Omar Tentouch',     'user'),
    ('20000000-0000-0000-0000-000000000002', 'tamjid.trabelsi@skillpulse.io',  '$2b$10$CfnFCxSeWrKkONM1Vl1E.uoYuHUxOl98M7iMZXk7aBrnP.piTku.O', 'Tamjid Trabelsi',   'user'),
    ('20000000-0000-0000-0000-000000000003', 'youssef.ouenniche@skillpulse.io','$2b$10$CfnFCxSeWrKkONM1Vl1E.uoYuHUxOl98M7iMZXk7aBrnP.piTku.O', 'Youssef Ouenniche', 'user'),
    ('20000000-0000-0000-0000-000000000004', 'rayen.chanchah@skillpulse.io',   '$2b$10$CfnFCxSeWrKkONM1Vl1E.uoYuHUxOl98M7iMZXk7aBrnP.piTku.O', 'Rayen Chanchah',    'user'),
    -- ── Additional users ─────────────────────────────────────────
    ('20000000-0000-0000-0000-000000000005', 'sara.benmoussa@skillpulse.io',   '$2b$10$CfnFCxSeWrKkONM1Vl1E.uoYuHUxOl98M7iMZXk7aBrnP.piTku.O', 'Sara Benmoussa',    'user'),
    ('20000000-0000-0000-0000-000000000006', 'karim.ajroudi@skillpulse.io',    '$2b$10$CfnFCxSeWrKkONM1Vl1E.uoYuHUxOl98M7iMZXk7aBrnP.piTku.O', 'Karim Ajroudi',     'user'),
    ('20000000-0000-0000-0000-000000000007', 'lina.dridi@skillpulse.io',       '$2b$10$CfnFCxSeWrKkONM1Vl1E.uoYuHUxOl98M7iMZXk7aBrnP.piTku.O', 'Lina Dridi',        'user'),
    ('20000000-0000-0000-0000-000000000008', 'mohamed.khelil@skillpulse.io',   '$2b$10$CfnFCxSeWrKkONM1Vl1E.uoYuHUxOl98M7iMZXk7aBrnP.piTku.O', 'Mohamed Khelil',    'user'),
    ('20000000-0000-0000-0000-000000000009', 'nadia.boukhalfa@skillpulse.io',  '$2b$10$CfnFCxSeWrKkONM1Vl1E.uoYuHUxOl98M7iMZXk7aBrnP.piTku.O', 'Nadia Boukhalfa',   'user'),
    -- ── Admin (cost-12 hash of  Adm!n@SP#2026 ) ─────────────────
    ('20000000-0000-0000-0000-000000000010', 'admin@skillpulse.io',            '$2b$12$52c4.KbFuz0cV2KfzrBuyuQctVBGPKpEyA/cSIoIjsCDuQ.j.QUq2', 'SkillPulse Admin',  'admin')
ON CONFLICT (id) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        role         = EXCLUDED.role;

-- ============================================================
-- SEED: Profiles
-- ============================================================
INSERT INTO profiles (user_id, domain, title, experience_level, bio) VALUES
    ('20000000-0000-0000-0000-000000000001', 'Web Development',  'Full Stack Developer',      'mid',    'Enjoys building end-to-end features and bridging frontend and backend worlds.'),
    ('20000000-0000-0000-0000-000000000002', 'Data Science',     'Data Scientist',            'mid',    'Passionate about statistical modelling and turning data into actionable insights.'),
    ('20000000-0000-0000-0000-000000000003', 'AI/ML',            'ML Engineer',               'senior', 'Specialises in NLP, LLMs, and deploying AI models into production systems.'),
    ('20000000-0000-0000-0000-000000000004', 'Backend',          'Backend Developer',         'mid',    'Focused on scalable APIs, microservices architecture, and database performance.'),
    ('20000000-0000-0000-0000-000000000005', 'Web Development',  'Frontend Developer',        'junior', 'Crafting responsive, accessible UIs with React and modern CSS.'),
    ('20000000-0000-0000-0000-000000000006', 'DevOps',           'DevOps Engineer',           'senior', 'Automates everything: CI/CD, IaC, container orchestration, and cloud cost control.'),
    ('20000000-0000-0000-0000-000000000007', 'Security',         'Cybersecurity Analyst',     'mid',    'Identifies vulnerabilities, conducts penetration tests, and enforces zero-trust policies.'),
    ('20000000-0000-0000-0000-000000000008', 'Cloud',            'Cloud Architect',           'senior', 'Designs multi-region, fault-tolerant cloud architectures on AWS and Azure.'),
    ('20000000-0000-0000-0000-000000000009', 'Management',       'Agile Coach',               'lead',   'Guides teams through Agile transformations, retrospectives, and OKR alignment.'),
    ('20000000-0000-0000-0000-000000000010', 'Management',       'Platform Administrator',    'lead',   'Oversees the SkillPulse platform, manages users, content, and system health.')
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- SEED: User Skills
-- ============================================================
INSERT INTO user_skills (user_id, skill_id, proficiency_level, years_of_experience) VALUES
    -- Omar Tentouch (Full Stack)
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'advanced',     4.0),  -- JavaScript
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'advanced',     3.0),  -- TypeScript
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'advanced',     3.5),  -- React
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'intermediate', 2.0),  -- Node.js
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000012', 'intermediate', 4.0),  -- Git
    -- Tamjid Trabelsi (Data Scientist)
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'advanced',     3.0),  -- Python
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000010', 'advanced',     3.0),  -- Data Analysis
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000011', 'intermediate', 2.5),  -- SQL
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000008', 'intermediate', 2.0),  -- Machine Learning
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000012', 'intermediate', 3.0),  -- Git
    -- Youssef Ouenniche (ML Engineer)
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'expert',       5.0),  -- Python
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000008', 'expert',       4.0),  -- Machine Learning
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000009', 'advanced',     3.0),  -- Deep Learning
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000010', 'advanced',     4.0),  -- Data Analysis
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000007', 'intermediate', 2.0),  -- Docker
    -- Rayen Chanchah (Backend Developer)
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005', 'advanced',     4.0),  -- Node.js
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006', 'advanced',     3.5),  -- PostgreSQL
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000013', 'advanced',     4.0),  -- REST API Design
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000014', 'intermediate', 2.0),  -- GraphQL
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000012', 'advanced',     4.0),  -- Git
    -- Sara Benmoussa (Frontend Developer)
    ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'intermediate', 1.5),  -- JavaScript
    ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', 'intermediate', 1.5),  -- React
    ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000012', 'beginner',     1.0),  -- Git
    -- Karim Ajroudi (DevOps Engineer)
    ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000007', 'expert',       6.0),  -- Docker
    ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000015', 'expert',       5.0),  -- Kubernetes
    ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000016', 'advanced',     5.0),  -- AWS
    ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000012', 'expert',       6.0),  -- Git
    ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000019', 'advanced',     4.0),  -- Agile
    -- Lina Dridi (Cybersecurity Analyst)
    ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000018', 'advanced',     4.0),  -- Cybersecurity
    ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'intermediate', 2.0),  -- Python
    ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000011', 'intermediate', 3.0),  -- SQL
    -- Mohamed Khelil (Cloud Architect)
    ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000016', 'expert',       7.0),  -- AWS
    ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000017', 'advanced',     5.0),  -- Azure
    ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000015', 'advanced',     5.0),  -- Kubernetes
    ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000007', 'advanced',     5.0),  -- Docker
    -- Nadia Boukhalfa (Agile Coach)
    ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000019', 'expert',       8.0),  -- Agile / Scrum
    ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000020', 'expert',       8.0),  -- Communication
    ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', 'beginner',     0.5)   -- Python (learning)
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- ============================================================
-- Trends are intentionally not seeded.
-- Source of truth: external ingestion pipeline -> public.trends
-- ============================================================

-- ============================================================
-- SEED: Skill Gaps
-- ============================================================
INSERT INTO skill_gaps (user_id, domain, skill_name, skill_id, gap_level, reason) VALUES
    -- Omar Tentouch
    ('20000000-0000-0000-0000-000000000001', 'Database',     'PostgreSQL',       '10000000-0000-0000-0000-000000000006', 3, 'Needs deeper knowledge of query optimisation and indexing strategies.'),
    ('20000000-0000-0000-0000-000000000001', 'DevOps',       'Docker',           '10000000-0000-0000-0000-000000000007', 2, 'Uses Docker for local dev but has not managed multi-container production setups.'),
    -- Tamjid Trabelsi
    ('20000000-0000-0000-0000-000000000002', 'AI/ML',        'Deep Learning',    '10000000-0000-0000-0000-000000000009', 4, 'Understands the theory but has not built or fine-tuned neural networks in production.'),
    ('20000000-0000-0000-0000-000000000002', 'Cloud',        'AWS',              '10000000-0000-0000-0000-000000000016', 3, 'No hands-on experience deploying data pipelines on cloud infrastructure.'),
    -- Youssef Ouenniche
    ('20000000-0000-0000-0000-000000000003', 'DevOps',       'Kubernetes',       '10000000-0000-0000-0000-000000000015', 4, 'Limited experience orchestrating ML workloads on K8s at scale.'),
    ('20000000-0000-0000-0000-000000000003', 'Backend',      'REST API Design',  '10000000-0000-0000-0000-000000000013', 2, 'Primarily focused on model development; API design skills need strengthening.'),
    -- Rayen Chanchah
    ('20000000-0000-0000-0000-000000000004', 'AI/ML',        'Machine Learning', '10000000-0000-0000-0000-000000000008', 3, 'Wants to integrate ML inference into backend services but lacks foundational ML knowledge.'),
    ('20000000-0000-0000-0000-000000000004', 'DevOps',       'Docker',           '10000000-0000-0000-0000-000000000007', 2, 'Containerisation knowledge is basic; needs production-level Docker skills.'),
    -- Sara Benmoussa
    ('20000000-0000-0000-0000-000000000005', 'Programming',  'TypeScript',       '10000000-0000-0000-0000-000000000003', 4, 'Works in JavaScript only; TypeScript adoption is a team requirement.'),
    ('20000000-0000-0000-0000-000000000005', 'Backend',      'Node.js',          '10000000-0000-0000-0000-000000000005', 3, 'No backend development experience; wants to become full-stack.'),
    -- Lina Dridi
    ('20000000-0000-0000-0000-000000000007', 'Cloud',        'AWS',              '10000000-0000-0000-0000-000000000016', 4, 'Cloud security posture management requires deeper AWS IAM and VPC knowledge.'),
    ('20000000-0000-0000-0000-000000000007', 'DevOps',       'Kubernetes',       '10000000-0000-0000-0000-000000000015', 3, 'Container security hardening requires stronger K8s fundamentals.'),
    -- Nadia Boukhalfa
    ('20000000-0000-0000-0000-000000000009', 'Programming',  'Python',           '10000000-0000-0000-0000-000000000001', 3, 'Wants to automate reporting and analysis tasks but Python skills are beginner-level.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: Recommendations
-- ============================================================
INSERT INTO recommendations (user_id, type, title, content, skill_name, skill_id, trend_title, trend_id) VALUES
    -- Omar Tentouch
    ('20000000-0000-0000-0000-000000000001', 'skill', 'Master PostgreSQL Query Optimisation',
     'Study execution plans with EXPLAIN ANALYSE, learn indexing strategies, and practise on real datasets to close your database gap.',
     'PostgreSQL', '10000000-0000-0000-0000-000000000006', NULL, NULL),
    -- Tamjid Trabelsi
    ('20000000-0000-0000-0000-000000000002', 'skill', 'Build Your First Neural Network with PyTorch',
     'Start with the fast.ai course to bridge the gap between ML theory and hands-on deep learning practice.',
     'Deep Learning', '10000000-0000-0000-0000-000000000009', NULL, NULL),

    -- Youssef Ouenniche
    ('20000000-0000-0000-0000-000000000003', 'skill', 'Deploy ML Models with Kubernetes',
     'Pursue the CKA certification path and explore KubeFlow to orchestrate your ML pipelines reliably at scale.',
     'Kubernetes', '10000000-0000-0000-0000-000000000015', NULL, NULL),

    -- Rayen Chanchah
    ('20000000-0000-0000-0000-000000000004', 'skill', 'Integrate ML Inference into Your APIs',
     'Take the Coursera ML Specialisation to understand the fundamentals, then serve scikit-learn or ONNX models via your existing Node.js/Express APIs.',
     'Machine Learning', '10000000-0000-0000-0000-000000000008', NULL, NULL),

    -- Sara Benmoussa
    ('20000000-0000-0000-0000-000000000005', 'skill', 'Adopt TypeScript in Your React Projects',
     'Migrate one existing React component to TypeScript, use the official TS handbook as a reference, and leverage VS Code IntelliSense for a smooth transition.',
     'TypeScript', '10000000-0000-0000-0000-000000000003', NULL, NULL),

    -- Lina Dridi
    ('20000000-0000-0000-0000-000000000007', 'skill', 'AWS Security Specialisation',
     'Study AWS IAM, Security Hub, and GuardDuty. The AWS Security Specialty certification will directly address your cloud security skill gap.',
     'AWS', '10000000-0000-0000-0000-000000000016', NULL, NULL),

    -- Nadia Boukhalfa
    ('20000000-0000-0000-0000-000000000009', 'skill', 'Automate Agile Reporting with Python',
     'Learn Python scripting through "Automate the Boring Stuff", then use pandas and Jira APIs to automate your sprint reports and OKR dashboards.',
     'Python', '10000000-0000-0000-0000-000000000001', NULL, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Done!  All tables created and populated with seed data.
-- ============================================================
