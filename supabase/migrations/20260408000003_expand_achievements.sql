-- Expand achievements list with sophisticated icons
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

  -- Add achievements with sophisticated icons
  v_result := array_append(v_result, json_build_object(
    'id', 'first_workout',
    'name', 'Genesis',
    'description', 'Embarked on your fitness odyssey!',
    'icon', '🌟',
    'xp_reward', 50,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'first_workout')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'week_streak',
    'name', 'Flame Keeper',
    'description', 'Sustained the sacred fire for 7 days!',
    'icon', '🔥',
    'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'week_streak')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'meal_logger',
    'name', 'Culinary Chronicler',
    'description', 'Documented 10 gastronomic journeys!',
    'icon', '📜',
    'xp_reward', 50,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meal_logger')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'level_5',
    'name', 'Ascended Initiate',
    'description', 'Climbed to Level 5 in the hierarchy!',
    'icon', '⚡',
    'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'level_5')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'level_10',
    'name', 'Elite Vanguard',
    'description', 'Commanded Level 10 dominion!',
    'icon', '👑',
    'xp_reward', 200,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'level_10')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'workout_5',
    'name', 'Forge Warrior',
    'description', 'Tempered steel through 5 battles!',
    'icon', '⚔️',
    'xp_reward', 75,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_5')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'workout_25',
    'name', 'Battle-Hardened',
    'description', 'Survived 25 epic confrontations!',
    'icon', '🏆',
    'xp_reward', 150,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_25')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'workout_100',
    'name', 'Mythic Legend',
    'description', 'Chronicled 100 legendary sagas!',
    'icon', '📖',
    'xp_reward', 500,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'workout_100')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'meals_50',
    'name', 'Epicurean Scholar',
    'description', 'Mastered 50 culinary manuscripts!',
    'icon', '🎭',
    'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meals_50')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'meals_200',
    'name', 'Gastronomic Oracle',
    'description', 'Divined wisdom from 200 feasts!',
    'icon', '🔮',
    'xp_reward', 300,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'meals_200')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'steps_10k',
    'name', 'Pathfinder',
    'description', 'Charted 10,000 steps through unknown lands!',
    'icon', '🗺️',
    'xp_reward', 75,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'steps_10k')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'sleep_8h',
    'name', 'Dream Weaver',
    'description', 'Wove 8 hours of restorative dreams!',
    'icon', '🌙',
    'xp_reward', 50,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'sleep_8h')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'month_streak',
    'name', 'Eternal Flame',
    'description', 'Nurtured the flame for 30 unbroken cycles!',
    'icon', '♾️',
    'xp_reward', 300,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'month_streak')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'perfect_week',
    'name', 'Harmony Weaver',
    'description', 'Orchestrated 7 days of perfect balance!',
    'icon', '🎼',
    'xp_reward', 200,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'perfect_week')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'early_bird',
    'name', 'Dawn Sentinel',
    'description', 'Stood guard at the break of dawn!',
    'icon', '🌅',
    'xp_reward', 50,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'early_bird')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'night_owl',
    'name', 'Midnight Sage',
    'description', 'Consulted the wisdom of the night!',
    'icon', '🦉',
    'xp_reward', 50,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'night_owl')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'consistency_king',
    'name', 'Rhythm Master',
    'description', 'Conducted 5 symphonies in one week!',
    'icon', '🎶',
    'xp_reward', 125,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'consistency_king')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'calorie_crusher',
    'name', 'Inferno Lord',
    'description', 'Forged 1000 flames in the crucible!',
    'icon', '🌋',
    'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'calorie_crusher')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'form_perfectionist',
    'name', 'Precision Artisan',
    'description', 'Achieved 90%+ mastery of form!',
    'icon', '🎯',
    'xp_reward', 75,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'form_perfectionist')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'social_eater',
    'name', 'Convivial Spirit',
    'description', 'Shared nourishment with kindred souls!',
    'icon', '🤝',
    'xp_reward', 60,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'social_eater')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'water_warrior',
    'name', 'Aqua Sovereign',
    'description', 'Commanded 3L of life-giving waters!',
    'icon', '🌊',
    'xp_reward', 75,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'water_warrior')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'marathon_walker',
    'name', 'Odyssey Runner',
    'description', 'Journeyed 20,000 steps across vast realms!',
    'icon', '🏃‍♂️',
    'xp_reward', 150,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'marathon_walker')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'sleep_master',
    'name', 'Slumber Archmage',
    'description', 'Mastered 9 hours of ethereal rest!',
    'icon', '✨',
    'xp_reward', 100,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'sleep_master')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'goal_crusher',
    'name', 'Destiny Forger',
    'description', 'Shaped reality to meet your vision!',
    'icon', '🔨',
    'xp_reward', 500,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'goal_crusher')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'protein_champion',
    'name', 'Vitality Alchemist',
    'description', 'Transmuted 200g+ into pure strength!',
    'icon', '⚗️',
    'xp_reward', 125,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'protein_champion')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'variety_seeker',
    'name', 'Diverse Maestro',
    'description', 'Conducted 10 unique symphonies!',
    'icon', '🎪',
    'xp_reward', 150,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'variety_seeker')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'speed_demon',
    'name', 'Velocity Phantom',
    'description', 'Danced through time in under 10 minutes!',
    'icon', '💨',
    'xp_reward', 80,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'speed_demon')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'endurance_king',
    'name', 'Timeless Guardian',
    'description', 'Stood vigilant for 60+ sacred minutes!',
    'icon', '⏳',
    'xp_reward', 120,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'endurance_king')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'recovery_expert',
    'name', 'Restoration Sage',
    'description', 'Cultivated 7 days of profound renewal!',
    'icon', '🕊️',
    'xp_reward', 175,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'recovery_expert')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'hydration_hero',
    'name', 'Elixir Champion',
    'description', 'Brewed vitality for 7 radiant days!',
    'icon', '🏆',
    'xp_reward', 150,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'hydration_hero')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'step_champion',
    'name', 'Stride Sovereign',
    'description', 'Marched 10,000 steps for 7 triumphant days!',
    'icon', '👣',
    'xp_reward', 200,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'step_champion')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'balanced_lifestyle',
    'name', 'Equilibrium Master',
    'description', 'Harmonized 7 days of perfect existence!',
    'icon', '⚖️',
    'xp_reward', 400,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'balanced_lifestyle')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'century_club',
    'name', 'Centennial Sage',
    'description', 'Witnessed 100 cycles of transformation!',
    'icon', '💎',
    'xp_reward', 1000,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'century_club')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'fitness_fanatic',
    'name', 'Ascended Adept',
    'description', 'Transcended to Level 15 enlightenment!',
    'icon', '🧘‍♂️',
    'xp_reward', 300,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'fitness_fanatic')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'health_hero',
    'name', 'Vitality Avatar',
    'description', 'Embodied perfect wellness for 14 days!',
    'icon', '🦸‍♂️',
    'xp_reward', 500,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'health_hero')
  ));

  v_result := array_append(v_result, json_build_object(
    'id', 'ultimate_champion',
    'name', 'Supreme Sovereign',
    'description', 'Conquered all realms of achievement!',
    'icon', '🏅',
    'xp_reward', 1000,
    'earned', EXISTS (SELECT 1 FROM achievements WHERE user_id = p_user_id AND achievement_id = 'ultimate_champion')
  ));

  RETURN json_build_object('achievements', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_achievements(uuid) TO authenticated;