-- =============================================================================
-- Migration: Persistent login streak tracking
-- File: supabase/migrations/20260411010000_login_streak_tracking.sql
--
-- PURPOSE
--   Before this migration streaks were computed entirely client-side in
--   useInsights.js by scanning activity_dates from get_insights_data. That
--   meant:
--     • Opening the app on a new day did NOT count as activity, so the streak
--       would show 0 until the user logged food / finished a workout / etc.
--     • The streak was recomputed from scratch on every Insights screen load
--       and never persisted anywhere — closing the app and reopening it could
--       show 0 even if the user had been consistent.
--
--   This migration makes the streak a first-class, persisted value:
--     1. Adds login_streak / longest_streak / last_login_date to profiles
--     2. Adds record_user_visit(uuid) RPC that the mobile client calls once
--        per app session. It compares last_login_date to CURRENT_DATE and
--        increments, resets, or no-ops accordingly, and also upserts today's
--        daily_activity row so "opened the app" counts as an engagement event.
--     3. Bumps get_insights_data to v3 so login_streak + longest_streak are
--        returned in the JSON payload — the Insights screen can then read the
--        persistent number directly instead of recomputing from activity_dates.
-- =============================================================================

-- ── 1. Schema: streak columns on profiles ──────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS login_streak    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_date date;


-- ── 2. record_user_visit RPC ───────────────────────────────────────────────
-- Called from AuthContext.resolveUser() every time the app resolves a session.
-- Idempotent within a day (multiple calls on the same date return the same
-- streak without double-counting) and self-healing across gaps.
CREATE OR REPLACE FUNCTION record_user_visit(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today           date := CURRENT_DATE;
  v_last_login      date;
  v_current_streak  integer;
  v_longest_streak  integer;
  v_gap_days        integer;
  v_visit_counted   boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'login_streak',   0,
      'longest_streak', 0,
      'last_login_date', NULL,
      'visit_counted',  false
    );
  END IF;

  SELECT last_login_date, login_streak, longest_streak
  INTO   v_last_login, v_current_streak, v_longest_streak
  FROM profiles
  WHERE id = p_user_id;

  -- Defensive: if there is no profile row yet (brand-new signup flow races
  -- onboarding) we still return a valid zero payload instead of failing.
  IF NOT FOUND THEN
    RETURN json_build_object(
      'login_streak',    0,
      'longest_streak',  0,
      'last_login_date', NULL,
      'visit_counted',   false
    );
  END IF;

  v_current_streak := COALESCE(v_current_streak, 0);
  v_longest_streak := COALESCE(v_longest_streak, 0);

  IF v_last_login IS NULL THEN
    -- First ever visit.
    v_current_streak := 1;
    v_visit_counted  := true;
  ELSIF v_last_login = v_today THEN
    -- Already counted today → no-op.
    v_visit_counted := false;
  ELSE
    v_gap_days := v_today - v_last_login;
    IF v_gap_days = 1 THEN
      -- Consecutive day → extend the streak.
      v_current_streak := v_current_streak + 1;
    ELSE
      -- Gap of 2+ days → streak broke, restart at 1.
      v_current_streak := 1;
    END IF;
    v_visit_counted := true;
  END IF;

  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  IF v_visit_counted THEN
    UPDATE profiles
    SET login_streak    = v_current_streak,
        longest_streak  = v_longest_streak,
        last_login_date = v_today,
        last_active     = now()
    WHERE id = p_user_id;

    -- Make "opened the app" count as activity so the heatmap / activity_dates
    -- reflect real engagement even on days the user didn't log a workout or
    -- food. We only upsert a zero-row if nothing exists yet — we never
    -- overwrite real numbers.
    INSERT INTO daily_activity (user_id, date, steps, water_ml, sleep_hours, calories_burned)
    VALUES (p_user_id, v_today, 0, 0, NULL, 0)
    ON CONFLICT (user_id, date) DO NOTHING;
  END IF;

  RETURN json_build_object(
    'login_streak',    v_current_streak,
    'longest_streak',  v_longest_streak,
    'last_login_date', v_today,
    'visit_counted',   v_visit_counted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION record_user_visit(uuid) TO authenticated, service_role;


-- ── 3. get_insights_data v3 — surface persistent streak ────────────────────
-- Same signature and same existing fields; just adds login_streak and
-- longest_streak so the mobile client can render the persisted value.
CREATE OR REPLACE FUNCTION get_insights_data(p_user_id uuid, p_period text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date     date;
  v_workout_count  integer := 0;
  v_avg_calories   numeric := 0;
  v_avg_steps      numeric := 0;
  v_avg_sleep      numeric := 0;
  v_weight_start   numeric;
  v_weight_end     numeric;
  v_weight_delta   numeric := 0;
  v_heatmap_days   json;
  v_activity_dates json;
  v_login_streak   integer := 0;
  v_longest_streak integer := 0;
BEGIN

  v_start_date := CASE p_period
    WHEN 'Week'     THEN CURRENT_DATE - INTERVAL '7 days'
    WHEN 'Month'    THEN CURRENT_DATE - INTERVAL '30 days'
    WHEN '3 Months' THEN CURRENT_DATE - INTERVAL '90 days'
    ELSE                 CURRENT_DATE - INTERVAL '7 days'
  END;

  SELECT COUNT(*)::integer INTO v_workout_count
  FROM workout_sessions
  WHERE user_id  = p_user_id
    AND ended_at IS NOT NULL
    AND started_at::date BETWEEN v_start_date AND CURRENT_DATE;

  SELECT COALESCE(ROUND(AVG(daily_cal)), 0) INTO v_avg_calories
  FROM (
    SELECT
      fl.consumed_at::date AS day,
      SUM(f.calories_per_100g * fl.quantity_grams / 100.0)::numeric AS daily_cal
    FROM food_logs fl
    JOIN foods f ON f.id = fl.food_id
    WHERE fl.user_id = p_user_id
      AND fl.consumed_at::date BETWEEN v_start_date AND CURRENT_DATE
    GROUP BY fl.consumed_at::date
  ) t;

  SELECT
    COALESCE(ROUND(AVG(steps)), 0),
    COALESCE(ROUND(AVG(sleep_hours)::numeric, 1), 0)
  INTO v_avg_steps, v_avg_sleep
  FROM daily_activity
  WHERE user_id = p_user_id
    AND date BETWEEN v_start_date AND CURRENT_DATE;

  SELECT weight_kg INTO v_weight_start
  FROM body_metrics
  WHERE user_id = p_user_id
    AND recorded_at::date >= v_start_date
  ORDER BY recorded_at ASC
  LIMIT 1;

  SELECT weight_kg INTO v_weight_end
  FROM body_metrics
  WHERE user_id = p_user_id
  ORDER BY recorded_at DESC
  LIMIT 1;

  IF v_weight_start IS NOT NULL AND v_weight_end IS NOT NULL THEN
    v_weight_delta := ROUND((v_weight_end - v_weight_start)::numeric, 1);
  END IF;

  SELECT json_agg(
    json_build_object(
      'date',        d.day::text,
      'has_workout', COALESCE(w.had_workout, false),
      'calories',    COALESCE(f.daily_cal,   0),
      'steps',       COALESCE(da.steps,      0),
      'sleep',       COALESCE(da.sleep_hours, 0),
      'water',       COALESCE(da.water_ml,   0)
    ) ORDER BY d.day
  )
  INTO v_heatmap_days
  FROM (
    SELECT gs::date AS day
    FROM generate_series(
      CURRENT_DATE - INTERVAL '41 days',
      CURRENT_DATE,
      INTERVAL '1 day'
    ) gs
  ) d
  LEFT JOIN (
    SELECT started_at::date AS day, true AS had_workout
    FROM workout_sessions
    WHERE user_id = p_user_id AND ended_at IS NOT NULL
    GROUP BY started_at::date
  ) w ON w.day = d.day
  LEFT JOIN (
    SELECT
      fl.consumed_at::date AS day,
      SUM(f.calories_per_100g * fl.quantity_grams / 100.0)::integer AS daily_cal
    FROM food_logs fl
    JOIN foods f ON f.id = fl.food_id
    WHERE fl.user_id = p_user_id
    GROUP BY fl.consumed_at::date
  ) f ON f.day = d.day
  LEFT JOIN (
    SELECT date AS day, steps, sleep_hours, water_ml
    FROM daily_activity
    WHERE user_id = p_user_id
  ) da ON da.day = d.day;

  -- Activity dates now also include any day the user opened the app, because
  -- record_user_visit writes a zero-row into daily_activity on first visit.
  -- To avoid a "streak of 1 forever" bug for lurking users we still only
  -- count a day as active if they generated real signal (steps/sleep/water
  -- /workout/food/app-open). Since record_user_visit rows have water_ml=0
  -- and steps=0, we add a last-resort OR to include rows that exist at all.
  SELECT json_agg(DISTINCT active_day::text ORDER BY active_day::text)
  INTO v_activity_dates
  FROM (
    SELECT date AS active_day
    FROM daily_activity
    WHERE user_id = p_user_id
      AND date >= CURRENT_DATE - INTERVAL '90 days'
    UNION
    SELECT started_at::date AS active_day
    FROM workout_sessions
    WHERE user_id    = p_user_id
      AND ended_at   IS NOT NULL
      AND started_at >= CURRENT_DATE - INTERVAL '90 days'
  ) t;

  -- Persisted streak from profiles.
  SELECT COALESCE(login_streak, 0), COALESCE(longest_streak, 0)
  INTO   v_login_streak, v_longest_streak
  FROM profiles
  WHERE id = p_user_id;

  RETURN json_build_object(
    'workout_count',   COALESCE(v_workout_count,   0),
    'avg_calories',    COALESCE(v_avg_calories,    0),
    'avg_steps',       COALESCE(v_avg_steps,       0),
    'avg_sleep',       COALESCE(v_avg_sleep,       0),
    'weight_delta',    COALESCE(v_weight_delta,    0),
    'heatmap_days',    COALESCE(v_heatmap_days,    '[]'::json),
    'activity_dates',  COALESCE(v_activity_dates,  '[]'::json),
    'login_streak',    COALESCE(v_login_streak,    0),
    'longest_streak',  COALESCE(v_longest_streak,  0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_insights_data(uuid, text) TO authenticated;
