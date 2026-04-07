import { createClient } from '@/lib/supabase/server';

export interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  category: string;
  difficulty: string;
  exercises: unknown[];
  ai_adapted: boolean;
  created_at: string;
  user_count?: number;
}

export async function getWorkoutPlans(): Promise<WorkoutPlan[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('workout_plans')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []).map((p) => ({
    ...p,
    exercises: (p.exercises as unknown[]) ?? [],
    user_count: 0,
  }));
}

export async function upsertWorkoutPlan(plan: Partial<WorkoutPlan>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('workout_plans')
    .upsert(plan)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorkoutPlan(id: string) {
  const supabase = createClient();
  await supabase.from('workout_plans').delete().eq('id', id);
}
