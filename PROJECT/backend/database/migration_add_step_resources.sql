-- Multi-platform learning resources per roadmap step.
-- Mobile renders these as a Coursera/Udemy/YouTube grid in the focused
-- step's drawer. When empty, the mobile client falls back to synthesizing
-- platform search URLs from the step title, so the UI degrades gracefully
-- before the AI service starts populating real curated links.
--
-- Shape per element:
--   { provider: 'coursera' | 'udemy' | 'youtube' | 'edx' | 'other',
--     title: string,
--     url: string,
--     free?: boolean }

ALTER TABLE ai_roadmap_steps
ADD COLUMN IF NOT EXISTS resources jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN ai_roadmap_steps.resources IS
  'Curated learning resources for this step (Coursera/Udemy/YouTube/etc). '
  'Mobile UI synthesizes search-URL fallbacks when empty.';
