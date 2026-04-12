/**
 * src/hooks/useWorkouts.js
 * Reads workout history and saves new sessions.
 * Tables: workout_sessions, workout_exercises, exercises
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { error as logError } from '../lib/logger';

export function useWorkouts(userId) {
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);  // recent history
    const [exercises, setExercises] = useState([]); // exercise library from DB

    const load = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            // Recent workout sessions (last 10)
            const { data: sess } = await supabase
                .from('workout_sessions')
                .select('id, started_at, ended_at, calories_burned, notes, ai_feedback')
                .eq('user_id', userId)
                .order('started_at', { ascending: false })
                .limit(10);

            setSessions(sess ?? []);

            // Exercise library
            const { data: exLib } = await supabase
                .from('exercises')
                .select('id, name, category, muscle_group, difficulty')
                .order('name');

            setExercises(exLib ?? []);
        } catch (e) {
            logError('useWorkouts load error:', e);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { load(); }, [load]);

    // ── Start a new session ──────────────────────────────────────────────────────
    const startSession = useCallback(async () => {
        if (!userId) return null;
        const { data } = await supabase
            .from('workout_sessions')
            .insert({ user_id: userId, started_at: new Date().toISOString() })
            .select()
            .single();
        return data?.id ?? null;
    }, [userId]);

    // ── Finish a session ─────────────────────────────────────────────────────────
    const finishSession = useCallback(async (sessionId, { caloriesBurned, notes }) => {
        if (!sessionId) return;
        await supabase
            .from('workout_sessions')
            .update({
                ended_at: new Date().toISOString(),
                calories_burned: caloriesBurned ?? 0,
                notes: notes ?? '',
            })
            .eq('id', sessionId);
        await load();
    }, [load]);

    // ── Log a single exercise set ────────────────────────────────────────────────
    const logExercise = useCallback(async (sessionId, {
        exerciseId, sets, reps, weightKg, durationSecs, postureScore,
    }) => {
        await supabase.from('workout_exercises').insert({
            session_id: sessionId,
            exercise_id: exerciseId,
            sets: sets ?? null,
            reps: reps ?? null,
            weight_kg: weightKg ?? null,
            duration_secs: durationSecs ?? null,
            posture_score: postureScore ?? null,
        });
    }, []);

    // ── Format history for Training screen display ───────────────────────────────
    const history = (sessions || []).map(s => {
        const start = s.started_at ? new Date(s.started_at) : null;
        const end = s.ended_at ? new Date(s.ended_at) : null;
        const durationM = start && end
            ? Math.round((end - start) / 60000)
            : 0;
        const completed = !!s.ended_at;
        const dateLabel = start
            ? start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            : 'Unknown';

        return {
            id: s.id,
            name: s.notes || 'Workout',
            date: dateLabel,
            completed,
            duration: durationM,
            calories: Math.round(s.calories_burned ?? 0),
        };
    });

    return {
        loading,
        history,
        exercises,
        startSession,
        finishSession,
        logExercise,
        refresh: load,
    };
}