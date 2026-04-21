/**
 * Default nutrition & activity targets.
 *
 * Every file that needs a fallback target should import from here
 * instead of hardcoding 2000 / 150 / 250 / 65 / 2500 / 10000.
 *
 * These defaults are only used when the user has no calorie_targets row
 * (brand-new accounts before onboarding completes).
 */

export const DEFAULT_TARGETS = Object.freeze({
  calorie_target: 2000,
  protein_target: 150,
  carbs_target: 250,
  fat_target: 65,
  water_target_ml: 2500,
  steps_target: 10000,
});

/**
 * Compute a personalised water target from body weight.
 * Rule of thumb: 35 ml per kg of body weight, clamped to [1500, 5000].
 * Falls back to DEFAULT_TARGETS.water_target_ml if weight is unavailable.
 */
export function computeWaterTarget(weightKg) {
  if (!weightKg || weightKg <= 0) return DEFAULT_TARGETS.water_target_ml;
  return Math.round(Math.min(5000, Math.max(1500, weightKg * 35)));
}
