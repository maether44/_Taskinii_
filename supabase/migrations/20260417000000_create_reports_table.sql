-- =============================================================================
-- Migration: Create reports table for in-app problem reports
-- =============================================================================

CREATE TABLE IF NOT EXISTS reports (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_type text        NOT NULL,
  subject    text        NOT NULL,
  details    text        NOT NULL,
  status     text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports
  DROP CONSTRAINT IF EXISTS reports_user_id_profiles_fkey;

ALTER TABLE reports
  ADD CONSTRAINT reports_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS reports_user_created_at_idx
  ON reports (user_id, created_at DESC);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_reports" ON reports;
CREATE POLICY "users_manage_own_reports"
  ON reports FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
