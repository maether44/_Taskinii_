-- =============================================================================
-- Migration: get_insights_data v2
-- Adds sleep_hours and water_ml to each heatmap_days entry so the JS
-- scoreDay() function can include sleep and hydration in the health score.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_insights_data(p_user_id uuid, p_period text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date    date;
  v_workout_count integer := 0;
  v_avg_calories  numeric := 0;
  v_avg_steps     numeric := 0;
  v_avg_sleep     numeric := 0;
  v_weight_start  numeric;
  v_weight_end    numeric;
  v_weight_delta  numeric := 0;
  v_heatmap_days  json;
  v_activity_dates json;
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

  -- ── Heatmap: last 42 days — now includes sleep_hours and water_ml ──────────
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

GRANT EXECUTE ON FUNCTION get_insights_data(uuid, text) TO authenticated;
