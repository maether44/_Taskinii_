-- =============================================================================
-- Migration: Yara proactive events (Phase 3 #3)
-- File: supabase/migrations/20260411000000_yara_proactive_events.sql
--
-- PURPOSE
--   Detect notable user events at the database level (workout streaks, water
--   targets hit, low-sleep nights, new weight entries) and queue them in
--   yara_events. The ai-assistant edge function reads pending events each
--   request, injects them into the prompt so Yara can surface them naturally,
--   then marks them consumed so they do not repeat.
--
--   Trigger functions are intentionally defensive: they never raise, so a
--   detector bug can never break the underlying INSERT on workout_sessions,
--   daily_activity, or body_metrics.
-- =============================================================================

CREATE TABLE IF NOT EXISTS yara_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type   text        NOT NULL,
  payload      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  severity     text        NOT NULL DEFAULT 'info'
                             CHECK (severity IN ('info', 'celebrate', 'warning')),
  dedupe_key   text,
  consumed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS yara_events_user_pending_idx
  ON yara_events (user_id, created_at DESC)
  WHERE consumed_at IS NULL;

-- Partial unique index: dedupe_key only enforces uniqueness when set, letting
-- the same trigger fire idempotently (e.g. a 3-day streak event only lands
-- once per user+date even if multiple sessions are logged that day).
CREATE UNIQUE INDEX IF NOT EXISTS yara_events_dedupe_uq
  ON yara_events (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

ALTER TABLE yara_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_yara_events" ON yara_events;
CREATE POLICY "users_read_own_yara_events"
  ON yara_events FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies: events are written server-side only by
-- trigger functions running under the table owner. The edge function reads
-- and consumes via SECURITY DEFINER RPCs below.


-- -----------------------------------------------------------------------------
-- get_pending_yara_events(p_user_id uuid, p_limit int)
-- Returns the most recent unconsumed events for a user.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_pending_yara_events(
  p_user_id uuid,
  p_limit   integer DEFAULT 10
)
RETURNS TABLE (
  id          uuid,
  event_type  text,
  payload     jsonb,
  severity    text,
  created_at  timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, event_type, payload, severity, created_at
  FROM yara_events
  WHERE user_id = p_user_id
    AND consumed_at IS NULL
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_pending_yara_events(uuid, integer)
  TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- consume_yara_events(p_user_id uuid, p_ids uuid[])
-- Marks the given events as surfaced so Yara does not repeat them.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION consume_yara_events(
  p_user_id uuid,
  p_ids     uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE yara_events
  SET consumed_at = now()
  WHERE user_id = p_user_id
    AND consumed_at IS NULL
    AND id = ANY(p_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION consume_yara_events(uuid, uuid[])
  TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- _yara_record_event — internal helper used by detector triggers.
-- Swallows unique_violation so duplicate dedupe_keys never fail, and swallows
-- any other error so detector bugs cannot break the parent INSERT/UPDATE.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _yara_record_event(
  p_user_id    uuid,
  p_type       text,
  p_payload    jsonb,
  p_severity   text,
  p_dedupe_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO yara_events (user_id, event_type, payload, severity, dedupe_key)
  VALUES (p_user_id, p_type, p_payload, p_severity, p_dedupe_key);
EXCEPTION
  WHEN unique_violation THEN NULL;
  WHEN OTHERS THEN NULL;
END;
$$;


-- -----------------------------------------------------------------------------
-- Detector: workout_sessions → first_workout_of_week + workout_streak_milestone
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION yara_detect_workout_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today  date := (COALESCE(NEW.started_at, NEW.ended_at) AT TIME ZONE 'UTC')::date;
  v_week   text := to_char(v_today, 'IYYY-"W"IW');
  v_streak integer := 0;
  v_day    date := v_today;
  v_exists boolean;
BEGIN
  IF NEW.ended_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1. First completed workout of the ISO week.
  PERFORM _yara_record_event(
    NEW.user_id,
    'first_workout_of_week',
    jsonb_build_object('week', v_week, 'session_id', NEW.id),
    'celebrate',
    'first_workout_week:' || v_week
  );

  -- 2. Consecutive-day streak ending today.
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE user_id = NEW.user_id
        AND ended_at IS NOT NULL
        AND (started_at AT TIME ZONE 'UTC')::date = v_day
    ) INTO v_exists;
    EXIT WHEN NOT v_exists;
    v_streak := v_streak + 1;
    v_day := v_day - 1;
    EXIT WHEN v_streak >= 30;
  END LOOP;

  IF v_streak IN (3, 7, 14, 30) THEN
    PERFORM _yara_record_event(
      NEW.user_id,
      'workout_streak_milestone',
      jsonb_build_object('streak_days', v_streak, 'through_date', v_today),
      'celebrate',
      'workout_streak:' || v_streak || ':' || v_today::text
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workout_sessions_yara_events ON workout_sessions;
CREATE TRIGGER workout_sessions_yara_events
  AFTER INSERT OR UPDATE OF ended_at ON workout_sessions
  FOR EACH ROW
  WHEN (NEW.ended_at IS NOT NULL)
  EXECUTE FUNCTION yara_detect_workout_events();


-- -----------------------------------------------------------------------------
-- Detector: daily_activity → water_target_hit + sleep_low_streak_2day
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION yara_detect_activity_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_sleep numeric;
BEGIN
  -- 1. Hit the 2000 ml water target for the day (first crossing only).
  IF COALESCE(NEW.water_ml, 0) >= 2000
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.water_ml, 0) < 2000) THEN
    PERFORM _yara_record_event(
      NEW.user_id,
      'water_target_hit',
      jsonb_build_object('water_ml', NEW.water_ml, 'date', NEW.date),
      'celebrate',
      'water_2000:' || NEW.date::text
    );
  END IF;

  -- 2. Two consecutive nights under 6h sleep.
  IF NEW.sleep_hours IS NOT NULL AND NEW.sleep_hours < 6 THEN
    SELECT sleep_hours INTO v_prev_sleep
    FROM daily_activity
    WHERE user_id = NEW.user_id
      AND date = NEW.date - 1;

    IF v_prev_sleep IS NOT NULL AND v_prev_sleep < 6 THEN
      PERFORM _yara_record_event(
        NEW.user_id,
        'sleep_low_streak_2day',
        jsonb_build_object(
          'nights', 2,
          'last_night_hours', NEW.sleep_hours,
          'prior_night_hours', v_prev_sleep,
          'date', NEW.date
        ),
        'warning',
        'sleep_low_2:' || NEW.date::text
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_activity_yara_events ON daily_activity;
CREATE TRIGGER daily_activity_yara_events
  AFTER INSERT OR UPDATE ON daily_activity
  FOR EACH ROW
  EXECUTE FUNCTION yara_detect_activity_events();


-- -----------------------------------------------------------------------------
-- Detector: body_metrics → weight_logged (with delta vs prior entry)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION yara_detect_body_metrics_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev  numeric;
  v_delta numeric;
BEGIN
  IF NEW.weight_kg IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT weight_kg INTO v_prev
  FROM body_metrics
  WHERE user_id = NEW.user_id
    AND id <> NEW.id
    AND weight_kg IS NOT NULL
  ORDER BY recorded_at DESC
  LIMIT 1;

  v_delta := CASE WHEN v_prev IS NULL THEN 0 ELSE NEW.weight_kg - v_prev END;

  PERFORM _yara_record_event(
    NEW.user_id,
    'weight_logged',
    jsonb_build_object(
      'weight_kg', NEW.weight_kg,
      'delta_kg',  v_delta,
      'has_previous', v_prev IS NOT NULL
    ),
    CASE WHEN v_delta < -0.5 THEN 'celebrate' ELSE 'info' END,
    'weight_logged:' || NEW.id::text
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS body_metrics_yara_events ON body_metrics;
CREATE TRIGGER body_metrics_yara_events
  AFTER INSERT ON body_metrics
  FOR EACH ROW
  EXECUTE FUNCTION yara_detect_body_metrics_events();