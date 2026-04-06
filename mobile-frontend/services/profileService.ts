import { supabase } from "../lib/supabase";
import { dobToISO } from "../lib/calculations";

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
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    gender: answers.gender,
    date_of_birth: dobToISO(answers.dob),
    height_cm: parseFloat(answers.height),
    weight_kg: parseFloat(answers.weight),
    goal: answers.goal,
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

export const saveCalorieTargets = async (userId, { calTarget, protein }) => {
  const { error } = await supabase.from("calorie_targets").insert({
    user_id: userId,
    daily_calories: parseInt(calTarget),
    protein_target: parseInt(protein),
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
