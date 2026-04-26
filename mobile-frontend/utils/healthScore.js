// src/utils/healthScore.js
// Calculates a 0-100 health score from OpenFoodFacts nutriments object

export function calcHealthScore(nutriments = {}) {
  function clamp(v) {
    return Math.max(0, parseFloat(v) || 0);
  }
  let s = 50;
  s -= clamp(nutriments["fat_100g"]) > 20 ? 15 : clamp(nutriments["fat_100g"]) > 10 ? 7 : 0;
  s -=
    clamp(nutriments["saturated-fat_100g"]) > 10
      ? 10
      : clamp(nutriments["saturated-fat_100g"]) > 5
        ? 5
        : 0;
  s -= clamp(nutriments["sugars_100g"]) > 20 ? 15 : clamp(nutriments["sugars_100g"]) > 10 ? 7 : 0;
  s += clamp(nutriments["fiber_100g"]) > 6 ? 15 : clamp(nutriments["fiber_100g"]) > 3 ? 8 : 0;
  s +=
    clamp(nutriments["proteins_100g"]) > 20 ? 15 : clamp(nutriments["proteins_100g"]) > 10 ? 8 : 0;
  return Math.max(0, Math.min(100, Math.round(s)));
}

// Score from raw macro values (for AI photo results)
export function calcHealthScoreFromMacros({
  protein = 0,
  carbs = 0,
  fat = 0,
  fiber = 0,
  calories = 0,
}) {
  let s = 50;
  s -= fat > 20 ? 15 : fat > 10 ? 7 : 0;
  s -= carbs > 60 ? 10 : 0;
  s += fiber > 6 ? 15 : fiber > 3 ? 8 : 0;
  s += protein > 20 ? 15 : protein > 10 ? 8 : 0;
  s -= calories > 600 ? 10 : 0;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function healthScoreLabel(score) {
  if (score >= 75) return { label: "Excellent", color: "#2ECC71" };
  if (score >= 55) return { label: "Good", color: "#C8F135" };
  if (score >= 35) return { label: "Moderate", color: "#F5A623" };
  return { label: "Poor", color: "#FF6B6B" };
}
