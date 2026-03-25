import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getHomeSnapshot } from '../services/dashboardService';

export function useDashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log("Auth Error or No User:", authError);
        setIsLoading(false);
        return;
      }

      const result = await getHomeSnapshot(user.id);
      
      if (!result) {
        console.log("RPC returned no data. Check Supabase SQL logs.");
        setError("No data received");
      } else {
        console.log("Dashboard Data Loaded successfully:", result);
        setData(result);
      }
    } catch (err) {
      console.error("Critical error in useDashboard:", err);
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
    user: data?.user || { name: 'User', goal: 'maintain' },
    stats: {
      calories: {
        eaten: data?.calories?.eaten || 0,
        target: data?.calories?.target || 2000,
        remaining: (data?.calories?.target || 2000) - (data?.calories?.eaten || 0)
      },
      macros: data?.macros || {
        protein: { current: 0, target: 150 },
        carbs: { current: 0, target: 250 },
        fat: { current: 0, target: 65 }
      },
      water: { current: data?.activity?.water_ml || 0, target: 2500 },
      steps: data?.activity?.steps || 0,
      sleep: data?.activity?.sleep_hours ?? null,
    },
    insight: data?.insight || "Keep it up!",
    logSleep: useCallback(async (hours) => {
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