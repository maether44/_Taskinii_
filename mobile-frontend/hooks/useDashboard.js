import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { getHomeSnapshot } from "../services/dashboardService";
import { RECOVERY_MAP } from "../services/workoutService";
import { getLocalAvatarForUser, resolveAvatarUrl } from "../lib/avatar";
import { useAuth } from "../context/AuthContext";
import { useToday } from "../context/TodayContext";
import { DEFAULT_TARGETS } from "../constants/targets";
import { error as logError } from "../lib/logger";

export function useDashboard() {
  const { user: authUser } = useAuth();
  const userId = authUser?.id ?? null;
  const today = useToday();

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
      setIsLoading(false);
      return;
    }
    try {
      // Only show the global spinner the first time we fetch for this user.
      if (loadedForUserRef.current !== userId) setIsLoading(true);

      const [result, profileRow] = await Promise.all([
        getHomeSnapshot(userId),
        supabase
          .from("profiles")
          .select("full_name, goal, avatar_url")
          .eq("id", userId)
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
            name: profileRow?.data?.full_name || result.user?.name || "User",
            goal: profileRow?.data?.goal || result.user?.goal || "maintain",
            avatar_url: localAvatarUrl || resolvedAvatarUrl,
          },
        });
        loadedForUserRef.current = userId;
      } else {
        setError("No data received");
      }
    } catch (err) {
      logError("Critical error in useDashboard:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  // Combine: refresh both the snapshot and TodayContext
  const refresh = useCallback(async () => {
    await Promise.all([loadSnapshot(), today.refresh()]);
  }, [loadSnapshot, today.refresh]);

  // Read shared state from TodayContext
  const {
    waterMl,
    sleepHours,
    caloriesBurned: workoutCals,
    muscleFatigue,
    goals,
    steps: todaySteps,
  } = today;

  return {
    isLoading: isLoading || today.loading,
    error,
    user: snapshot?.user || { name: "User", goal: "maintain", avatar_url: null },
    stats: {
      calories: {
        eaten: snapshot?.calories?.eaten || 0,
        target: snapshot?.calories?.target || goals.calorie_target,
        burned: workoutCals,
        remaining:
          (snapshot?.calories?.target || goals.calorie_target) -
          (snapshot?.calories?.eaten || 0) +
          workoutCals,
      },
      macros: snapshot?.macros || {
        protein: { current: 0, target: goals.protein_target },
        carbs: { current: 0, target: goals.carbs_target },
        fat: { current: 0, target: goals.fat_target },
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
        const recovery = RECOVERY_MAP[top.muscle_name] ?? "a different muscle group";
        return `I noticed your ${top.muscle_name} fatigue is high (${top.fatigue_pct}%). Tomorrow, we will focus on ${recovery} for recovery.`;
      }
      return (
        snapshot?.insight || "You're doing great! Stay consistent and the results will follow."
      );
    })(),
    logSleep: useCallback(
      async (hours) => {
        await today.logSleep({ hours });
      },
      [today.logSleep],
    ),
    logWater: today.logWater,
    refresh,
  };
}
