'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface DailyActivity {
  id: string;
  date: string;
  calories_burned: number;
  water_ml: number;
  steps: number;
  sleep_hours: number;
}

export interface FoodLog {
  id: string;
  food_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  quantity_grams: number;
  consumed_at: string;
  foods: {
    name: string;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    fiber_per_100g: number;
  } | null;
}

export interface WorkoutSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  calories_burned: number;
  notes: string | null;
  ai_feedback: string | null;
}

export interface CalorieTarget {
  daily_calories: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
}

export interface AiInsight {
  id: string;
  insight_type: string;
  message: string;
  period: string | null;
  source: string | null;
  created_at: string;
}

export interface DashboardSnapshot {
  [key: string]: unknown;
}

export function useAppData() {
  const { user } = useAuth();
  const [todayActivity, setTodayActivity] = useState<DailyActivity | null>(null);
  const [weekActivity, setWeekActivity] = useState<DailyActivity[]>([]);
  const [todayFoodLogs, setTodayFoodLogs] = useState<FoodLog[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSession[]>([]);
  const [calorieTarget, setCalorieTarget] = useState<CalorieTarget | null>(null);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [dashboardSnap, setDashboardSnap] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    setLoading(true);
    setError(null);
    try {
      const [activityRes, weekRes, foodRes, workoutRes, targetRes, insightRes, snapRes] = await Promise.all([
        supabase.from('daily_activity').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('daily_activity').select('*').eq('user_id', user.id).gte('date', sevenDaysAgo).order('date', { ascending: true }),
        supabase.from('food_logs').select('*, foods(name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g)').eq('user_id', user.id).gte('consumed_at', today + 'T00:00:00').lte('consumed_at', today + 'T23:59:59').order('consumed_at', { ascending: true }),
        supabase.from('workout_sessions').select('*').eq('user_id', user.id).order('started_at', { ascending: false }).limit(10),
        supabase.from('calorie_targets').select('daily_calories, protein_target, carbs_target, fat_target').eq('user_id', user.id).order('effective_from', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('ai_insights').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.rpc('get_daily_dashboard_v5', { p_user_id: user.id }),
      ]);

      setTodayActivity(activityRes.data ?? null);
      setWeekActivity(weekRes.data ?? []);
      setTodayFoodLogs((foodRes.data as FoodLog[]) ?? []);
      setRecentWorkouts(workoutRes.data ?? []);
      setCalorieTarget(targetRes.data ?? null);
      setInsights(insightRes.data ?? []);
      setDashboardSnap(snapRes.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user, today, sevenDaysAgo]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const insightSub = supabase
      .channel('app-insights')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_insights', filter: `user_id=eq.${user.id}` }, () => {
        supabase.from('ai_insights').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
          .then(({ data }) => { if (data) setInsights(data); });
      })
      .subscribe();

    const activitySub = supabase
      .channel('app-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_activity', filter: `user_id=eq.${user.id}` }, () => {
        supabase.from('daily_activity').select('*').eq('user_id', user.id).eq('date', today).maybeSingle()
          .then(({ data }) => setTodayActivity(data ?? null));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(insightSub);
      supabase.removeChannel(activitySub);
    };
  }, [user, today]);

  return { todayActivity, weekActivity, todayFoodLogs, recentWorkouts, calorieTarget, insights, dashboardSnap, loading, error, refetch: fetchAll };
}
