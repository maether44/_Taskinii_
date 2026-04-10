import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getHomeSnapshot } from '../services/dashboardService';
import { RECOVERY_MAP } from '../services/workoutService';
import { getLocalAvatarForUser, resolveAvatarUrl } from '../lib/avatar';
import { useAuth } from '../context/AuthContext';
import { useToday } from '../context/TodayContext';
import { DEFAULT_TARGETS } from '../constants/targets';

export function useDashboard() {
  const { user: authUser } = useAuth();
  const userId = authUser?.id ?? null;
  const today = useToday();

  // Dashboard-specific state (not shared — only Home uses these)
  const [snapshot, setSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load the RPC snapshot + profile (dashboard-specific, not duplicated elsewhere)
  const loadSnapshot = useCallback(async () => {
    if (!userId) { setIsLoading(false); return; }
    try {
      setIsLoading(true);
      const TODAY = new Date().toISOString().split('T')[0];

      const [result, profileRow] = await Promise.all([
        getHomeSnapshot(userId),
        supabase
          .from('profiles')
          .select('full_name, goal, avatar_url')
          .eq('id', userId)
          .maybeSingle(),
      ]);

      const localAvatarUrl = await getLocalAvatarForUser(userId).catch(() => null);
      const resolvedAvatarUrl = profileRow?.data?.avatar_url
        ? await resolveAvatarUrl(profileRow.data.avatar_url).catch(() => null)
        : null;

      if (result) {
        setSnapshot({
          ...result,
          user: {
            ...(result.user || {}),
            id: userId,
            name: profileRow?.data?.full_name || result.user?.name || 'User',
            goal: profileRow?.data?.goal || result.user?.goal || 'maintain',
            avatar_url: localAvatarUrl || resolvedAvatarUrl,
          },
        });
      } else {
        setError('No data received');
      }
    } catch (err) {
      console.error('Critical error in useDashboard:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadSnapshot(); }, [loadSnapshot]);

  // Combine: refresh both the snapshot and TodayContext
  const refresh = useCallback(async () => {
    await Promise.all([loadSnapshot(), today.refresh()]);
  }, [loadSnapshot, today.refresh]);

  // Read shared state from TodayContext
  const { waterMl, sleepHours, caloriesBurned: workoutCals, muscleFatigue, goals } = today;

  return {
    isLoading: isLoading || today.loading,
    error,
    user: snapshot?.user || { name: 'User', goal: 'maintain', avatar_url: null },
    stats: {
      calories: {
        eaten:   snapshot?.calories?.eaten || 0,
        target:  snapshot?.calories?.target || goals.calorie_target,
        burned:  workoutCals,
        remaining: (snapshot?.calories?.target || goals.calorie_target) - (snapshot?.calories?.eaten || 0) + workoutCals,
      },
      macros: snapshot?.macros || {
        protein: { current: 0, target: goals.protein_target },
        carbs: { current: 0, target: goals.carbs_target },
        fat: { current: 0, target: goals.fat_target }
      },
      water: { current: waterMl, target: goals.water_target_ml },
      steps: snapshot?.activity?.steps || 0,
      stepsTarget: goals.steps_target ?? DEFAULT_TARGETS.steps_target,
      sleep: sleepHours ?? snapshot?.activity?.sleep_hours ?? null,
    },
    workoutCalories: workoutCals,
    muscleFatigue,
    yaraInsight: (() => {
      const top = muscleFatigue.find(m => m.fatigue_pct >= 70);
      if (top) {
        const recovery = RECOVERY_MAP[top.muscle_name] ?? 'a different muscle group';
        return `I noticed your ${top.muscle_name} fatigue is high (${top.fatigue_pct}%). Tomorrow, we will focus on ${recovery} for recovery.`;
      }
      return snapshot?.insight || "You're doing great! Stay consistent and the results will follow.";
    })(),
    logSleep: useCallback(async (hours) => {
      await today.logSleep({ hours });
    }, [today.logSleep]),
    logWater: today.logWater,
    refresh,
  };
}
