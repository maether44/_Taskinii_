-- =============================================================================
-- Migration: user_reports table
-- File: supabase/migrations/20260417000000_user_reports.sql
--
-- PURPOSE
--   Stores generated PDF report metadata for weekly/monthly/quarterly reports.
--   RLS ensures users can only access their own rows.
--   Rows are never deleted — only soft-expired via is_expired flag.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_reports (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type    text        NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'quarterly', 'biannual', 'yearly')),
  period_start   date        NOT NULL,
  period_end     date        NOT NULL,
  storage_path   text        NOT NULL,
  narrative      text,
  status         text        NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'available', 'failed', 'expired')),
  is_expired     boolean     NOT NULL DEFAULT false,
  expires_at     timestamptz NOT NULL,
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_reports_user_type_idx
  ON user_reports (user_id, report_type, created_at DESC);

CREATE INDEX IF NOT EXISTS user_reports_expires_at_idx
  ON user_reports (expires_at)
  WHERE is_expired = false;

ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Users can read their own reports
DROP POLICY IF EXISTS "users_read_own_reports" ON user_reports;
CREATE POLICY "users_read_own_reports"
  ON user_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own reports (via edge function with user JWT)
DROP POLICY IF EXISTS "users_insert_own_reports" ON user_reports;
CREATE POLICY "users_insert_own_reports"
  ON user_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role needs update access for status changes and expiry
-- (service_role bypasses RLS by default, but explicit policy for JWT-auth'd updates)
DROP POLICY IF EXISTS "users_update_own_reports" ON user_reports;
CREATE POLICY "users_update_own_reports"
  ON user_reports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_user_reports_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_reports_updated_at ON user_reports;
CREATE TRIGGER trg_user_reports_updated_at
  BEFORE UPDATE ON user_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reports_updated_at();
