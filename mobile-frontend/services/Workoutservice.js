import { supabase } from '../lib/supabase';
import { log, warn, error as logError } from '../lib/logger';

/**
 * Saves a completed workout session to Supabase.
 * Called from WorkoutActive after SESSION_COMPLETE message.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.exerciseKey   - e.g. 'squat', 'pushup'
 * @param {string} params.exerciseName  - display name
 * @param {number} params.reps
 * @param {number} params.postureScore  - 0–100
 * @param {number} params.caloriesBurned
 * @param {number} [params.elapsed]     - seconds
 * @returns {string|null} sessionId
 */
export async function saveWorkoutSession({
  userId,
  exerciseKey,
  exerciseName,
  reps,
  postureScore,
  caloriesBurned,
  elapsed = 0,
}) {
  try {
    const now      = new Date().toISOString();
    const startedAt = elapsed
      ? new Date(Date.now() - elapsed * 1000).toISOString()
      : now;

    // ── 1. Insert workout_session row ──────────────────────────
    const { data: session, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({
        user_id:         userId,
        started_at:      startedAt,
        ended_at:        now,
        calories_burned: Math.max(1, caloriesBurned),
        notes:           `${exerciseName} — ${reps} reps · ${Math.round(postureScore)}% form`,
      })
      .select('id')
      .single();

    if (sessionError) {
      logError('[workoutService] session insert error:', sessionError.message);
      return null;
    }

    const sessionId = session.id;

    // ── 2. Look up or create exercise row ─────────────────────
    let exerciseId = null;
    try {
      // Try to find by name (case-insensitive)
      const { data: existing } = await supabase
        .from('exercises')
        .select('id')
        .ilike('name', exerciseName.trim())
        .maybeSingle();

      if (existing?.id) {
        exerciseId = existing.id;
      } else {
        // Create a new exercise entry
        const { data: created, error: createError } = await supabase
          .from('exercises')
          .insert({
            name:         exerciseName.trim(),
            category:     'ai_tracked',
            muscle_group: exerciseKey,
            difficulty:   'intermediate',
          })
          .select('id')
          .single();

        if (!createError) exerciseId = created.id;
      }
    } catch (e) {
      warn('[workoutService] exercise lookup error:', e.message);
    }

    // ── 3. Insert workout_exercises row ───────────────────────
    if (exerciseId) {
      const { error: exError } = await supabase
        .from('workout_exercises')
        .insert({
          session_id:    sessionId,
          exercise_id:   exerciseId,
          sets:          1,
          reps:          reps,
          weight_kg:     0,
          duration_secs: elapsed || null,
          posture_score: postureScore,
        });

      if (exError) {
        warn('[workoutService] workout_exercises insert error:', exError.message);
      }
    }

    log('[workoutService] Session saved:', sessionId);
    return sessionId;

  } catch (err) {
    logError('[workoutService] Unexpected error:', err.message);
    return null;
  }
}

/**
 * Fetches workout history for a user.
 * Returns sessions with their exercises joined.
 *
 * @param {string} userId
 * @param {number} [limit=50]
 * @returns {Array}
 */
export async function fetchWorkoutHistory(userId, limit = 50) {
  try {
    const { data: sessions, error } = await supabase
      .from('workout_sessions')
      .select(`
        id,
        started_at,
        ended_at,
        calories_burned,
        notes,
        created_at,
        workout_exercises (
          id,
          sets,
          reps,
          weight_kg,
          duration_secs,
          posture_score,
          exercises (
            id,
            name,
            category,
            muscle_group
          )
        )
      `)
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return sessions || [];
  } catch (err) {
    logError('[workoutService] fetchWorkoutHistory error:', err.message);
    return [];
  }
}