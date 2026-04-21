/**
 * services/aiPlanService.ts
 *
 * Generates and persists AI training plans via the onboarding-plan edge function.
 * Plans are stored in the training_plans table as JSONB (one active plan per user).
 */
import { supabase } from "../lib/supabase";
import { error as logError } from "../lib/logger";

type ProfileForPlan = {
  goal: string | null;
  gender: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  activity_level: string | null;
  experience: string | null;
  equipment: string | null;
  sleep_quality: string | null;
  stress_level: string | null;
  diet_pref: string | null;
  workout_days_per_week: number | null;
  preferred_workout_time: string | null;
};

type CalorieTargetsForPlan = {
  daily_calories: number | null;
  protein_target: number | null;
};

export type PlanExercise = {
  name: string;
  sets: number;
  reps: string;
  rest: string;
};

export type PlanDay = {
  name: string;
  focus: string;
  exercises: PlanExercise[];
  coachTip: string;
};

export type AIPlan = {
  intro: string;
  days: PlanDay[];
  nutritionNote: string;
  recoveryNote: string;
  motivationNote: string;
};

export type SavedPlan = {
  id: string;
  plan_json: AIPlan;
  created_at: string;
};

/** Load the user's saved training plan (or null if none). */
export async function loadPlan(userId: string): Promise<SavedPlan | null> {
  const { data, error } = await supabase
    .from("training_plans")
    .select("id, plan_json, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logError("[aiPlanService] loadPlan error:", error.message);
    return null;
  }
  return data as SavedPlan | null;
}

/**
 * Generate a new AI training plan from the user's profile.
 * Calls the onboarding-plan edge function, saves to training_plans, returns the plan.
 */
export async function generatePlan(userId: string): Promise<AIPlan> {
  // 1. Fetch profile + calorie targets
  const [{ data: profileRaw }, { data: targetsRaw }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "goal, gender, date_of_birth, height_cm, weight_kg, target_weight_kg, " +
          "activity_level, experience, equipment, sleep_quality, stress_level, " +
          "diet_pref, workout_days_per_week, preferred_workout_time",
      )
      .eq("id", userId)
      .single(),
    supabase
      .from("calorie_targets")
      .select("daily_calories, protein_target")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = profileRaw as unknown as ProfileForPlan | null;
  const targets = targetsRaw as unknown as CalorieTargetsForPlan | null;

  if (!profile) throw new Error("Profile not found");

  const age = profile.date_of_birth
    ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
    : 25;

  // 2. Build answers object matching edge function expectations
  const answers = {
    goal: profile.goal ?? "maintain",
    gender: profile.gender ?? "other",
    age,
    height: profile.height_cm ?? 170,
    weight: profile.weight_kg ?? 70,
    targetW: profile.target_weight_kg ?? null,
    activity: profile.activity_level ?? "moderate",
    experience: profile.experience ?? "beginner",
    injuries: ["none"],
    days: profile.workout_days_per_week ?? 3,
    duration: 30,
    timeOfDay: profile.preferred_workout_time ?? "any",
    equipment: profile.equipment ?? "bodyweight",
    focus: ["balanced"],
    sleep: profile.sleep_quality ?? "ok",
    stress: profile.stress_level ?? "medium",
    diet: profile.diet_pref ?? "anything",
    calTarget: targets?.daily_calories ?? 2000,
    protein: targets?.protein_target ?? 120,
  };

  // 3. Call edge function
  const { data, error } = await supabase.functions.invoke("onboarding-plan", {
    body: { answers },
  });

  if (error) throw new Error(error.message ?? "Failed to generate plan");
  if (!data?.days) throw new Error("Invalid plan response");

  const plan = data as AIPlan;

  // 4. Upsert into training_plans (one per user)
  const { error: saveError } = await supabase
    .from("training_plans")
    .upsert(
      { user_id: userId, plan_json: plan, created_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  if (saveError) {
    logError("[aiPlanService] save error:", saveError.message);
  }

  return plan;
}
