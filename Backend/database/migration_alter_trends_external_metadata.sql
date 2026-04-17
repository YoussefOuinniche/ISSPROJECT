-- ============================================================
-- MIGRATION: Extend trends for external news/trend metadata
-- ============================================================

ALTER TABLE public.trends
    ADD COLUMN IF NOT EXISTS source_name  TEXT,
    ADD COLUMN IF NOT EXISTS source_url   TEXT,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS scraped_at   TIMESTAMPTZ;
