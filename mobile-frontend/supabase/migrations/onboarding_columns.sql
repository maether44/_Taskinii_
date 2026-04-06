-- Add missing onboarding columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender          TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth   DATE,
  ADD COLUMN IF NOT EXISTS height_cm       NUMERIC,
  ADD COLUMN IF NOT EXISTS weight_kg       NUMERIC,
  ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS goal            TEXT,
  ADD COLUMN IF NOT EXISTS activity_level  TEXT,
  ADD COLUMN IF NOT EXISTS onboarded       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS experience      TEXT,
  ADD COLUMN IF NOT EXISTS equipment       TEXT,
  ADD COLUMN IF NOT EXISTS preferred_workout_time TEXT,
  ADD COLUMN IF NOT EXISTS sleep_quality   TEXT,
  ADD COLUMN IF NOT EXISTS stress_level    TEXT,
  ADD COLUMN IF NOT EXISTS diet_pref       TEXT;

-- Create calorie_targets table if it doesn't exist
CREATE TABLE IF NOT EXISTS calorie_targets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_calories   INT  NOT NULL,
  protein_target   INT  NOT NULL,
  effective_from   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS calorie_targets_user_date
  ON calorie_targets(user_id, effective_from DESC);
