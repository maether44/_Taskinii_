import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getHomeSnapshot } from '../services/dashboardService';
import { getMuscleFatigue, RECOVERY_MAP } from '../services/workoutService';
import { getLocalAvatarForUser, resolveAvatarUrl } from '../lib/avatar';

export function useDashboard() {
  const [data,         setData]         = useState(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState(null);
  const [muscleFatigue,setMuscleFatigue]= useState([]);
  const [workoutCals,  setWorkoutCals]  = useState(0);
  const [sleepHours,   setSleepHours]   = useState(null);

  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setIsLoading(false);
        return;
      }

      const TODAY = new Date().toISOString().split('T')[0];

      const [result, fatigue, activityRow, profileRow] = await Promise.all([
        getHomeSnapshot(user.id),
        getMuscleFatigue(user.id),
        supabase
          .from('daily_activity')
          .select('calories_burned, sleep_hours, sleep_quality')
          .eq('user_id', user.id)
          .eq('date', TODAY)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('full_name, goal, avatar_url')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      const localAvatarUrl = await getLocalAvatarForUser(user.id).catch(() => null);
      const resolvedAvatarUrl = profileRow?.data?.avatar_url
        ? await resolveAvatarUrl(profileRow.data.avatar_url).catch(() => null)
        : null;

      if (!result) {
        setError('No data received');
      } else {
        setData({
          ...result,
          user: {
            ...(result.user || {}),
            id: user.id,
            name: profileRow?.data?.full_name || result.user?.name || 'User',
            goal: profileRow?.data?.goal || result.user?.goal || 'maintain',
            avatar_url: localAvatarUrl || resolvedAvatarUrl,
          },
        });
      }

      setMuscleFatigue(fatigue);

      const activity = activityRow.data;
      setWorkoutCals(activity?.calories_burned ?? 0);
      setSleepHours(activity?.sleep_hours ?? null);

    } catch (err) {
      console.error('Critical error in useDashboard:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    isLoading,
    error,
    user: data?.user || { name: 'User', goal: 'maintain', avatar_url: null },
    stats: {
      calories: {
        eaten:   data?.calories?.eaten || 0,
        target:  data?.calories?.target || 2000,
        burned:  workoutCals,
        // (Goal - Eaten) + Burned — workout calories add back to budget
        remaining: (data?.calories?.target || 2000) - (data?.calories?.eaten || 0) + workoutCals,
      },
      macros: data?.macros || {
        protein: { current: 0, target: 150 },
        carbs: { current: 0, target: 250 },
        fat: { current: 0, target: 65 }
      },
      water: { current: data?.activity?.water_ml || 0, target: 2500 },
      steps: data?.activity?.steps || 0,
      // sleepHours comes from direct daily_activity query (not RPC) so it's always fresh
      sleep: sleepHours ?? data?.activity?.sleep_hours ?? null,
    },
    workoutCalories: workoutCals,
    muscleFatigue,
    yaraInsight: (() => {
      const top = muscleFatigue.find(m => m.fatigue_pct >= 70);
      if (top) {
        const recovery = RECOVERY_MAP[top.muscle_name] ?? 'a different muscle group';
        return `I noticed your ${top.muscle_name} fatigue is high (${top.fatigue_pct}%). Tomorrow, we will focus on ${recovery} for recovery.`;
      }
      return data?.insight || "You're doing great! Stay consistent and the results will follow.";
    })(),
    logSleep: useCallback(async (hours) => {
      setSleepHours(hours);
      setData(prev => {
        if (!prev) return prev;
        return { ...prev, activity: { ...prev.activity, sleep_hours: hours } };
      });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const TODAY = new Date().toISOString().split('T')[0];
        await supabase.from('daily_activity')
          .upsert({ user_id: user.id, date: TODAY, sleep_hours: hours }, { onConflict: 'user_id,date' });
      } catch (e) {
        console.error('logSleep error:', e);
        loadAllData();
      }
    }, [loadAllData]),
    logWater: useCallback(async (mlDelta) => {
      // Optimistic update so the UI responds instantly
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          activity: {
            ...prev.activity,
            water_ml: Math.max(0, (prev.activity?.water_ml || 0) + mlDelta),
          },
        };
      });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const TODAY = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase
          .from('daily_activity').select('*')
          .eq('user_id', user.id).eq('date', TODAY).single();
        const newMl = Math.max(0, (existing?.water_ml || 0) + mlDelta);
        if (existing) {
          await supabase.from('daily_activity').update({ water_ml: newMl }).eq('id', existing.id);
        } else {
          await supabase.from('daily_activity').insert({ user_id: user.id, date: TODAY, water_ml: newMl });
        }
      } catch (e) {
        console.error('logWater error:', e);
        loadAllData(); // revert optimistic update on failure
      }
    }, [loadAllData]),
    refresh: loadAllData
  };
}
