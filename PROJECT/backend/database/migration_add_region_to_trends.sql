-- Add region column to job_market_trends for Global / Tunisia split
ALTER TABLE public.job_market_trends ADD COLUMN IF NOT EXISTS region text DEFAULT 'global';
UPDATE public.job_market_trends SET region = 'global' WHERE region IS NULL;

-- Seed Tunisia-specific trending demand (uses slugs so safe to run multiple times)
INSERT INTO public.job_market_trends (job_role_id, growth_percentage, openings_count, demand_index, region, last_analyzed_at)
SELECT jr.id, tndata.growth, tndata.openings, tndata.demand, 'tn', NOW()
FROM (VALUES
  ('frontend-developer',   45, 312, 'surging'),
  ('full-stack-developer', 52, 428, 'surging'),
  ('react-developer',      41, 267, 'surging'),
  ('python-developer',     38, 245, 'surging'),
  ('node-developer',       29, 201, 'stable'),
  ('data-scientist',       33, 187, 'stable'),
  ('data-analyst',         27, 143, 'stable'),
  ('devops-engineer',      25, 134, 'stable'),
  ('mobile-developer',     22, 156, 'stable'),
  ('ui-designer',          19, 112, 'stable'),
  ('backend-developer',    35, 298, 'surging'),
  ('machine-learning-engineer', 48, 89, 'surging')
) AS tndata(slug, growth, openings, demand)
JOIN public.job_roles jr ON jr.slug = tndata.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.job_market_trends jmt2
  WHERE jmt2.job_role_id = jr.id AND jmt2.region = 'tn'
);
