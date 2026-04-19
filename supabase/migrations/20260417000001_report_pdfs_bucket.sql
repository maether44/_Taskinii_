-- =============================================================================
-- Migration: report-pdfs private storage bucket
-- File: supabase/migrations/20260417000001_report_pdfs_bucket.sql
--
-- PURPOSE
--   Creates a PRIVATE storage bucket for generated PDF reports.
--   Access is via signed URLs only (generated server-side, 1h TTL).
--   Path convention: {user_id}/{report_type}/{period_start}.pdf
--
--   Service role uploads/deletes files. No direct client access policies.
--   Users never touch storage directly — they get fresh signed URLs from
--   the generate-report edge function.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('report-pdfs', 'report-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Service role (used by edge functions) bypasses RLS automatically.
-- Authenticated users can read their own reports (needed for createSignedUrl).
DROP POLICY IF EXISTS "users_read_own_reports" ON storage.objects;
CREATE POLICY "users_read_own_reports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'report-pdfs'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );
