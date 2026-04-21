-- Replace achievement data: clearer names, plain descriptions, Ionicons icon names
CREATE OR REPLACE FUNCTION get_all_achievements(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json[];
BEGIN
  v_result := '{}';

  v_result := array_append(v_result, json_build_object(
    'id', 'first_workout', 'name', 'First Workout',
    'description', 'Completed your very first BodyQ workout.',
    'icon', 'barbell-outline', 'xp_reward', 50,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'first_workout')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'week_streak', 'name', '7-Day Streak',
    'description', 'Showed up every day for 7 days straight.',
    'icon', 'flame-outline', 'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'week_streak')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'meal_logger', 'name', '10 Meals Logged',
    'description', 'Tracked your first 10 meals in the food diary.',
    'icon', 'restaurant-outline', 'xp_reward', 50,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meal_logger')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'level_5', 'name', 'Level 5',
    'description', 'Earned enough XP to reach Level 5.',
    'icon', 'trending-up-outline', 'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'level_5')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'level_10', 'name', 'Level 10',
    'description', 'Earned enough XP to reach Level 10.',
    'icon', 'star-outline', 'xp_reward', 200,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'level_10')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'workout_5', 'name', '5 Workouts',
    'description', 'Finished 5 workouts in total.',
    'icon', 'fitness-outline', 'xp_reward', 75,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_5')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'workout_25', 'name', '25 Workouts',
    'description', 'Finished 25 workouts in total.',
    'icon', 'medal-outline', 'xp_reward', 150,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_25')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'workout_100', 'name', '100 Workouts',
    'description', 'Finished 100 workouts in total.',
    'icon', 'trophy-outline', 'xp_reward', 500,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_100')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'meals_50', 'name', '50 Meals Logged',
    'description', 'Tracked 50 meals in the food diary.',
    'icon', 'nutrition-outline', 'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meals_50')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'meals_200', 'name', '200 Meals Logged',
    'description', 'Tracked 200 meals in the food diary.',
    'icon', 'albums-outline', 'xp_reward', 300,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meals_200')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'steps_10k', 'name', '10,000 Steps',
    'description', 'Walked 10,000 steps in a single day.',
    'icon', 'footsteps-outline', 'xp_reward', 75,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'steps_10k')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'sleep_8h', 'name', '8-Hour Sleep',
    'description', 'Slept at least 8 hours in one night.',
    'icon', 'moon-outline', 'xp_reward', 50,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'sleep_8h')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'month_streak', 'name', '30-Day Streak',
    'description', 'Showed up every day for 30 days straight.',
    'icon', 'infinite-outline', 'xp_reward', 300,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'month_streak')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'perfect_week', 'name', 'Perfect Week',
    'description', 'Hit every goal every single day for a full week.',
    'icon', 'checkmark-circle-outline', 'xp_reward', 200,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'perfect_week')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'early_bird', 'name', 'Early Riser',
    'description', 'Completed a workout before 9 AM.',
    'icon', 'sunny-outline', 'xp_reward', 50,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'early_bird')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'night_owl', 'name', 'Night Trainer',
    'description', 'Completed a workout after 9 PM.',
    'icon', 'cloudy-night-outline', 'xp_reward', 50,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'night_owl')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'consistency_king', 'name', '5x This Week',
    'description', 'Trained 5 times in a single week.',
    'icon', 'calendar-outline', 'xp_reward', 125,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'consistency_king')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'calorie_crusher', 'name', '1,000 Cal Burned',
    'description', 'Burned over 1,000 calories in a single session.',
    'icon', 'flash-outline', 'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'calorie_crusher')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'form_perfectionist', 'name', '90% Form Score',
    'description', 'Maintained 90%+ form score throughout a workout.',
    'icon', 'body-outline', 'xp_reward', 75,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'form_perfectionist')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'social_eater', 'name', 'Shared a Meal',
    'description', 'Logged a meal together with someone else.',
    'icon', 'people-outline', 'xp_reward', 60,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'social_eater')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'water_warrior', 'name', '3L in One Day',
    'description', 'Drank 3 litres of water in a single day.',
    'icon', 'water-outline', 'xp_reward', 75,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'water_warrior')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'marathon_walker', 'name', '20,000 Steps',
    'description', 'Walked 20,000 steps in a single day.',
    'icon', 'walk-outline', 'xp_reward', 150,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'marathon_walker')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'sleep_master', 'name', '9-Hour Sleep',
    'description', 'Slept at least 9 hours in one night.',
    'icon', 'bed-outline', 'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'sleep_master')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'goal_crusher', 'name', 'Goal Achieved',
    'description', 'Hit your primary fitness goal.',
    'icon', 'flag-outline', 'xp_reward', 500,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'goal_crusher')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'protein_champion', 'name', '200g Protein Day',
    'description', 'Hit 200g or more of protein in a single day.',
    'icon', 'egg-outline', 'xp_reward', 125,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'protein_champion')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'variety_seeker', 'name', '10 Workout Types',
    'description', 'Tried 10 different types of workouts.',
    'icon', 'grid-outline', 'xp_reward', 150,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'variety_seeker')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'speed_demon', 'name', 'Under 10 Minutes',
    'description', 'Finished a full workout in less than 10 minutes.',
    'icon', 'timer-outline', 'xp_reward', 80,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'speed_demon')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'endurance_king', 'name', '60-Min Session',
    'description', 'Worked out for 60 minutes or more in one go.',
    'icon', 'time-outline', 'xp_reward', 120,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'endurance_king')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'recovery_expert', 'name', '7 Rest Days',
    'description', 'Took proper rest and recovery for 7 days.',
    'icon', 'leaf-outline', 'xp_reward', 175,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'recovery_expert')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'hydration_hero', 'name', 'Hydrated All Week',
    'description', 'Hit your water goal every day for 7 days.',
    'icon', 'shield-checkmark-outline', 'xp_reward', 150,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'hydration_hero')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'step_champion', 'name', '10K Steps × 7 Days',
    'description', 'Hit 10,000 steps every day for a full week.',
    'icon', 'map-outline', 'xp_reward', 200,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'step_champion')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'balanced_lifestyle', 'name', 'All Goals for a Week',
    'description', 'Nailed workouts, food, sleep and water for 7 days.',
    'icon', 'scale-outline', 'xp_reward', 400,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'balanced_lifestyle')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'century_club', 'name', '100-Day Journey',
    'description', 'Logged activity for 100 consecutive days.',
    'icon', 'journal-outline', 'xp_reward', 1000,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'century_club')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'fitness_fanatic', 'name', 'Level 15',
    'description', 'Earned enough XP to reach Level 15.',
    'icon', 'diamond-outline', 'xp_reward', 300,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'fitness_fanatic')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'health_hero', 'name', '14-Day Streak',
    'description', 'Trained every day for 14 days straight.',
    'icon', 'heart-outline', 'xp_reward', 500,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'health_hero')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'ultimate_champion', 'name', 'All Achievements',
    'description', 'Unlocked every single achievement in BodyQ.',
    'icon', 'ribbon-outline', 'xp_reward', 1000,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'ultimate_champion')
  ));

  RETURN json_build_object('achievements', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_achievements(uuid) TO authenticated;
