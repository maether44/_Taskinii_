/**
 * services/aiPlanService.ts
 *
 * Generates and persists AI training plans.
 * Calls Gemini directly (no Edge Function) — avoids 401 auth issues.
 */
import { supabase } from '../lib/supabase';
import { error as logError } from '../lib/logger';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

export type PlanExercise = {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  muscle?: string;
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
    .from('training_plans')
    .select('id, plan_json, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logError('[aiPlanService] loadPlan error:', error.message);
    return null;
  }
  return data as SavedPlan | null;
}

function buildPrompt(profile: any, targets: any): string {
  const age = profile.date_of_birth
    ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 25;

  const goal      = profile.goal ?? 'maintain';
  const gender    = profile.gender ?? 'other';
  const height    = profile.height_cm ?? 170;
  const weight    = profile.weight_kg ?? 70;
  const experience= profile.experience ?? 'beginner';
  const days      = profile.workout_days_per_week ?? 3;
  const equipment = profile.equipment ?? 'full_gym';
  const diet      = profile.diet_pref ?? 'anything';
  const calTarget = targets?.daily_calories ?? 2000;
  const protein   = targets?.protein_target ?? 120;

  const goalLabel: Record<string, string> = {
    lose_fat: 'lose fat', gain_muscle: 'build muscle',
    maintain: 'maintain', gain_weight: 'gain weight',
  };

  const seed = Math.floor(Math.random() * 9999);
  const equipMap: Record<string,string> = {
    full_gym: 'barbell, cable, machine, dumbbell',
    dumbbells: 'dumbbell and bodyweight only',
    home: 'bodyweight only, no equipment',
    resistance_bands: 'resistance bands and bodyweight',
    kettlebells: 'kettlebell and bodyweight',
  };
  const expMap: Record<string,string> = {
    beginner: 'simple compounds, reps 12-15, light weight',
    intermediate: 'compound + isolation, reps 8-12, moderate weight',
    advanced: 'heavy compounds, reps 4-10, periodisation',
  };

  return `[seed:${seed}] You are a fitness coach. Generate a unique ${days}-day training split.

USER: ${goalLabel[goal] ?? goal} goal, ${gender}, ${age}yo, ${height}cm, ${weight}kg.
Level: ${experience}. Equipment: ${equipMap[equipment] ?? equipment}.
Nutrition: ${calTarget}kcal/day, ${protein}g protein. Diet: ${diet}.
Training: ${expMap[experience] ?? experience}.

REQUIREMENTS:
- Vary exercise selection based on the user profile above
- 5 exercises per training day, appropriate for ${equipment}
- 4 meals (Breakfast, Lunch, Dinner, Snack) totaling ~${calTarget}kcal
- Each food item has its own realistic calorie value
- Meal foods must match ${diet} diet preference

JSON only, no markdown:
{"intro":"string","days":[{"name":"string","focus":"string","exercises":[{"name":"string","sets":3,"reps":"string","rest":"string","muscle":"string"}],"coachTip":"string","meals":[{"type":"Breakfast","calories":400,"foods":[{"name":"string","calories":200},{"name":"string","calories":200}]},{"type":"Lunch","calories":500,"foods":[{"name":"string","calories":300},{"name":"string","calories":200}]},{"type":"Dinner","calories":500,"foods":[{"name":"string","calories":300},{"name":"string","calories":200}]},{"type":"Snack","calories":200,"foods":[{"name":"string","calories":200}]}]}],"nutritionNote":"string","recoveryNote":"string","motivationNote":"string"}`;
}

function parsePlanResponse(text: string): AIPlan {
  // Strip markdown fences if present
  let raw = text.replace(/```json|```/g, '').trim();

  // Extract the JSON object
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');

  let clean = jsonMatch[0];

  // First attempt
  try { return JSON.parse(clean); } catch (_) {}

  // Repair common issues
  clean = clean
    .replace(/,\s*([}\]])/g, '$1')   // trailing commas
    .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // unquoted keys
    .replace(/[\x00-\x1F\x7F]/g, ' '); // control chars

  // Balance braces
  const opens  = (clean.match(/\{/g) || []).length;
  const closes = (clean.match(/\}/g) || []).length;
  for (let i = 0; i < opens - closes; i++) clean += '}';

  const aOpens  = (clean.match(/\[/g) || []).length;
  const aCloses = (clean.match(/\]/g) || []).length;
  for (let i = 0; i < aOpens - aCloses; i++) clean += ']';

  try { return JSON.parse(clean); }
  catch (e) { throw new Error('Could not parse AI response. Please retry.'); }
}

/**
 * Generate a new AI training plan from the user's Supabase profile.
 * Calls Gemini directly — no Edge Function needed.
 */
export async function generatePlan(userId: string): Promise<AIPlan> {
  // 1. Fetch profile + calorie targets
  const [{ data: profile }, { data: targets }] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'goal, gender, date_of_birth, height_cm, weight_kg, target_weight_kg, ' +
        'activity_level, experience, equipment, sleep_quality, stress_level, ' +
        'diet_pref, workout_days_per_week, preferred_workout_time'
      )
      .eq('id', userId)
      .single(),
    supabase
      .from('calorie_targets')
      .select('daily_calories, protein_target')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!profile) throw new Error('Profile not found');

  // 2. Call Groq directly
  const prompt = buildPrompt(profile, targets);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 4096,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data?.error ?? data));

  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('Empty response from Groq');

  const plan = parsePlanResponse(text);

  // 3. Save to Supabase
  const { error: saveError } = await supabase
    .from('training_plans')
    .upsert(
      { user_id: userId, plan_json: plan, created_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

  if (saveError) {
    logError('[aiPlanService] save error:', saveError.message);
  }

  return plan;
}


// Different training splits to cycle through on regeneration
const SPLITS = [
  'Push/Pull/Legs split',
  'Upper/Lower split', 
  'Full Body split',
  'Bro split (chest/back/shoulders/arms/legs)',
  'Athletic performance split',
  'Hypertrophy focused split',
];

/**
 * Regenerate with a forced different training split style.
 * Accepts an optional splitIndex to cycle through different styles.
 */
export async function regeneratePlan(userId: string, currentSplitIndex: number = 0): Promise<{ plan: AIPlan; nextSplitIndex: number }> {
  const nextIndex = (currentSplitIndex + 1) % SPLITS.length;
  const forcedSplit = SPLITS[nextIndex];

  const [{ data: profile }, { data: targets }] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'goal, gender, date_of_birth, height_cm, weight_kg, target_weight_kg, ' +
        'activity_level, experience, equipment, sleep_quality, stress_level, ' +
        'diet_pref, workout_days_per_week, preferred_workout_time'
      )
      .eq('id', userId)
      .single(),
    supabase
      .from('calorie_targets')
      .select('daily_calories, protein_target')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!profile) throw new Error('Profile not found');

  const age = profile.date_of_birth
    ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 25;
  const days      = profile.workout_days_per_week ?? 4;
  const equipment = profile.equipment ?? 'full_gym';
  const diet      = profile.diet_pref ?? 'anything';
  const calTarget = targets?.daily_calories ?? 2000;
  const protein   = targets?.protein_target ?? 120;
  const experience= profile.experience ?? 'intermediate';
  const goal      = profile.goal ?? 'maintain';
  const gender    = profile.gender ?? 'other';
  const weight    = profile.weight_kg ?? 70;
  const height    = profile.height_cm ?? 170;
  const seed      = Math.floor(Math.random() * 99999);

  const goalLabel: Record<string, string> = {
    lose_fat: 'lose fat', gain_muscle: 'build muscle',
    maintain: 'maintain', gain_weight: 'gain weight',
  };

  const prompt = `[seed:${seed}] Fitness coach. Generate a DIFFERENT ${days}-day plan using a ${forcedSplit}.

USER: ${goalLabel[goal] ?? goal}, ${gender}, ${age}yo, ${height}cm, ${weight}kg, ${experience}, ${equipment}.
Calories: ${calTarget}kcal, protein: ${protein}g. Diet: ${diet}.

Use the ${forcedSplit} structure. Choose DIFFERENT exercises than typical. Be creative.
4 meals/day totaling ~${calTarget}kcal. Each food has its own calorie value.

JSON only:
{"intro":"string","days":[{"name":"string","focus":"string","exercises":[{"name":"string","sets":3,"reps":"string","rest":"string","muscle":"string"}],"coachTip":"string","meals":[{"type":"Breakfast","calories":400,"foods":[{"name":"string","calories":200},{"name":"string","calories":200}]},{"type":"Lunch","calories":500,"foods":[{"name":"string","calories":300},{"name":"string","calories":200}]},{"type":"Dinner","calories":500,"foods":[{"name":"string","calories":300},{"name":"string","calories":200}]},{"type":"Snack","calories":200,"foods":[{"name":"string","calories":200}]}]}],"nutritionNote":"string","recoveryNote":"string","motivationNote":"string"}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 4096,
      temperature: 0.9,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data?.error ?? data));

  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('Empty response from Groq');

  const plan = parsePlanResponse(text);

  await supabase
    .from('training_plans')
    .upsert(
      { user_id: userId, plan_json: plan, created_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

  return { plan, nextSplitIndex: nextIndex };
}