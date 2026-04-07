'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface Streaks {
  workout: number;
  nutrition: number;
  water: number;
  steps: number;
  overall: number;
}

export function useStreaks() {
  const { user } = useAuth();
  const [streaks, setStreaks] = useState<Streaks>({ workout: 0, nutrition: 0, water: 0, steps: 0, overall: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    async function calculate() {
      setLoading(true);
      try {
        const [actRes, workoutRes, foodRes] = await Promise.all([
          supabase.from('daily_activity').select('date, water_ml, steps').eq('user_id', user!.id).gte('date', sixtyDaysAgo).order('date', { ascending: false }),
          supabase.from('workout_sessions').select('started_at').eq('user_id', user!.id).gte('started_at', sixtyDaysAgo + 'T00:00:00').order('started_at', { ascending: false }),
          supabase.from('food_logs').select('consumed_at').eq('user_id', user!.id).gte('consumed_at', sixtyDaysAgo + 'T00:00:00').order('consumed_at', { ascending: false }),
        ]);

        const actMap = new Map<string, { water_ml: number; steps: number }>();
        for (const row of actRes.data ?? []) {
          actMap.set(row.date, { water_ml: row.water_ml ?? 0, steps: row.steps ?? 0 });
        }

        const workoutDays = new Set<string>();
        for (const row of workoutRes.data ?? []) {
          workoutDays.add(row.started_at.split('T')[0]);
        }

        const nutritionDays = new Set<string>();
        for (const row of foodRes.data ?? []) {
          nutritionDays.add(row.consumed_at.split('T')[0]);
        }

        function countStreak(hasActivity: (date: string) => boolean): number {
          let streak = 0;
          const d = new Date(today);
          let skippedToday = false;
          while (true) {
            const ds = d.toISOString().split('T')[0];
            if (hasActivity(ds)) {
              streak++;
              d.setDate(d.getDate() - 1);
            } else if (ds === todayStr && !skippedToday) {
              // Allow today to be incomplete — check yesterday first
              skippedToday = true;
              d.setDate(d.getDate() - 1);
            } else {
              break;
            }
          }
          return streak;
        }

        const workout = countStreak((d) => workoutDays.has(d));
        const nutrition = countStreak((d) => nutritionDays.has(d));
        const water = countStreak((d) => (actMap.get(d)?.water_ml ?? 0) >= 2000);
        const steps = countStreak((d) => (actMap.get(d)?.steps ?? 0) >= 8000);
        const overall = countStreak((d) => workoutDays.has(d) && nutritionDays.has(d) && (actMap.get(d)?.water_ml ?? 0) >= 2000 && (actMap.get(d)?.steps ?? 0) >= 8000);

        setStreaks({ workout, nutrition, water, steps, overall });
      } finally {
        setLoading(false);
      }
    }

    calculate();
  }, [user]);

  return { streaks, loading };
}
