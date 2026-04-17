-- =============================================================================
-- Migration: Allow admins to read all user reports
-- =============================================================================

DROP POLICY IF EXISTS "admins_read_all_reports" ON reports;

CREATE POLICY "admins_read_all_reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );
