/**
 * mobile-frontend/hooks/useInsights.js
 *
 * Powers the Insights screen with real Supabase data.
 *
 * DATA SOURCES
 *   1. get_insights_data RPC  — workout count, avg steps/sleep/calories, heatmap (42 days
 *                               with sleep + water since migration v2), activity dates for streak
 *   2. food_logs + foods      — direct query for nutrition breakdown per period
 *   3. workout_sessions       — direct query for workout summary per period
 *   4. getMuscleFatigue()     — current muscle recovery state, also forwarded to Groq
 *
 * RETURNS
 *   isLoading, error, refresh
 *   rawStats         — full payload forwarded to yaraInsightsService (now includes muscleFatigue)
 *   userId
 *   metrics          — 4 summary cards: Streak, Workouts, Avg Steps, Avg Sleep
 *   trendData        — { Week, Month, '3 Months' } health-score arrays for the chart
 *   heatmapData      — { 'YYYY-MM-DD': 0|1|2|3 } intensity map
 *   nutritionSummary — { avgCal, avgProtein, avgCarbs, avgFat, loggedDays }
 *   workoutSummary   — { count, totalCal, avgDurationMin }
 *   muscleFatigue    — [{ muscle_name, fatigue_pct }] sorted by fatigue desc
 *   aiHistory        — recent AI coaching rows from ai_insights table
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getMuscleFatigue } from "../services/workoutService";
import { useAuth } from "../context/AuthContext";
import { error as logError } from "../lib/logger";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Streaks are now persisted server-side (profiles.login_streak +
// profiles.longest_streak, updated by record_user_visit RPC on every app
// open). This helper is the FALLBACK used only if the RPC response for some
// reason doesn't carry the persisted values — it recomputes a best-effort
// streak from activity_dates the same way it used to, so the Insights card
// never displays a blank value during a migration/rollout.
function computeStreaks(activityDates) {
  if (!activityDates?.length) return { currentStreak: 0, longestStreak: 0 };
  const dateSet = new Set(activityDates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let currentStreak = 0;
  const cursor = new Date(today);
  const toLocal = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!dateSet.has(toLocal(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dateSet.has(toLocal(cursor))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const sorted = Array.from(dateSet).sort();
  let longest = 0,
    streak = sorted.length ? 1 : 0;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      longest = Math.max(longest, streak);
      streak = 1;
    }
  }
  return { currentStreak, longestStreak: Math.max(longest, streak) };
}

// Prefer the persisted streak on stats (set by get_insights_data v3). Falls
// back to recomputing from activity_dates if the field is missing — useful
// for older cached responses during rollout.
function resolveStreaks(stats) {
  const persisted = Number(stats?.login_streak);
  const longest = Number(stats?.longest_streak);
  if (
    Number.isFinite(persisted) &&
    persisted >= 0 &&
    stats?.login_streak !== undefined &&
    stats?.login_streak !== null
  ) {
    return {
      currentStreak: persisted,
      longestStreak: Number.isFinite(longest) ? Math.max(longest, persisted) : persisted,
    };
  }
  return computeStreaks(stats?.activity_dates);
}

function buildHeatmapData(heatmapDays) {
  const map = {};
  (heatmapDays ?? []).forEach((d) => {
    const intensity = d.has_workout
      ? 3
      : d.steps > 8000
        ? 2
        : d.steps > 2000
          ? 1
          : d.calories > 0
            ? 1
            : 0;
    map[d.date] = intensity;
  });
  return map;
}

// Health score 0-100: workout, steps, food, sleep, water — all connected
function scoreDay(d) {
  let s = 0;
  if (d.has_workout) s += 35;
  if (d.steps > 8000) s += 25;
  else if (d.steps > 4000) s += 12;
  if (d.calories > 0) s += 20;
  if (d.sleep >= 7) s += 15;
  else if (d.sleep >= 6) s += 8;
  if (d.water >= 2000) s += 5;
  return Math.min(s, 100);
}

function buildTrendData(heatmapDays) {
  const days = heatmapDays ?? [];
  const weekBars = days.slice(-7).map(scoreDay);
  const last30 = days.slice(-30);
  const b30 = Math.ceil(last30.length / 12) || 1;
  const monthBars = Array.from({ length: 12 }, (_, i) => {
    const chunk = last30.slice(i * b30, (i + 1) * b30);
    return chunk.length ? Math.round(chunk.reduce((s, d) => s + scoreDay(d), 0) / chunk.length) : 0;
  });
  const b3m = Math.ceil(days.length / 12) || 1;
  const threeMonthBars = Array.from({ length: 12 }, (_, i) => {
    const chunk = days.slice(i * b3m, (i + 1) * b3m);
    return chunk.length ? Math.round(chunk.reduce((s, d) => s + scoreDay(d), 0) / chunk.length) : 0;
  });
  return {
    Week: weekBars.length ? weekBars : [0, 0, 0, 0, 0, 0, 0],
    Month: monthBars.length ? monthBars : new Array(12).fill(0),
    "3 Months": threeMonthBars.length ? threeMonthBars : new Array(12).fill(0),
  };
}

function buildMetrics(stats, streakData) {
  const fmtK = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v ?? 0)));
  const { workout_count = 0, avg_steps = 0, avg_sleep = 0 } = stats;
  const current = streakData.currentStreak ?? 0;
  const longest = streakData.longestStreak ?? 0;
  // Streak delta surfaces the best record so the user sees progress over the
  // full history — not just the current period. Matches the "strong tracking
  // system" request: the streak is persistent and always visible.
  const streakDelta =
    current === 0 ? "Start!" : current >= longest ? `Best: ${current}d` : `Best: ${longest}d`;
  return [
    { label: "Streak", value: `${current}d`, delta: streakDelta, up: current > 0 },
    {
      label: "Workouts",
      value: String(workout_count),
      delta: workout_count > 0 ? `+${workout_count}` : "0",
      up: workout_count > 0,
    },
    {
      label: "Avg. Steps",
      value: fmtK(avg_steps),
      delta: avg_steps >= 8000 ? "On target" : avg_steps > 0 ? "Below" : "–",
      up: avg_steps >= 8000,
    },
    {
      label: "Avg. Sleep",
      value: avg_sleep > 0 ? `${avg_sleep}h` : "–",
      delta: avg_sleep >= 7 ? "Good" : avg_sleep > 0 ? "Low" : "–",
      up: avg_sleep >= 7,
    },
  ];
}

// Period string → JS Date for direct Supabase queries
function periodToStartDate(period) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period === "Week") d.setDate(d.getDate() - 7);
  else if (period === "Month") d.setDate(d.getDate() - 30);
  else d.setDate(d.getDate() - 90);
  return d;
}

// Compute nutrition summary from raw food_log rows
function buildNutritionSummary(rows) {
  if (!rows?.length) return null;
  const dayMap = {};
  rows.forEach((row) => {
    const day = row.consumed_at?.split("T")[0];
    if (!day || !row.foods) return;
    if (!dayMap[day]) dayMap[day] = { cal: 0, protein: 0, carbs: 0, fat: 0 };
    const q = (row.quantity_grams ?? 0) / 100;
    dayMap[day].cal += (row.foods.calories_per_100g ?? 0) * q;
    dayMap[day].protein += (row.foods.protein_per_100g ?? 0) * q;
    dayMap[day].carbs += (row.foods.carbs_per_100g ?? 0) * q;
    dayMap[day].fat += (row.foods.fat_per_100g ?? 0) * q;
  });
  const days = Object.values(dayMap);
  if (!days.length) return null;
  return {
    avgCal: Math.round(days.reduce((s, d) => s + d.cal, 0) / days.length),
    avgProtein: Math.round(days.reduce((s, d) => s + d.protein, 0) / days.length),
    avgCarbs: Math.round(days.reduce((s, d) => s + d.carbs, 0) / days.length),
    avgFat: Math.round(days.reduce((s, d) => s + d.fat, 0) / days.length),
    loggedDays: days.length,
  };
}

// Compute workout summary from raw session rows
function buildWorkoutSummary(rows) {
  if (!rows?.length) return { count: 0, totalCal: 0, avgDurationMin: 0 };
  const totalCal = rows.reduce((s, w) => s + (w.calories_burned ?? 0), 0);
  const durations = rows
    .filter((w) => w.started_at && w.ended_at)
    .map((w) => (new Date(w.ended_at) - new Date(w.started_at)) / 60000);
  const avgDurationMin = durations.length
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : 0;
  return { count: rows.length, totalCal, avgDurationMin };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInsights(period) {
  const { user: authUser } = useAuth();
  const userId = authUser?.id ?? null;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawStats, setRawStats] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [trendData, setTrendData] = useState({ Week: [], Month: [], "3 Months": [] });
  const [heatmapData, setHeatmapData] = useState({});
  const [nutritionSummary, setNutritionSummary] = useState(null);
  const [workoutSummary, setWorkoutSummary] = useState(null);
  const [muscleFatigue, setMuscleFatigue] = useState([]);
  const [aiHistory, setAiHistory] = useState([]);

  const load = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const startDate = periodToStartDate(period);
      const startIso = startDate.toISOString();

      const [
        { data: rpcData, error: rpcErr },
        { data: nutritionRows },
        { data: workoutRows },
        fatigueRows,
        { data: aiHistoryData },
      ] = await Promise.all([
        // 1. Main insights RPC (heatmap, streak dates, aggregated stats)
        supabase.rpc("get_insights_data", { p_user_id: userId, p_period: period }),

        // 2. Nutrition — food_logs joined to foods for macro data
        supabase
          .from("food_logs")
          .select(
            "consumed_at, quantity_grams, foods(calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)",
          )
          .eq("user_id", userId)
          .gte("consumed_at", startIso),

        // 3. Workout sessions — for summary card
        supabase
          .from("workout_sessions")
          .select("calories_burned, started_at, ended_at")
          .eq("user_id", userId)
          .gte("started_at", startIso)
          .not("ended_at", "is", null),

        // 4. Muscle fatigue — also sent to Groq so AI knows recovery state
        getMuscleFatigue(userId).catch(() => []),

        // 5. AI coaching history — wrap in Promise.resolve so .catch works on PostgrestFilterBuilder
        Promise.resolve(supabase.rpc("get_user_ai_history", { p_user_id: userId })).catch(() => ({
          data: [],
        })),
      ]);

      if (rpcErr) throw rpcErr;

      const stats = rpcData ?? {};
      const streaks = resolveStreaks(stats);

      const nutrition = buildNutritionSummary(nutritionRows);
      const workout = buildWorkoutSummary(workoutRows);

      setMuscleFatigue(fatigueRows ?? []);
      setNutritionSummary(nutrition);
      setWorkoutSummary(workout);
      setAiHistory(Array.isArray(aiHistoryData) ? aiHistoryData : []);
      setMetrics(buildMetrics(stats, streaks));
      setTrendData(buildTrendData(stats.heatmap_days));
      setHeatmapData(buildHeatmapData(stats.heatmap_days));

      // rawStats forwarded to Groq — now includes muscle fatigue and the
      // resolved (persisted-preferred) streak numbers so the AI sees the same
      // engagement metric the user does.
      setRawStats({
        ...stats,
        login_streak: streaks.currentStreak,
        longest_streak: streaks.longestStreak,
        nutrition_summary: nutrition,
        workout_summary: workout,
        muscle_fatigue: fatigueRows ?? [],
      });
    } catch (e) {
      logError("[useInsights] load error:", e);
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [userId, period]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    isLoading,
    error,
    refresh: load,
    rawStats,
    userId,
    metrics,
    trendData,
    heatmapData,
    nutritionSummary,
    workoutSummary,
    muscleFatigue,
    aiHistory,
  };
}
