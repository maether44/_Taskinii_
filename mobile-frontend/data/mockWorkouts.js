// ─── EXERCISE LIBRARY ─────────────────────────────────────────────────────────
export const EXERCISES = [
  // CHEST
  { id: 'bench_press',    name: 'Bench Press',        muscle: 'Chest',     equipment: 'Barbell', category: 'Strength' },
  { id: 'incline_press',  name: 'Incline DB Press',   muscle: 'Chest',     equipment: 'Dumbbell',category: 'Strength' },
  { id: 'chest_fly',      name: 'Chest Fly',          muscle: 'Chest',     equipment: 'Dumbbell',category: 'Strength' },
  { id: 'pushup',         name: 'Push-Up',            muscle: 'Chest',     equipment: 'Bodyweight',category:'Strength'},
  // BACK
  { id: 'pullup',         name: 'Pull-Up',            muscle: 'Back',      equipment: 'Bodyweight',category:'Strength'},
  { id: 'deadlift',       name: 'Deadlift',           muscle: 'Back',      equipment: 'Barbell', category: 'Strength' },
  { id: 'row',            name: 'Barbell Row',        muscle: 'Back',      equipment: 'Barbell', category: 'Strength' },
  { id: 'lat_pulldown',   name: 'Lat Pulldown',       muscle: 'Back',      equipment: 'Cable',   category: 'Strength' },
  // LEGS
  { id: 'squat',          name: 'Back Squat',         muscle: 'Legs',      equipment: 'Barbell', category: 'Strength' },
  { id: 'leg_press',      name: 'Leg Press',          muscle: 'Legs',      equipment: 'Machine', category: 'Strength' },
  { id: 'lunge',          name: 'Walking Lunge',      muscle: 'Legs',      equipment: 'Dumbbell',category: 'Strength' },
  { id: 'leg_curl',       name: 'Leg Curl',           muscle: 'Hamstrings',equipment: 'Machine', category: 'Strength' },
  // SHOULDERS
  { id: 'ohp',            name: 'Overhead Press',     muscle: 'Shoulders', equipment: 'Barbell', category: 'Strength' },
  { id: 'lateral_raise',  name: 'Lateral Raise',      muscle: 'Shoulders', equipment: 'Dumbbell',category: 'Strength' },
  // ARMS
  { id: 'bicep_curl',     name: 'Bicep Curl',         muscle: 'Biceps',    equipment: 'Dumbbell',category: 'Strength' },
  { id: 'tricep_dip',     name: 'Tricep Dip',         muscle: 'Triceps',   equipment: 'Bodyweight',category:'Strength'},
  { id: 'tricep_push',    name: 'Tricep Pushdown',    muscle: 'Triceps',   equipment: 'Cable',   category: 'Strength' },
  // CORE
  { id: 'plank',          name: 'Plank',              muscle: 'Core',      equipment: 'Bodyweight',category:'Core'    },
  { id: 'crunch',         name: 'Crunch',             muscle: 'Core',      equipment: 'Bodyweight',category:'Core'    },
  { id: 'leg_raise',      name: 'Leg Raise',          muscle: 'Core',      equipment: 'Bodyweight',category:'Core'    },
  // CARDIO
  { id: 'run',            name: 'Treadmill Run',      muscle: 'Full Body', equipment: 'Machine', category: 'Cardio' },
  { id: 'bike',           name: 'Stationary Bike',    muscle: 'Legs',      equipment: 'Machine', category: 'Cardio' },
  { id: 'jump_rope',      name: 'Jump Rope',          muscle: 'Full Body', equipment: 'Bodyweight',category:'Cardio' },
];

// ─── WEEKLY WORKOUT PLANS ─────────────────────────────────────────────────────
export const WORKOUT_PLANS = {
  fat_loss: {
    name: 'Fat Loss Program',
    days: [
      {
        day: 'Monday',
        name: 'Upper Body + Cardio',
        estimatedMinutes: 50,
        estimatedCalories: 380,
        exercises: [
          { id: 'bench_press',   sets: 3, reps: 12, restSec: 60  },
          { id: 'row',           sets: 3, reps: 12, restSec: 60  },
          { id: 'ohp',           sets: 3, reps: 10, restSec: 60  },
          { id: 'bicep_curl',    sets: 3, reps: 15, restSec: 45  },
          { id: 'tricep_push',   sets: 3, reps: 15, restSec: 45  },
          { id: 'run',           sets: 1, reps: 0,  restSec: 0, duration: '20 min' },
        ],
      },
      { day: 'Tuesday',   name: 'Rest Day',        estimatedMinutes: 0,  estimatedCalories: 0,   exercises: [] },
      {
        day: 'Wednesday',
        name: 'Lower Body',
        estimatedMinutes: 45,
        estimatedCalories: 320,
        exercises: [
          { id: 'squat',         sets: 4, reps: 10, restSec: 90  },
          { id: 'leg_press',     sets: 3, reps: 12, restSec: 60  },
          { id: 'lunge',         sets: 3, reps: 12, restSec: 60  },
          { id: 'leg_curl',      sets: 3, reps: 12, restSec: 60  },
          { id: 'plank',         sets: 3, reps: 0,  restSec: 30, duration: '45 sec' },
        ],
      },
      { day: 'Thursday',  name: 'Active Recovery', estimatedMinutes: 25, estimatedCalories: 150, exercises: [
          { id: 'bike',          sets: 1, reps: 0,  restSec: 0, duration: '25 min' },
        ]},
      {
        day: 'Friday',
        name: 'Full Body',
        estimatedMinutes: 55,
        estimatedCalories: 400,
        exercises: [
          { id: 'deadlift',      sets: 4, reps: 8,  restSec: 120 },
          { id: 'bench_press',   sets: 3, reps: 10, restSec: 90  },
          { id: 'lat_pulldown',  sets: 3, reps: 12, restSec: 60  },
          { id: 'lateral_raise', sets: 3, reps: 15, restSec: 45  },
          { id: 'leg_raise',     sets: 3, reps: 15, restSec: 45  },
        ],
      },
      { day: 'Saturday',  name: 'Rest Day',        estimatedMinutes: 0,  estimatedCalories: 0,   exercises: [] },
      { day: 'Sunday',    name: 'Rest Day',        estimatedMinutes: 0,  estimatedCalories: 0,   exercises: [] },
    ],
  },

  muscle_gain: {
    name: 'Muscle Building Program',
    days: [
      {
        day: 'Monday',
        name: 'Chest & Triceps',
        estimatedMinutes: 60,
        estimatedCalories: 350,
        exercises: [
          { id: 'bench_press',   sets: 4, reps: 8,  restSec: 120 },
          { id: 'incline_press', sets: 4, reps: 10, restSec: 90  },
          { id: 'chest_fly',     sets: 3, reps: 12, restSec: 60  },
          { id: 'tricep_dip',    sets: 3, reps: 12, restSec: 60  },
          { id: 'tricep_push',   sets: 3, reps: 12, restSec: 60  },
        ],
      },
      {
        day: 'Tuesday',
        name: 'Back & Biceps',
        estimatedMinutes: 60,
        estimatedCalories: 360,
        exercises: [
          { id: 'deadlift',      sets: 4, reps: 6,  restSec: 180 },
          { id: 'pullup',        sets: 4, reps: 8,  restSec: 90  },
          { id: 'row',           sets: 4, reps: 10, restSec: 90  },
          { id: 'lat_pulldown',  sets: 3, reps: 12, restSec: 60  },
          { id: 'bicep_curl',    sets: 3, reps: 12, restSec: 60  },
        ],
      },
      { day: 'Wednesday', name: 'Rest Day', estimatedMinutes: 0, estimatedCalories: 0, exercises: [] },
      {
        day: 'Thursday',
        name: 'Legs',
        estimatedMinutes: 65,
        estimatedCalories: 420,
        exercises: [
          { id: 'squat',         sets: 5, reps: 5,  restSec: 180 },
          { id: 'leg_press',     sets: 4, reps: 10, restSec: 90  },
          { id: 'lunge',         sets: 3, reps: 12, restSec: 60  },
          { id: 'leg_curl',      sets: 4, reps: 12, restSec: 60  },
        ],
      },
      {
        day: 'Friday',
        name: 'Shoulders & Core',
        estimatedMinutes: 50,
        estimatedCalories: 300,
        exercises: [
          { id: 'ohp',           sets: 4, reps: 8,  restSec: 120 },
          { id: 'lateral_raise', sets: 4, reps: 15, restSec: 45  },
          { id: 'plank',         sets: 4, reps: 0,  restSec: 30, duration: '60 sec' },
          { id: 'crunch',        sets: 3, reps: 20, restSec: 45  },
          { id: 'leg_raise',     sets: 3, reps: 15, restSec: 45  },
        ],
      },
      { day: 'Saturday', name: 'Rest Day', estimatedMinutes: 0, estimatedCalories: 0, exercises: [] },
      { day: 'Sunday',   name: 'Rest Day', estimatedMinutes: 0, estimatedCalories: 0, exercises: [] },
    ],
  },
};

// ─── WORKOUT HISTORY (last 5) ─────────────────────────────────────────────────
export const WORKOUT_HISTORY = [
  { date: '2025-02-24', name: 'Upper Body + Cardio', duration: 52, calories: 390, completed: true  },
  { date: '2025-02-23', name: 'Rest Day',            duration: 0,  calories: 0,   completed: true  },
  { date: '2025-02-22', name: 'Lower Body',          duration: 48, calories: 330, completed: true  },
  { date: '2025-02-21', name: 'Active Recovery',     duration: 25, calories: 155, completed: true  },
  { date: '2025-02-20', name: 'Full Body',           duration: 58, calories: 410, completed: false },
];