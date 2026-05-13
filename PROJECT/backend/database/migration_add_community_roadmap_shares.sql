-- Community sharing for completed roadmaps.

CREATE TABLE IF NOT EXISTS community_roadmap_shares (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roadmap_id      UUID NOT NULL REFERENCES ai_roadmaps(id) ON DELETE CASCADE,
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    summary         TEXT,
    completed_steps INTEGER NOT NULL DEFAULT 0 CHECK (completed_steps >= 0),
    total_steps     INTEGER NOT NULL DEFAULT 0 CHECK (total_steps >= 0),
    is_public       BOOLEAN NOT NULL DEFAULT TRUE,
    shared_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (roadmap_id)
);

CREATE INDEX IF NOT EXISTS idx_community_roadmap_shares_public_shared
    ON community_roadmap_shares (is_public, shared_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_roadmap_shares_profile
    ON community_roadmap_shares (profile_id, shared_at DESC);

DROP TRIGGER IF EXISTS trg_community_roadmap_shares_updated_at ON community_roadmap_shares;
CREATE TRIGGER trg_community_roadmap_shares_updated_at
BEFORE UPDATE ON community_roadmap_shares
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
