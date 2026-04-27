export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

export const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const GYM_EQUIPMENT = [
  {
    id:           'smithMachine',
    name:         'Smith Machine',
    icon:         'barbell-outline',
    primaryMuscle:'Quads · Glutes',
    imageUrl:     'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
    exerciseKey:  'squat',
    setup: [
      'Set the bar at mid-chest height when standing.',
      'Step under the bar, feet shoulder-width, toes slightly out.',
      'Unrack by rotating the bar forward.',
      'Descend until thighs are parallel. Keep knees tracking over toes.',
    ],
    activation:
      'At the bottom, feel your glutes fully loaded. Drive through your heels — consciously squeeze your glutes hard at the top lockout for a 1-second pause.',
    alternatives: [
      { name: 'Goblet Squat', icon: 'fitness-outline' },
      { name: 'DB Split Squat', icon: 'body-outline' },
    ],
  },
  {
    id:           'legPress',
    name:         'Leg Press',
    icon:         'footsteps-outline',
    primaryMuscle:'Quads · Hamstrings',
    imageUrl:     'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&q=80',
    exerciseKey:  'squat',
    setup: [
      'Adjust seat so knees are at 90° with feet on platform.',
      'Place feet hip-width apart, mid-platform.',
      'Keep lower back flat against the pad throughout.',
      'Do NOT lock out knees at the top — keep slight tension.',
    ],
    activation:
      'Focus on the outer quad sweep. Push through the entire foot evenly. On the way back down, control the weight — that eccentric load is where the muscle grows.',
    alternatives: [
      { name: 'DB Bulgarian Split Squat', icon: 'body-outline' },
      { name: 'DB Step-Up', icon: 'fitness-outline' },
    ],
  },
  {
    id:           'latPulldown',
    name:         'Lat Pulldown',
    icon:         'arrow-down-circle-outline',
    primaryMuscle:'Lats · Biceps',
    imageUrl:     'https://images.unsplash.com/photo-1581009137042-c552e485697a?w=400&q=80',
    exerciseKey:  'bicepCurl',
    setup: [
      'Adjust thigh pad to lock hips firmly in place.',
      'Grip bar slightly wider than shoulder-width, overhand.',
      'Lean back 10–15° — this is your fixed position throughout.',
      'Depress your shoulder blades before each pull.',
    ],
    activation:
      'Initiate every rep by pulling your elbows DOWN and BACK — not your hands. Think "elbows to hip pockets." You should feel a deep stretch in your lats at full extension.',
    alternatives: [
      { name: 'DB Single-Arm Row', icon: 'barbell-outline' },
      { name: 'DB Pullover', icon: 'fitness-outline' },
    ],
  },
  {
    id:           'chestPress',
    name:         'Chest Press',
    icon:         'expand-outline',
    primaryMuscle:'Chest · Triceps',
    imageUrl:     'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80',
    exerciseKey:  'pushup',
    setup: [
      'Adjust seat so handles are at mid-chest height.',
      'Sit tall — lower back lightly against the pad.',
      'Grip handles with wrists straight, elbows at 75° (not flared to 90°).',
      'Keep shoulder blades pinched together for the entire set.',
    ],
    activation:
      'As you press, imagine trying to bring your elbows together. Squeeze your pecs hard at full extension — hold 1 second. Feel the inner chest fibers contract.',
    alternatives: [
      { name: 'DB Bench Press', icon: 'barbell-outline' },
      { name: 'DB Chest Fly', icon: 'expand-outline' },
    ],
  },
  {
    id:           'cableRow',
    name:         'Cable Row',
    icon:         'swap-horizontal-outline',
    primaryMuscle:'Back · Rear Delts',
    imageUrl:     'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
    exerciseKey:  'bicepCurl',
    setup: [
      'Set pulley to hip height. Use a close-grip V-bar attachment.',
      'Sit upright, knees slightly bent, feet on platforms.',
      'Start with arms extended — feel a full lat stretch.',
      'Do NOT lean back more than 10° to initiate the pull.',
    ],
    activation:
      'Drive elbows back past your torso. At the peak contraction, squeeze your shoulder blades hard together for 2 seconds. Your mid-back should feel on fire.',
    alternatives: [
      { name: 'DB Bent-Over Row', icon: 'barbell-outline' },
      { name: 'DB Pendlay Row', icon: 'fitness-outline' },
    ],
  },
  {
    id:           'shoulderPress',
    name:         'Shoulder Press',
    icon:         'arrow-up-circle-outline',
    primaryMuscle:'Shoulders · Triceps',
    imageUrl:     'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80',
    exerciseKey:  'shoulderPress',
    setup: [
      'Adjust seat so handles are at ear/jaw height.',
      'Sit with lower back flush against the pad.',
      'Grip handles with palms facing forward, wrists neutral.',
      'Keep core tight — avoid arching your lower back at the top.',
    ],
    activation:
      'Press through the heel of your palm. At the top, shrug slightly — feel the lateral head of the shoulder squeeze. Lower slowly over 3 counts to maximise deltoid activation.',
    alternatives: [
      { name: 'DB Arnold Press', icon: 'fitness-outline' },
      { name: 'DB Lateral Raise', icon: 'body-outline' },
    ],
  },
  {
    id:           'legCurl',
    name:         'Leg Curl',
    icon:         'walk-outline',
    primaryMuscle:'Hamstrings',
    imageUrl:     'https://images.unsplash.com/photo-1516567832786-d171bef2e97e?w=400&q=80',
    exerciseKey:  'deadlift',
    setup: [
      'Adjust pad so it rests just above the heel, not on the ankle.',
      'Lie face-down, hips pressed into the bench.',
      'Hold handles to stabilise — do not lift your hips.',
      'Keep toes pointed slightly inward to target bicep femoris.',
    ],
    activation:
      'Curl through a full range — bring heels toward your glutes. At peak, squeeze hamstrings for a hard 1-second hold. Lower over 3 counts — the eccentric is where the strength gains live.',
    alternatives: [
      { name: 'DB Romanian Deadlift', icon: 'barbell-outline' },
      { name: 'DB Nordic Curl (assisted)', icon: 'body-outline' },
    ],
  },
  {
    id:           'cableBicepCurl',
    name:         'Cable Curl',
    icon:         'hand-right-outline',
    primaryMuscle:'Biceps · Forearms',
    imageUrl:     'https://images.unsplash.com/photo-1597452485675-8c2a65a7253c?w=400&q=80',
    exerciseKey:  'bicepCurl',
    setup: [
      'Set pulley to lowest pin. Use a straight or EZ bar attachment.',
      'Stand one step back from the machine, arms fully extended.',
      'Pin your elbows to your sides — they must NOT move.',
      'Supinate your wrists at the top (rotate pinky up).',
    ],
    activation:
      'At full contraction, your wrists should be supinated with knuckles facing the ceiling. Squeeze the peak of your bicep hard for 1 second. The constant cable tension keeps the muscle under load even at the bottom.',
    alternatives: [
      { name: 'DB Alternating Curl', icon: 'fitness-outline' },
      { name: 'DB Hammer Curl', icon: 'barbell-outline' },
    ],
  },
];

export const HOME_EXERCISES = [
  { id: 'pushup',   name: 'Push-Up',       icon: 'body-outline',      primaryMuscle: 'Chest · Triceps',    exerciseKey: 'pushup',  sets: '4 × 15', imageUrl: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400&q=80', isHome: true },
  { id: 'airsquat', name: 'Air Squat',     icon: 'walk-outline',      primaryMuscle: 'Quads · Glutes',     exerciseKey: 'squat',   sets: '4 × 20', imageUrl: 'https://images.unsplash.com/photo-1536922246289-88c42f957773?w=400&q=80', isHome: true },
  { id: 'lunge',    name: 'Reverse Lunge', icon: 'footsteps-outline', primaryMuscle: 'Glutes · Quads',     exerciseKey: 'lunge',   sets: '3 × 12', imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', isHome: true },
  { id: 'plank',    name: 'Plank Hold',    icon: 'fitness-outline',   primaryMuscle: 'Core',               exerciseKey: 'plank',   sets: '3 × 45s',imageUrl: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=400&q=80', isHome: true },
  { id: 'glute',    name: 'Glute Bridge',  icon: 'arrow-up-outline',  primaryMuscle: 'Glutes · Hamstrings',exerciseKey: 'squat',   sets: '4 × 20', imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80', isHome: true },
  { id: 'dipchest', name: 'Tricep Dip',    icon: 'arrow-down-outline',primaryMuscle: 'Triceps · Chest',   exerciseKey: 'pushup',  sets: '3 × 12', imageUrl: 'https://images.unsplash.com/photo-1530822847156-5df684ec5933?w=400&q=80', isHome: true },
];

export const COMBINED_EQUIPMENT = [
  ...GYM_EQUIPMENT.map(e => ({ ...e, isHome: false })),
  ...HOME_EXERCISES,
];

export const PLAN_CIRCUITS = {
  strength: [
    { name: 'Barbell Squat',   icon: 'barbell-outline',          key: 'squat',         sets: '4×8',  target: 'Quads · Glutes' },
    { name: 'Chest Press',     icon: 'expand-outline',           key: 'pushup',        sets: '3×10', target: 'Chest · Triceps' },
    { name: 'Cable Row',       icon: 'swap-horizontal-outline',  key: 'bicepCurl',     sets: '3×12', target: 'Back · Rear Delts' },
  ],
  upper: [
    { name: 'Shoulder Press',  icon: 'arrow-up-circle-outline',  key: 'shoulderPress', sets: '4×10', target: 'Shoulders · Triceps' },
    { name: 'Lat Pulldown',    icon: 'arrow-down-circle-outline',key: 'bicepCurl',     sets: '3×12', target: 'Lats · Biceps' },
    { name: 'Cable Curl',      icon: 'hand-right-outline',       key: 'bicepCurl',     sets: '3×15', target: 'Biceps' },
  ],
  lower: [
    { name: 'Leg Press',       icon: 'footsteps-outline',        key: 'squat',         sets: '4×10', target: 'Quads · Hamstrings' },
    { name: 'Leg Curl',        icon: 'walk-outline',             key: 'deadlift',      sets: '3×12', target: 'Hamstrings' },
    { name: 'Smith Machine',   icon: 'barbell-outline',          key: 'squat',         sets: '3×10', target: 'Quads · Glutes' },
  ],
  recovery: [
    { name: 'Plank Hold',      icon: 'fitness-outline',          key: 'plank',         sets: '3×45s',target: 'Core' },
    { name: 'Air Squat',       icon: 'walk-outline',             key: 'squat',         sets: '3×20', target: 'Full Body' },
    { name: 'Glute Bridge',    icon: 'arrow-up-outline',         key: 'squat',         sets: '3×20', target: 'Glutes' },
  ],
};

export const BODY_SPOTS = [
  { id: 'Shoulders', cx: 17,  cy: 52,  rx: 11, ry: 9  },
  { id: 'Shoulders', cx: 103, cy: 52,  rx: 11, ry: 9  },
  { id: 'Chest',     cx: 60,  cy: 64,  rx: 22, ry: 16 },
  { id: 'Biceps',    cx: 15,  cy: 80,  rx: 8,  ry: 14 },
  { id: 'Biceps',    cx: 105, cy: 80,  rx: 8,  ry: 14 },
  { id: 'Triceps',   cx: 13,  cy: 93,  rx: 7,  ry: 10 },
  { id: 'Triceps',   cx: 107, cy: 93,  rx: 7,  ry: 10 },
  { id: 'Forearms',  cx: 14,  cy: 118, rx: 6,  ry: 12 },
  { id: 'Forearms',  cx: 106, cy: 118, rx: 6,  ry: 12 },
  { id: 'Core',      cx: 60,  cy: 98,  rx: 17, ry: 22 },
  { id: 'Glutes',    cx: 42,  cy: 137, rx: 13, ry: 10 },
  { id: 'Glutes',    cx: 78,  cy: 137, rx: 13, ry: 10 },
  { id: 'Quads',     cx: 42,  cy: 162, rx: 12, ry: 22 },
  { id: 'Quads',     cx: 78,  cy: 162, rx: 12, ry: 22 },
  { id: 'Hamstrings',cx: 42,  cy: 185, rx: 11, ry: 12 },
  { id: 'Hamstrings',cx: 78,  cy: 185, rx: 11, ry: 12 },
  { id: 'Back',      cx: 60,  cy: 78,  rx: 20, ry: 20 },
];

export function fatigueColor(pct) {
  if (pct >= 70) return '#7C5CFC';
  if (pct >= 30) return '#FF9500';
  return '#C8F135';
}

export function fatigueLabel(pct) {
  if (pct >= 70) return 'FATIGUED';
  if (pct >= 30) return 'SORE';
  return 'FRESH';
}

export const C = {
  bg:      '#0F0B1E',
  card:    '#161230',
  border:  '#1E1A35',
  purple:  '#7C5CFC',
  purpleD: '#4A2FC8',
  lime:    '#C8F135',
  text:    '#FFFFFF',
  sub:     '#6B5F8A',
  accent:  '#9D85F5',
};

export const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 8,
};
