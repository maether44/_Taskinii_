-- =============================================================================
-- Migration: pg_cron jobs for auto-generating all performance reports
-- File: supabase/migrations/20260417000002_pg_cron_weekly_reports.sql
--
-- PURPOSE
--   Schedules automatic report generation for all active users:
--     - Weekly:     every Sunday at 20:00 UTC
--     - Monthly:    1st of each month at 02:00 UTC
--     - Quarterly:  1st of Jan/Apr/Jul/Oct at 03:00 UTC
--     - Biannual:   1st of Jan/Jul at 04:00 UTC
--     - Yearly:     Jan 1st at 05:00 UTC
--   Also schedules daily cleanup of expired reports at 03:00 UTC.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── Helper: generate reports for all active users ───────────────────────────
-- Reusable across all cron schedules. Calls the generate-report edge function
-- for each user who has logged any activity in the last 30 days.

CREATE OR REPLACE FUNCTION trigger_report_generation(p_report_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_url     text;
  v_key     text;
BEGIN
  v_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/generate-report';
  v_key := current_setting('app.settings.service_role_key', true);

  FOR v_user_id IN
    SELECT DISTINCT da.user_id
    FROM daily_activity da
    WHERE da.date >= CURRENT_DATE - INTERVAL '30 days'
      AND (COALESCE(da.steps, 0) > 0 OR COALESCE(da.sleep_hours, 0) > 0 OR COALESCE(da.water_ml, 0) > 0)
  LOOP
    PERFORM net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body    := jsonb_build_object(
        'userId',     v_user_id::text,
        'reportType', p_report_type
      )
    );
  END LOOP;
END;
$$;


-- ─── Weekly: Sunday 20:00 UTC ────────────────────────────────────────────────
SELECT cron.unschedule('generate-weekly-reports')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-weekly-reports');

SELECT cron.schedule(
  'generate-weekly-reports',
  '0 20 * * 0',
  $$SELECT trigger_report_generation('weekly')$$
);


-- ─── Monthly: 1st of each month at 02:00 UTC ────────────────────────────────
SELECT cron.unschedule('generate-monthly-reports')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-monthly-reports');

SELECT cron.schedule(
  'generate-monthly-reports',
  '0 2 1 * *',
  $$SELECT trigger_report_generation('monthly')$$
);


-- ─── Quarterly: 1st of Jan/Apr/Jul/Oct at 03:00 UTC ─────────────────────────
SELECT cron.unschedule('generate-quarterly-reports')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-quarterly-reports');

SELECT cron.schedule(
  'generate-quarterly-reports',
  '0 3 1 1,4,7,10 *',
  $$SELECT trigger_report_generation('quarterly')$$
);


-- ─── Biannual: 1st of Jan/Jul at 04:00 UTC ──────────────────────────────────
SELECT cron.unschedule('generate-biannual-reports')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-biannual-reports');

SELECT cron.schedule(
  'generate-biannual-reports',
  '0 4 1 1,7 *',
  $$SELECT trigger_report_generation('biannual')$$
);


-- ─── Yearly: Jan 1st at 05:00 UTC ───────────────────────────────────────────
SELECT cron.unschedule('generate-yearly-reports')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-yearly-reports');

SELECT cron.schedule(
  'generate-yearly-reports',
  '0 5 1 1 *',
  $$SELECT trigger_report_generation('yearly')$$
);


-- ─── Daily cleanup of expired reports: 06:00 UTC ────────────────────────────
SELECT cron.unschedule('cleanup-expired-reports')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-reports');

-- Create a wrapper function so cron.schedule doesn't need nested $$ blocks
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  v_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/cleanup-expired-reports';
  v_key := current_setting('app.settings.service_role_key', true);

  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := '{}'::jsonb
  );
END;
$$;

SELECT cron.schedule(
  'cleanup-expired-reports',
  '0 6 * * *',
  $$SELECT trigger_cleanup_expired_reports()$$
);
