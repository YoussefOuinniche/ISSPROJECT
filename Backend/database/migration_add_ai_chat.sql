CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS chat_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_history_user_created_at
    ON chat_history (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_ai_profile (
    user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile_json JSONB NOT NULL DEFAULT '{}'::jsonb
);
