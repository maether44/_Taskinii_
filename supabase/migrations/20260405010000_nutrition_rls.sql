-- =============================================================================
-- Nutrition logging RLS policies
-- Fixes meal saving for foods, food_logs, daily_activity, and calorie_targets.
-- =============================================================================

ALTER TABLE IF EXISTS foods DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS calorie_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_users_read_foods" ON foods;
DROP POLICY IF EXISTS "authenticated_users_insert_foods" ON foods;

DROP POLICY IF EXISTS "users_manage_own_food_logs" ON food_logs;
CREATE POLICY "users_manage_own_food_logs"
  ON food_logs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_manage_own_daily_activity" ON daily_activity;
CREATE POLICY "users_manage_own_daily_activity"
  ON daily_activity FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_manage_own_calorie_targets" ON calorie_targets;
CREATE POLICY "users_manage_own_calorie_targets"
  ON calorie_targets FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
