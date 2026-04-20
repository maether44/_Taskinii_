-- =============================================================================
-- Migration: Atomic water and sleep RPCs
-- Replaces client-side upsert/insert-or-update with server-side functions
-- that match the increment_steps pattern (SECURITY DEFINER, ON CONFLICT).
-- =============================================================================

ALTER TABLE IF EXISTS daily_activity
  ADD COLUMN IF NOT EXISTS sleep_quality integer;

-- ── log_water_ml ──────────────────────────────────────────────────────────────
-- Applies a delta (positive = add, negative = undo) to water_ml atomically.
-- Returns the new total so the client can sync state without a round-trip.
CREATE OR REPLACE FUNCTION log_water_ml(
  p_user_id   uuid,
  p_delta     integer,
  p_date      date DEFAULT CURRENT_DATE
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_ml integer;
BEGIN
  INSERT INTO daily_activity (user_id, date, water_ml)
  VALUES (p_user_id, p_date, GREATEST(0, p_delta))
  ON CONFLICT (user_id, date) DO UPDATE SET
    water_ml = GREATEST(0, daily_activity.water_ml + p_delta)
  RETURNING water_ml INTO v_new_ml;
  RETURN COALESCE(v_new_ml, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION log_water_ml(uuid, integer, date) TO authenticated;

-- ── log_sleep_data ────────────────────────────────────────────────────────────
-- Upserts sleep_hours and sleep_quality for a given day without touching
-- other columns (water_ml, steps, calories_burned stay intact).
CREATE OR REPLACE FUNCTION log_sleep_data(
  p_user_id   uuid,
  p_hours     numeric,
  p_quality   integer,
  p_date      date DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO daily_activity (user_id, date, sleep_hours, sleep_quality)
  VALUES (p_user_id, p_date, p_hours, p_quality)
  ON CONFLICT (user_id, date) DO UPDATE SET
    sleep_hours   = EXCLUDED.sleep_hours,
    sleep_quality = EXCLUDED.sleep_quality;
END;
$$;

GRANT EXECUTE ON FUNCTION log_sleep_data(uuid, numeric, integer, date) TO authenticated;
