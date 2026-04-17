-- ============================================================
-- MIGRATION: Add role_salaries table for dynamic external salary data
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.role_salaries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_slug    TEXT NOT NULL,
    country      TEXT NOT NULL,
    seniority    TEXT,
    avg_salary   NUMERIC,
    currency     TEXT,
    source_name  TEXT,
    source_url   TEXT,
    collected_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Required uniqueness across source snapshots per role/country/seniority/source.
CREATE UNIQUE INDEX IF NOT EXISTS uq_role_salaries_role_country_seniority_source
    ON public.role_salaries (role_slug, country, seniority, source_name);

CREATE INDEX IF NOT EXISTS idx_role_salaries_role_slug
    ON public.role_salaries (role_slug);

CREATE INDEX IF NOT EXISTS idx_role_salaries_country
    ON public.role_salaries (country);

-- Optional composite index for common role+country lookups.
CREATE INDEX IF NOT EXISTS idx_role_salaries_role_country
    ON public.role_salaries (role_slug, country);

-- Reuse existing updated_at trigger function if present; create only if missing.
DO $$
BEGIN
    IF to_regprocedure('public.update_updated_at_column()') IS NULL THEN
        CREATE OR REPLACE FUNCTION public.update_updated_at_column()
        RETURNS TRIGGER AS $fn$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;
    END IF;
END;
$$;

-- Create role_salaries updated_at trigger only if not already present.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE t.tgname = 'trg_role_salaries_updated_at'
          AND n.nspname = 'public'
          AND c.relname = 'role_salaries'
          AND NOT t.tgisinternal
    ) THEN
        CREATE TRIGGER trg_role_salaries_updated_at
        BEFORE UPDATE ON public.role_salaries
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END;
$$;
