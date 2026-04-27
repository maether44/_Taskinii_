/**
 * App-wide magic numbers extracted into named constants.
 * Import from here instead of hardcoding values across screens/services.
 */

// ── Notification scheduling ────────────────────────────────────
export const HYDRATION_REMINDER_HOUR = 17; // 5 PM
export const WORKOUT_REMINDER_HOURS = {
  morning: 7,
  afternoon: 13,
  evening: 18,
  any: 8,
};

// ── Health score thresholds (per 100g) ─────────────────────────
export const HEALTH_SCORE = Object.freeze({
  SUGAR_HIGH: 20,
  SUGAR_MODERATE: 10,
  FIBER_HIGH: 6,
  FIBER_LOW: 2,
  FIBER_MODERATE: 3,
  PROTEIN_LOW: 8,
  PROTEIN_VERY_LOW: 10,
  FAT_HIGH: 30,
  FAT_MODERATE: 20,
});

// ── Fatigue thresholds ─────────────────────────────────────────
export const FATIGUE = Object.freeze({
  HIGH: 70,
  MODERATE: 30,
});

// ── Streak milestones ──────────────────────────────────────────
export const STREAK_MILESTONES = Object.freeze([3, 7, 14, 30, 60, 100, 365]);

// ── Default hydration ──────────────────────────────────────────
export const DEFAULT_WATER_GOAL_ML = 2000;
export const CUP_ML = 250;
