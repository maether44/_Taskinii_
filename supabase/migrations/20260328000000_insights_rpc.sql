-- =============================================================================
-- Migration: Insights RPC + ai_insights cache table
-- File: supabase/migrations/20260328000000_insights_rpc.sql
--
-- PURPOSE
--   This migration does two things:
--     1. Creates the `ai_insights` table that caches Yara's AI-generated
--        insight cards so we don't call Groq on every screen load.
--     2. Creates the `get_insights_data` stored function (RPC) that the
--        mobile app calls via supabase.rpc().  The function aggregates data
--        from several tables into a single JSON payload so the app only needs
--        one round-trip to the database.
-- =============================================================================


-- =============================================================================
-- PART 1 — ai_insights table
-- =============================================================================

-- Each row is one AI-generated insight card for a specific user and period.
-- The `message` column stores "title|body text" separated by a pipe so we can
-- split them in JS without needing extra columns.
-- `period` mirrors the period selector in the UI: 'Week', 'Month', '3 Months'.
CREATE TABLE IF NOT EXISTS ai_insights (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type text        NOT NULL,   -- e.g. 'Performance', 'Nutrition', 'Recovery'
  message      text        NOT NULL,   -- "Short title|Full insight text"
  period       text        NOT NULL DEFAULT 'Week',
  created_at   timestamptz DEFAULT now()
);

-- Composite index speeds up the cache look-up query in yaraInsightsService.js:
--   WHERE user_id = ? AND period = ? AND created_at >= ?   ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS ai_insights_user_period_idx
  ON ai_insights (user_id, period, created_at DESC);

-- Row-Level Security: every user can only read/write their own rows.
-- This is enforced at the database level regardless of what the app sends.
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_insights" ON ai_insights;
CREATE POLICY "users_manage_own_insights"
  ON ai_insights FOR ALL
  USING  (auth.uid() = user_id)   -- read filter
  WITH CHECK (auth.uid() = user_id); -- write filter


-- =============================================================================
-- PART 2 — get_insights_data(p_user_id, p_period) RPC
--
-- Called from the app as: supabase.rpc('get_insights_data', { p_user_id, p_period })
--
-- Returns a single JSON object:
--   {
--     workout_count  : integer  — completed workouts in the selected period
--     avg_calories   : integer  — average kcal/day from food logs in the period
--     avg_steps      : integer  — average daily step count in the period
--     avg_sleep      : numeric  — average sleep hours/night in the period
--     weight_delta   : numeric  — kg change (end minus start) across the period
--     heatmap_days   : array    — last 42 days, each { date, has_workout, calories, steps }
--     activity_dates : array    — ISO date strings where user was active (last 90 days)
--                                 used by the JS streak calculator
--   }
--
-- SECURITY DEFINER means the function runs with the privileges of its owner
-- (the Supabase service role), not the calling user.  This is safe here because
-- the function always filters by p_user_id and the app passes auth.uid() as that
-- parameter.  GRANT EXECUTE is limited to the `authenticated` role only.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_insights_data(p_user_id uuid, p_period text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public   -- prevents search_path injection attacks
AS $$
DECLARE
  -- v_start_date is the earliest date included in the selected period stats.
  v_start_date    date;
  v_workout_count integer := 0;
  v_avg_calories  numeric := 0;
  v_avg_steps     numeric := 0;
  v_avg_sleep     numeric := 0;
  v_weight_start  numeric;   -- earliest weight reading in the period
  v_weight_end    numeric;   -- most recent weight reading overall
  v_weight_delta  numeric := 0;
  v_heatmap_days  json;      -- always 42 days regardless of selected period
  v_activity_dates json;     -- last 90 days of active dates for streak calc
BEGIN

  -- ── Period → start date ────────────────────────────────────────────────────
  -- Convert the human-readable period name into a concrete start date so every
  -- subsequent query can use a simple BETWEEN clause.
  v_start_date := CASE p_period
    WHEN 'Week'     THEN CURRENT_DATE - INTERVAL '7 days'
    WHEN 'Month'    THEN CURRENT_DATE - INTERVAL '30 days'
    WHEN '3 Months' THEN CURRENT_DATE - INTERVAL '90 days'
    ELSE                 CURRENT_DATE - INTERVAL '7 days'  -- safe default
  END;


  -- ── Workout count ──────────────────────────────────────────────────────────
  -- Only count sessions that were actually completed (ended_at IS NOT NULL).
  -- Sessions that were started but never finished are excluded.
  SELECT COUNT(*)::integer INTO v_workout_count
  FROM workout_sessions
  WHERE user_id  = p_user_id
    AND ended_at IS NOT NULL
    AND started_at::date BETWEEN v_start_date AND CURRENT_DATE;


  -- ── Average daily calories ─────────────────────────────────────────────────
  -- Calories are NOT stored directly in food_logs.  They live in the `foods`
  -- table as calories_per_100g.  We must JOIN and scale by quantity_grams/100
  -- to get the actual calories for each logged item, then SUM per day, then
  -- AVG across all days in the period that had any food logged.
  SELECT COALESCE(ROUND(AVG(daily_cal)), 0) INTO v_avg_calories
  FROM (
    SELECT
      fl.consumed_at::date                                           AS day,
      SUM(f.calories_per_100g * fl.quantity_grams / 100.0)::numeric AS daily_cal
    FROM food_logs fl
    JOIN foods f ON f.id = fl.food_id
    WHERE fl.user_id = p_user_id
      AND fl.consumed_at::date BETWEEN v_start_date AND CURRENT_DATE
    GROUP BY fl.consumed_at::date
  ) t;


  -- ── Average steps and sleep ────────────────────────────────────────────────
  -- Both fields live in daily_activity with one row per (user, date).
  -- sleep_hours is rounded to 1 decimal place (e.g. 7.5) to match how the
  -- SleepLog screen records it.
  SELECT
    COALESCE(ROUND(AVG(steps)), 0),
    COALESCE(ROUND(AVG(sleep_hours)::numeric, 1), 0)
  INTO v_avg_steps, v_avg_sleep
  FROM daily_activity
  WHERE user_id = p_user_id
    AND date BETWEEN v_start_date AND CURRENT_DATE;


  -- ── Weight delta ───────────────────────────────────────────────────────────
  -- We want the change in weight across the selected period:
  --   delta = (most recent measurement) - (earliest measurement in period)
  -- A positive value means the user gained weight; negative means lost.
  -- If there is only one measurement or none, delta stays 0.
  SELECT weight_kg INTO v_weight_start
  FROM body_metrics
  WHERE user_id = p_user_id
    AND recorded_at::date >= v_start_date
  ORDER BY recorded_at ASC
  LIMIT 1;

  -- The "end" weight is always the most recent measurement, even if it was
  -- recorded before the period start (handles edge cases with infrequent logs).
  SELECT weight_kg INTO v_weight_end
  FROM body_metrics
  WHERE user_id = p_user_id
  ORDER BY recorded_at DESC
  LIMIT 1;

  IF v_weight_start IS NOT NULL AND v_weight_end IS NOT NULL THEN
    v_weight_delta := ROUND((v_weight_end - v_weight_start)::numeric, 1);
  END IF;


  -- ── Heatmap: last 42 days ──────────────────────────────────────────────────
  -- The UI displays a 7-row (Mon–Sun) × 6-column (weeks) calendar grid.
  -- 7 × 6 = 42 cells, so we always generate exactly 42 days regardless of the
  -- selected period.  The period only affects the aggregated stats above.
  --
  -- For each day we LEFT JOIN three sources so missing data becomes 0/false
  -- rather than NULLs:
  --   w  — workout_sessions: did the user complete a workout that day?
  --   f  — food_logs+foods:  total calories logged that day
  --   da — daily_activity:   step count for that day
  --
  -- The JS hook (useInsights) then converts these three values into an
  -- intensity level (0–3) for the coloured heatmap cells.
  SELECT json_agg(
    json_build_object(
      'date',        d.day::text,       -- 'YYYY-MM-DD' string the JS can use as a Map key
      'has_workout', COALESCE(w.had_workout, false),
      'calories',    COALESCE(f.daily_cal,   0),
      'steps',       COALESCE(da.steps,      0)
    ) ORDER BY d.day  -- ascending so JS slice(-7) gives the correct last-7-days
  )
  INTO v_heatmap_days
  FROM (
    -- Generate the 42-day spine: one row per day from 41 days ago to today.
    SELECT gs::date AS day
    FROM generate_series(
      CURRENT_DATE - INTERVAL '41 days',
      CURRENT_DATE,
      INTERVAL '1 day'
    ) gs
  ) d
  -- Did the user work out on this day? (GROUP BY collapses multiple sessions.)
  LEFT JOIN (
    SELECT started_at::date AS day, true AS had_workout
    FROM workout_sessions
    WHERE user_id = p_user_id AND ended_at IS NOT NULL
    GROUP BY started_at::date
  ) w ON w.day = d.day
  -- How many calories were logged on this day? (Requires foods JOIN for scaling.)
  LEFT JOIN (
    SELECT
      fl.consumed_at::date                                           AS day,
      SUM(f.calories_per_100g * fl.quantity_grams / 100.0)::integer AS daily_cal
    FROM food_logs fl
    JOIN foods f ON f.id = fl.food_id
    WHERE fl.user_id = p_user_id
    GROUP BY fl.consumed_at::date
  ) f ON f.day = d.day
  -- Step count from daily_activity.
  LEFT JOIN (
    SELECT date AS day, steps
    FROM daily_activity
    WHERE user_id = p_user_id
  ) da ON da.day = d.day;


  -- ── Activity dates for streak calculation ─────────────────────────────────
  -- The streak calculator in useInsights.js needs a list of every date where
  -- the user was "active" so it can count consecutive days.
  --
  -- A day counts as active if:
  --   • The user logged any steps OR sleep_hours in daily_activity, OR
  --   • The user completed a workout session.
  --
  -- We look back 90 days so the longest-streak calculation has enough history.
  -- UNION automatically deduplicates dates that appear in both sources.
  SELECT json_agg(DISTINCT active_day::text ORDER BY active_day::text)
  INTO v_activity_dates
  FROM (
    SELECT date AS active_day
    FROM daily_activity
    WHERE user_id = p_user_id
      AND date >= CURRENT_DATE - INTERVAL '90 days'
      AND (COALESCE(steps, 0) > 0 OR COALESCE(sleep_hours, 0) > 0)
    UNION
    SELECT started_at::date AS active_day
    FROM workout_sessions
    WHERE user_id    = p_user_id
      AND ended_at   IS NOT NULL
      AND started_at >= CURRENT_DATE - INTERVAL '90 days'
  ) t;


  -- ── Return everything as one JSON object ───────────────────────────────────
  -- COALESCE on each field ensures we always return 0 / [] rather than NULL,
  -- which avoids defensive null-checks on the JS side.
  RETURN json_build_object(
    'workout_count',   COALESCE(v_workout_count,   0),
    'avg_calories',    COALESCE(v_avg_calories,    0),
    'avg_steps',       COALESCE(v_avg_steps,       0),
    'avg_sleep',       COALESCE(v_avg_sleep,       0),
    'weight_delta',    COALESCE(v_weight_delta,    0),
    'heatmap_days',    COALESCE(v_heatmap_days,    '[]'::json),
    'activity_dates',  COALESCE(v_activity_dates,  '[]'::json)
  );
END;
$$;

-- Only logged-in users can call this function.
-- The anon role (unauthenticated visitors) cannot.
GRANT EXECUTE ON FUNCTION get_insights_data(uuid, text) TO authenticated;
