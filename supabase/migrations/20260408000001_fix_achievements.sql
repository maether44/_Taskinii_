-- Fix for get_all_achievements function
-- Make it simpler to avoid syntax issues

CREATE OR REPLACE FUNCTION get_all_achievements(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json[];
BEGIN
  -- Initialize empty array
  v_result := '{}';

  -- Add achievements
  v_result := array_append(v_result, json_build_object(
    'id', 'first_workout',
    'name', 'First Workout',
    'description', 'Completed your first workout!',
    'icon', '🏆',
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
    'id', 'meal_logger',
    'name', 'Meal Logger',
    'description', 'Logged 10 meals!',
    'icon', '🍽️',
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
    'icon', '💪',
    'xp_reward', 75,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_5')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'workout_25',
    'name', 'Workout Champion',
    'description', 'Completed 25 workouts!',
    'icon', '🏅',
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
    'icon', '🍲',
    'xp_reward', 300,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meals_200')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'steps_10k',
    'name', 'Step Master',
    'description', 'Walked 10,000 steps in a day!',
    'icon', '🚶‍♂️',
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
    'icon', '🏃‍♂️',
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
    'icon', '🦸‍♂️',
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