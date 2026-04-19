import { error as logError } from './logger';
/**
 * AppEventBus — lightweight pub/sub for cross-screen communication.
 *
 * Events emitted here let any subscriber (hooks, contexts, Yara) react
 * without tight coupling between screens.
 *
 * Usage:
 *   import { AppEvents, emit, on, off } from '../lib/eventBus';
 *   emit(AppEvents.MEAL_LOGGED, { calories: 350, mealType: 'lunch' });
 *   const unsub = on(AppEvents.MEAL_LOGGED, (payload) => { ... });
 *   unsub();                         // or: off(AppEvents.MEAL_LOGGED, handler);
 */

const listeners = {};

export const AppEvents = Object.freeze({
  // Nutrition
  MEAL_LOGGED:          'MEAL_LOGGED',
  WATER_LOGGED:         'WATER_LOGGED',

  // Sleep & Activity
  SLEEP_LOGGED:         'SLEEP_LOGGED',

  // Workout
  WORKOUT_COMPLETED:    'WORKOUT_COMPLETED',

  // Gamification
  ACHIEVEMENT_AWARDED:  'ACHIEVEMENT_AWARDED',
  XP_AWARDED:           'XP_AWARDED',
  STREAK_MILESTONE:     'STREAK_MILESTONE',

  // Profile
  PROFILE_UPDATED:      'PROFILE_UPDATED',
  TARGETS_UPDATED:      'TARGETS_UPDATED',

  // Generic refresh signal (e.g. after bulk changes)
  REFRESH_TODAY:        'REFRESH_TODAY',
});

export function on(event, handler) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(handler);
  return () => off(event, handler);
}

export function off(event, handler) {
  const list = listeners[event];
  if (!list) return;
  const idx = list.indexOf(handler);
  if (idx !== -1) list.splice(idx, 1);
}

export function emit(event, payload) {
  const list = listeners[event];
  if (!list?.length) return;
  for (const fn of list) {
    try { fn(payload); } catch (e) { logError(`[EventBus] ${event}:`, e); }
  }
}
