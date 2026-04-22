/**
 * TodayContext — single source of truth for today's live data.
 *
 * Owns: calorie_targets (goals), food_logs, daily_activity (water, sleep,
 *       calories_burned), and muscle fatigue.
 *
 * All hooks that previously fetched these independently now read from here.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getMuscleFatigue } from '../services/workoutService';
import { AppEvents, emit } from '../lib/eventBus';
import { DEFAULT_TARGETS, computeWaterTarget } from '../constants/targets';
import { error as logError } from '../lib/logger';

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
  // Steps: DB-persisted base + live pedometer count since context mounted
  const [dbSteps, setDbSteps] = useState(0);
  const [liveSteps, setLiveSteps] = useState(0);
  const [pedometerAvailable, setPedometerAvailable] = useState(true);
  const [pedometerPermission, setPedometerPermission] = useState(null);
  const pendingSyncRef = useRef(0);
  const syncTimerRef = useRef(null);
  // Tracks the user id we've already completed an initial fetch for. We only
  // flip the global `loading` flag when we've never loaded data for the
  // current user — subsequent refreshes (focus, event bus, write-backs) must
  // not trigger the Home screen's full-page spinner, which unmounts the
  // whole layout and loses optimistic state mid-tap.
  const loadedForUserRef = useRef(null);

  // ── Central data loader ──────────────────────────────────────────
  const loadToday = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    // Only show the global loader on the very first fetch for this user.
    // Refreshes after that update state in place.
    if (loadedForUserRef.current !== userId) setLoading(true);
    const today = todayString();

    try {
      const [{ data: goalsData }, { data: logs }, { data: activity }, { data: profile }, fatigue] =
        await Promise.all([
          supabase
            .from('calorie_targets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('food_logs')
            .select(
              `
            id, meal_type, quantity_grams, consumed_at,
            foods (
              id, name, brand, barcode,
              calories_per_100g, protein_per_100g,
              carbs_per_100g, fat_per_100g, fiber_per_100g
            )
          `,
            )
            .eq('user_id', userId)
            .gte('consumed_at', `${today}T00:00:00.000Z`)
            .lte('consumed_at', `${today}T23:59:59.999Z`)
            .order('consumed_at', { ascending: true }),
          supabase
            .from('daily_activity')
            .select('water_ml, calories_burned, sleep_hours, sleep_quality, steps')
            .eq('user_id', userId)
            .eq('date', today)
            .maybeSingle(),
          supabase.from('profiles').select('weight_kg').eq('id', userId).maybeSingle(),
          getMuscleFatigue(userId).catch(() => []),
        ]);

      setGoals(normalizeGoals(goalsData, profile?.weight_kg));
      setFoodLogs(logs || []);
      setWaterMl(activity?.water_ml || 0);
      setCaloriesBurned(activity?.calories_burned || 0);
      setSleepHours(activity?.sleep_hours ?? null);
      setSleepQuality(activity?.sleep_quality ?? null);
      setDbSteps(activity?.steps || 0);
      setMuscleFatigue(fatigue ?? []);
      loadedForUserRef.current = userId;
    } catch (error) {
      logError('[TodayContext] loadToday error:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load on mount / user change
  useEffect(() => {
    loadToday();
  }, [loadToday]);

  // Subscribe to EventBus refresh signals.
  //
  // NOTE: we deliberately do NOT listen to WATER_LOGGED / SLEEP_LOGGED here,
  // even though this context emits them. Those events exist for OTHER
  // screens (e.g. Insights) to react to user activity. Subscribing locally
  // would create a loop: logWater() optimistically updates state → persists
  // → emits WATER_LOGGED → loadToday() refetches → momentarily flips the
  // global loading flag → Home.js unmounts its layout and the user's tap
  // visually evaporates. The logWater / logSleep write paths already keep
  // state in sync themselves, so no local refetch is needed.
  useEffect(() => {
    const unsub = [];
    unsub.push(
      require('../lib/eventBus').on(AppEvents.REFRESH_TODAY, loadToday),
      require('../lib/eventBus').on(AppEvents.MEAL_LOGGED, loadToday),
      require('../lib/eventBus').on(AppEvents.WORKOUT_COMPLETED, loadToday),
      require('../lib/eventBus').on(AppEvents.TARGETS_UPDATED, loadToday),
    );
    return () => unsub.forEach((fn) => fn());
  }, [loadToday]);

  // ── Pedometer: shared step source for Home + Fuel ───────────────
  // Subscribes to the device pedometer, batches DB syncs every 30s.
  useEffect(() => {
    let sub = null;

    (async () => {
      const available = await Pedometer.isAvailableAsync().catch(() => false);
      setPedometerAvailable(available);
      if (!available) return;

      const { status } = await Pedometer.requestPermissionsAsync().catch(() => ({
        status: 'denied',
      }));
      setPedometerPermission(status);
      if (status !== 'granted') return;

      sub = Pedometer.watchStepCount(({ steps: count }) => {
        setLiveSteps(count);
        pendingSyncRef.current = count;
      });
    })();

    return () => {
      if (sub) sub.remove();
    };
  }, []);

  // Batch sync live steps to DB every 30 seconds
  useEffect(() => {
    if (!userId) return;
    const timer = setInterval(() => {
      const pending = pendingSyncRef.current;
      if (pending <= 0) return;
      const today = todayString();
      supabase
        .rpc('increment_steps', {
          p_user_id: userId,
          p_steps: pending,
          p_date: today,
        })
        .then(({ error }) => {
          if (!error) {
            setDbSteps((prev) => prev + pending);
            pendingSyncRef.current = 0;
            setLiveSteps(0);
          }
        });
    }, 30000);
    syncTimerRef.current = timer;
    return () => clearInterval(timer);
  }, [userId]);

  // Total steps = persisted DB steps + live (unsynced) pedometer steps
  const steps = dbSteps + liveSteps;

  // ── Write operations (optimistic + persist) ──────────────────────

  const logWater = useCallback(
    async (mlDelta) => {
      if (!userId) {
        setWaterMl((prev) => Math.max(0, prev + mlDelta));
        return;
      }
      // Optimistic
      setWaterMl((prev) => Math.max(0, prev + mlDelta));
      try {
        const { data: newMl, error } = await supabase.rpc('log_water_ml', {
          p_user_id: userId,
          p_delta: mlDelta,
          p_date: todayString(),
        });
        if (error) {
          logError('[TodayContext] log_water_ml error:', error);
          loadToday();
          return;
        }
        if (typeof newMl === 'number') setWaterMl(newMl);
        emit(AppEvents.WATER_LOGGED, { waterMl: newMl });
      } catch (error) {
        logError('[TodayContext] logWater error:', error);
        loadToday();
      }
    },
    [userId, loadToday],
  );

  const logSleep = useCallback(
    async ({ hours, quality }) => {
      if (!userId) return false;
      // Optimistic
      setSleepHours(hours);
      setSleepQuality(quality ?? null);
      try {
        const { error } = await supabase.rpc('log_sleep_data', {
          p_user_id: userId,
          p_hours: hours,
          p_quality: quality ?? null,
          p_date: todayString(),
        });
        if (error) {
          logError('[TodayContext] log_sleep_data error:', error);
          loadToday();
          return false;
        }
        emit(AppEvents.SLEEP_LOGGED, { hours, quality });
        return true;
      } catch (e) {
        logError('[TodayContext] logSleep error:', e);
        loadToday();
        return false;
      }
    },
    [userId, loadToday],
  );

  const value = useMemo(
    () => ({
      loading,
      userId,
      goals,
      foodLogs,
      waterMl,
      sleepHours,
      sleepQuality,
      caloriesBurned,
      muscleFatigue,
      steps,
      pedometerAvailable,
      pedometerPermission,
      logWater,
      logSleep,
      refresh: loadToday,
    }),
    [
      loading,
      userId,
      goals,
      foodLogs,
      waterMl,
      sleepHours,
      sleepQuality,
      caloriesBurned,
      muscleFatigue,
      steps,
      pedometerAvailable,
      pedometerPermission,
      logWater,
      logSleep,
      loadToday,
    ],
  );

  return <TodayContext.Provider value={value}>{children}</TodayContext.Provider>;
}

export function useToday() {
  const ctx = useContext(TodayContext);
  if (!ctx) throw new Error('useToday must be used within a TodayProvider');
  return ctx;
}
