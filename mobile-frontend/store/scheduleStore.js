/**
 * scheduleStore.js
 * Lightweight pub/sub store — shares the AI-generated weekly schedule
 * between YaraAssistant and ScheduleScreen without Supabase or AsyncStorage.
 * 
 * Usage:
 *   import { scheduleStore } from '../store/scheduleStore';
 *   scheduleStore.set(data);           // from YaraAssistant
 *   scheduleStore.get();               // read current value
 *   scheduleStore.subscribe(fn);       // from ScheduleScreen — returns unsub fn
 *   scheduleStore.logDay(day, field, value); // update a logged value
 */

const createStore = () => {
  let state = null;
  const listeners = new Set();

  return {
    get: () => state,

    set: (newState) => {
      state = newState;
      listeners.forEach(fn => fn(state));
    },

    // Update a single logged field (sleep_actual, steps_actual, water_actual)
    logDay: (dayIndex, field, value) => {
      if (!state?.days?.[dayIndex]) return;
      state = {
        ...state,
        days: state.days.map((d, i) => i === dayIndex ? { ...d, [field]: value } : d
        ),
      };
      listeners.forEach(fn => fn(state));
    },

    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
};

export const scheduleStore = createStore();