-- ============================================================
-- MIGRATION: Job Aggregation Layer
-- Tables: raw_jobs, normalized_jobs, trending_snapshots
-- ============================================================


-- ============================================================
-- 1. RAW_JOBS
-- ============================================================

CREATE TABLE public.raw_jobs (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id text        NOT NULL,
    source      text        NOT NULL
                                CHECK (source IN ('adzuna', 'remoteok', 'keejob', 'bayt', 'optioncarriere')),
    raw_payload jsonb       NOT NULL DEFAULT '{}',
    fetched_at  timestamptz NOT NULL DEFAULT now(),
    is_processed boolean    NOT NULL DEFAULT false,
    CONSTRAINT raw_jobs_source_external_id_key UNIQUE (source, external_id)
);

CREATE INDEX idx_raw_jobs_source       ON public.raw_jobs(source);
CREATE INDEX idx_raw_jobs_is_processed ON public.raw_jobs(is_processed) WHERE is_processed = false;
CREATE INDEX idx_raw_jobs_fetched_at   ON public.raw_jobs(fetched_at DESC);


-- ============================================================
-- 2. NORMALIZED_JOBS
-- ============================================================

CREATE TABLE public.normalized_jobs (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_job_id       uuid        NOT NULL REFERENCES public.raw_jobs(id) ON DELETE CASCADE,
    title            text        NOT NULL,
    company          text,
    location         text,
    country_code     text,
    salary_min       numeric,
    salary_max       numeric,
    salary_currency  text,
    description      text,
    tags             text[],
    is_remote        boolean     NOT NULL DEFAULT false,
    source           text,
    source_url       text,
    date_posted      timestamptz,
    popularity_score numeric     NOT NULL DEFAULT 0,
    is_trending      boolean     NOT NULL DEFAULT false,
    ai_summary       text,
    ai_tags          jsonb,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_normalized_jobs_country_code ON public.normalized_jobs(country_code);
CREATE INDEX idx_normalized_jobs_source       ON public.normalized_jobs(source);
CREATE INDEX idx_normalized_jobs_is_trending  ON public.normalized_jobs(is_trending) WHERE is_trending = true;
CREATE INDEX idx_normalized_jobs_date_posted  ON public.normalized_jobs(date_posted DESC);
CREATE INDEX idx_normalized_jobs_tags_gin     ON public.normalized_jobs USING gin(tags);
CREATE INDEX idx_normalized_jobs_raw_job_id   ON public.normalized_jobs(raw_job_id);

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.normalized_jobs
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ============================================================
-- 3. TRENDING_SNAPSHOTS
-- ============================================================

CREATE TABLE public.trending_snapshots (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_at    timestamptz NOT NULL DEFAULT now(),
    region         text        NOT NULL
                                   CHECK (region IN ('global', 'tn')),
    trending_data  jsonb       NOT NULL DEFAULT '[]',
    generated_by   text        NOT NULL
                                   CHECK (generated_by IN ('cron', 'manual'))
);

CREATE INDEX idx_trending_snapshots_region      ON public.trending_snapshots(region);
CREATE INDEX idx_trending_snapshots_snapshot_at ON public.trending_snapshots(snapshot_at DESC);


-- ============================================================
-- 4. DEDUPLICATION FUNCTION
-- Removes older duplicate normalized_jobs rows sharing the
-- same title + company + date_posted, keeping the newest id.
-- ============================================================

CREATE OR REPLACE FUNCTION deduplicate_normalized_jobs()
RETURNS void AS $$
BEGIN
    DELETE FROM public.normalized_jobs nj
    WHERE nj.id NOT IN (
        SELECT DISTINCT ON (title, company, date_posted) id
        FROM public.normalized_jobs
        ORDER BY title, company, date_posted, created_at DESC
    );
END;
$$ LANGUAGE plpgsql;
