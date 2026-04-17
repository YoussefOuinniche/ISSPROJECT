-- ============================================================
-- MIGRATION: Align role_salaries and role_demand with
--            country_code-based live ingestion + upsert targets
-- ============================================================

ALTER TABLE public.role_salaries
    ADD COLUMN IF NOT EXISTS country_code TEXT;

UPDATE public.role_salaries
SET country_code = UPPER(country)
WHERE country_code IS NULL
  AND country IS NOT NULL;

ALTER TABLE public.role_salaries
    ALTER COLUMN country_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_role_salaries_role_country_code
    ON public.role_salaries (role_slug, country_code);

CREATE INDEX IF NOT EXISTS idx_role_salaries_role_country_code_lookup
    ON public.role_salaries (role_slug, country_code);

ALTER TABLE public.role_demand
    ADD COLUMN IF NOT EXISTS country_code TEXT;

UPDATE public.role_demand
SET country_code = UPPER(country)
WHERE country_code IS NULL
  AND country IS NOT NULL;

ALTER TABLE public.role_demand
    ALTER COLUMN country_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_role_demand_role_country_code
    ON public.role_demand (role_slug, country_code);

CREATE INDEX IF NOT EXISTS idx_role_demand_role_country_code_lookup
    ON public.role_demand (role_slug, country_code);
