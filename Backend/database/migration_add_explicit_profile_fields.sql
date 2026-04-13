ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS explicit_skills JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS explicit_target_role VARCHAR(255),
  ADD COLUMN IF NOT EXISTS explicit_education TEXT,
  ADD COLUMN IF NOT EXISTS explicit_experience TEXT,
  ADD COLUMN IF NOT EXISTS explicit_preferences JSONB DEFAULT '{}'::jsonb;
