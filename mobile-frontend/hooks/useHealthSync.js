/**
 * useHealthSync — Universal Health Data Hook + Wear OS Bridge
 *
 * Reads Steps, Calories, and Sleep from the platform's health store:
 *   iOS     → Apple HealthKit  (react-native-health)
 *   Android → Health Connect   (react-native-health-connect)
 *
 * After every successful sync, broadcastToWatch() fires automatically,
 * pushing the latest metrics to any paired Wear OS watch via the Wearable
 * Message API path '/bodyq/metrics' (react-native-wear-connectivity).
 *
 * Background delivery is handled by a registered expo-background-fetch task
 * (BODYQ_HEALTH_BROADCAST) so the watch stays up to date even when BodyQ
 * is not in the foreground. On Android the OS fires the task roughly every
 * 15 minutes; on iOS every 30 minutes (both subject to OS throttling).
 *
 * Data flow (foreground):
 *   syncData()
 *     → fetchFrom[HealthKit | HealthConnect]()
 *     → upsert Supabase daily_activity
 *     → cache AsyncStorage
 *     → broadcastToWatch()  ← Wear OS Message API, path '/bodyq/metrics'
 *     → _setState()         ← re-renders all consumers
 *     → AlexiEvents.emit('ble_data_updated')   ← Alexi watch queries
 *
 * Data flow (background, OS-initiated):
 *   BODYQ_HEALTH_BROADCAST task fires
 *     → fetchFrom[HealthKit | HealthConnect]()
 *     → broadcastToWatch()
 *
 * Requires a development build (EAS Build) — not compatible with Expo Go.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { supabase } from '../lib/supabase';
import { AlexiEvents } from '../context/AlexiVoiceContext';
import { wearSyncService } from '../services/wearSyncService';

const LAST_SYNCED_KEY  = '@healthsync_last_synced';
const CACHED_DATA_KEY  = '@healthsync_cached_data';
const STEPS_GOAL       = 10000;
const BG_TASK_NAME     = 'BODYQ_HEALTH_BROADCAST';
// Background interval: 15 min (Android WorkManager minimum; iOS is ~30 min).
const BG_INTERVAL_MINS = 15; // minimumInterval unit is minutes in expo-background-task

// ─── Lazy-load native modules ─────────────────────────────────────────────────
function getAppleHealthKit() {
  if (Platform.OS !== 'ios') return null;
  try { return require('react-native-health').default; } catch { return null; }
}

function getHealthConnect() {
  if (Platform.OS !== 'android') return null;
  try { return require('react-native-health-connect'); } catch { return null; }
}

function getWearConnectivity() {
  // Wear OS Message API is Android-only (Wear OS watches paired to Android phones).
  if (Platform.OS !== 'android') return null;
  try { return require('react-native-wear-connectivity'); } catch { return null; }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── iOS HealthKit fetch ──────────────────────────────────────────────────────
async function fetchFromHealthKit() {
  const AHK = getAppleHealthKit();
  if (!AHK) throw new Error('Apple HealthKit not available on this device.');

  await new Promise((resolve, reject) => {
    AHK.initHealthKit(
      { permissions: { read: ['Steps', 'SleepAnalysis', 'ActiveEnergyBurned'], write: [] } },
      err => (err ? reject(new Error(String(err))) : resolve()),
    );
  });

  const start = startOfToday().toISOString();
  const end   = new Date().toISOString();

  const [steps, calories, sleep] = await Promise.all([
    new Promise(resolve => {
      AHK.getStepCount({ date: start }, (err, result) =>
        resolve(err ? 0 : Math.round(result?.value ?? 0)),
      );
    }),
    new Promise(resolve => {
      AHK.getActiveEnergyBurned({ startDate: start, endDate: end }, (err, results) => {
        if (err || !Array.isArray(results)) return resolve(0);
        resolve(Math.round(results.reduce((s, r) => s + (r.value ?? 0), 0)));
      });
    }),
    new Promise(resolve => {
      AHK.getSleepSamples({ startDate: start, endDate: end, limit: 30 }, (err, results) => {
        if (err || !Array.isArray(results)) return resolve(0);
        const ASLEEP = new Set(['ASLEEP', 'CORE', 'DEEP', 'REM']);
        const ms = results
          .filter(r => ASLEEP.has(r.value))
          .reduce((s, r) => s + Math.max(new Date(r.endDate) - new Date(r.startDate), 0), 0);
        resolve(+(ms / 3_600_000).toFixed(2));
      });
    }),
  ]);

  return { steps, calories, sleep };
}

// ─── Android Health Connect fetch ─────────────────────────────────────────────
async function fetchFromHealthConnect() {
  const HC = getHealthConnect();
  if (!HC) throw new Error('Health Connect module not available.');
  const { initialize, requestPermission, readRecords } = HC;

  const ready = await initialize();
  if (!ready) {
    throw new Error(
      'Health Connect is not installed. Install it from the Google Play Store and try again.',
    );
  }

  await requestPermission([
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'SleepSession' },
    { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  ]);

  const timeRangeFilter = {
    operator:  'between',
    startTime: startOfToday().toISOString(),
    endTime:   new Date().toISOString(),
  };

  const [stepsRes, calRes, sleepRes] = await Promise.all([
    readRecords('Steps',               { timeRangeFilter }),
    readRecords('TotalCaloriesBurned', { timeRangeFilter }),
    readRecords('SleepSession',        { timeRangeFilter }),
  ]);

  const steps    = (stepsRes.records  || []).reduce((s, r) => s + (r.count ?? 0), 0);
  const calories = (calRes.records    || []).reduce((s, r) => s + (r.energy?.inKilocalories ?? 0), 0);
  const sleepMs  = (sleepRes.records  || []).reduce((s, r) =>
    s + Math.max(new Date(r.endTime) - new Date(r.startTime), 0), 0);

  return { steps, calories: Math.round(calories), sleep: +(sleepMs / 3_600_000).toFixed(2) };
}

// ─── Wear OS broadcast ────────────────────────────────────────────────────────
// Sends today's metrics to a paired Wear OS watch via the Wearable Message API.
// The watch app identifies the payload by the 'path' field ('/bodyq/metrics').
// Non-fatal: if the watch is unreachable, the error is logged and swallowed.
async function broadcastToWatch({ steps, calories, sleep }) {
  const wc = getWearConnectivity();
  if (!wc) return; // iOS or module unavailable — skip silently.

  const { sendMessage } = wc;

  const payload = {
    path:     '/bodyq/metrics',        // watch app uses this to route the payload
    steps,
    calories,
    sleep,
    goal:     STEPS_GOAL,
    progress: Math.round(Math.min((steps / STEPS_GOAL) * 100, 100)),
    ts:       Date.now(),
  };

  await new Promise(resolve => {
    // Both callbacks resolve — a failed send is non-fatal (watch may be off/disconnected).
    sendMessage(payload, resolve, resolve);
  });

  console.log('[HealthSync] broadcastToWatch →', payload.path, `${payload.steps} steps`);
}

// ─── Background task ──────────────────────────────────────────────────────────
// TaskManager.defineTask MUST be called at module level (not inside async
// context) so the task handler is registered when the JS runtime first starts,
// including headless background launches initiated by the OS.
TaskManager.defineTask(BG_TASK_NAME, async () => {
  try {
    const data = await (Platform.OS === 'ios'
      ? fetchFromHealthKit()
      : fetchFromHealthConnect());
    await broadcastToWatch(data);
    await wearSyncService.sendData({ steps: data.steps, calories: data.calories, target: STEPS_GOAL });
    console.log('[HealthSync] BG task complete —', data.steps, 'steps broadcast');
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    console.warn('[HealthSync] BG task failed:', e.message);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// registerBackgroundTask — called once after the app mounts.
// Idempotent: re-registering a task that is already registered is a no-op.
async function registerBackgroundTask() {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
      console.warn('[HealthSync] Background tasks restricted by the OS.');
      return;
    }
    // minimumInterval is in minutes. registerTaskAsync is idempotent —
    // it silently returns if the task is already registered.
    await BackgroundTask.registerTaskAsync(BG_TASK_NAME, {
      minimumInterval: BG_INTERVAL_MINS,
    });
    console.log('[HealthSync] Background task registered ✓');
  } catch (e) {
    console.warn('[HealthSync] registerBackgroundTask:', e.message);
  }
}

// ─── Auto-sync gate — fires once per app session, not per hook consumer ───────
let _autoSyncDone = false;

// ─── Module-level singleton state ─────────────────────────────────────────────
let _state = {
  steps:         0,
  calories:      0,
  sleep:         0,
  stepsGoal:     STEPS_GOAL,
  isSyncing:     false,
  lastSynced:    null,
  hasPermission: false,
  error:         null,
  platform:      Platform.OS === 'ios' ? 'apple' : 'android',
};

const _listeners = new Set();

function _setState(updater) {
  _state = typeof updater === 'function' ? updater(_state) : { ..._state, ...updater };
  _listeners.forEach(fn => fn(_state));
  AlexiEvents.emit('ble_data_updated', {
    steps:       _state.steps,
    sleep:       _state.sleep,
    battery:     null,
    isConnected: !!_state.lastSynced,
    deviceName:  _state.platform === 'apple' ? 'Apple Health' : 'Health Connect',
  });
}

// Restore cached state on cold start so the UI is populated immediately.
(async () => {
  try {
    const [ts, raw] = await Promise.all([
      AsyncStorage.getItem(LAST_SYNCED_KEY),
      AsyncStorage.getItem(CACHED_DATA_KEY),
    ]);
    if (ts) {
      const cached = raw ? JSON.parse(raw) : {};
      _setState({ lastSynced: ts, hasPermission: true, ...cached });
    }
  } catch (_) {}
})();

// ─── The hook ─────────────────────────────────────────────────────────────────
export function useHealthSync() {
  const [state, setLocalState] = useState(_state);
  const mountedRef             = useRef(true);
  const bgRegisteredRef        = useRef(false);

  // Subscribe to module-level state changes.
  useEffect(() => {
    mountedRef.current = true;
    const listener = s => { if (mountedRef.current) setLocalState(s); };
    _listeners.add(listener);
    setLocalState(_state);
    return () => {
      mountedRef.current = false;
      _listeners.delete(listener);
    };
  }, []);

  // Register the background broadcast task once per app session.
  useEffect(() => {
    if (bgRegisteredRef.current) return;
    bgRegisteredRef.current = true;
    registerBackgroundTask();
  }, []);

  // Auto-sync on first app open — populates watch without user interaction.
  useEffect(() => {
    if (_autoSyncDone) return;
    _autoSyncDone = true;
    const t = setTimeout(syncData, 2500);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const syncData = useCallback(async () => {
    if (_state.isSyncing) return;
    _setState({ isSyncing: true, error: null });

    try {
      const data = await (Platform.OS === 'ios'
        ? fetchFromHealthKit()
        : fetchFromHealthConnect());

      // 1. Persist to Supabase.
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const today  = new Date().toISOString().split('T')[0];
        const update = { user_id: user.id, date: today, steps: data.steps };
        if (data.sleep    > 0) update.sleep_hours     = data.sleep;
        if (data.calories > 0) update.calories_burned = data.calories;
        await supabase.from('daily_activity').upsert(update, { onConflict: 'user_id,date' });
      }

      // 2. Cache for cold starts.
      const now = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SYNCED_KEY, now);
      await AsyncStorage.setItem(CACHED_DATA_KEY, JSON.stringify(data));

      // 3. Update state (re-renders UI + notifies Alexi).
      _setState({ ...data, isSyncing: false, lastSynced: now, hasPermission: true, error: null });

      // 4. Push to paired Wear OS watch (fire-and-forget, non-fatal).
      broadcastToWatch(data);
      wearSyncService.sendData({ steps: data.steps, calories: data.calories, target: STEPS_GOAL });

      AlexiEvents.emit('dataUpdated', { type: 'health_sync', ...data });
    } catch (e) {
      console.error('[HealthSync]', e.message);
      _setState({ isSyncing: false, error: e.message });
    }
  }, []);

  return { ...state, syncData };
}
