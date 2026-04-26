import { supabase } from "../lib/supabase";
import { calcMacroTargets, dobToISO, normalizeGoal } from "../lib/calculations";
import { refreshAll } from "./embeddingService";

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("goal, onboarded, date_of_birth, preferred_workout_time, workout_days_per_week")
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const saveOnboardingProfile = async (userId, answers) => {
  const normalizedGoal = normalizeGoal(answers.goal);
  const { error } = await supabase.from("profiles").upsert({
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
    coach_name: answers.coachName ?? "Yara",
  });

  if (error) throw new Error(error.message);
  refreshAll(userId);
};

export const saveCalorieTargets = async (userId, { calTarget, protein, goal }) => {
  const dailyCalories = parseInt(calTarget);
  const macroTargets = calcMacroTargets(dailyCalories, goal);
  const { error } = await supabase.from("calorie_targets").insert({
    user_id: userId,
    daily_calories: dailyCalories,
    protein_target: parseInt(protein) || macroTargets.protein_target,
    carbs_target: macroTargets.carbs_target,
    fat_target: macroTargets.fat_target,
    effective_from: new Date().toISOString().split("T")[0],
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
