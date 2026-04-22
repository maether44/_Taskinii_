/**
 * src/hooks/useProfile.js
 * Reads the logged-in user's profile, calorie targets, and body metrics.
 * Tables: profiles, calorie_targets, body_metrics
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeGoal } from '../lib/calculations';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_TARGETS, computeWaterTarget } from '../constants/targets';
import { error as logError } from '../lib/logger';

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function calcBMR(p) {
  if (!p?.weight_kg || !p?.height_cm || !p?.date_of_birth) return 1800;
  const age = new Date().getFullYear() - new Date(p.date_of_birth).getFullYear();
  const base = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * age;
  return Math.round(p.gender === 'female' ? base - 161 : base + 5);
}

export function useProfile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [targets, setTargets] = useState(null);
  const { user: authUser } = useAuth();
  const userId = authUser?.id ?? null;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Profile
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single();
      const normalizedProfile = prof ? { ...prof, goal: normalizeGoal(prof.goal) } : null;
      setProfile(normalizedProfile);

      // 2. Latest calorie targets
      const { data: tgt } = await supabase
        .from('calorie_targets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tgt) {
        setTargets(tgt);
      } else if (normalizedProfile) {
        // Auto-create targets from profile data
        const bmr = calcBMR(normalizedProfile);
        const tdee = Math.round(
          bmr * (ACTIVITY_MULTIPLIERS[normalizedProfile.activity_level] ?? 1.55),
        );
        const adj =
          normalizedProfile.goal === 'lose_fat'
            ? -500
            : normalizedProfile.goal === 'gain_muscle'
              ? 300
              : normalizedProfile.goal === 'gain_weight'
                ? 400
                : 0;
        const cal = Math.max(1200, tdee + adj);
        const auto = {
          user_id: userId,
          daily_calories: cal,
          protein_target: Math.round((cal * 0.3) / 4),
          carbs_target: Math.round((cal * 0.45) / 4),
          fat_target: Math.round((cal * 0.25) / 9),
        };
        const { data: created } = await supabase
          .from('calorie_targets')
          .insert(auto)
          .select()
          .single();
        setTargets(created ?? auto);
      }
    } catch (e) {
      logError('useProfile load error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Derived values screens need — memoized to avoid recalculating on every render
  const { bmr, tdee, name, age } = useMemo(() => {
    const _bmr = calcBMR(profile);
    return {
      bmr: _bmr,
      tdee: Math.round(_bmr * (ACTIVITY_MULTIPLIERS[profile?.activity_level] ?? 1.55)),
      name: profile?.full_name?.split(' ')[0] ?? 'there',
      age: profile?.date_of_birth
        ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
        : null,
    };
  }, [profile]);

  return {
    loading,
    profile,
    targets,
    userId,
    // Helpers
    name,
    age,
    bmr,
    tdee,
    calorieTarget: targets?.daily_calories ?? DEFAULT_TARGETS.calorie_target,
    proteinTarget: targets?.protein_target ?? DEFAULT_TARGETS.protein_target,
    carbsTarget: targets?.carbs_target ?? DEFAULT_TARGETS.carbs_target,
    fatTarget: targets?.fat_target ?? DEFAULT_TARGETS.fat_target,
    waterTargetMl: targets?.water_target_ml ?? computeWaterTarget(profile?.weight_kg),
    stepsTarget: targets?.steps_target ?? DEFAULT_TARGETS.steps_target,
    refresh: load,
  };
}
