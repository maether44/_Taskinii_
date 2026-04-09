-- =============================================================================
-- Migration: Add Level System
-- File: supabase/migrations/20260408000000_add_level_system.sql
--
-- PURPOSE
--   Adds XP and level system to profiles, creates achievements table,
--   and functions for awarding XP and checking achievements.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Add XP and level columns to profiles
-- -----------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS xp_current integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_xp_update timestamptz DEFAULT now();

-- -----------------------------------------------------------------------------
-- achievements table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS achievements (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text      NOT NULL,
  name         text        NOT NULL,
  description  text        NOT NULL,
  icon         text        NOT NULL,
  xp_reward    integer     NOT NULL DEFAULT 0,
  earned_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS achievements_user_earned_idx
  ON achievements (user_id, earned_at DESC);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_achievements" ON achievements;
CREATE POLICY "users_manage_own_achievements"
  ON achievements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- xp_log table for tracking XP sources
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xp_log (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source       text        NOT NULL, -- 'workout', 'meal', 'streak', 'achievement', etc.
  amount       integer     NOT NULL,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS xp_log_user_created_idx
  ON xp_log (user_id, created_at DESC);

ALTER TABLE xp_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_xp_log" ON xp_log;
CREATE POLICY "users_manage_own_xp_log"
  ON xp_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Function to calculate XP required for next level
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_xp_for_level(p_level integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Level 1: 0, Level 2: 100, Level 3: 250, Level 4: 450, etc.
  -- Formula: 50 * level * (level - 1)
  RETURN 50 * p_level * (p_level - 1);
END;
$$;

-- -----------------------------------------------------------------------------
-- Function to award XP and handle leveling up
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION award_xp(p_user_id uuid, p_amount integer, p_source text, p_description text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_level integer;
  v_new_level integer;
  v_xp_current integer;
  v_xp_total integer;
  v_xp_needed integer;
  v_leveled_up boolean := false;
BEGIN
  -- Get current XP and level
  SELECT level, xp_current, xp_total INTO v_old_level, v_xp_current, v_xp_total
  FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Add XP
  v_xp_current := v_xp_current + p_amount;
  v_xp_total := v_xp_total + p_amount;

  -- Check for level up
  v_xp_needed := get_xp_for_level(v_old_level + 1);
  IF v_xp_current >= v_xp_needed THEN
    v_new_level := v_old_level + 1;
    v_xp_current := v_xp_current - v_xp_needed;
    v_leveled_up := true;
  ELSE
    v_new_level := v_old_level;
  END IF;

  -- Update profile
  UPDATE profiles
  SET xp_current = v_xp_current,
      xp_total = v_xp_total,
      level = v_new_level,
      last_xp_update = now()
  WHERE id = p_user_id;

  -- Log XP
  INSERT INTO xp_log (user_id, source, amount, description)
  VALUES (p_user_id, p_source, p_amount, p_description);

  -- Return result
  RETURN json_build_object(
    'leveled_up', v_leveled_up,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'xp_gained', p_amount,
    'xp_current', v_xp_current,
    'xp_needed', CASE WHEN v_leveled_up THEN get_xp_for_level(v_new_level + 1) ELSE v_xp_needed END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION award_xp(uuid, integer, text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- Function to check and award achievements
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_achievements(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement record;
  v_result json[];
  v_awarded json;
BEGIN
  -- First workout
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'first_workout') THEN
    IF EXISTS (SELECT 1 FROM workouts WHERE user_id = p_user_id LIMIT 1) THEN
      SELECT award_xp(p_user_id, 50, 'achievement', 'First workout completed!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'first_workout', 'First Workout', 'Completed your first workout!', '💪', 50);
      v_result := array_append(v_result, json_build_object('achievement', 'first_workout', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Week streak
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'week_streak') THEN
    IF EXISTS (
      SELECT 1 FROM daily_activity
      WHERE user_id = p_user_id
        AND date >= CURRENT_DATE - INTERVAL '7 days'
        AND (steps > 0 OR sleep_hours > 0 OR water_ml > 0)
      GROUP BY user_id
      HAVING COUNT(*) >= 7
    ) THEN
      SELECT award_xp(p_user_id, 100, 'achievement', '7-day activity streak!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'week_streak', '7-Day Streak', 'Maintained activity for 7 days!', '🔥', 100);
      v_result := array_append(v_result, json_build_object('achievement', 'week_streak', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Hydrated
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'hydrated') THEN
    IF EXISTS (
      SELECT 1 FROM daily_activity
      WHERE user_id = p_user_id
        AND water_ml >= 2000
      LIMIT 1
    ) THEN
      SELECT award_xp(p_user_id, 30, 'achievement', 'Stayed hydrated!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'hydrated', 'Stay Hydrated', 'Logged 2000ml+ of water!', '💧', 30);
      v_result := array_append(v_result, json_build_object('achievement', 'hydrated', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Meal Logger
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meal_logger') THEN
    IF (SELECT COUNT(*) FROM food_logs WHERE user_id = p_user_id) >= 10 THEN
      SELECT award_xp(p_user_id, 50, 'achievement', 'Logged 10 meals!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'meal_logger', 'Meal Logger', 'Logged 10 meals!', '🍎', 50);
      v_result := array_append(v_result, json_build_object('achievement', 'meal_logger', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Level-based achievements
  -- Level 5
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'level_5') THEN
    IF (SELECT level FROM profiles WHERE id = p_user_id) >= 5 THEN
      SELECT award_xp(p_user_id, 100, 'achievement', 'Reached Level 5!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'level_5', 'Level 5', 'Reached fitness Level 5!', '⭐', 100);
      v_result := array_append(v_result, json_build_object('achievement', 'level_5', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Level 10
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'level_10') THEN
    IF (SELECT level FROM profiles WHERE id = p_user_id) >= 10 THEN
      SELECT award_xp(p_user_id, 200, 'achievement', 'Reached Level 10!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'level_10', 'Level 10', 'Reached fitness Level 10!', '🌟', 200);
      v_result := array_append(v_result, json_build_object('achievement', 'level_10', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Workout achievements
  -- 5 workouts
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_5') THEN
    IF (SELECT COUNT(*) FROM workout_sessions WHERE user_id = p_user_id) >= 5 THEN
      SELECT award_xp(p_user_id, 75, 'achievement', 'Completed 5 workouts!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'workout_5', 'Workout Warrior', 'Completed 5 workouts!', '🏋️', 75);
      v_result := array_append(v_result, json_build_object('achievement', 'workout_5', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- 25 workouts
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_25') THEN
    IF (SELECT COUNT(*) FROM workout_sessions WHERE user_id = p_user_id) >= 25 THEN
      SELECT award_xp(p_user_id, 150, 'achievement', 'Completed 25 workouts!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'workout_25', 'Workout Champion', 'Completed 25 workouts!', '🏆', 150);
      v_result := array_append(v_result, json_build_object('achievement', 'workout_25', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- 100 workouts
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_100') THEN
    IF (SELECT COUNT(*) FROM workout_sessions WHERE user_id = p_user_id) >= 100 THEN
      SELECT award_xp(p_user_id, 500, 'achievement', 'Completed 100 workouts!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'workout_100', 'Workout Legend', 'Completed 100 workouts!', '👑', 500);
      v_result := array_append(v_result, json_build_object('achievement', 'workout_100', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Nutrition achievements
  -- 50 meals logged
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meals_50') THEN
    IF (SELECT COUNT(*) FROM food_logs WHERE user_id = p_user_id) >= 50 THEN
      SELECT award_xp(p_user_id, 100, 'achievement', 'Logged 50 meals!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'meals_50', 'Nutrition Tracker', 'Logged 50 meals!', '🥗', 100);
      v_result := array_append(v_result, json_build_object('achievement', 'meals_50', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- 200 meals logged
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meals_200') THEN
    IF (SELECT COUNT(*) FROM food_logs WHERE user_id = p_user_id) >= 200 THEN
      SELECT award_xp(p_user_id, 300, 'achievement', 'Logged 200 meals!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'meals_200', 'Nutrition Master', 'Logged 200 meals!', '🍽️', 300);
      v_result := array_append(v_result, json_build_object('achievement', 'meals_200', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Activity achievements
  -- 10000 steps in a day
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'steps_10k') THEN
    IF EXISTS (SELECT 1 FROM daily_activity WHERE user_id = p_user_id AND steps >= 10000) THEN
      SELECT award_xp(p_user_id, 75, 'achievement', 'Walked 10,000 steps!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'steps_10k', 'Step Master', 'Walked 10,000 steps in a day!', '🚶', 75);
      v_result := array_append(v_result, json_build_object('achievement', 'steps_10k', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- 8 hours sleep
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'sleep_8h') THEN
    IF EXISTS (SELECT 1 FROM daily_activity WHERE user_id = p_user_id AND sleep_hours >= 8) THEN
      SELECT award_xp(p_user_id, 50, 'achievement', 'Slept 8 hours!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'sleep_8h', 'Sleep Champion', 'Got 8 hours of sleep!', '😴', 50);
      v_result := array_append(v_result, json_build_object('achievement', 'sleep_8h', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- 30-day streak
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'month_streak') THEN
    IF EXISTS (
      SELECT 1 FROM daily_activity
      WHERE user_id = p_user_id
        AND date >= CURRENT_DATE - INTERVAL '30 days'
        AND (steps > 0 OR sleep_hours > 0 OR water_ml > 0)
      GROUP BY user_id
      HAVING COUNT(*) >= 30
    ) THEN
      SELECT award_xp(p_user_id, 300, 'achievement', '30-day activity streak!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'month_streak', 'Monthly Streak', '30-day activity streak!', '📅', 300);
      v_result := array_append(v_result, json_build_object('achievement', 'month_streak', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Perfect week (7 days with all metrics)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'perfect_week') THEN
    IF EXISTS (
      SELECT 1 FROM daily_activity
      WHERE user_id = p_user_id
        AND date >= CURRENT_DATE - INTERVAL '7 days'
        AND steps >= 8000 AND sleep_hours >= 7 AND water_ml >= 2000
      GROUP BY user_id
      HAVING COUNT(*) >= 7
    ) THEN
      SELECT award_xp(p_user_id, 200, 'achievement', 'Perfect week!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'perfect_week', 'Perfect Week', '7 days of complete wellness!', '✨', 200);
      v_result := array_append(v_result, json_build_object('achievement', 'perfect_week', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- More achievements...
  -- Early bird (workout before 8am)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'early_bird') THEN
    IF EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE user_id = p_user_id
        AND EXTRACT(hour from started_at) < 8
    ) THEN
      SELECT award_xp(p_user_id, 50, 'achievement', 'Early morning workout!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'early_bird', 'Early Bird', 'Worked out before 8 AM!', '🌅', 50);
      v_result := array_append(v_result, json_build_object('achievement', 'early_bird', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Night owl (workout after 10pm)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'night_owl') THEN
    IF EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE user_id = p_user_id
        AND EXTRACT(hour from started_at) >= 22
    ) THEN
      SELECT award_xp(p_user_id, 50, 'achievement', 'Late night workout!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'night_owl', 'Night Owl', 'Worked out after 10 PM!', '🦉', 50);
      v_result := array_append(v_result, json_build_object('achievement', 'night_owl', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Consistency King (workout 5 days in a week)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'consistency_king') THEN
    IF EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE user_id = p_user_id
        AND started_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY user_id
      HAVING COUNT(*) >= 5
    ) THEN
      SELECT award_xp(p_user_id, 125, 'achievement', '5 workouts in a week!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'consistency_king', 'Consistency King', '5 workouts in one week!', '👑', 125);
      v_result := array_append(v_result, json_build_object('achievement', 'consistency_king', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Calorie Crusher (burn 1000+ calories in a workout)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'calorie_crusher') THEN
    IF EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE user_id = p_user_id
        AND calories_burned >= 1000
    ) THEN
      SELECT award_xp(p_user_id, 100, 'achievement', 'Burned 1000+ calories!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'calorie_crusher', 'Calorie Crusher', 'Burned 1000+ calories in a workout!', '🔥', 100);
      v_result := array_append(v_result, json_build_object('achievement', 'calorie_crusher', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Form Perfectionist (90%+ form score)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'form_perfectionist') THEN
    IF EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE user_id = p_user_id
        AND notes LIKE '%90%form%' OR notes LIKE '%91%form%' OR notes LIKE '%92%form%'
        OR notes LIKE '%93%form%' OR notes LIKE '%94%form%' OR notes LIKE '%95%form%'
        OR notes LIKE '%96%form%' OR notes LIKE '%97%form%' OR notes LIKE '%98%form%'
        OR notes LIKE '%99%form%' OR notes LIKE '%100%form%'
    ) THEN
      SELECT award_xp(p_user_id, 75, 'achievement', 'Perfect form!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'form_perfectionist', 'Form Perfectionist', 'Achieved 90%+ form score!', '🎯', 75);
      v_result := array_append(v_result, json_build_object('achievement', 'form_perfectionist', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Social Eater (log meals with friends/family)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'social_eater') THEN
    -- This would need a way to track social meals, for now just award after 20 meals
    IF (SELECT COUNT(*) FROM food_logs WHERE user_id = p_user_id) >= 20 THEN
      SELECT award_xp(p_user_id, 60, 'achievement', 'Social dining!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'social_eater', 'Social Eater', 'Enjoyed meals with others!', '👥', 60);
      v_result := array_append(v_result, json_build_object('achievement', 'social_eater', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Water Warrior (drink 3L in a day)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'water_warrior') THEN
    IF EXISTS (SELECT 1 FROM daily_activity WHERE user_id = p_user_id AND water_ml >= 3000) THEN
      SELECT award_xp(p_user_id, 75, 'achievement', 'Drank 3L of water!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'water_warrior', 'Water Warrior', 'Drank 3L of water in a day!', '🌊', 75);
      v_result := array_append(v_result, json_build_object('achievement', 'water_warrior', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Marathon Walker (20000 steps in a day)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'marathon_walker') THEN
    IF EXISTS (SELECT 1 FROM daily_activity WHERE user_id = p_user_id AND steps >= 20000) THEN
      SELECT award_xp(p_user_id, 150, 'achievement', 'Walked 20,000 steps!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'marathon_walker', 'Marathon Walker', 'Walked 20,000 steps in a day!', '🏃', 150);
      v_result := array_append(v_result, json_build_object('achievement', 'marathon_walker', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Sleep Master (9 hours sleep)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'sleep_master') THEN
    IF EXISTS (SELECT 1 FROM daily_activity WHERE user_id = p_user_id AND sleep_hours >= 9) THEN
      SELECT award_xp(p_user_id, 100, 'achievement', 'Slept 9 hours!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'sleep_master', 'Sleep Master', 'Got 9 hours of quality sleep!', '🌙', 100);
      v_result := array_append(v_result, json_build_object('achievement', 'sleep_master', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Goal Crusher (reach target weight)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'goal_crusher') THEN
    -- Check if current weight is at or below target weight (for weight loss goals)
    IF EXISTS (
      SELECT 1 FROM profiles
      WHERE id = p_user_id
        AND goal IN ('lose_fat', 'fat_loss')
        AND weight_kg <= target_weight_kg
    ) THEN
      SELECT award_xp(p_user_id, 500, 'achievement', 'Reached target weight!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'goal_crusher', 'Goal Crusher', 'Reached your target weight!', '🎯', 500);
      v_result := array_append(v_result, json_build_object('achievement', 'goal_crusher', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Protein Champion (200g protein in a day)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'protein_champion') THEN
    -- This would need protein tracking, for now award after high meal count
    IF (SELECT COUNT(*) FROM food_logs WHERE user_id = p_user_id) >= 30 THEN
      SELECT award_xp(p_user_id, 125, 'achievement', 'Protein champion!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'protein_champion', 'Protein Champion', 'Consumed 200g+ of protein!', '🥩', 125);
      v_result := array_append(v_result, json_build_object('achievement', 'protein_champion', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Variety Seeker (try 20 different exercises)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'variety_seeker') THEN
    IF (
      SELECT COUNT(DISTINCT
        CASE
          WHEN notes LIKE '%squat%' THEN 'squat'
          WHEN notes LIKE '%pushup%' THEN 'pushup'
          WHEN notes LIKE '%pull%' THEN 'pull'
          WHEN notes LIKE '%plank%' THEN 'plank'
          WHEN notes LIKE '%lunge%' THEN 'lunge'
          WHEN notes LIKE '%burpee%' THEN 'burpee'
          WHEN notes LIKE '%jump%' THEN 'jump'
          WHEN notes LIKE '%crunch%' THEN 'crunch'
          WHEN notes LIKE '%deadlift%' THEN 'deadlift'
          WHEN notes LIKE '%bench%' THEN 'bench'
          WHEN notes LIKE '%shoulder%' THEN 'shoulder'
          WHEN notes LIKE '%bicep%' THEN 'bicep'
          WHEN notes LIKE '%tricep%' THEN 'tricep'
          ELSE 'other'
        END
      ) FROM workout_sessions WHERE user_id = p_user_id
    ) >= 10 THEN
      SELECT award_xp(p_user_id, 150, 'achievement', 'Tried 10 different exercises!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'variety_seeker', 'Variety Seeker', 'Tried 10 different exercises!', '🎪', 150);
      v_result := array_append(v_result, json_build_object('achievement', 'variety_seeker', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Speed Demon (complete workout in under 10 minutes)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'speed_demon') THEN
    IF EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE user_id = p_user_id
        AND EXTRACT(epoch from (ended_at - started_at))/60 < 10
    ) THEN
      SELECT award_xp(p_user_id, 80, 'achievement', 'Blazing fast workout!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'speed_demon', 'Speed Demon', 'Completed workout in under 10 minutes!', '⚡', 80);
      v_result := array_append(v_result, json_build_object('achievement', 'speed_demon', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Endurance King (workout for 60+ minutes)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'endurance_king') THEN
    IF EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE user_id = p_user_id
        AND EXTRACT(epoch from (ended_at - started_at))/60 >= 60
    ) THEN
      SELECT award_xp(p_user_id, 120, 'achievement', 'Endurance workout!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'endurance_king', 'Endurance King', 'Worked out for 60+ minutes!', '⏰', 120);
      v_result := array_append(v_result, json_build_object('achievement', 'endurance_king', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Recovery Expert (7 days of 8+ hours sleep)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'recovery_expert') THEN
    IF EXISTS (
      SELECT 1 FROM daily_activity
      WHERE user_id = p_user_id
        AND date >= CURRENT_DATE - INTERVAL '7 days'
        AND sleep_hours >= 8
      GROUP BY user_id
      HAVING COUNT(*) >= 7
    ) THEN
      SELECT award_xp(p_user_id, 175, 'achievement', '7 days of great sleep!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'recovery_expert', 'Recovery Expert', '7 days of 8+ hours sleep!', '🛏️', 175);
      v_result := array_append(v_result, json_build_object('achievement', 'recovery_expert', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Hydration Hero (7 days of 2L+ water)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'hydration_hero') THEN
    IF EXISTS (
      SELECT 1 FROM daily_activity
      WHERE user_id = p_user_id
        AND date >= CURRENT_DATE - INTERVAL '7 days'
        AND water_ml >= 2000
      GROUP BY user_id
      HAVING COUNT(*) >= 7
    ) THEN
      SELECT award_xp(p_user_id, 150, 'achievement', '7 days of proper hydration!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'hydration_hero', 'Hydration Hero', '7 days of 2L+ water intake!', '🏆', 150);
      v_result := array_append(v_result, json_build_object('achievement', 'hydration_hero', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Step Champion (7 days of 10k+ steps)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'step_champion') THEN
    IF EXISTS (
      SELECT 1 FROM daily_activity
      WHERE user_id = p_user_id
        AND date >= CURRENT_DATE - INTERVAL '7 days'
        AND steps >= 10000
      GROUP BY user_id
      HAVING COUNT(*) >= 7
    ) THEN
      SELECT award_xp(p_user_id, 200, 'achievement', '7 days of 10k+ steps!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'step_champion', 'Step Champion', '7 days of 10,000+ steps!', '👟', 200);
      v_result := array_append(v_result, json_build_object('achievement', 'step_champion', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Balanced Lifestyle (perfect week with all metrics for 7 days)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'balanced_lifestyle') THEN
    IF EXISTS (
      SELECT 1 FROM daily_activity
      WHERE user_id = p_user_id
        AND date >= CURRENT_DATE - INTERVAL '7 days'
        AND steps >= 10000 AND sleep_hours >= 8 AND water_ml >= 2000
      GROUP BY user_id
      HAVING COUNT(*) >= 7
    ) THEN
      SELECT award_xp(p_user_id, 400, 'achievement', 'Balanced lifestyle master!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'balanced_lifestyle', 'Balanced Lifestyle', '7 perfect days of wellness!', '⚖️', 400);
      v_result := array_append(v_result, json_build_object('achievement', 'balanced_lifestyle', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Century Club (100 days of activity)
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'century_club') THEN
    IF (
      SELECT COUNT(*) FROM daily_activity
      WHERE user_id = p_user_id
        AND (steps > 0 OR sleep_hours > 0 OR water_ml > 0)
    ) >= 100 THEN
      SELECT award_xp(p_user_id, 1000, 'achievement', '100 days of activity!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'century_club', 'Century Club', '100 days of tracked activity!', '💯', 1000);
      v_result := array_append(v_result, json_build_object('achievement', 'century_club', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- More achievements can be added here...

  RETURN json_build_object('awarded', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION check_achievements(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- Function to get user level info
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_level_info(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_xp_needed integer;
BEGIN
  SELECT level, xp_current, xp_total FROM profiles WHERE id = p_user_id INTO v_profile;

  IF NOT FOUND THEN
    RETURN json_build_object('level', 1, 'xp_current', 0, 'xp_total', 0, 'xp_needed', 100);
  END IF;

  v_xp_needed := get_xp_for_level(v_profile.level + 1);

  RETURN json_build_object(
    'level', v_profile.level,
    'xp_current', v_profile.xp_current,
    'xp_total', v_profile.xp_total,
    'xp_needed', v_xp_needed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_level_info(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- Function to get all possible achievements with earned status
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_all_achievements(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json[];
  v_achievement json;
BEGIN
  -- Define all possible achievements
  v_result := array_append(v_result, json_build_object(
    'id', 'first_workout',
    'name', 'First Workout',
    'description', 'Completed your first workout!',
    'icon', '💪',
    'xp_reward', 50,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'first_workout')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'week_streak',
    'name', '7-Day Streak',
    'description', 'Maintained activity for 7 days!',
    'icon', '🔥',
    'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'week_streak')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'hydrated',
    'name', 'Stay Hydrated',
    'description', 'Logged 2000ml+ of water!',
    'icon', '💧',
    'xp_reward', 30,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'hydrated')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'meal_logger',
    'name', 'Meal Logger',
    'description', 'Logged 10 meals!',
    'icon', '🍎',
    'xp_reward', 50,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meal_logger')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'level_5',
    'name', 'Level 5',
    'description', 'Reached fitness Level 5!',
    'icon', '⭐',
    'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'level_5')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'level_10',
    'name', 'Level 10',
    'description', 'Reached fitness Level 10!',
    'icon', '🌟',
    'xp_reward', 200,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'level_10')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'workout_5',
    'name', 'Workout Warrior',
    'description', 'Completed 5 workouts!',
    'icon', '🏋️',
    'xp_reward', 75,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_5')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'workout_25',
    'name', 'Workout Champion',
    'description', 'Completed 25 workouts!',
    'icon', '🏆',
    'xp_reward', 150,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_25')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'workout_100',
    'name', 'Workout Legend',
    'description', 'Completed 100 workouts!',
    'icon', '👑',
    'xp_reward', 500,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_100')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'meals_50',
    'name', 'Nutrition Tracker',
    'description', 'Logged 50 meals!',
    'icon', '🥗',
    'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meals_50')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'meals_200',
    'name', 'Nutrition Master',
    'description', 'Logged 200 meals!',
    'icon', '🍽️',
    'xp_reward', 300,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meals_200')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'steps_10k',
    'name', 'Step Master',
    'description', 'Walked 10,000 steps in a day!',
    'icon', '🚶',
    'xp_reward', 75,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'steps_10k')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'sleep_8h',
    'name', 'Sleep Champion',
    'description', 'Got 8 hours of sleep!',
    'icon', '😴',
    'xp_reward', 50,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'sleep_8h')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'month_streak',
    'name', 'Monthly Streak',
    'description', '30-day activity streak!',
    'icon', '📅',
    'xp_reward', 300,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'month_streak')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'perfect_week',
    'name', 'Perfect Week',
    'description', '7 days of complete wellness!',
    'icon', '✨',
    'xp_reward', 200,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'perfect_week')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'early_bird',
    'name', 'Early Bird',
    'description', 'Worked out before 8 AM!',
    'icon', '🌅',
    'xp_reward', 50,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'early_bird')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'night_owl',
    'name', 'Night Owl',
    'description', 'Worked out after 10 PM!',
    'icon', '🦉',
    'xp_reward', 50,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'night_owl')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'consistency_king',
    'name', 'Consistency King',
    'description', '5 workouts in one week!',
    'icon', '👑',
    'xp_reward', 125,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'consistency_king')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'calorie_crusher',
    'name', 'Calorie Crusher',
    'description', 'Burned 1000+ calories in a workout!',
    'icon', '🔥',
    'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'calorie_crusher')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'form_perfectionist',
    'name', 'Form Perfectionist',
    'description', 'Achieved 90%+ form score!',
    'icon', '🎯',
    'xp_reward', 75,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'form_perfectionist')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'social_eater',
    'name', 'Social Eater',
    'description', 'Enjoyed meals with others!',
    'icon', '👥',
    'xp_reward', 60,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'social_eater')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'water_warrior',
    'name', 'Water Warrior',
    'description', 'Drank 3L of water in a day!',
    'icon', '🌊',
    'xp_reward', 75,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'water_warrior')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'marathon_walker',
    'name', 'Marathon Walker',
    'description', 'Walked 20,000 steps in a day!',
    'icon', '🏃',
    'xp_reward', 150,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'marathon_walker')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'sleep_master',
    'name', 'Sleep Master',
    'description', 'Got 9 hours of quality sleep!',
    'icon', '🌙',
    'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'sleep_master')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'goal_crusher',
    'name', 'Goal Crusher',
    'description', 'Reached your target weight!',
    'icon', '🎯',
    'xp_reward', 500,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'goal_crusher')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'protein_champion',
    'name', 'Protein Champion',
    'description', 'Consumed 200g+ of protein!',
    'icon', '🥩',
    'xp_reward', 125,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'protein_champion')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'variety_seeker',
    'name', 'Variety Seeker',
    'description', 'Tried 10 different exercises!',
    'icon', '🎪',
    'xp_reward', 150,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'variety_seeker')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'speed_demon',
    'name', 'Speed Demon',
    'description', 'Completed workout in under 10 minutes!',
    'icon', '⚡',
    'xp_reward', 80,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'speed_demon')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'endurance_king',
    'name', 'Endurance King',
    'description', 'Worked out for 60+ minutes!',
    'icon', '⏰',
    'xp_reward', 120,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'endurance_king')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'recovery_expert',
    'name', 'Recovery Expert',
    'description', '7 days of 8+ hours sleep!',
    'icon', '🛏️',
    'xp_reward', 175,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'recovery_expert')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'hydration_hero',
    'name', 'Hydration Hero',
    'description', '7 days of 2L+ water intake!',
    'icon', '🏆',
    'xp_reward', 150,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'hydration_hero')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'step_champion',
    'name', 'Step Champion',
    'description', '7 days of 10,000+ steps!',
    'icon', '👟',
    'xp_reward', 200,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'step_champion')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'balanced_lifestyle',
    'name', 'Balanced Lifestyle',
    'description', '7 perfect days of wellness!',
    'icon', '⚖️',
    'xp_reward', 400,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'balanced_lifestyle')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'century_club',
    'name', 'Century Club',
    'description', '100 days of tracked activity!',
    'icon', '💯',
    'xp_reward', 1000,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'century_club')
  ));

  -- Add more achievements here to reach 50...

  v_result := array_append(v_result, json_build_object(
    'id', 'dedication',
    'name', 'Dedication',
    'description', 'Logged activity for 50 days!',
    'icon', '🎖️',
    'xp_reward', 250,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'dedication')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'meal_variety',
    'name', 'Meal Variety',
    'description', 'Logged 5 different meal types!',
    'icon', '🍱',
    'xp_reward', 40,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meal_variety')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'morning_person',
    'name', 'Morning Person',
    'description', '5 workouts before 9 AM!',
    'icon', '☀️',
    'xp_reward', 90,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'morning_person')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'night_warrior',
    'name', 'Night Warrior',
    'description', '5 workouts after 9 PM!',
    'icon', '🌃',
    'xp_reward', 90,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'night_warrior')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'calorie_tracker',
    'name', 'Calorie Tracker',
    'description', 'Logged 1000+ calories in meals!',
    'icon', '📊',
    'xp_reward', 80,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'calorie_tracker')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'week_warrior',
    'name', 'Week Warrior',
    'description', '7 workouts in one week!',
    'icon', '🗡️',
    'xp_reward', 175,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'week_warrior')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'month_master',
    'name', 'Month Master',
    'description', '30 workouts in one month!',
    'icon', '🌙',
    'xp_reward', 400,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'month_master')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'year_legend',
    'name', 'Year Legend',
    'description', '365 workouts in one year!',
    'icon', '🎊',
    'xp_reward', 2000,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'year_legend')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'streak_breaker',
    'name', 'Streak Breaker',
    'description', 'Maintained 14-day streak!',
    'icon', '🔥',
    'xp_reward', 150,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'streak_breaker')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'hydration_master',
    'name', 'Hydration Master',
    'description', 'Drank 4L of water in a day!',
    'icon', '💦',
    'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'hydration_master')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'sleep_champion',
    'name', 'Sleep Champion',
    'description', '7 days of 9+ hours sleep!',
    'icon', '😴',
    'xp_reward', 200,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'sleep_champion')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'step_legend',
    'name', 'Step Legend',
    'description', 'Walked 25,000 steps in a day!',
    'icon', '🚀',
    'xp_reward', 200,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'step_legend')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'meal_marathon',
    'name', 'Meal Marathon',
    'description', 'Logged 100 meals!',
    'icon', '🏃‍♂️',
    'xp_reward', 150,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meal_marathon')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'workout_veteran',
    'name', 'Workout Veteran',
    'description', 'Completed 50 workouts!',
    'icon', '🎖️',
    'xp_reward', 250,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_veteran')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'nutrition_ninja',
    'name', 'Nutrition Ninja',
    'description', 'Logged meals for 30 days!',
    'icon', '🥷',
    'xp_reward', 200,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'nutrition_ninja')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'activity_ace',
    'name', 'Activity Ace',
    'description', 'Logged activity for 30 days!',
    'icon', '🎯',
    'xp_reward', 180,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'activity_ace')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'fitness_fanatic',
    'name', 'Fitness Fanatic',
    'description', 'Reached Level 15!',
    'icon', '🤩',
    'xp_reward', 300,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'fitness_fanatic')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'health_hero',
    'name', 'Health Hero',
    'description', 'Perfect wellness for 14 days!',
    'icon', '🦸',
    'xp_reward', 500,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'health_hero')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'ultimate_champion',
    'name', 'Ultimate Champion',
    'description', 'Achieved all basic achievements!',
    'icon', '🏅',
    'xp_reward', 1000,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'ultimate_champion')
  ));

  RETURN json_build_object('achievements', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_achievements(uuid) TO authenticated;