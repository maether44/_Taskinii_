-- =============================================================================
-- Migration: Yara backend alignment
-- File: supabase/migrations/20260405000000_yara_backend.sql
--
-- PURPOSE
--   Aligns the database with what the mobile app and Edge Functions already
--   expect for Yara:
--   1. Extends ai_insights with source/is_read used by ai-assistant and Insights.
--   2. Creates user_insights for the Yara sidebar cards.
--   3. Adds the missing RPCs consumed by supabase/functions/ai-assistant.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ai_insights compatibility columns
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS ai_insights
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'yara',
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ai_insights_user_source_created_idx
  ON ai_insights (user_id, source, created_at DESC);


-- -----------------------------------------------------------------------------
-- user_insights table used by mobile-frontend/components/YaraAssistant.js
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_insights (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type text        NOT NULL,
  message      text        NOT NULL,
  icon         text,
  color        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_insights_user_created_idx
  ON user_insights (user_id, created_at DESC);

ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_user_insights" ON user_insights;
CREATE POLICY "users_manage_own_user_insights"
  ON user_insights FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- get_user_full_activity_summary(p_user_id uuid)
-- Returns a single JSON object with 30-day activity, sleep, and hydration stats.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_full_activity_summary(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  WITH base AS (
    SELECT
      COALESCE(ROUND(AVG(steps)), 0)                  AS avg_steps,
      COALESCE(ROUND(AVG(sleep_hours)::numeric, 1), 0) AS avg_sleep_hours,
      COALESCE(ROUND(AVG(water_ml)), 0)               AS avg_water_ml,
      COALESCE(MAX(steps), 0)                         AS max_steps,
      COUNT(*) FILTER (
        WHERE COALESCE(steps, 0) > 0
           OR COALESCE(sleep_hours, 0) > 0
           OR COALESCE(water_ml, 0) > 0
      )::integer                                      AS active_days
    FROM daily_activity
    WHERE user_id = p_user_id
      AND date >= CURRENT_DATE - INTERVAL '30 days'
  )
  SELECT json_build_object(
    'avg_steps',       COALESCE(avg_steps, 0),
    'avg_sleep_hours', COALESCE(avg_sleep_hours, 0),
    'avg_water_ml',    COALESCE(avg_water_ml, 0),
    'max_steps',       COALESCE(max_steps, 0),
    'active_days',     COALESCE(active_days, 0)
  )
  INTO v_result
  FROM base;

  RETURN COALESCE(v_result, '{}'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_full_activity_summary(uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- get_user_nutrition_summary(p_user_id uuid)
-- Returns 30-day averages plus a compact recent meal log summary for Yara.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_nutrition_summary(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  WITH daily_logs AS (
    SELECT
      fl.consumed_at::date AS day,
      SUM(f.calories_per_100g * fl.quantity_grams / 100.0) AS calories,
      SUM(f.protein_per_100g  * fl.quantity_grams / 100.0) AS protein,
      SUM(f.carbs_per_100g    * fl.quantity_grams / 100.0) AS carbs,
      SUM(f.fat_per_100g      * fl.quantity_grams / 100.0) AS fat
    FROM food_logs fl
    JOIN foods f ON f.id = fl.food_id
    WHERE fl.user_id = p_user_id
      AND fl.consumed_at >= now() - INTERVAL '30 days'
    GROUP BY fl.consumed_at::date
  ),
  recent_meals AS (
    SELECT json_agg(
      json_build_object(
        'date', meal_day::text,
        'meal_type', meal_type,
        'foods', foods
      )
      ORDER BY meal_day DESC
    ) AS items
    FROM (
      SELECT
        fl.consumed_at::date AS meal_day,
        fl.meal_type,
        string_agg(f.name, ', ' ORDER BY f.name) AS foods
      FROM food_logs fl
      JOIN foods f ON f.id = fl.food_id
      WHERE fl.user_id = p_user_id
        AND fl.consumed_at >= now() - INTERVAL '7 days'
      GROUP BY fl.consumed_at::date, fl.meal_type
      ORDER BY fl.consumed_at::date DESC, fl.meal_type
      LIMIT 12
    ) meal_rows
  ),
  latest_target AS (
    SELECT
      COALESCE(calorie_target, daily_calories, 2000) AS calorie_target,
      COALESCE(protein_target, 150)                  AS protein_target,
      COALESCE(carbs_target, 250)                    AS carbs_target,
      COALESCE(fat_target, 65)                       AS fat_target
    FROM calorie_targets
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1
  )
  SELECT json_build_object(
    'avg_calories',         COALESCE(ROUND((SELECT AVG(calories) FROM daily_logs)), 0),
    'avg_protein_g',        COALESCE(ROUND((SELECT AVG(protein)  FROM daily_logs)), 0),
    'avg_carbs_g',          COALESCE(ROUND((SELECT AVG(carbs)    FROM daily_logs)), 0),
    'avg_fat_g',            COALESCE(ROUND((SELECT AVG(fat)      FROM daily_logs)), 0),
    'logged_days',          COALESCE((SELECT COUNT(*) FROM daily_logs), 0),
    'daily_calorie_target', COALESCE((SELECT calorie_target FROM latest_target), 2000),
    'protein_target',       COALESCE((SELECT protein_target FROM latest_target), 150),
    'carbs_target',         COALESCE((SELECT carbs_target   FROM latest_target), 250),
    'fat_target',           COALESCE((SELECT fat_target     FROM latest_target), 65),
    'recent_meals',         COALESCE((SELECT items FROM recent_meals), '[]'::json)
  )
  INTO v_result;

  RETURN COALESCE(v_result, '{}'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_nutrition_summary(uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- get_user_workout_summary(p_user_id uuid)
-- Returns recent completed workouts as rows, which Supabase exposes as an array.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_workout_summary(p_user_id uuid)
RETURNS TABLE (
  started_at timestamptz,
  ended_at timestamptz,
  calories_burned integer,
  exercise_count integer,
  avg_posture_score numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ws.started_at,
    ws.ended_at,
    COALESCE(ws.calories_burned, 0)::integer AS calories_burned,
    COALESCE(ex.exercise_count, 0)::integer  AS exercise_count,
    NULL::numeric                            AS avg_posture_score
  FROM workout_sessions ws
  LEFT JOIN (
    SELECT workout_session_id, COUNT(*)::integer AS exercise_count
    FROM workout_exercises
    GROUP BY workout_session_id
  ) ex ON ex.workout_session_id = ws.id
  WHERE ws.user_id = p_user_id
    AND ws.ended_at IS NOT NULL
  ORDER BY ws.started_at DESC
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION get_user_workout_summary(uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- get_user_body_metrics_history(p_user_id uuid)
-- Returns recent body metric rows aliased to the field names Yara expects.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_body_metrics_history(p_user_id uuid)
RETURNS TABLE (
  logged_at timestamptz,
  weight_kg numeric,
  body_fat_pct numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    bm.recorded_at AS logged_at,
    bm.weight_kg,
    bm.body_fat_pct
  FROM body_metrics bm
  WHERE bm.user_id = p_user_id
  ORDER BY bm.recorded_at DESC
  LIMIT 12;
$$;

GRANT EXECUTE ON FUNCTION get_user_body_metrics_history(uuid) TO authenticated;


-- -----------------------------------------------------------------------------
-- get_user_ai_history(p_user_id uuid)
-- Returns recent Yara/insight history for retrieval-augmented coaching.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_ai_history(p_user_id uuid)
RETURNS TABLE (
  created_at timestamptz,
  insight_type text,
  message text,
  source text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ai.created_at,
    ai.insight_type,
    ai.message,
    ai.source
  FROM ai_insights ai
  WHERE ai.user_id = p_user_id
  ORDER BY ai.created_at DESC
  LIMIT 12;
$$;

GRANT EXECUTE ON FUNCTION get_user_ai_history(uuid) TO authenticated;
