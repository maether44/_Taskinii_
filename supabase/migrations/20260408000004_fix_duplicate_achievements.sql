-- Fix check_achievements to prevent duplicate achievements using ON CONFLICT
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
    IF EXISTS (SELECT 1 FROM workout_sessions WHERE user_id = p_user_id LIMIT 1) THEN
      SELECT award_xp(p_user_id, 50, 'achievement', 'First workout completed!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'first_workout', 'First Workout', 'Completed your first workout!', '💪', 50)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
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
      VALUES (p_user_id, 'week_streak', '7-Day Streak', 'Maintained activity for 7 days!', '🔥', 100)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
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
      VALUES (p_user_id, 'hydrated', 'Stay Hydrated', 'Logged 2000ml+ of water!', '💧', 30)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'hydrated', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Meal Logger
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meal_logger') THEN
    IF (SELECT COUNT(*) FROM food_logs WHERE user_id = p_user_id) >= 10 THEN
      SELECT award_xp(p_user_id, 50, 'achievement', 'Logged 10 meals!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'meal_logger', 'Meal Logger', 'Logged 10 meals!', '🍎', 50)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'meal_logger', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Level-based achievements
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'level_5') THEN
    IF (SELECT level FROM profiles WHERE id = p_user_id) >= 5 THEN
      SELECT award_xp(p_user_id, 100, 'achievement', 'Reached Level 5!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'level_5', 'Level 5', 'Reached fitness Level 5!', '⭐', 100)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'level_5', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'level_10') THEN
    IF (SELECT level FROM profiles WHERE id = p_user_id) >= 10 THEN
      SELECT award_xp(p_user_id, 200, 'achievement', 'Reached Level 10!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'level_10', 'Level 10', 'Reached fitness Level 10!', '🌟', 200)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'level_10', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Workout achievements
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_5') THEN
    IF (SELECT COUNT(*) FROM workout_sessions WHERE user_id = p_user_id) >= 5 THEN
      SELECT award_xp(p_user_id, 75, 'achievement', 'Completed 5 workouts!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'workout_5', 'Workout Warrior', 'Completed 5 workouts!', '🏋️', 75)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'workout_5', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_25') THEN
    IF (SELECT COUNT(*) FROM workout_sessions WHERE user_id = p_user_id) >= 25 THEN
      SELECT award_xp(p_user_id, 150, 'achievement', 'Completed 25 workouts!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'workout_25', 'Workout Champion', 'Completed 25 workouts!', '🏆', 150)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'workout_25', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_100') THEN
    IF (SELECT COUNT(*) FROM workout_sessions WHERE user_id = p_user_id) >= 100 THEN
      SELECT award_xp(p_user_id, 500, 'achievement', 'Completed 100 workouts!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'workout_100', 'Workout Legend', 'Completed 100 workouts!', '👑', 500)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'workout_100', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Nutrition achievements
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meals_50') THEN
    IF (SELECT COUNT(*) FROM food_logs WHERE user_id = p_user_id) >= 50 THEN
      SELECT award_xp(p_user_id, 100, 'achievement', 'Logged 50 meals!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'meals_50', 'Nutrition Tracker', 'Logged 50 meals!', '🥗', 100)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'meals_50', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meals_200') THEN
    IF (SELECT COUNT(*) FROM food_logs WHERE user_id = p_user_id) >= 200 THEN
      SELECT award_xp(p_user_id, 300, 'achievement', 'Logged 200 meals!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'meals_200', 'Nutrition Master', 'Logged 200 meals!', '🍽️', 300)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'meals_200', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- Activity achievements
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'steps_10k') THEN
    IF EXISTS (SELECT 1 FROM daily_activity WHERE user_id = p_user_id AND steps >= 10000) THEN
      SELECT award_xp(p_user_id, 75, 'achievement', 'Walked 10,000 steps!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'steps_10k', 'Step Master', 'Walked 10,000 steps in a day!', '🚶', 75)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'steps_10k', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'sleep_8h') THEN
    IF EXISTS (SELECT 1 FROM daily_activity WHERE user_id = p_user_id AND sleep_hours >= 8) THEN
      SELECT award_xp(p_user_id, 50, 'achievement', 'Slept 8 hours!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'sleep_8h', 'Sleep Champion', 'Got 8 hours of sleep!', '😴', 50)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'sleep_8h', 'xp_awarded', v_awarded));
    END IF;
  END IF;

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
      VALUES (p_user_id, 'month_streak', 'Monthly Streak', '30-day activity streak!', '📅', 300)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'month_streak', 'xp_awarded', v_awarded));
    END IF;
  END IF;

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
      VALUES (p_user_id, 'perfect_week', 'Perfect Week', '7 days of complete wellness!', '✨', 200)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'perfect_week', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  -- More achievements...
  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'early_bird') THEN
    IF EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE user_id = p_user_id
        AND EXTRACT(hour from started_at) < 8
    ) THEN
      SELECT award_xp(p_user_id, 50, 'achievement', 'Early morning workout!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'early_bird', 'Early Bird', 'Worked out before 8 AM!', '🌅', 50)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'early_bird', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'night_owl') THEN
    IF EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE user_id = p_user_id
        AND EXTRACT(hour from started_at) >= 22
    ) THEN
      SELECT award_xp(p_user_id, 50, 'achievement', 'Late night workout!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'night_owl', 'Night Owl', 'Worked out after 10 PM!', '🦉', 50)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'night_owl', 'xp_awarded', v_awarded));
    END IF;
  END IF;

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
      VALUES (p_user_id, 'consistency_king', 'Consistency King', '5 workouts in one week!', '👑', 125)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'consistency_king', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'calorie_crusher') THEN
    IF EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE user_id = p_user_id
        AND calories_burned >= 1000
    ) THEN
      SELECT award_xp(p_user_id, 100, 'achievement', 'Burned 1000+ calories!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'calorie_crusher', 'Calorie Crusher', 'Burned 1000+ calories in a workout!', '🔥', 100)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'calorie_crusher', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'form_perfectionist') THEN
    IF EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE user_id = p_user_id
        AND (notes LIKE '%90%form%' OR notes LIKE '%91%form%' OR notes LIKE '%92%form%'
          OR notes LIKE '%93%form%' OR notes LIKE '%94%form%' OR notes LIKE '%95%form%'
          OR notes LIKE '%96%form%' OR notes LIKE '%97%form%' OR notes LIKE '%98%form%'
          OR notes LIKE '%99%form%' OR notes LIKE '%100%form%')
    ) THEN
      SELECT award_xp(p_user_id, 75, 'achievement', 'Perfect form!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'form_perfectionist', 'Form Perfectionist', 'Achieved 90%+ form score!', '🎯', 75)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'form_perfectionist', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'social_eater') THEN
    IF (SELECT COUNT(*) FROM food_logs WHERE user_id = p_user_id) >= 20 THEN
      SELECT award_xp(p_user_id, 60, 'achievement', 'Social dining!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'social_eater', 'Social Eater', 'Enjoyed meals with others!', '👥', 60)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'social_eater', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'water_warrior') THEN
    IF EXISTS (SELECT 1 FROM daily_activity WHERE user_id = p_user_id AND water_ml >= 3000) THEN
      SELECT award_xp(p_user_id, 75, 'achievement', 'Drank 3L of water!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'water_warrior', 'Water Warrior', 'Drank 3L of water in a day!', '🌊', 75)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'water_warrior', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'marathon_walker') THEN
    IF EXISTS (SELECT 1 FROM daily_activity WHERE user_id = p_user_id AND steps >= 20000) THEN
      SELECT award_xp(p_user_id, 150, 'achievement', 'Walked 20,000 steps!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'marathon_walker', 'Marathon Walker', 'Walked 20,000 steps in a day!', '🏃‍♂️', 150)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'marathon_walker', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'sleep_master') THEN
    IF EXISTS (SELECT 1 FROM daily_activity WHERE user_id = p_user_id AND sleep_hours >= 9) THEN
      SELECT award_xp(p_user_id, 100, 'achievement', 'Slept 9 hours!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'sleep_master', 'Sleep Master', 'Got 9 hours of quality sleep!', '🌙', 100)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'sleep_master', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'goal_crusher') THEN
    IF EXISTS (
      SELECT 1 FROM profiles
      WHERE id = p_user_id
        AND goal IN ('lose_fat', 'fat_loss')
        AND weight_kg <= target_weight_kg
    ) THEN
      SELECT award_xp(p_user_id, 500, 'achievement', 'Reached target weight!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'goal_crusher', 'Goal Crusher', 'Reached your target weight!', '🎯', 500)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'goal_crusher', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'protein_champion') THEN
    IF (SELECT COUNT(*) FROM food_logs WHERE user_id = p_user_id) >= 30 THEN
      SELECT award_xp(p_user_id, 125, 'achievement', 'Protein champion!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'protein_champion', 'Protein Champion', 'Consumed 200g+ of protein!', '🥩', 125)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'protein_champion', 'xp_awarded', v_awarded));
    END IF;
  END IF;

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
      VALUES (p_user_id, 'variety_seeker', 'Variety Seeker', 'Tried 10 different exercises!', '🎪', 150)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'variety_seeker', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'speed_demon') THEN
    IF EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE user_id = p_user_id
        AND EXTRACT(epoch from (ended_at - started_at))/60 < 10
    ) THEN
      SELECT award_xp(p_user_id, 80, 'achievement', 'Blazing fast workout!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'speed_demon', 'Speed Demon', 'Completed workout in under 10 minutes!', '⚡', 80)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'speed_demon', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'endurance_king') THEN
    IF EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE user_id = p_user_id
        AND EXTRACT(epoch from (ended_at - started_at))/60 >= 60
    ) THEN
      SELECT award_xp(p_user_id, 120, 'achievement', 'Endurance workout!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'endurance_king', 'Endurance King', 'Worked out for 60+ minutes!', '⏰', 120)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'endurance_king', 'xp_awarded', v_awarded));
    END IF;
  END IF;

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
      VALUES (p_user_id, 'recovery_expert', 'Recovery Expert', '7 days of 8+ hours sleep!', '🛏️', 175)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'recovery_expert', 'xp_awarded', v_awarded));
    END IF;
  END IF;

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
      VALUES (p_user_id, 'hydration_hero', 'Hydration Hero', '7 days of 2L+ water intake!', '🏆', 150)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'hydration_hero', 'xp_awarded', v_awarded));
    END IF;
  END IF;

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
      VALUES (p_user_id, 'step_champion', 'Step Champion', '7 days of 10,000+ steps!', '👟', 200)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'step_champion', 'xp_awarded', v_awarded));
    END IF;
  END IF;

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
      VALUES (p_user_id, 'balanced_lifestyle', 'Balanced Lifestyle', '7 perfect days of wellness!', '⚖️', 400)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'balanced_lifestyle', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'century_club') THEN
    IF (
      SELECT COUNT(*) FROM daily_activity
      WHERE user_id = p_user_id
        AND (steps > 0 OR sleep_hours > 0 OR water_ml > 0)
    ) >= 100 THEN
      SELECT award_xp(p_user_id, 1000, 'achievement', '100 days of activity!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'century_club', 'Century Club', '100 days of tracked activity!', '💯', 1000)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'century_club', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'fitness_fanatic') THEN
    IF (SELECT level FROM profiles WHERE id = p_user_id) >= 15 THEN
      SELECT award_xp(p_user_id, 300, 'achievement', 'Reached Level 15!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'fitness_fanatic', 'Fitness Fanatic', 'Reached Level 15!', '🤩', 300)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'fitness_fanatic', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'health_hero') THEN
    IF EXISTS (
      SELECT 1 FROM daily_activity
      WHERE user_id = p_user_id
        AND date >= CURRENT_DATE - INTERVAL '14 days'
        AND steps >= 10000 AND sleep_hours >= 8 AND water_ml >= 2000
      GROUP BY user_id
      HAVING COUNT(*) >= 14
    ) THEN
      SELECT award_xp(p_user_id, 500, 'achievement', 'Perfect wellness for 14 days!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'health_hero', 'Health Hero', 'Perfect wellness for 14 days!', '🦸‍♂️', 500)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'health_hero', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'ultimate_champion') THEN
    -- Check if user has earned a significant number of achievements
    IF (SELECT COUNT(*) FROM achievements WHERE user_id = p_user_id) >= 10 THEN
      SELECT award_xp(p_user_id, 1000, 'achievement', 'Achieved all basic achievements!') INTO v_awarded;
      INSERT INTO achievements (user_id, achievement_id, name, description, icon, xp_reward)
      VALUES (p_user_id, 'ultimate_champion', 'Ultimate Champion', 'Achieved all basic achievements!', '🏅', 1000)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      v_result := array_append(v_result, json_build_object('achievement', 'ultimate_champion', 'xp_awarded', v_awarded));
    END IF;
  END IF;

  RETURN json_build_object('awarded', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION check_achievements(uuid) TO authenticated;