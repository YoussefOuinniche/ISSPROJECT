CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
