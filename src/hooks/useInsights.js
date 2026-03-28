/** src/hooks/useInsights.js — all the data logic: RPC call, streak calculation, 
 * &heatmap building, trend chart data, metric cards
 *
 * PURPOSE
 *   Custom React hook that powers the Insights screen with real data.
 *   It calls the Supabase `get_insights_data` RPC once per (user, period)
 *   combination, then derives everything the screen needs entirely in JS —
 *
 * WHAT IT RETURNS
 *   {
 *     isLoading   : bool       — true while the RPC is in-flight
 *     error       : Error|null — set if the RPC or auth fails
 *     rawStats    : object     — the raw RPC response (passed to yaraInsightsService)
 *     userId      : string     — current auth user ID (needed for the service call)
 *     metrics     : array      — 4 summary cards: Streak, Workouts, Steps, Sleep
 *     trendData   : object     — { Week, Month, '3 Months' } arrays of 0-100 scores
 *     heatmapData : object     — { 'YYYY-MM-DD': 0|1|2|3 } intensity map
 *     streakData  : object     — { currentStreak, longestStreak } in days
 *     refresh     : function   — manually re-fetch (pull-to-refresh, etc.)
 *   }
 *
 * WHEN IT RE-FETCHES
 *   The `load` callback depends on `[userId, period]`.  Any time the user
 *   switches the period selector in the UI, the hook automatically fires a
 *   new RPC call and replaces all derived state.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';


// =============================================================================
// computeStreaks(activityDates)
//
// Walks backward through a sorted list of 'YYYY-MM-DD' active-day strings to
// find two numbers:
//   currentStreak — consecutive days ending today (or yesterday if today isn't
//                   logged yet, e.g. it's 8 AM and the user hasn't worked out).
//   longestStreak — the longest consecutive run anywhere in the last 90 days.
//
// Complexity: O(n) where n = number of active dates (max ~90).
// =============================================================================
function computeStreaks(activityDates) {
  // Guard: no activity at all → both streaks are 0.
  if (!activityDates?.length) return { currentStreak: 0, longestStreak: 0 };

  // Use a Set for O(1) date membership tests in the backward-walk loop.
  const dateSet = new Set(activityDates);

  // ── Current streak ────────────────────────────────────────────────────────
  // Start from today.  If today isn't in the set yet (the user hasn't logged
  // activity yet today), step back one day before beginning the count.
  // This prevents the streak from resetting at midnight on an otherwise
  // active day.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  const cursor = new Date(today);

  const todayStr = cursor.toISOString().split('T')[0];
  if (!dateSet.has(todayStr)) {
    // Today not yet logged — try from yesterday instead.
    cursor.setDate(cursor.getDate() - 1);
  }

  // Walk backward day by day until a gap is found.
  while (true) {
    const ds = cursor.toISOString().split('T')[0];
    if (dateSet.has(ds)) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break; // first missing day ends the streak
    }
  }

  // ── Longest streak ────────────────────────────────────────────────────────
  // Sort dates ascending, then scan for consecutive pairs.
  // The difference between two adjacent ISO date strings converted to Date
  // objects is exactly 86 400 000 ms if they are one day apart.
  const sorted = Array.from(dateSet).sort(); // lexicographic sort works for ISO dates
  let longest = 0;
  let streak = sorted.length ? 1 : 0; // a single active day = streak of 1

  for (let i = 1; i < sorted.length; i++) {
    const diffDays = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000;
    if (diffDays === 1) {
      // Consecutive days — extend the current run.
      streak++;
    } else {
      // Gap found — save the run length and reset.
      longest = Math.max(longest, streak);
      streak = 1;
    }
  }
  // Don't forget the final run (loop ends without a gap after the last element).
  longest = Math.max(longest, streak);

  return { currentStreak, longestStreak: longest };
}


// =============================================================================
// buildHeatmapData(heatmapDays)
//
// Converts the raw 42-day array returned by the RPC into a plain object keyed
// by 'YYYY-MM-DD' string so the screen can do a simple lookup for each cell:
//
//   intensity = heatmapData['2026-03-15'] ?? 0
//
// Intensity levels (0–3) map to four colours in the UI:
//   0 → '#2D2252' (darkest / no activity)
//   1 → '#3D2F7A' (light activity — some steps or calories logged)
//   2 → '#A38DF2' (moderate activity — high step count)
//   3 → '#6F4BF2' (most active — completed a workout)
// =============================================================================
function buildHeatmapData(heatmapDays) {
  const map = {};
  (heatmapDays ?? []).forEach(d => {
    // Workout days get the highest intensity regardless of steps.
    // Step thresholds: 8 000 is a common daily goal; 2 000 indicates at least
    // some movement.  Any food logged also bumps a zero-step day to level 1.
    const intensity = d.has_workout  ? 3
      : d.steps  > 8000             ? 2
      : d.steps  > 2000             ? 1
      : d.calories > 0              ? 1
      : 0;
    map[d.date] = intensity;
  });
  return map;
}


// =============================================================================
// scoreDay(d) — helper used by buildTrendData
//
// Converts one day's raw activity into a 0–100 "health score" for the bar chart.
// The weights are intentionally simple:
//   Workout completed   → +40 pts  (biggest impact — structured exercise)
//   Steps ≥ 8 000/day   → +35 pts  (hitting the recommended step goal)
//   Steps ≥ 4 000/day   → +18 pts  (partial credit for moderate movement)
//   Food logged         → +25 pts  (nutritional tracking is part of a healthy day)
//
// Capped at 100 so the bar chart always fits its 0–100 scale.
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
//
// The bar chart renders a different number of bars per period:
//   Week      →  7 bars (one per day)
//   Month     → 12 bars (~2-3 days averaged per bar)
//   3 Months  → 12 bars (~3-4 days averaged per bar)
//
// All three are computed from the same 42-day heatmap array so the hook only
// needs one RPC call.  When the user switches periods, the screen reads a
// different key from the returned object — no re-fetch needed for the chart.
//
// Bucketing: for Month and 3 Months we split the days array into 12 equal
// chunks and average the scoreDay() values in each chunk.  This smooths out
// daily variance and gives a readable trend line.
// =============================================================================
function buildTrendData(heatmapDays) {
  const days = heatmapDays ?? [];

  // Week: last 7 days, one bar each — most granular view.
  const weekBars = days.slice(-7).map(scoreDay);

  // Month: last 30 days split into 12 buckets of ~2-3 days.
  const last30 = days.slice(-30);
  const monthBars = [];
  const bucketSize30 = Math.ceil(last30.length / 12);
  for (let i = 0; i < 12; i++) {
    const chunk = last30.slice(i * bucketSize30, (i + 1) * bucketSize30);
    monthBars.push(
      chunk.length
        ? Math.round(chunk.reduce((s, d) => s + scoreDay(d), 0) / chunk.length)
        : 0,
    );
  }

  // 3 Months: all 42 available days split into 12 buckets of ~3-4 days.
  // We only have 42 days of heatmap data (not 90), so the bars compress
  // further, showing the broad trend rather than exact weeks.
  const threeMonthBars = [];
  const bucketSize3m = Math.ceil(days.length / 12);
  for (let i = 0; i < 12; i++) {
    const chunk = days.slice(i * bucketSize3m, (i + 1) * bucketSize3m);
    threeMonthBars.push(
      chunk.length
        ? Math.round(chunk.reduce((s, d) => s + scoreDay(d), 0) / chunk.length)
        : 0,
    );
  }

  // Fallback to zero-filled arrays if the slice returned nothing (no data yet).
  return {
    Week:       weekBars.length       ? weekBars       : [0, 0, 0, 0, 0, 0, 0],
    Month:      monthBars.length      ? monthBars      : new Array(12).fill(0),
    '3 Months': threeMonthBars.length ? threeMonthBars : new Array(12).fill(0),
  };
}


// =============================================================================
// buildMetrics(stats, streakData)
//
// Produces the 4-card summary grid shown below the trend chart.
// Each card has: value (large number), label, delta badge, and direction.
//
// Cards:
//   1. Streak     — current consecutive active days from computeStreaks()
//   2. Workouts   — count of completed sessions in the selected period
//   3. Avg. Steps — average daily step count; green if ≥ 8 000 (common goal)
//   4. Avg. Sleep — average sleep hours; green if ≥ 7 (recommended minimum)
//
// fmtK() shortens large numbers: 8500 → '8.5k', 600 → '600'.
// =============================================================================
function buildMetrics(stats, streakData) {
  const fmtK = v =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v ?? 0));

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
      // Show "+N" if there are workouts, "0" if none — never show a negative delta.
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
      // Show "–" if no sleep data exists rather than displaying "0h".
      value: avg_sleep > 0 ? `${avg_sleep}h` : '–',
      delta: avg_sleep >= 7 ? 'Good' : avg_sleep > 0 ? 'Low' : '–',
      up:    avg_sleep >= 7,
    },
  ];
}


// =============================================================================
// useInsights(period) — the exported hook
// =============================================================================
export function useInsights(period) {
  // userId is resolved asynchronously from the Supabase session.
  // Until it resolves, `load` is a no-op (guards on `if (!userId) return`).
  const [userId,      setUserId]      = useState(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState(null);

  // rawStats is the unmodified RPC response, forwarded to yaraInsightsService
  // so it can build the Groq prompt without the hook needing to know about AI.
  const [rawStats,    setRawStats]    = useState(null);

  // All derived state is kept in the hook so the screen stays a pure display layer.
  const [metrics,     setMetrics]     = useState([]);
  const [trendData,   setTrendData]   = useState({ Week: [], Month: [], '3 Months': [] });
  const [heatmapData, setHeatmapData] = useState({});
  const [streakData,  setStreakData]  = useState({ currentStreak: 0, longestStreak: 0 });

  // Resolve the logged-in user's ID once on mount.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  // `load` is memoised with useCallback so the useEffect below only fires when
  // userId OR period actually changes — not on every render.
  const load = useCallback(async () => {
    if (!userId) return;  // auth not resolved yet — wait
    setIsLoading(true);
    setError(null);
    try {
      // Single RPC call returns all aggregated data the screen needs.
      const { data, error: rpcErr } = await supabase.rpc('get_insights_data', {
        p_user_id: userId,
        p_period:  period,
      });

      if (rpcErr) throw rpcErr;

      const stats   = data ?? {};
      // Compute streaks from the activity_dates array the RPC returned.
      const streaks = computeStreaks(stats.activity_dates);

      // Persist raw stats for yaraInsightsService (called separately in the screen).
      setRawStats(stats);
      // Derive everything else and store it in state.
      setStreakData(streaks);
      setMetrics(buildMetrics(stats, streaks));
      setTrendData(buildTrendData(stats.heatmap_days));
      setHeatmapData(buildHeatmapData(stats.heatmap_days));
    } catch (e) {
      console.error('useInsights error:', e);
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [userId, period]); // re-run whenever the user switches periods

  // Trigger load on mount and whenever the memoised `load` function changes.
  useEffect(() => { load(); }, [load]);

  return {
    isLoading,
    error,
    rawStats,    // forwarded to yaraInsightsService for AI prompt building
    userId,      // forwarded to yaraInsightsService for DB writes
    metrics,
    trendData,
    heatmapData,
    streakData,
    refresh: load, // exposed so the screen can offer pull-to-refresh
  };
}
