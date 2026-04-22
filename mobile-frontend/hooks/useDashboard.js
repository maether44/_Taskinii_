import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getHomeSnapshot } from '../services/dashboardService';
import { RECOVERY_MAP } from '../services/workoutService';
import { getLocalAvatarForUser, resolveAvatarUrl } from '../lib/avatar';
import { useAuth } from '../context/AuthContext';
import { useToday } from '../context/TodayContext';
import { DEFAULT_TARGETS } from '../constants/targets';
import { error as logError } from '../lib/logger';
import { sumFoodLogs } from '../utils/macroCalc';

export function useDashboard() {
  const { user: authUser } = useAuth();
  const userId = authUser?.id ?? null;
  const today = useToday();
  const fallbackUserName =
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    authUser?.email?.split('@')?.[0] ||
    'User';

  // Dashboard-specific state (not shared — only Home uses these)
  const [snapshot, setSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Tracks the user id we've completed an initial fetch for. Subsequent
  // refetches (on focus, after logging, after events) must NOT flip
  // isLoading back to true — otherwise Home swaps its layout for the global
  // spinner, every BentoCard unmounts, their FadeInDown animations replay
  // on remount, and the calorie count-up restarts, which the user sees as
  // the page "losing its content" even though the DB data is intact.
  const loadedForUserRef = useRef(null);

  // Load the RPC snapshot + profile (dashboard-specific, not duplicated elsewhere)
  const loadSnapshot = useCallback(async () => {
    if (!userId) {
      setSnapshot(null);
      setError(null);
      loadedForUserRef.current = null;
      setIsLoading(false);
      return;
    }
    try {
      // Only show the global spinner the first time we fetch for this user.
      if (loadedForUserRef.current !== userId) setIsLoading(true);
      setError(null);
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

      setSnapshot({
        ...(result || {}),
        user: {
          ...(result?.user || {}),
          id: userId,
          name: profileRow?.data?.full_name || result?.user?.name || fallbackUserName,
          goal: profileRow?.data?.goal || result?.user?.goal || 'maintain',
          avatar_url: localAvatarUrl || resolvedAvatarUrl,
        },
      });
      loadedForUserRef.current = userId;
    } catch (err) {
      logError('Critical error in useDashboard:', err);
      setSnapshot((prev) => ({
        ...(prev || {}),
        user: {
          ...(prev?.user || {}),
          id: userId,
          name: prev?.user?.name || fallbackUserName,
          goal: prev?.user?.goal || 'maintain',
          avatar_url: prev?.user?.avatar_url || null,
        },
      }));
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, [fallbackUserName, userId]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  // Read shared state from TodayContext
  const {
    loading: todayLoading,
    waterMl,
    sleepHours,
    caloriesBurned: workoutCals,
    muscleFatigue,
    goals,
    steps: todaySteps,
    foodLogs,
    refresh: refreshToday,
    logSleep: logSleepToday,
    logWater: logWaterToday,
  } = today;

  // Combine: refresh both the snapshot and TodayContext
  const refresh = useCallback(async () => {
    await Promise.all([loadSnapshot(), refreshToday()]);
  }, [loadSnapshot, refreshToday]);

  const nutritionTotals = sumFoodLogs(foodLogs || []);
  const calorieTarget = goals.calorie_target ?? DEFAULT_TARGETS.calorie_target;
  const remainingCalories = Math.max(calorieTarget - nutritionTotals.calories + workoutCals, 0);

  return {
    isLoading: isLoading || todayLoading,
    error,
    user: snapshot?.user || { name: 'User', goal: 'maintain', avatar_url: null },
    stats: {
      calories: {
        eaten: nutritionTotals.calories,
        target: calorieTarget,
        burned: workoutCals,
        remaining: remainingCalories,
      },
      macros: {
        protein: {
          current: nutritionTotals.protein,
          target: goals.protein_target ?? DEFAULT_TARGETS.protein_target,
        },
        carbs: {
          current: nutritionTotals.carbs,
          target: goals.carbs_target ?? DEFAULT_TARGETS.carbs_target,
        },
        fat: {
          current: nutritionTotals.fat,
          target: goals.fat_target ?? DEFAULT_TARGETS.fat_target,
        },
      },
      water: { current: waterMl, target: goals.water_target_ml },
      steps: todaySteps,
      stepsTarget: goals.steps_target ?? DEFAULT_TARGETS.steps_target,
      sleep: sleepHours ?? snapshot?.activity?.sleep_hours ?? null,
    },
    workoutCalories: workoutCals,
    muscleFatigue,
    yaraInsight: (() => {
      const top = muscleFatigue.find((m) => m.fatigue_pct >= 70);
      if (top) {
        const recovery = RECOVERY_MAP[top.muscle_name] ?? 'a different muscle group';
        return `I noticed your ${top.muscle_name} fatigue is high (${top.fatigue_pct}%). Tomorrow, we will focus on ${recovery} for recovery.`;
      }
      return (
        snapshot?.insight || "You're doing great! Stay consistent and the results will follow."
      );
    })(),
    logSleep: useCallback(
      async (hours) => {
        await logSleepToday({ hours });
      },
      [logSleepToday],
    ),
    logWater: logWaterToday,
    refresh,
  };
}
