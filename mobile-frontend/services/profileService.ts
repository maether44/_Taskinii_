import { supabase } from '../lib/supabase';
import { calcMacroTargets, dobToISO, normalizeGoal } from '../lib/calculations';
import { resolveAvatarUrl, AVATAR_BUCKET } from '../lib/avatar';

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, goal, onboarded, date_of_birth, preferred_workout_time, workout_days_per_week, avatar_url')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Fetches the user's profile photo URL from the bucket.
 * Returns a public or signed URL that can be used to display the image.
 * If the user has no avatar, returns null.
 */
export const getProfilePhotoUrl = async (userId: string): Promise<string | null> => {
  // First get the avatar path from the profile
  const { data, error } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.avatar_url) return null;

  // The avatar_url in the profile stores the path in the bucket
  const avatarPath = data.avatar_url;

  // Use the avatar resolver to get the proper URL (public or signed)
  const resolvedUrl = await resolveAvatarUrl(avatarPath);
  return resolvedUrl;
};

/**
 * Fetches the full profile data including the resolved profile photo URL.
 * This is a convenience method that combines getProfile with getProfilePhotoUrl.
 */
export const getProfileWithPhoto = async (userId: string) => {
  const profile = await getProfile(userId);
  const photoUrl = await getProfilePhotoUrl(userId);

  return {
    ...profile,
    profile_photo_url: photoUrl,
  };
};

/**
 * Fetches multiple user profiles by their IDs.
 * Returns a Map of userId -> profile data for efficient lookup.
 * This is useful for batch loading user data for comments, posts, etc.
 */
export const getProfilesByIds = async (userIds: string[]) => {
  if (!userIds.length) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  if (error) throw new Error(error.message);

  return new Map((data || []).map((row) => [row.id, row]));
};

export const saveOnboardingProfile = async (userId: string, answers: any) => {
  const normalizedGoal = normalizeGoal(answers.goal);
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    gender: answers.gender,
    date_of_birth: dobToISO(answers.dob),
    height_cm: parseFloat(answers.height),
    weight_kg: parseFloat(answers.weight),
    target_weight_kg: answers.targetW ? parseFloat(answers.targetW) : null,
    goal: normalizedGoal,
    activity_level: answers.activity,
    onboarded: true,
    updated_at: new Date().toISOString(),
    experience: answers.experience,
    equipment: answers.equipment,
    preferred_workout_time: answers.timeOfDay,
    workout_days_per_week: answers.days ?? null,
    sleep_quality: answers.sleep,
    stress_level: answers.stress,
    diet_pref: answers.diet,
  });

  if (error) throw new Error(error.message);
};

export const saveCalorieTargets = async (
  userId: string,
  { calTarget, protein, goal }: { calTarget: any; protein: any; goal: any },
) => {
  const dailyCalories = parseInt(calTarget);
  const macroTargets = calcMacroTargets(dailyCalories, goal);
  const { error } = await supabase.from('calorie_targets').insert({
    user_id: userId,
    daily_calories: dailyCalories,
    protein_target: parseInt(protein) || macroTargets.protein_target,
    carbs_target: macroTargets.carbs_target,
    fat_target: macroTargets.fat_target,
    effective_from: new Date().toISOString().split('T')[0],
  });

  if (error) throw new Error(error.message);
};

// user_id:          userId,
// goal:             answers.goal,
// gender:           answers.gender,
// date_of_birth:    dobToISO(answers.dob),   // ← convert here
// height_cm:        answers.height,
// weight_kg:        answers.weight,
// target_weight_kg: answers.targetW || null,
// activity_level:   answers.activity,
// experience:       answers.experience,
// equipment:        answers.equipment,
// sleep_quality:    answers.sleep,
// stress_level:     answers.stress,
// diet_preference:  answers.diet,
// bmr:              answers.bmr,
// tdee:             answers.tdee,
// cal_target:       answers.calTarget,
// protein_g:        answers.protein,
// onboarded:        true,
// updated_at:       new Date().toISOString(),
