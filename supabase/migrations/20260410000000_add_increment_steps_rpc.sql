-- =============================================================================
-- Migration: Add Pedometer Sync Functions
-- File: supabase/migrations/20260410000000_add_increment_steps_rpc.sql
--
-- PURPOSE
--   Adds RPC function to increment daily step count from mobile pedometer.
--   Syncs steps to daily_activity table, ensuring idempotency.
--
-- USAGE
--   SELECT increment_steps(user_id, steps_to_add, sync_date)
--   Example: SELECT increment_steps(auth.uid(), 100, '2025-04-10'::date)
-- =============================================================================

-- Ensure daily_activity table has steps column
ALTER TABLE IF EXISTS daily_activity
  ADD COLUMN IF NOT EXISTS steps integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_step_sync timestamptz DEFAULT now();

-- Create or replace the increment_steps RPC function
CREATE OR REPLACE FUNCTION increment_steps(
  p_user_id uuid,
  p_steps integer,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_activity_id uuid;
  v_current_steps integer;
  v_new_steps integer;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'user_id cannot be null',
      'code', 'INVALID_INPUT'
    );
  END IF;

  IF p_steps IS NULL OR p_steps < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'steps must be a non-negative integer',
      'code', 'INVALID_INPUT'
    );
  END IF;

  -- Get or create daily_activity record for the user on the given date
  BEGIN
    SELECT id, steps INTO v_activity_id, v_current_steps
    FROM daily_activity
    WHERE user_id = p_user_id
      AND date = p_date
    LIMIT 1;

    IF v_activity_id IS NULL THEN
      -- Create new daily_activity record
      INSERT INTO daily_activity (user_id, date, steps, last_step_sync)
      VALUES (p_user_id, p_date, p_steps, now())
      RETURNING id INTO v_activity_id;
      
      v_new_steps := p_steps;
    ELSE
      -- Update existing record with new steps
      UPDATE daily_activity
      SET steps = steps + p_steps,
          last_step_sync = now()
      WHERE id = v_activity_id
      RETURNING steps INTO v_new_steps;
    END IF;

    -- Check for achievements on reaching 10k or 20k steps
    IF v_new_steps >= 10000 THEN
      PERFORM award_achievement(p_user_id, 'first_10k_steps');
    END IF;

    IF v_new_steps >= 20000 THEN
      PERFORM award_achievement(p_user_id, 'tough_walker');
    END IF;

    v_result := jsonb_build_object(
      'success', true,
      'user_id', p_user_id,
      'date', p_date,
      'steps_added', p_steps,
      'total_steps', v_new_steps,
      'timestamp', now()
    );

  EXCEPTION WHEN OTHERS THEN
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'DATABASE_ERROR'
    );
  END;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_steps(uuid, integer, date) TO authenticated;

-- Comment for clarity
COMMENT ON FUNCTION increment_steps(uuid, integer, date) IS
  'Increment step count for a user on a specific date. Used by mobile pedometer to sync steps to daily_activity.';
