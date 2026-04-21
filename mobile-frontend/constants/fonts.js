// src/utils/macroCalc.js
// Macro and calorie calculation utilities matching the DB schema

export function calcBMR({ weight_kg, height_cm, age, gender }) {
  if (!weight_kg || !height_cm || !age) return 0;
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return Math.round(gender === "female" ? base - 161 : base + 5);
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calcTDEE(bmr, activityLevel = "moderate") {
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.55));
}

export function calcCalorieTarget(tdee, goal) {
  switch (goal) {
    case "lose_fat":
      return Math.round(tdee - 400);
    case "gain_muscle":
      return Math.round(tdee + 200);
    case "gain_weight":
      return Math.round(tdee + 400);
    default:
      return tdee;
  }
}

export function calcMacroTargets(calorieTarget, goal) {
  // Protein: 2g/kg implied — use percentage splits by goal
  let proteinPct, carbsPct, fatPct;
  switch (goal) {
    case "lose_fat":
      proteinPct = 0.35;
      carbsPct = 0.35;
      fatPct = 0.3;
      break;
    case "gain_muscle":
    case "gain_weight":
      proteinPct = 0.3;
      carbsPct = 0.45;
      fatPct = 0.25;
      break;
    default:
      proteinPct = 0.25;
      carbsPct = 0.45;
      fatPct = 0.3;
  }
  return {
    protein_target: Math.round((calorieTarget * proteinPct) / 4),
    carbs_target: Math.round((calorieTarget * carbsPct) / 4),
    fat_target: Math.round((calorieTarget * fatPct) / 9),
  };
}

// Scale nutrition values from per-100g to a given serving size
export function scaleNutrition(per100g, servingGrams) {
  const scale = servingGrams / 100;
  return {
    calories: Math.round((per100g.calories_per_100g || 0) * scale),
    protein: Math.round((per100g.protein_per_100g || 0) * scale * 10) / 10,
    carbs: Math.round((per100g.carbs_per_100g || 0) * scale * 10) / 10,
    fat: Math.round((per100g.fat_per_100g || 0) * scale * 10) / 10,
    fiber: Math.round((per100g.fiber_per_100g || 0) * scale * 10) / 10,
  };
}

export function sumFoodLogs(foodLogs = []) {
  return foodLogs.reduce(
    (acc, log) => {
      const food = log.foods;
      if (!food) return acc;
      const scale = (log.quantity_grams || 100) / 100;
      return {
        calories: acc.calories + Math.round((food.calories_per_100g || 0) * scale),
        protein: acc.protein + Math.round((food.protein_per_100g || 0) * scale * 10) / 10,
        carbs: acc.carbs + Math.round((food.carbs_per_100g || 0) * scale * 10) / 10,
        fat: acc.fat + Math.round((food.fat_per_100g || 0) * scale * 10) / 10,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
