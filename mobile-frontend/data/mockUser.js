// ─── SINGLE SOURCE OF TRUTH ───────────────────────────────────────────────────
// In a real app this would come from AsyncStorage / backend
// All screens import from here so data is consistent

export const USER = {
  name: 'Alex',
  email: 'alex@example.com',
  gender: 'male',       // male | female
  age: 27,
  heightCm: 180,
  weightKg: 82,
  goalWeightKg: 75,
  bodyFatPct: 18,
  activityLevel: 'moderate', // sedentary | light | moderate | active | very_active
  goal: 'fat_loss',          // fat_loss | muscle_gain | maintain
  weeklyWorkoutDays: 4,
  joined: '2024-01-15',
};

// ─── CALCULATED TARGETS ───────────────────────────────────────────────────────
// Mifflin-St Jeor BMR
const bmrMale   = 10 * USER.weightKg + 6.25 * USER.heightCm - 5 * USER.age + 5;
const bmrFemale = 10 * USER.weightKg + 6.25 * USER.heightCm - 5 * USER.age - 161;
export const BMR = USER.gender === 'male' ? Math.round(bmrMale) : Math.round(bmrFemale);

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};
export const TDEE = Math.round(BMR * ACTIVITY_MULTIPLIERS[USER.activityLevel]);

export const CALORIE_TARGET = USER.goal === 'fat_loss'
  ? TDEE - 400
  : USER.goal === 'muscle_gain'
  ? TDEE + 200
  : TDEE;

export const MACROS = {
  protein: Math.round(USER.weightKg * 2.0),       // 2g per kg
  fat:     Math.round(CALORIE_TARGET * 0.25 / 9), // 25% of calories
  carbs:   Math.round((CALORIE_TARGET - (USER.weightKg * 2.0 * 4) - (CALORIE_TARGET * 0.25)) / 4),
};

export const WATER_TARGET_ML = Math.round(USER.weightKg * 35); // 35ml per kg

// ─── TODAY'S LOGGED DATA ──────────────────────────────────────────────────────
export const TODAY = {
  date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
  calories: { eaten: 1420, burned: 280, goal: CALORIE_TARGET },
  protein:  { eaten: 98,  goal: MACROS.protein },
  carbs:    { eaten: 165, goal: MACROS.carbs   },
  fat:      { eaten: 42,  goal: MACROS.fat     },
  water:    { ml: 1200,   goal: WATER_TARGET_ML },
  steps:    { count: 7832, goal: 10000 },
  sleep:    { hours: 7.2, quality: 4, goal: 8 },  // quality 1–5
  activeMin:{ count: 34,  goal: 60 },
  streak:   { workout: 5, nutrition: 3, hydration: 7 },
};

// ─── RECOVERY & SCORES ────────────────────────────────────────────────────────
export const RECOVERY = {
  score: 74,
  energy: 82,
  readiness: 'High',   // Low | Moderate | High
  hrv: 62,
  restingHR: 58,
  sleepScore: 78,
};

// ─── WEEK HISTORY ─────────────────────────────────────────────────────────────
export const WEEK = {
  workouts:   [true, true, false, true, false, false, false],
  calories:   [1820, 2050, 1600, 1950, 1420, 0, 0],
  protein:    [140, 155, 110, 148, 98, 0, 0],
  sleep:      [7.1, 6.8, 8.2, 7.5, 7.2, 0, 0],
  steps:      [9200, 11400, 6800, 9300, 7832, 0, 0],
};

// ─── PERSONAL RECORDS ─────────────────────────────────────────────────────────
export const PERSONAL_RECORDS = [
  { exercise: 'Bench Press',   weight: 90,  unit: 'kg', date: '2024-12-10' },
  { exercise: 'Squat',         weight: 120, unit: 'kg', date: '2025-01-05' },
  { exercise: 'Deadlift',      weight: 140, unit: 'kg', date: '2025-01-20' },
  { exercise: 'Pull-ups',      weight: 12,  unit: 'reps', date: '2025-02-01' },
  { exercise: 'Shoulder Press',weight: 65,  unit: 'kg', date: '2024-11-28' },
];

// ─── BADGES & GAMIFICATION ────────────────────────────────────────────────────
export const BADGES = [
  { id: 'streak7',    icon: '🔥', label: '7-Day Streak',       xp: 100, earned: false },
  { id: 'workouts30', icon: '💪', label: '30 Workouts Done',    xp: 200, earned: false },
  { id: 'hydrated',   icon: '💧', label: 'Hydration Master',    xp: 50,  earned: false },
  { id: 'posture100', icon: '🧍', label: 'Perfect Form',        xp: 75,  earned: false },
  { id: 'streak5',    icon: '⚡', label: '5-Day Streak',        xp: 50,  earned: true  },
  { id: 'firstlog',   icon: '📝', label: 'First Meal Logged',   xp: 20,  earned: true  },
  { id: 'steps10k',   icon: '👟', label: '10K Steps',           xp: 40,  earned: true  },
];

export const XP = { current: 340, goal: 500, level: 12 };