ALTER TABLE calorie_targets
  ADD COLUMN IF NOT EXISTS carbs_target INT,
  ADD COLUMN IF NOT EXISTS fat_target INT;

UPDATE profiles
SET goal = CASE
  WHEN goal = 'fat_loss' THEN 'lose_fat'
  WHEN goal IN ('muscle', 'muscle_gain') THEN 'gain_muscle'
  ELSE goal
END
WHERE goal IN ('fat_loss', 'muscle', 'muscle_gain');

UPDATE calorie_targets
SET carbs_target = COALESCE(carbs_target, ROUND((daily_calories * 0.45) / 4.0)),
    fat_target = COALESCE(fat_target, ROUND((daily_calories * 0.30) / 9.0))
WHERE carbs_target IS NULL
   OR fat_target IS NULL;
