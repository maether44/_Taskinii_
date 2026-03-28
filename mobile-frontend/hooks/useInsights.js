/**
 * mobile-frontend/hooks/useInsights.js
 *
 * Custom React hook that powers the Insights screen with real Supabase data.
 * Calls the `get_insights_data` RPC once per (user, period) combination, then
 * derives everything the screen needs (metrics, heatmap, trend chart, streaks).
 *
 * RETURNS
 *   isLoading   — true while the RPC is in-flight
 *   error       — set if the RPC or auth fails
 *   rawStats    — raw RPC response forwarded to yaraInsightsService
 *   userId      — current auth user ID
 *   metrics     — 4 summary cards: Streak, Workouts, Steps, Sleep
 *   trendData   — { Week, Month, '3 Months' } arrays of 0-100 scores
 *   heatmapData — { 'YYYY-MM-DD': 0|1|2|3 } intensity map
 *   streakData  — { currentStreak, longestStreak }
 *   refresh     — manually re-fetch
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';  // mobile-frontend uses lib/supabase (not config/)


// =============================================================================
// computeStreaks(activityDates)
// Walks backward through 'YYYY-MM-DD' active-day strings to find:
//   currentStreak — consecutive days ending today (or yesterday if today not logged yet)
//   longestStreak — longest consecutive run in the last 90 days
// =============================================================================
function computeStreaks(activityDates) {
  if (!activityDates?.length) return { currentStreak: 0, longestStreak: 0 };

  const dateSet = new Set(activityDates);

  // Current streak — walk backward from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let currentStreak = 0;
  const cursor = new Date(today);
  const todayStr = cursor.toISOString().split('T')[0];
  if (!dateSet.has(todayStr)) {
    // Today not logged yet — start from yesterday to avoid false resets
    cursor.setDate(cursor.getDate() - 1);
  }
  while (true) {
    const ds = cursor.toISOString().split('T')[0];
    if (dateSet.has(ds)) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Longest streak — scan sorted dates for consecutive pairs
  const sorted = Array.from(dateSet).sort();
  let longest = 0;
  let streak  = sorted.length ? 1 : 0;
  for (let i = 1; i < sorted.length; i++) {
    const diffDays = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000;
    if (diffDays === 1) {
      streak++;
    } else {
      longest = Math.max(longest, streak);
      streak  = 1;
    }
  }
  longest = Math.max(longest, streak);

  return { currentStreak, longestStreak: longest };
}


// =============================================================================
// buildHeatmapData(heatmapDays)
// Converts the 42-day RPC array into { 'YYYY-MM-DD': 0|1|2|3 }.
// Intensity: 3=workout, 2=8000+ steps, 1=some movement/calories, 0=nothing
// =============================================================================
function buildHeatmapData(heatmapDays) {
  const map = {};
  (heatmapDays ?? []).forEach(d => {
    const intensity = d.has_workout   ? 3
      : d.steps > 8000               ? 2
      : d.steps > 2000               ? 1
      : d.calories > 0               ? 1
      : 0;
    map[d.date] = intensity;
  });
  return map;
}


// =============================================================================
// scoreDay(d) — 0-100 health score for one day, used by buildTrendData
// Workout +40, steps≥8000 +35, steps≥4000 +18, food logged +25, capped at 100
// =============================================================================
function scoreDay(d) {
  let s = 0;
  if (d.has_workout)       s += 40;
  if (d.steps > 8000)      s += 35;
  else if (d.steps > 4000) s += 18;
  if (d.calories > 0)      s += 25;
  return Math.min(s, 100);
}


// =============================================================================
// buildTrendData(heatmapDays)
// Returns { Week: [7], Month: [12], '3 Months': [12] } score arrays for the chart.
// =============================================================================
function buildTrendData(heatmapDays) {
  const days = heatmapDays ?? [];

  // Week: last 7 days
  const weekBars = days.slice(-7).map(scoreDay);

  // Month: last 30 days bucketed into 12 bars
  const last30        = days.slice(-30);
  const bucketSize30  = Math.ceil(last30.length / 12) || 1;
  const monthBars     = [];
  for (let i = 0; i < 12; i++) {
    const chunk = last30.slice(i * bucketSize30, (i + 1) * bucketSize30);
    monthBars.push(chunk.length
      ? Math.round(chunk.reduce((s, d) => s + scoreDay(d), 0) / chunk.length)
      : 0);
  }

  // 3 Months: all 42 days bucketed into 12 bars
  const bucketSize3m  = Math.ceil(days.length / 12) || 1;
  const threeMonthBars = [];
  for (let i = 0; i < 12; i++) {
    const chunk = days.slice(i * bucketSize3m, (i + 1) * bucketSize3m);
    threeMonthBars.push(chunk.length
      ? Math.round(chunk.reduce((s, d) => s + scoreDay(d), 0) / chunk.length)
      : 0);
  }

  return {
    Week:       weekBars.length       ? weekBars       : [0, 0, 0, 0, 0, 0, 0],
    Month:      monthBars.length      ? monthBars      : new Array(12).fill(0),
    '3 Months': threeMonthBars.length ? threeMonthBars : new Array(12).fill(0),
  };
}


// =============================================================================
// buildMetrics(stats, streakData)
// Produces the 4-card summary grid (Streak, Workouts, Avg Steps, Avg Sleep).
// =============================================================================
function buildMetrics(stats, streakData) {
  const fmtK = v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v ?? 0));
  const { workout_count = 0, avg_steps = 0, avg_sleep = 0 } = stats;

  return [
    {
      label: 'Streak',
      value: `${streakData.currentStreak}d`,
      delta: streakData.currentStreak > 0 ? 'Active' : 'Start!',
      up:    streakData.currentStreak > 0,
    },
    {
      label: 'Workouts',
      value: String(workout_count),
      delta: workout_count > 0 ? `+${workout_count}` : '0',
      up:    workout_count > 0,
    },
    {
      label: 'Avg. Steps',
      value: fmtK(avg_steps),
      delta: avg_steps >= 8000 ? 'On target' : avg_steps > 0 ? 'Below' : '–',
      up:    avg_steps >= 8000,
    },
    {
      label: 'Avg. Sleep',
      value: avg_sleep > 0 ? `${avg_sleep}h` : '–',
      delta: avg_sleep >= 7 ? 'Good' : avg_sleep > 0 ? 'Low' : '–',
      up:    avg_sleep >= 7,
    },
  ];
}


// =============================================================================
// useInsights(period) — exported hook
// =============================================================================
export function useInsights(period) {
  const [userId,      setUserId]      = useState(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState(null);
  const [rawStats,    setRawStats]    = useState(null);
  const [metrics,     setMetrics]     = useState([]);
  const [trendData,   setTrendData]   = useState({ Week: [], Month: [], '3 Months': [] });
  const [heatmapData, setHeatmapData] = useState({});
  const [streakData,  setStreakData]  = useState({ currentStreak: 0, longestStreak: 0 });

  // Resolve the logged-in user once on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        console.log('[useInsights] userId resolved:', data.user.id);
        setUserId(data.user.id);
      } else {
        console.warn('[useInsights] No authenticated user found');
        setIsLoading(false);
      }
    });
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    console.log('[useInsights] Calling get_insights_data RPC — userId:', userId, 'period:', period);
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_insights_data', {
        p_user_id: userId,
        p_period:  period,
      });

      if (rpcErr) {
        console.error('[useInsights] RPC error:', rpcErr);
        throw rpcErr;
      }

      console.log('[useInsights] RPC returned:', JSON.stringify(data).slice(0, 200));

      const stats   = data ?? {};
      const streaks = computeStreaks(stats.activity_dates);

      console.log('[useInsights] Streaks:', streaks);
      console.log('[useInsights] heatmap_days count:', stats.heatmap_days?.length ?? 0);

      setRawStats(stats);
      setStreakData(streaks);
      setMetrics(buildMetrics(stats, streaks));
      setTrendData(buildTrendData(stats.heatmap_days));
      setHeatmapData(buildHeatmapData(stats.heatmap_days));
    } catch (e) {
      console.error('[useInsights] load error:', e);
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [userId, period]);

  useEffect(() => { load(); }, [load]);

  return {
    isLoading,
    error,
    rawStats,
    userId,
    metrics,
    trendData,
    heatmapData,
    streakData,
    refresh: load,
  };
}
