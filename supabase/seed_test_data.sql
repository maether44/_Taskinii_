-- =============================================================================
-- Seed script: test data for report feature
-- User: israa.daassi@medtech.tn (0309451c-8f0e-4dad-ad51-637029a577b9)
--
-- Creates:
--   - 7-day login streak (profiles update)
--   - 13 days of daily_activity (Apr 6-18) — 10k steps on 4 days
--   - Protein-based low-carb food logs with veggies
--   - 2 light workout sessions per week (4 total)
--   - Weekly milestone unlock
-- =============================================================================

DO $$
DECLARE
  v_uid     uuid := '0309451c-8f0e-4dad-ad51-637029a577b9';
  v_ws1     uuid := gen_random_uuid();  -- workout session Apr 8
  v_ws2     uuid := gen_random_uuid();  -- workout session Apr 11
  v_ws3     uuid := gen_random_uuid();  -- workout session Apr 15
  v_ws4     uuid := gen_random_uuid();  -- workout session Apr 17

  -- Food IDs
  v_chicken  uuid := '2702deb6-a231-465d-872c-80720122fdcb';
  v_salmon   uuid := '0af12fdd-f2d5-4b3f-b5a3-92cb8114284f';
  v_eggs     uuid := 'dd354e62-1796-492a-87b0-280ccdfebcf2';
  v_eggwhite uuid := 'b516fe2f-a579-4e15-b6a0-d26e2b842615';
  v_yogurt   uuid := '4fdc083c-9c36-45eb-bd1a-27f2a4e5e167';
  v_whey     uuid := 'e5be2e7b-df5f-4d20-a23c-ab26a02a5b0d';
  v_broccoli uuid := 'e40d37d2-1742-4d1c-8bc8-5b120d17b598';
  v_spinach  uuid := '1a3d6339-706d-45d1-ad92-796c8354ac70';
  v_avocado  uuid := 'd17ba1bc-de67-4123-9c06-eb7e4c37c66b';
  v_zucchini uuid := '00b34078-ad10-4b89-978c-d6c63ed72f1f';
  v_tomato   uuid := '0e47d967-62ef-40c4-b6eb-588c8c345005';
  v_pepper   uuid := '6ce36d59-51ee-4dca-b8f5-da0ea7064855';
  v_cucumber uuid := '24e8a940-84d6-4369-885c-03835d3819cb';
  v_tuna     uuid := '3317bb4b-db10-417c-91bf-719faa7b0b07';
  v_cottage  uuid := '67e7aa1e-e0d3-4d80-aa0d-ba2636f045fe';

  -- Exercise IDs
  v_pushup   uuid := '7edfc94c-5559-4565-ad53-5dd726593f0d';
  v_dips     uuid := '4971c212-4dd9-4235-93d3-ae11f8393262';
  v_dbpress  uuid := 'dd18501f-9529-47ed-993c-9b244f7367b7';
  v_lateral  uuid := 'a234cd09-6808-44b4-bd87-c42a102abeb9';
BEGIN
  -- ═══════════════════════════════════════════════════════════════════
  -- 1. Update streak to 7 days
  -- ═══════════════════════════════════════════════════════════════════
  UPDATE profiles
  SET login_streak    = 7,
      longest_streak  = GREATEST(longest_streak, 7),
      last_login_date = '2026-04-18'
  WHERE id = v_uid;

  -- ═══════════════════════════════════════════════════════════════════
  -- 2. Daily activity: April 6 – 18 (13 days)
  --    10k+ steps on Apr 7(Tue), 9(Thu), 11(Sat), 14(Tue)
  --    Light days: 3000-6000 steps
  -- ═══════════════════════════════════════════════════════════════════
  INSERT INTO daily_activity (user_id, date, steps, water_ml, sleep_hours, calories_burned)
  VALUES
    (v_uid, '2026-04-06', 4200,  2200, 7.0,  180),   -- Mon
    (v_uid, '2026-04-07', 10800, 2800, 7.5,  320),   -- Tue  — 10k
    (v_uid, '2026-04-08', 5100,  2400, 6.5,  350),   -- Wed  — workout day
    (v_uid, '2026-04-09', 11200, 3000, 8.0,  290),   -- Thu  — 10k
    (v_uid, '2026-04-10', 3800,  2100, 7.0,  160),   -- Fri
    (v_uid, '2026-04-11', 10500, 2600, 7.5,  380),   -- Sat  — 10k + workout
    (v_uid, '2026-04-12', 4500,  2300, 8.0,  170),   -- Sun
    (v_uid, '2026-04-13', 3600,  2000, 7.0,  150),   -- Mon
    (v_uid, '2026-04-14', 10300, 2900, 7.5,  310),   -- Tue  — 10k
    (v_uid, '2026-04-15', 5400,  2500, 6.5,  360),   -- Wed  — workout day
    (v_uid, '2026-04-16', 4100,  2200, 7.0,  175),   -- Thu
    (v_uid, '2026-04-17', 5800,  2700, 7.5,  340),   -- Fri  — workout day
    (v_uid, '2026-04-18', 3200,  2100, 7.0,  140)    -- Sat (today)
  ON CONFLICT (user_id, date) DO UPDATE SET
    steps          = EXCLUDED.steps,
    water_ml       = EXCLUDED.water_ml,
    sleep_hours    = EXCLUDED.sleep_hours,
    calories_burned = EXCLUDED.calories_burned;

  -- ═══════════════════════════════════════════════════════════════════
  -- 3. Food logs: protein-heavy, low-carb, veggie-rich
  --    Typical day: ~1600-1800 kcal, 120-150g protein, <100g carbs
  -- ═══════════════════════════════════════════════════════════════════

  -- Apr 6 (Mon)
  INSERT INTO food_logs (user_id, food_id, meal_type, quantity_grams, consumed_at) VALUES
    (v_uid, v_eggs,     'breakfast', 200, '2026-04-06T07:30:00Z'),  -- 2 eggs
    (v_uid, v_spinach,  'breakfast', 80,  '2026-04-06T07:30:00Z'),
    (v_uid, v_chicken,  'lunch',     200, '2026-04-06T12:30:00Z'),
    (v_uid, v_broccoli, 'lunch',     150, '2026-04-06T12:30:00Z'),
    (v_uid, v_avocado,  'lunch',     80,  '2026-04-06T12:30:00Z'),
    (v_uid, v_salmon,   'dinner',    180, '2026-04-06T19:00:00Z'),
    (v_uid, v_zucchini, 'dinner',    120, '2026-04-06T19:00:00Z'),
    (v_uid, v_yogurt,   'snack',     200, '2026-04-06T16:00:00Z');

  -- Apr 7 (Tue)
  INSERT INTO food_logs (user_id, food_id, meal_type, quantity_grams, consumed_at) VALUES
    (v_uid, v_eggwhite, 'breakfast', 200, '2026-04-07T07:00:00Z'),
    (v_uid, v_avocado,  'breakfast', 70,  '2026-04-07T07:00:00Z'),
    (v_uid, v_tuna,     'lunch',     200, '2026-04-07T12:00:00Z'),
    (v_uid, v_cucumber, 'lunch',     100, '2026-04-07T12:00:00Z'),
    (v_uid, v_tomato,   'lunch',     80,  '2026-04-07T12:00:00Z'),
    (v_uid, v_chicken,  'dinner',    220, '2026-04-07T19:30:00Z'),
    (v_uid, v_pepper,   'dinner',    100, '2026-04-07T19:30:00Z'),
    (v_uid, v_whey,     'snack',     30,  '2026-04-07T15:30:00Z');

  -- Apr 8 (Wed — workout day)
  INSERT INTO food_logs (user_id, food_id, meal_type, quantity_grams, consumed_at) VALUES
    (v_uid, v_eggs,     'breakfast', 250, '2026-04-08T06:30:00Z'),
    (v_uid, v_spinach,  'breakfast', 60,  '2026-04-08T06:30:00Z'),
    (v_uid, v_chicken,  'lunch',     250, '2026-04-08T12:00:00Z'),
    (v_uid, v_broccoli, 'lunch',     180, '2026-04-08T12:00:00Z'),
    (v_uid, v_salmon,   'dinner',    200, '2026-04-08T19:00:00Z'),
    (v_uid, v_zucchini, 'dinner',    150, '2026-04-08T19:00:00Z'),
    (v_uid, v_cottage,  'snack',     150, '2026-04-08T16:00:00Z'),
    (v_uid, v_whey,     'snack',     35,  '2026-04-08T10:00:00Z');

  -- Apr 9 (Thu)
  INSERT INTO food_logs (user_id, food_id, meal_type, quantity_grams, consumed_at) VALUES
    (v_uid, v_eggwhite, 'breakfast', 180, '2026-04-09T07:30:00Z'),
    (v_uid, v_tomato,   'breakfast', 80,  '2026-04-09T07:30:00Z'),
    (v_uid, v_tuna,     'lunch',     180, '2026-04-09T12:30:00Z'),
    (v_uid, v_avocado,  'lunch',     80,  '2026-04-09T12:30:00Z'),
    (v_uid, v_spinach,  'lunch',     100, '2026-04-09T12:30:00Z'),
    (v_uid, v_chicken,  'dinner',    200, '2026-04-09T19:00:00Z'),
    (v_uid, v_pepper,   'dinner',    120, '2026-04-09T19:00:00Z'),
    (v_uid, v_yogurt,   'snack',     200, '2026-04-09T16:00:00Z');

  -- Apr 10 (Fri)
  INSERT INTO food_logs (user_id, food_id, meal_type, quantity_grams, consumed_at) VALUES
    (v_uid, v_eggs,     'breakfast', 200, '2026-04-10T08:00:00Z'),
    (v_uid, v_cucumber, 'breakfast', 80,  '2026-04-10T08:00:00Z'),
    (v_uid, v_salmon,   'lunch',     200, '2026-04-10T13:00:00Z'),
    (v_uid, v_broccoli, 'lunch',     150, '2026-04-10T13:00:00Z'),
    (v_uid, v_chicken,  'dinner',    180, '2026-04-10T19:30:00Z'),
    (v_uid, v_zucchini, 'dinner',    130, '2026-04-10T19:30:00Z'),
    (v_uid, v_whey,     'snack',     30,  '2026-04-10T16:00:00Z');

  -- Apr 11 (Sat — workout day)
  INSERT INTO food_logs (user_id, food_id, meal_type, quantity_grams, consumed_at) VALUES
    (v_uid, v_eggwhite, 'breakfast', 220, '2026-04-11T07:00:00Z'),
    (v_uid, v_avocado,  'breakfast', 80,  '2026-04-11T07:00:00Z'),
    (v_uid, v_chicken,  'lunch',     250, '2026-04-11T12:30:00Z'),
    (v_uid, v_tomato,   'lunch',     100, '2026-04-11T12:30:00Z'),
    (v_uid, v_spinach,  'lunch',     80,  '2026-04-11T12:30:00Z'),
    (v_uid, v_salmon,   'dinner',    200, '2026-04-11T19:00:00Z'),
    (v_uid, v_pepper,   'dinner',    100, '2026-04-11T19:00:00Z'),
    (v_uid, v_cottage,  'snack',     180, '2026-04-11T16:00:00Z'),
    (v_uid, v_whey,     'snack',     35,  '2026-04-11T10:00:00Z');

  -- Apr 12 (Sun)
  INSERT INTO food_logs (user_id, food_id, meal_type, quantity_grams, consumed_at) VALUES
    (v_uid, v_eggs,     'breakfast', 200, '2026-04-12T08:30:00Z'),
    (v_uid, v_spinach,  'breakfast', 70,  '2026-04-12T08:30:00Z'),
    (v_uid, v_tuna,     'lunch',     200, '2026-04-12T13:00:00Z'),
    (v_uid, v_cucumber, 'lunch',     100, '2026-04-12T13:00:00Z'),
    (v_uid, v_broccoli, 'lunch',     120, '2026-04-12T13:00:00Z'),
    (v_uid, v_chicken,  'dinner',    200, '2026-04-12T19:00:00Z'),
    (v_uid, v_zucchini, 'dinner',    130, '2026-04-12T19:00:00Z'),
    (v_uid, v_yogurt,   'snack',     200, '2026-04-12T16:00:00Z');

  -- Apr 13-18 (streak continuation — lighter logging)
  INSERT INTO food_logs (user_id, food_id, meal_type, quantity_grams, consumed_at) VALUES
    (v_uid, v_eggs,     'breakfast', 200, '2026-04-13T07:30:00Z'),
    (v_uid, v_chicken,  'lunch',     200, '2026-04-13T12:30:00Z'),
    (v_uid, v_broccoli, 'lunch',     150, '2026-04-13T12:30:00Z'),
    (v_uid, v_salmon,   'dinner',    180, '2026-04-13T19:00:00Z'),

    (v_uid, v_eggwhite, 'breakfast', 200, '2026-04-14T07:00:00Z'),
    (v_uid, v_tuna,     'lunch',     200, '2026-04-14T12:00:00Z'),
    (v_uid, v_avocado,  'lunch',     80,  '2026-04-14T12:00:00Z'),
    (v_uid, v_chicken,  'dinner',    220, '2026-04-14T19:00:00Z'),
    (v_uid, v_pepper,   'dinner',    100, '2026-04-14T19:00:00Z'),

    (v_uid, v_eggs,     'breakfast', 250, '2026-04-15T06:30:00Z'),
    (v_uid, v_spinach,  'breakfast', 80,  '2026-04-15T06:30:00Z'),
    (v_uid, v_chicken,  'lunch',     250, '2026-04-15T12:00:00Z'),
    (v_uid, v_broccoli, 'lunch',     180, '2026-04-15T12:00:00Z'),
    (v_uid, v_salmon,   'dinner',    200, '2026-04-15T19:00:00Z'),
    (v_uid, v_whey,     'snack',     35,  '2026-04-15T10:00:00Z'),

    (v_uid, v_eggwhite, 'breakfast', 200, '2026-04-16T07:30:00Z'),
    (v_uid, v_tuna,     'lunch',     180, '2026-04-16T12:30:00Z'),
    (v_uid, v_cucumber, 'lunch',     100, '2026-04-16T12:30:00Z'),
    (v_uid, v_chicken,  'dinner',    200, '2026-04-16T19:00:00Z'),
    (v_uid, v_zucchini, 'dinner',    130, '2026-04-16T19:00:00Z'),

    (v_uid, v_eggs,     'breakfast', 200, '2026-04-17T07:00:00Z'),
    (v_uid, v_avocado,  'breakfast', 70,  '2026-04-17T07:00:00Z'),
    (v_uid, v_salmon,   'lunch',     200, '2026-04-17T12:30:00Z'),
    (v_uid, v_broccoli, 'lunch',     150, '2026-04-17T12:30:00Z'),
    (v_uid, v_chicken,  'dinner',    200, '2026-04-17T19:00:00Z'),
    (v_uid, v_tomato,   'dinner',    100, '2026-04-17T19:00:00Z'),
    (v_uid, v_whey,     'snack',     30,  '2026-04-17T16:00:00Z'),

    (v_uid, v_eggwhite, 'breakfast', 180, '2026-04-18T07:30:00Z'),
    (v_uid, v_chicken,  'lunch',     200, '2026-04-18T12:00:00Z'),
    (v_uid, v_spinach,  'lunch',     100, '2026-04-18T12:00:00Z'),
    (v_uid, v_yogurt,   'snack',     200, '2026-04-18T15:00:00Z');

  -- ═══════════════════════════════════════════════════════════════════
  -- 4. Workout sessions (light, ~35 min each)
  --    Week 1: Apr 8 (Wed) + Apr 11 (Sat)
  --    Week 2: Apr 15 (Wed) + Apr 17 (Fri)
  -- ═══════════════════════════════════════════════════════════════════

  INSERT INTO workout_sessions (id, user_id, started_at, ended_at, calories_burned, notes)
  VALUES
    (v_ws1, v_uid, '2026-04-08T17:00:00Z', '2026-04-08T17:35:00Z', 180, 'Light upper body'),
    (v_ws2, v_uid, '2026-04-11T10:00:00Z', '2026-04-11T10:40:00Z', 210, 'Light push + core'),
    (v_ws3, v_uid, '2026-04-15T17:00:00Z', '2026-04-15T17:30:00Z', 170, 'Light upper body'),
    (v_ws4, v_uid, '2026-04-17T17:30:00Z', '2026-04-17T18:05:00Z', 195, 'Light push day');

  -- Exercises for each session
  INSERT INTO workout_exercises (session_id, exercise_id, sets, reps, weight_kg, duration_secs)
  VALUES
    -- Session 1 (Apr 8)
    (v_ws1, v_pushup,  3, 12, NULL, 180),
    (v_ws1, v_dbpress, 3, 10, 12,   200),
    (v_ws1, v_lateral, 3, 12, 6,    180),
    (v_ws1, v_dips,    3, 10, NULL, 160),
    -- Session 2 (Apr 11)
    (v_ws2, v_pushup,  3, 15, NULL, 200),
    (v_ws2, v_dbpress, 3, 12, 14,   220),
    (v_ws2, v_lateral, 3, 12, 7,    180),
    (v_ws2, v_dips,    3, 12, NULL, 180),
    -- Session 3 (Apr 15)
    (v_ws3, v_pushup,  3, 12, NULL, 170),
    (v_ws3, v_lateral, 3, 10, 6,    160),
    (v_ws3, v_dips,    3, 10, NULL, 150),
    -- Session 4 (Apr 17)
    (v_ws4, v_pushup,  3, 15, NULL, 190),
    (v_ws4, v_dbpress, 3, 10, 14,   200),
    (v_ws4, v_lateral, 3, 12, 7,    180),
    (v_ws4, v_dips,    3, 12, NULL, 170);

  -- ═══════════════════════════════════════════════════════════════════
  -- 5. Unlock weekly milestone
  -- ═══════════════════════════════════════════════════════════════════
  INSERT INTO milestone_unlocks (user_id, milestone_type, streak_required, unlocked_at, claimed_at)
  VALUES (v_uid, 'weekly', 7, now(), now())
  ON CONFLICT (user_id, milestone_type) DO UPDATE SET
    unlocked_at = now(),
    claimed_at  = now(),
    skipped     = false;

  RAISE NOTICE 'Test data seeded successfully for user %', v_uid;
END;
$$;
