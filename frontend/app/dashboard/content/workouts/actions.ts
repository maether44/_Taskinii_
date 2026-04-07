'use server';

import { upsertWorkoutPlan, deleteWorkoutPlan } from '@/lib/supabase/queries/content';
import { WorkoutPlan } from '@/lib/supabase/queries/content';

export async function saveWorkoutPlan(plan: Partial<WorkoutPlan>) {
  return upsertWorkoutPlan(plan);
}

export async function removeWorkoutPlan(id: string) {
  return deleteWorkoutPlan(id);
}
