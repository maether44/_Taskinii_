import { supabase } from '../lib/supabase';

export const saveAIPlan = async (userId, aiPlan, answers) => {
  // Deactivate any previous plans first
  await supabase
    .from('ai_plans')
    .update({ is_active: false })
    .eq('id', userId);

  // Insert the new plan
  const { data: plan, error: planError } = await supabase
    .from('ai_plans')
    .insert({
      id:         userId,
      intro:           aiPlan.intro,
      nutrition_note:  aiPlan.nutritionNote,
      recovery_note:   aiPlan.recoveryNote,
      motivation_note: aiPlan.motivationNote,
      is_active:       true,
      raw_json:        aiPlan,
    })
    .select()
    .single();

  if (planError) throw new Error(planError.message);

  // Insert each day and its exercises
  for (const [i, day] of aiPlan.days.entries()) {
    const { data: planDay, error: dayError } = await supabase
      .from('plan_days')
      .insert({
        plan_id:          plan.id,
        day_number:       i + 1,
        name:             day.name,
        focus:            day.focus,
        duration_minutes: answers.duration,
        coach_tip:        day.coachTip,
      })
      .select()
      .single();

    if (dayError) throw new Error(dayError.message);

    const exercises = (day.exercises || []).map((ex, j) => ({
      day_id:      planDay.id,
      order_index: j,
      name:        ex.name,
      sets:        ex.sets,
      reps:        ex.reps,
      rest:        ex.rest,
    }));

    const { error: exError } = await supabase
      .from('plan_exercises')
      .insert(exercises);

    if (exError) throw new Error(exError.message);
  }
};