export const THEMES = {
  dark: {
    bg: '#0E0C15',
    surface: '#18152A',
    card: '#201C35',
    border: '#2D2850',
    text: '#F4F0FF',
    sub: '#8B82AD',
    muted: '#3D3560',
    purple: '#7B61FF',
    purpleLight: '#A08AFF',
    lime: '#B8F566',
    green: '#2ECC71',
    orange: '#F5A623',
    red: '#FF6B6B',
    pill: '#2D2850',
  },
  light: {
    bg: '#F7F5FF',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E5E1F8',
    text: '#1A1535',
    sub: '#6B5F8A',
    muted: '#C5BEE8',
    purple: '#7B61FF',
    purpleLight: '#A08AFF',
    lime: '#5CB832',
    green: '#2ECC71',
    orange: '#F5A623',
    red: '#FF6B6B',
    pill: '#EDE9FF',
  },
};

export const STEPS = [
  { id: 'goal', emoji: '🎯', label: 'Your Goal' },
  { id: 'body', emoji: '📏', label: 'About You' },
  { id: 'xp', emoji: '💪', label: 'Experience' },
  { id: 'schedule', emoji: '📅', label: 'Schedule' },
  { id: 'equipment', emoji: '🏋️', label: 'Equipment' },
  { id: 'lifestyle', emoji: '🌙', label: 'Lifestyle' },
  { id: 'plan', emoji: '✨', label: 'Your Plan' },
];

export const GOALS = [
  { id: 'lose_fat', emoji: '🔥', title: 'Lose Weight', sub: 'Burn fat, get leaner' },
  { id: 'gain_muscle', emoji: '💪', title: 'Build Muscle', sub: 'Get stronger and bigger' },
  { id: 'maintain', emoji: '⚖️', title: 'Stay Healthy', sub: 'Maintain and feel great' },
  { id: 'gain_weight', emoji: '🍽️', title: 'Gain Weight', sub: 'Healthy bulk and mass' },
  { id: 'build_habits', emoji: '🧠', title: 'Build Habits', sub: 'Consistency and lifestyle' },
];

export const EXPERIENCE = [
  { id: 'beginner', emoji: '🌱', title: 'Just Starting', sub: 'Less than 6 months' },
  { id: 'intermediate', emoji: '🏃', title: 'Some Experience', sub: '6 months – 2 years' },
  { id: 'advanced', emoji: '🦅', title: 'Experienced', sub: '2+ years of training' },
];

export const DAYS = [2, 3, 4, 5, 6];

export const DURATIONS = [
  { v: 30, label: '30 min' },
  { v: 45, label: '45 min' },
  { v: 60, label: '1 hr' },
  { v: 75, label: '75 min' },
  { v: 90, label: '90 min' },
];

export const TIMES = [
  { id: 'morning', emoji: '🌅', label: 'Morning' },
  { id: 'afternoon', emoji: '☀️', label: 'Afternoon' },
  { id: 'evening', emoji: '🌙', label: 'Evening' },
  { id: 'any', emoji: '🔄', label: 'Any time' },
];

export const EQUIPMENT = [
  { id: 'full_gym', emoji: '🏢', title: 'Full Gym', sub: 'All machines & equipment' },
  { id: 'home_weights', emoji: '🏠', title: 'Home Gym', sub: 'Dumbbells & barbells' },
  { id: 'bodyweight', emoji: '🤸', title: 'No Equipment', sub: 'Just my body' },
  { id: 'bands', emoji: '🎽', title: 'Resistance Bands', sub: 'Bands & bodyweight' },
];

export const FOCUS = [
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'legs', label: 'Legs' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'arms', label: 'Arms' },
  { id: 'core', label: 'Core' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'cardio', label: 'Cardio' },
];

export const INJURIES = [
  { id: 'none', label: 'None ✓' },
  { id: 'knee', label: 'Knee' },
  { id: 'back', label: 'Lower Back' },
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'wrist', label: 'Wrist' },
  { id: 'hip', label: 'Hip' },
];

export const SLEEP = [
  { id: 'poor', label: '< 6 hrs', color: '#FF6B6B' },
  { id: 'ok', label: '6–7 hrs', color: '#F5A623' },
  { id: 'good', label: '7–8 hrs', color: '#2ECC71' },
  { id: 'great', label: '8+ hrs', color: '#2ECC71' },
];

export const STRESS = [
  { id: 'low', emoji: '😌', label: 'Relaxed' },
  { id: 'medium', emoji: '😐', label: 'Moderate' },
  { id: 'high', emoji: '😓', label: 'Stressed' },
];

export const DIET = [
  { id: 'anything', label: 'I eat everything' },
  { id: 'protein', label: 'High protein focus' },
  { id: 'veggie', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'lowcarb', label: 'Low carb / Keto' },
];

export const ACTIVITY = [
  { id: 'sedentary', label: 'Mostly sitting', mult: 1.2 },
  { id: 'light', label: 'Light movement', mult: 1.375 },
  { id: 'moderate', label: 'Active job/lifestyle', mult: 1.55 },
  { id: 'active', label: 'Very active', mult: 1.725 },
  { id: 'very_active', label: 'Extremely active', mult: 1.9 },
];
