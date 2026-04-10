/**
 * TodayContext — single source of truth for today's live data.
 *
 * Owns: calorie_targets (goals), food_logs, daily_activity (water, sleep,
 *       calories_burned), and muscle fatigue.
 *
 * All hooks that previously fetched these independently now read from here.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getMuscleFatigue } from '../services/workoutService';
import { AppEvents, emit } from '../lib/eventBus';
import { DEFAULT_TARGETS, computeWaterTarget } from '../constants/targets';

const TodayContext = createContext(null);

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function normalizeGoals(row, weightKg) {
  const waterTarget = computeWaterTarget(weightKg);
  if (!row) return { ...DEFAULT_TARGETS, water_target_ml: waterTarget };
  return {
    calorie_target: row.calorie_target ?? row.daily_calories ?? DEFAULT_TARGETS.calorie_target,
    protein_target: row.protein_target ?? DEFAULT_TARGETS.protein_target,
    carbs_target: row.carbs_target ?? DEFAULT_TARGETS.carbs_target,
    fat_target: row.fat_target ?? DEFAULT_TARGETS.fat_target,
    water_target_ml: row.water_target_ml ?? waterTarget,
    steps_target: row.steps_target ?? DEFAULT_TARGETS.steps_target,
  };
}

export function TodayProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState(DEFAULT_TARGETS);
  const [foodLogs, setFoodLogs] = useState([]);
  const [waterMl, setWaterMl] = useState(0);
  const [sleepHours, setSleepHours] = useState(null);
  const [sleepQuality, setSleepQuality] = useState(null);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [muscleFatigue, setMuscleFatigue] = useState([]);

  // ── Central data loader ──────────────────────────────────────────
  const loadToday = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const today = todayString();

    try {
      const [
        { data: goalsData },
        { data: logs },
        { data: activity },
        { data: profile },
        fatigue,
      ] = await Promise.all([
        supabase
          .from('calorie_targets')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('food_logs')
          .select(`
            id, meal_type, quantity_grams, consumed_at,
            foods (
              id, name, brand, barcode,
              calories_per_100g, protein_per_100g,
              carbs_per_100g, fat_per_100g, fiber_per_100g
            )
          `)
          .eq('user_id', userId)
          .gte('consumed_at', `${today}T00:00:00.000Z`)
          .lte('consumed_at', `${today}T23:59:59.999Z`)
          .order('consumed_at', { ascending: true }),
        supabase
          .from('daily_activity')
          .select('water_ml, calories_burned, sleep_hours, sleep_quality')
          .eq('user_id', userId)
          .eq('date', today)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('weight_kg')
          .eq('id', userId)
          .maybeSingle(),
        getMuscleFatigue(userId).catch(() => []),
      ]);

      setGoals(normalizeGoals(goalsData, profile?.weight_kg));
      setFoodLogs(logs || []);
      setWaterMl(activity?.water_ml || 0);
      setCaloriesBurned(activity?.calories_burned || 0);
      setSleepHours(activity?.sleep_hours ?? null);
      setSleepQuality(activity?.sleep_quality ?? null);
      setMuscleFatigue(fatigue ?? []);
    } catch (error) {
      console.error('[TodayContext] loadToday error:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load on mount / user change
  useEffect(() => { loadToday(); }, [loadToday]);

  // Subscribe to EventBus refresh signals
  useEffect(() => {
    const unsub = [];
    unsub.push(
      require('../lib/eventBus').on(AppEvents.REFRESH_TODAY, loadToday),
      require('../lib/eventBus').on(AppEvents.MEAL_LOGGED, loadToday),
      require('../lib/eventBus').on(AppEvents.WATER_LOGGED, loadToday),
      require('../lib/eventBus').on(AppEvents.SLEEP_LOGGED, loadToday),
      require('../lib/eventBus').on(AppEvents.WORKOUT_COMPLETED, loadToday),
      require('../lib/eventBus').on(AppEvents.TARGETS_UPDATED, loadToday),
    );
    return () => unsub.forEach(fn => fn());
  }, [loadToday]);

  // ── Write operations (optimistic + persist) ──────────────────────

  const logWater = useCallback(async (mlDelta) => {
    if (!userId) {
      setWaterMl(prev => Math.max(0, prev + mlDelta));
      return;
    }
    // Optimistic
    setWaterMl(prev => Math.max(0, prev + mlDelta));
    try {
      const today = todayString();
      const { data: existing } = await supabase
        .from('daily_activity')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      const newMl = Math.max(0, (existing?.water_ml || 0) + mlDelta);
      if (existing?.id) {
        await supabase.from('daily_activity').update({ water_ml: newMl }).eq('id', existing.id);
      } else {
        await supabase.from('daily_activity').insert({ user_id: userId, date: today, water_ml: newMl });
      }
      emit(AppEvents.WATER_LOGGED, { waterMl: newMl });
    } catch (error) {
      console.error('[TodayContext] logWater error:', error);
      loadToday(); // revert optimistic on failure
    }
  }, [userId, loadToday]);

  const logSleep = useCallback(async ({ hours, quality }) => {
    if (!userId) return false;
    // Optimistic
    setSleepHours(hours);
    setSleepQuality(quality ?? null);
    try {
      const { error } = await supabase
        .from('daily_activity')
        .upsert(
          { user_id: userId, date: todayString(), sleep_hours: hours, sleep_quality: quality ?? null },
          { onConflict: 'user_id,date' },
        );
      if (error) { loadToday(); return false; }
      emit(AppEvents.SLEEP_LOGGED, { hours, quality });
      return true;
    } catch (e) {
      console.error('[TodayContext] logSleep error:', e);
      loadToday();
      return false;
    }
  }, [userId, loadToday]);

  const value = useMemo(() => ({
    loading,
    userId,
    goals,
    foodLogs,
    waterMl,
    sleepHours,
    sleepQuality,
    caloriesBurned,
    muscleFatigue,
    logWater,
    logSleep,
    refresh: loadToday,
  }), [loading, userId, goals, foodLogs, waterMl, sleepHours, sleepQuality, caloriesBurned, muscleFatigue, logWater, logSleep, loadToday]);

  return (
    <TodayContext.Provider value={value}>
      {children}
    </TodayContext.Provider>
  );
}

export function useToday() {
  const ctx = useContext(TodayContext);
  if (!ctx) throw new Error('useToday must be used within a TodayProvider');
  return ctx;
}
