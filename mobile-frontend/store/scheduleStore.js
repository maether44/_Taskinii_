/**
 * scheduleStore.js
 * Pub/sub store with AsyncStorage persistence.
 * Tracks exercise completion per day.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCHEDULE_KEY   = '@yara_schedule';
const COMPLETION_KEY = '@yara_completion'; // { "2025-04-16": { done: true, checked: [0,2] } }

const createStore = () => {
  let state      = null;
  let completion = {}; // date -> { done: bool, checked: number[] }
  const listeners = new Set();
  const notify = () => listeners.forEach(fn => fn(state, completion));

  return {
    get:           () => state,
    getCompletion: () => completion,

    // ── Hydrate on app start ──────────────────────────────────
    hydrate: async () => {
      try {
        const [rawSchedule, rawCompletion] = await Promise.all([
          AsyncStorage.getItem(SCHEDULE_KEY),
          AsyncStorage.getItem(COMPLETION_KEY),
        ]);
        if (rawSchedule)   state      = JSON.parse(rawSchedule);
        if (rawCompletion) completion = JSON.parse(rawCompletion);
        notify();
      } catch (_) {}
    },

    // ── Save new schedule from Yara ───────────────────────────
    set: async (newState) => {
      state = newState;
      notify();
      try { await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(newState)); } catch (_) {}
    },

    // ── Toggle a single exercise checked state ────────────────
    toggleExercise: async (date, exerciseIndex) => {
      const day = completion[date] ?? { done: false, checked: [] };
      const checked = day.checked.includes(exerciseIndex)
        ? day.checked.filter(i => i !== exerciseIndex)
        : [...day.checked, exerciseIndex];
      completion = { ...completion, [date]: { ...day, checked } };
      notify();
      try { await AsyncStorage.setItem(COMPLETION_KEY, JSON.stringify(completion)); } catch (_) {}
    },

    // ── Mark day as fully done ────────────────────────────────
    markDayDone: async (date) => {
      completion = { ...completion, [date]: { ...completion[date], done: true } };
      notify();
      try { await AsyncStorage.setItem(COMPLETION_KEY, JSON.stringify(completion)); } catch (_) {}
    },

    // ── Clear schedule ────────────────────────────────────────
    clear: async () => {
      state = null;
      notify();
      try { await AsyncStorage.removeItem(SCHEDULE_KEY); } catch (_) {}
    },

    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
};

export const scheduleStore = createStore();