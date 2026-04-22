import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getHomeSnapshot } from '../services/dashboardService';
import { RECOVERY_MAP } from '../services/workoutService';
import { getLocalAvatarForUser, resolveAvatarUrl } from '../lib/avatar';
import { useAuth } from '../context/AuthContext';
import { useToday } from '../context/TodayContext';
import { DEFAULT_TARGETS } from '../constants/targets';
import { error as logError } from '../lib/logger';

const HOME_INSIGHT_FALLBACK = "You're doing great! Stay consistent and the results will follow.";

function toSentenceCase(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function sanitizeHomeInsight(rawInsight, context = {}) {
  const { waterMl = 0, waterTargetMl = 0, sleepHours = 0, caloriesRemaining = null } = context;
  if (!rawInsight || typeof rawInsight !== 'string') return HOME_INSIGHT_FALLBACK;

  const normalized = rawInsight
    .replace(/[_-]+/g, ' ')
    .replace(/\b(meal logging|log water|log sleep|log food|track water|track sleep)\b\s*[:|-]?\s*/gi, '')
    .replace(/\b(action|task|intent|command|tool|type)\b\s*[:|-]?\s*[a-z_ -]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const parts = normalized
    .split(/(?<=[.!?])\s+|\s*\|\s*|\s*•\s*|\s*-\s+(?=[a-z])/i)
    .map(part => part.trim().replace(/^["'`]+|["'`]+$/g, ''))
    .filter(Boolean);

  const filtered = parts.filter((part) => {
    const lower = part.toLowerCase();

    if (!lower || /^[a-z_]+$/.test(lower)) return false;
    if (/(meal logging|log water|log sleep|log food|track water|track sleep|open [a-z ]+ page)/i.test(lower)) return false;
    if ((/water/.test(lower) && /(log|drink|add|track)/.test(lower)) && waterMl > 0) return false;
    if ((/sleep/.test(lower) && /(log|track|add)/.test(lower)) && sleepHours > 0) return false;
    if ((/eat|meal|food|calories/.test(lower) && /(log|track|add)/.test(lower)) && caloriesRemaining !== null && caloriesRemaining <= 0) return false;
    return true;
  });

  const best = filtered[0] || normalized;
  const cleaned = toSentenceCase(
    best
      .replace(/\b(lets|let's)\s+(log|track|add)\b/gi, 'Focus on')
      .replace(/\bi\b/g, 'you')
      .replace(/\s+/g, ' ')
      .trim(),
  );

  if (!cleaned || cleaned.length < 12) return HOME_INSIGHT_FALLBACK;
  return cleaned;
}

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
    if (!userId) { setIsLoading(false); return; }
    try {
      // Only show the global spinner the first time we fetch for this user.
      if (loadedForUserRef.current !== userId) setIsLoading(true);
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
        loadedForUserRef.current = userId;
      } else {
        setError('No data received');
      }
    } catch (err) {
      logError('Critical error in useDashboard:', err);
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
  const { waterMl, sleepHours, caloriesBurned: workoutCals, muscleFatigue, goals, steps: todaySteps } = today;
  const caloriesTarget = snapshot?.calories?.target || goals.calorie_target;
  const caloriesEaten = snapshot?.calories?.eaten || 0;
  const caloriesRemaining = caloriesTarget - caloriesEaten + workoutCals;

  return {
    isLoading: isLoading || today.loading,
    error,
    user: snapshot?.user || { name: 'User', goal: 'maintain', avatar_url: null },
    stats: {
      calories: {
        eaten:   caloriesEaten,
        target:  caloriesTarget,
        burned:  workoutCals,
        remaining: caloriesRemaining,
      },
      macros: snapshot?.macros || {
        protein: { current: 0, target: goals.protein_target },
        carbs: { current: 0, target: goals.carbs_target },
        fat: { current: 0, target: goals.fat_target }
      },
      water: { current: waterMl, target: goals.water_target_ml },
      steps: todaySteps,
      stepsTarget: goals.steps_target ?? DEFAULT_TARGETS.steps_target,
      sleep: sleepHours ?? snapshot?.activity?.sleep_hours ?? null,
    },
    workoutCalories: workoutCals,
    muscleFatigue,
    yaraInsight: (() => {
      const top = muscleFatigue.find(m => m.fatigue_pct >= 70);
      if (top) {
        const recovery = RECOVERY_MAP[top.muscle_name] ?? 'a different muscle group';
        return `Your ${top.muscle_name} fatigue is high (${top.fatigue_pct}%). Prioritize ${recovery} and recovery work next.`;
      }
      return sanitizeHomeInsight(snapshot?.insight, {
        waterMl,
        waterTargetMl: goals.water_target_ml,
        sleepHours,
        caloriesRemaining,
      });
    })(),
    logSleep: useCallback(async (hours) => {
      await today.logSleep({ hours });
    }, [today.logSleep]),
    logWater: today.logWater,
    refresh,
  };
}
