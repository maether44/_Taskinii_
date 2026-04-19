-- =============================================================================
-- Migration: milestone_unlocks — gates report access behind streak thresholds
-- File: supabase/migrations/20260418000000_milestone_unlocks.sql
--
-- PURPOSE
--   Tracks which performance-report tiers a user has unlocked via login streaks.
--   Thresholds:  7d → weekly, 30d → monthly, 90d → quarterly,
--                180d → biannual, 365d → yearly.
--   A milestone is "unlocked" when the streak crosses the threshold, and
--   "claimed" when the user taps "Claim Report" on the celebration screen.
--   Rows are never deleted.
-- =============================================================================

CREATE TABLE IF NOT EXISTS milestone_unlocks (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_type text        NOT NULL CHECK (milestone_type IN ('weekly', 'monthly', 'quarterly', 'biannual', 'yearly')),
  streak_required integer   NOT NULL,
  unlocked_at    timestamptz NOT NULL DEFAULT now(),
  claimed_at     timestamptz,
  skipped        boolean     NOT NULL DEFAULT false,
  UNIQUE (user_id, milestone_type)
);

CREATE INDEX IF NOT EXISTS milestone_unlocks_user_idx
  ON milestone_unlocks (user_id, milestone_type);

ALTER TABLE milestone_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_milestones" ON milestone_unlocks;
CREATE POLICY "users_read_own_milestones"
  ON milestone_unlocks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_milestones" ON milestone_unlocks;
CREATE POLICY "users_insert_own_milestones"
  ON milestone_unlocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_update_own_milestones" ON milestone_unlocks;
CREATE POLICY "users_update_own_milestones"
  ON milestone_unlocks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── check_milestone_unlocks RPC ─────────────────────────────────────────────
-- Called after record_user_visit. Returns any NEW milestones the user just
-- crossed (not previously unlocked). Returns empty array if nothing new.
CREATE OR REPLACE FUNCTION check_milestone_unlocks(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak    integer;
  v_new       json[];
  v_threshold record;
BEGIN
  SELECT COALESCE(login_streak, 0) INTO v_streak
  FROM profiles WHERE id = p_user_id;

  v_new := ARRAY[]::json[];

  FOR v_threshold IN
    SELECT * FROM (VALUES
      ('weekly',    7),
      ('monthly',   30),
      ('quarterly', 90),
      ('biannual',  180),
      ('yearly',    365)
    ) AS t(milestone_type, streak_required)
    ORDER BY streak_required ASC
  LOOP
    IF v_streak >= v_threshold.streak_required THEN
      -- Only insert if not already unlocked
      INSERT INTO milestone_unlocks (user_id, milestone_type, streak_required)
      VALUES (p_user_id, v_threshold.milestone_type, v_threshold.streak_required)
      ON CONFLICT (user_id, milestone_type) DO NOTHING;

      -- Check if this was newly inserted (no claimed_at, just created)
      IF FOUND THEN
        v_new := array_append(v_new, json_build_object(
          'milestone_type', v_threshold.milestone_type,
          'streak_required', v_threshold.streak_required
        ));
      END IF;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'current_streak', v_streak,
    'new_milestones', to_json(v_new)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_milestone_unlocks(uuid) TO authenticated, service_role;


-- ─── claim_milestone RPC ─────────────────────────────────────────────────────
-- Called when user taps "Claim Report" or "Skip" on the celebration screen.
CREATE OR REPLACE FUNCTION claim_milestone(p_user_id uuid, p_milestone_type text, p_skipped boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row milestone_unlocks%ROWTYPE;
BEGIN
  UPDATE milestone_unlocks
  SET claimed_at = CASE WHEN p_skipped THEN claimed_at ELSE now() END,
      skipped    = p_skipped
  WHERE user_id = p_user_id
    AND milestone_type = p_milestone_type
    AND claimed_at IS NULL
  RETURNING * INTO v_row;

  IF v_row IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Milestone not found or already claimed');
  END IF;

  RETURN json_build_object('success', true, 'milestone', row_to_json(v_row));
END;
$$;

GRANT EXECUTE ON FUNCTION claim_milestone(uuid, text, boolean) TO authenticated;
