/**
 * constants/muscleFatigue.js
 * Single source of truth for exercise → muscle fatigue mapping.
 * Used by WorkoutActive, ManualWorkout, ExerciseInfo, and Training.
 */

// Maps individual primary muscles (from exercises.json) to fatigue targets.
export const MUSCLE_FATIGUE = {
  chest:          [{ name: 'Chest', inc: 25 }, { name: 'Triceps', inc: 10 }],
  abdominals:     [{ name: 'Core', inc: 25 }],
  biceps:         [{ name: 'Biceps', inc: 25 }],
  triceps:        [{ name: 'Triceps', inc: 25 }],
  quadriceps:     [{ name: 'Quads', inc: 25 }],
  hamstrings:     [{ name: 'Hamstrings', inc: 25 }],
  glutes:         [{ name: 'Glutes', inc: 25 }],
  shoulders:      [{ name: 'Shoulders', inc: 25 }],
  lats:           [{ name: 'Back', inc: 25 }],
  'middle back':  [{ name: 'Back', inc: 20 }],
  'lower back':   [{ name: 'Back', inc: 15 }],
  forearms:       [{ name: 'Forearms', inc: 20 }],
  calves:         [{ name: 'Calves', inc: 20 }],
  traps:          [{ name: 'Shoulders', inc: 15 }, { name: 'Back', inc: 10 }],
  neck:           [{ name: 'Shoulders', inc: 10 }],
  adductors:      [{ name: 'Quads', inc: 10 }],
  abductors:      [{ name: 'Glutes', inc: 10 }],
};

// Maps AI-coach exercise keys to the muscles they target.
// Used by WorkoutActive when the exercise doesn't come from the JSON library.
export const EXERCISE_KEY_MUSCLES = {
  squat:         ['quadriceps', 'glutes', 'hamstrings'],
  pushup:        ['chest', 'triceps', 'shoulders'],
  bicepCurl:     ['biceps', 'forearms'],
  shoulderPress: ['shoulders', 'triceps'],
  deadlift:      ['hamstrings', 'glutes', 'lats'],
  lunge:         ['quadriceps', 'glutes', 'hamstrings'],
  plank:         ['abdominals', 'shoulders'],
};

/**
 * Returns fatigue entries for an exercise from the JSON library.
 * @param {{ primaryMuscles?: string[] }} exercise
 * @returns {{ name: string, inc: number }[]}
 */
export function fatigueForExercise(exercise) {
  const muscles = exercise.primaryMuscles || [];
  const result = [];
  for (const m of muscles) {
    const entries = MUSCLE_FATIGUE[m.toLowerCase()] || [];
    for (const e of entries) {
      if (!result.find(r => r.name === e.name)) result.push(e);
    }
  }
  return result;
}

/**
 * Returns fatigue entries for an AI-coach exercise key.
 * @param {string} exerciseKey - e.g. 'squat', 'pushup'
 * @returns {{ name: string, inc: number }[]}
 */
export function fatigueForKey(exerciseKey) {
  const primaryMuscles = EXERCISE_KEY_MUSCLES[exerciseKey] || [];
  return fatigueForExercise({ primaryMuscles });
}

/**
 * Applies time-based decay to a fatigue percentage.
 * Muscles recover ~2% per hour, so 100% → 0% takes ~50 hours (~2 days).
 * @param {number} fatiguePct - stored fatigue (0-100)
 * @param {string|Date} lastUpdated - ISO timestamp of last update
 * @returns {number} decayed fatigue (0-100)
 */
export function decayFatigue(fatiguePct, lastUpdated) {
  if (!lastUpdated || !fatiguePct) return 0;
  const hoursSince = (Date.now() - new Date(lastUpdated).getTime()) / 3600000;
  return Math.max(0, Math.round(fatiguePct - hoursSince * 2));
}

export function exerciseNeedsWeight(equipment) {
  return equipment && equipment !== 'body only';
}
