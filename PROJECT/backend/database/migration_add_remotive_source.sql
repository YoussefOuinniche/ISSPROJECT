-- Adds 'remotive' to the allowed raw_jobs.source CHECK list so the
-- Remotive seeder can write directly into raw_jobs / normalized_jobs.
--
-- Re-runnable: drops the old constraint by its conventional name if it
-- exists, then recreates it with the wider set of values.

ALTER TABLE public.raw_jobs DROP CONSTRAINT IF EXISTS raw_jobs_source_check;

ALTER TABLE public.raw_jobs
    ADD CONSTRAINT raw_jobs_source_check
    CHECK (source IN ('adzuna', 'remoteok', 'keejob', 'bayt', 'optioncarriere', 'remotive'));
