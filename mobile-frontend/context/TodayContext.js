/**
 * TodayContext — single source of truth for today's live data.
 *
 * Owns: calorie_targets (goals), food_logs, daily_activity (water, sleep,
 *       calories_burned), and muscle fatigue.
 *
 * All hooks that previously fetched these independently now read from here.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getMuscleFatigue } from '../services/workoutService';
import { AppEvents, emit } from '../lib/eventBus';
import { DEFAULT_TARGETS, computeWaterTarget } from '../constants/targets';
import { error as logError } from '../lib/logger';

const TodayContext = createContext(null);

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayWindow(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return {
    dateKey: getLocalDateKey(date),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function getStartOfDay(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
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
  const dbStepsRef = useRef(0);
  const lastSyncedReadingRef = useRef(0);
  const lastObservedReadingRef = useRef(0);
  const iosDeviceStepsAtSubscribeRef = useRef(0);
  const isFlushingStepsRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  // Tracks the user id we've already completed an initial fetch for. We only
  // flip the global `loading` flag when we've never loaded data for the
  // current user — subsequent refreshes (focus, event bus, write-backs) must
  // not trigger the Home screen's full-page spinner, which unmounts the
  // whole layout and loses optimistic state mid-tap.
  const loadedForUserRef = useRef(null);

  // ── Central data loader ──────────────────────────────────────────
  const loadToday = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    // Only show the global loader on the very first fetch for this user.
    // Refreshes after that update state in place.
    if (loadedForUserRef.current !== userId) setLoading(true);
    const { dateKey, startIso, endIso } = getTodayWindow();

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
          .gte('consumed_at', startIso)
          .lte('consumed_at', endIso)
          .order('consumed_at', { ascending: true }),
        supabase
          .from('daily_activity')
          .select('water_ml, calories_burned, sleep_hours, sleep_quality, steps')
          .eq('user_id', userId)
          .eq('date', dateKey)
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
  useEffect(() => { loadToday(); }, [loadToday]);

  useEffect(() => {
    dbStepsRef.current = dbSteps;
  }, [dbSteps]);

  const updateUnsyncedStepsFromAbsolute = useCallback((absoluteReading) => {
    const normalizedReading = Math.max(0, Math.floor(Number(absoluteReading) || 0));
    lastObservedReadingRef.current = normalizedReading;
    const unsynced = Math.max(0, normalizedReading - lastSyncedReadingRef.current);
    pendingSyncRef.current = unsynced;
    setLiveSteps(unsynced);
  }, []);

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
    return () => unsub.forEach(fn => fn());
  }, [loadToday]);

  // ── Pedometer: shared step source for Home + Fuel ───────────────
  // Subscribes to the device pedometer, batches DB syncs every 30s.
  useEffect(() => {
    if (!userId || loading) return undefined;

    let sub = null;
    let cancelled = false;

    (async () => {
      const available = await Pedometer.isAvailableAsync().catch(() => false);
      if (cancelled) return;
      setPedometerAvailable(available);
      if (!available) return;

      const { status } = await Pedometer.requestPermissionsAsync().catch(() => ({ status: 'denied' }));
      if (cancelled) return;
      setPedometerPermission(status);
      if (status !== 'granted') return;

      if (Platform.OS === 'ios') {
        const initialTodaySteps = await Pedometer
          .getStepCountAsync(getStartOfDay(), new Date())
          .then((result) => result?.steps ?? 0)
          .catch(() => 0);

        iosDeviceStepsAtSubscribeRef.current = initialTodaySteps;
        lastSyncedReadingRef.current = Math.min(initialTodaySteps, dbStepsRef.current);
        updateUnsyncedStepsFromAbsolute(initialTodaySteps);
      } else {
        lastSyncedReadingRef.current = 0;
        updateUnsyncedStepsFromAbsolute(0);
      }

      sub = Pedometer.watchStepCount(({ steps: count }) => {
        const normalizedCount = Math.max(0, count || 0);

        if (Platform.OS === 'ios') {
          const absoluteTodaySteps = iosDeviceStepsAtSubscribeRef.current + normalizedCount;
          updateUnsyncedStepsFromAbsolute(absoluteTodaySteps);
          return;
        }

        updateUnsyncedStepsFromAbsolute(normalizedCount);
      });
    })();

    return () => {
      cancelled = true;
      if (sub) sub.remove();
    };
  }, [userId, loading, updateUnsyncedStepsFromAbsolute]);

  const reconcileIosTodaySteps = useCallback(async () => {
    if (!userId || Platform.OS !== 'ios' || pedometerPermission !== 'granted') return;

    try {
      const deviceTodaySteps = await Pedometer
        .getStepCountAsync(getStartOfDay(), new Date())
        .then((result) => result?.steps ?? 0);

      if (deviceTodaySteps < dbStepsRef.current) {
        setDbSteps(deviceTodaySteps);
        dbStepsRef.current = deviceTodaySteps;
      }

      lastSyncedReadingRef.current = Math.min(deviceTodaySteps, dbStepsRef.current);
      updateUnsyncedStepsFromAbsolute(deviceTodaySteps);
    } catch (error) {
      logError('[TodayContext] reconcileIosTodaySteps error:', error);
    }
  }, [userId, pedometerPermission, updateUnsyncedStepsFromAbsolute]);

  const flushPendingSteps = useCallback(async () => {
    if (!userId || isFlushingStepsRef.current) return false;

    const pending = Math.max(0, Math.floor(pendingSyncRef.current));
    const absoluteTotal = Platform.OS === 'ios'
      ? Math.max(0, Math.floor(lastObservedReadingRef.current))
      : Math.max(0, Math.floor(dbStepsRef.current + pending));

    if (pending <= 0 && absoluteTotal <= 0) return true;

    isFlushingStepsRef.current = true;

    try {
      let totalSteps = absoluteTotal;

      const { data: syncData, error: syncError } = await supabase.rpc('sync_step_total', {
        p_user_id: userId,
        p_total_steps: absoluteTotal,
        p_date: getLocalDateKey(),
      });

      if (syncError?.code === 'PGRST205' || syncError?.code === '42883') {
        const { data, error } = await supabase.rpc('increment_steps', {
          p_user_id: userId,
          p_steps: pending,
          p_date: getLocalDateKey(),
        });

        if (error) {
          logError('[TodayContext] increment_steps error:', error);
          return false;
        }

        totalSteps = Number.isFinite(Number(data?.total_steps))
          ? Number(data.total_steps)
          : dbStepsRef.current + pending;
        lastSyncedReadingRef.current += pending;
      } else if (syncError) {
        logError('[TodayContext] sync_step_total error:', syncError);
        return false;
      } else {
        totalSteps = Number.isFinite(Number(syncData?.total_steps))
          ? Number(syncData.total_steps)
          : absoluteTotal;
        lastSyncedReadingRef.current = totalSteps;
      }

      setDbSteps(totalSteps);
      dbStepsRef.current = totalSteps;
      updateUnsyncedStepsFromAbsolute(lastObservedReadingRef.current);
      return true;
    } catch (error) {
      logError('[TodayContext] flushPendingSteps error:', error);
      return false;
    } finally {
      isFlushingStepsRef.current = false;
    }
  }, [userId, updateUnsyncedStepsFromAbsolute]);

  // Batch sync live steps to DB every 30 seconds
  useEffect(() => {
    if (!userId) return;
    const timer = globalThis.setInterval(() => {
      flushPendingSteps();
    }, 30000);
    return () => globalThis.clearInterval(timer);
  }, [userId, flushPendingSteps]);

  // Flush before backgrounding so we do not lose the in-memory foreground delta.
  // On iOS, also reconcile from the device when returning to the foreground to
  // catch steps taken while the app was not active.
  useEffect(() => {
    if (!userId) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (prevState === 'active' && /inactive|background/.test(nextState)) {
        flushPendingSteps();
        return;
      }

      if (/inactive|background/.test(prevState) && nextState === 'active') {
        reconcileIosTodaySteps();
      }
    });

    return () => subscription.remove();
  }, [userId, flushPendingSteps, reconcileIosTodaySteps]);

  useEffect(() => {
    if (Platform.OS === 'ios' && userId && pedometerPermission === 'granted') {
      reconcileIosTodaySteps();
    }
  }, [userId, pedometerPermission, dbSteps, reconcileIosTodaySteps]);

  // Total steps = persisted DB steps + live (unsynced) pedometer steps
  const steps = dbSteps + liveSteps;

  // ── Write operations (optimistic + persist) ──────────────────────

  const logWater = useCallback(async (mlDelta) => {
    if (!userId) {
      setWaterMl(prev => Math.max(0, prev + mlDelta));
      return;
    }
    // Optimistic
    setWaterMl(prev => Math.max(0, prev + mlDelta));
    try {
      const { data: newMl, error } = await supabase.rpc('log_water_ml', {
        p_user_id: userId,
        p_delta:   mlDelta,
        p_date:    getLocalDateKey(),
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
  }, [userId, loadToday]);

  const logSleep = useCallback(async ({ hours, quality }) => {
    if (!userId) return false;
    // Optimistic
    setSleepHours(hours);
    setSleepQuality(quality ?? null);
    try {
      const { error } = await supabase.rpc('log_sleep_data', {
        p_user_id: userId,
        p_hours:   hours,
        p_quality: quality ?? null,
        p_date:    getLocalDateKey(),
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
    steps,
    pedometerAvailable,
    pedometerPermission,
    logWater,
    logSleep,
    refresh: loadToday,
  }), [loading, userId, goals, foodLogs, waterMl, sleepHours, sleepQuality, caloriesBurned, muscleFatigue, steps, pedometerAvailable, pedometerPermission, logWater, logSleep, loadToday]);

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
