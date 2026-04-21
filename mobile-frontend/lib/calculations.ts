import { ACTIVITY } from "../constants/onBoardingData";

export function normalizeGoal(goal) {
  switch (goal) {
    case "fat_loss":
      return "lose_fat";
    case "muscle":
    case "muscle_gain":
      return "gain_muscle";
    default:
      return goal;
  }
}

// Parse DD/MM/YYYY → age in years
export function dobToAge(dob) {
  if (!dob || dob.length !== 10) return null;
  const [dd, mm, yyyy] = dob.split("/").map(Number);
  if (!dd || !mm || !yyyy) return null;

  const birth = new Date(yyyy, mm - 1, dd);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasBirthdayPassed) age--;
  return age;
}

// Convert DD/MM/YYYY → YYYY-MM-DD for Supabase DATE column
export function dobToISO(dob) {
  if (!dob || dob.length !== 10) return null;
  const [dd, mm, yyyy] = dob.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

export function calcBMR({ gender, weight, height, dob }) {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  const a = dobToAge(dob);
  if (!w || !h || !a) return 0;
  return Math.round(
    gender === "female" ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5,
  );
}

export function calcTDEE(bmr, activityId) {
  const mult = ACTIVITY.find((x) => x.id === activityId)?.mult || 1.55;
  return bmr ? Math.round(bmr * mult) : 0;
}

export function calcCalTarget(tdee, goal) {
  if (!tdee) return 0;
  const normalizedGoal = normalizeGoal(goal);
  if (normalizedGoal === "lose_fat") return tdee - 400;
  if (normalizedGoal === "gain_muscle") return tdee + 200;
  if (normalizedGoal === "gain_weight") return tdee + 400;
  return tdee;
}

export function calcMacroTargets(calorieTarget, goal) {
  const normalizedGoal = normalizeGoal(goal);

  let proteinPct = 0.25;
  let carbsPct = 0.45;
  let fatPct = 0.3;

  if (normalizedGoal === "lose_fat") {
    proteinPct = 0.35;
    carbsPct = 0.35;
    fatPct = 0.3;
  } else if (normalizedGoal === "gain_muscle" || normalizedGoal === "gain_weight") {
    proteinPct = 0.3;
    carbsPct = 0.45;
    fatPct = 0.25;
  }

  return {
    protein_target: Math.round((calorieTarget * proteinPct) / 4),
    carbs_target: Math.round((calorieTarget * carbsPct) / 4),
    fat_target: Math.round((calorieTarget * fatPct) / 9),
  };
}

export function calcProtein(weight) {
  const w = parseFloat(weight);
  return w ? Math.round(w * 2) : 0;
}

export function calcBMI(weight, height) {
  const w = parseFloat(weight),
    h = parseFloat(height);
  return w && h ? (w / (h / 100) ** 2).toFixed(1) : null;
}

export function bmiStatus(bmi) {
  if (!bmi) return "";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight ✅";
  if (bmi < 30) return "Overweight";
  return "Obese";
}
