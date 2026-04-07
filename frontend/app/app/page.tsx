'use client';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/hooks/useAppData';
import { useStreaks } from '@/hooks/useStreaks';
import StatRing from '@/components/app/shared/StatRing';
import StreakBadge from '@/components/app/shared/StreakBadge';
import MacroBar from '@/components/app/shared/MacroBar';
import InsightCard from '@/components/app/shared/InsightCard';
import { PageSkeleton } from '@/components/app/shared/LoadingSkeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chartTheme } from '@/lib/chartTheme';

/* ----------------------------------------------------------
   OVERVIEW PAGE  /app
   Greeting, streak badges, KPI tiles, 7-day chart,
   recent workout card, nutrition ring, AI insights preview.
   ---------------------------------------------------------- */

function greeting(name: string | null | undefined): string {
  const hour = new Date().getHours();
  const first = name?.split(' ')[0] ?? 'there';
  if (hour < 12) return `Good morning, ${first} 👋`;
  if (hour < 18) return `Good afternoon, ${first} 👋`;
  return `Good evening, ${first} 👋`;
}

function calcNutrition(foodLogs: ReturnType<typeof useAppData>['todayFoodLogs']) {
  let cal = 0, protein = 0, carbs = 0, fat = 0;
  for (const log of foodLogs) {
    const f = log.foods;
    if (!f) continue;
    const factor = log.quantity_grams / 100;
    cal     += f.calories_per_100g * factor;
    protein += f.protein_per_100g * factor;
    carbs   += f.carbs_per_100g * factor;
    fat     += f.fat_per_100g * factor;
  }
  return { cal: Math.round(cal), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
}

export default function OverviewPage() {
  const { profile } = useAuth();
  const { todayActivity, weekActivity, todayFoodLogs, recentWorkouts, calorieTarget, insights, loading } = useAppData();
  const { streaks } = useStreaks();

  if (loading) return <PageSkeleton />;

  const nutrition = calcNutrition(todayFoodLogs);
  const calTarget = calorieTarget?.daily_calories ?? 2000;
  const calPct    = Math.min((nutrition.cal / calTarget) * 100, 100);
  const stepGoal  = 10000;
  const stepPct   = Math.min(((todayActivity?.steps ?? 0) / stepGoal) * 100, 100);
  const waterGoal = 3000;
  const waterPct  = Math.min(((todayActivity?.water_ml ?? 0) / waterGoal) * 100, 100);

  const chartData = weekActivity.map((d) => ({
    date: d.date.slice(5),
    Steps: d.steps ?? 0,
    Calories: d.calories_burned ?? 0,
  }));

  const lastWorkout = recentWorkouts[0];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px' }}>
      {/* ── Greeting ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 26, color: 'var(--bq-white)', margin: 0, lineHeight: 1.2 }}>
          {greeting(profile?.full_name)}
        </h1>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: 'var(--bq-muted)', marginTop: 6, marginBottom: 0 }}>
          Here&apos;s your fitness snapshot for today
        </p>
      </div>

      {/* ── Streak Row ── */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 28, padding: '16px 20px', background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 16 }}>
        <StreakBadge count={streaks.overall}   label="Overall"   size="md" />
        <div style={{ width: 1, background: 'var(--bq-border)', alignSelf: 'stretch' }} />
        <StreakBadge count={streaks.workout}   label="Workouts"  size="sm" />
        <StreakBadge count={streaks.nutrition} label="Nutrition" size="sm" />
        <StreakBadge count={streaks.water}     label="Hydration" size="sm" />
        <StreakBadge count={streaks.steps}     label="Steps"     size="sm" />
      </div>

      {/* ── KPI Tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
        {/* Calories */}
        <div style={tileStyle}>
          <span style={tileLabelStyle}>Calories</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <span style={tileValueStyle}>{nutrition.cal.toLocaleString()}</span>
            <span style={tileUnitStyle}>/ {calTarget.toLocaleString()} kcal</span>
          </div>
          <div style={barTrackStyle}><div style={{ ...barFillStyle, width: `${calPct}%`, background: 'var(--bq-lime)' }} /></div>
        </div>
        {/* Steps */}
        <div style={tileStyle}>
          <span style={tileLabelStyle}>Steps</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <span style={tileValueStyle}>{(todayActivity?.steps ?? 0).toLocaleString()}</span>
            <span style={tileUnitStyle}>/ {stepGoal.toLocaleString()}</span>
          </div>
          <div style={barTrackStyle}><div style={{ ...barFillStyle, width: `${stepPct}%`, background: '#38BDF8' }} /></div>
        </div>
        {/* Water */}
        <div style={tileStyle}>
          <span style={tileLabelStyle}>Water</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <span style={tileValueStyle}>{((todayActivity?.water_ml ?? 0) / 1000).toFixed(1)}</span>
            <span style={tileUnitStyle}>L / {(waterGoal / 1000).toFixed(1)} L</span>
          </div>
          <div style={barTrackStyle}><div style={{ ...barFillStyle, width: `${waterPct}%`, background: '#7C5CFC' }} /></div>
        </div>
        {/* Sleep */}
        <div style={tileStyle}>
          <span style={tileLabelStyle}>Sleep</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <span style={tileValueStyle}>{(todayActivity?.sleep_hours ?? 0).toFixed(1)}</span>
            <span style={tileUnitStyle}>hrs</span>
          </div>
          <div style={barTrackStyle}><div style={{ ...barFillStyle, width: `${Math.min(((todayActivity?.sleep_hours ?? 0) / 8) * 100, 100)}%`, background: '#A78BFA' }} /></div>
        </div>
      </div>

      {/* ── Two-column layout for chart + nutrition ring ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 28 }}>
        {/* 7-day steps/calories chart */}
        <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 600, color: 'var(--bq-white)', marginBottom: 16 }}>
            Last 7 Days — Steps &amp; Calories
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="gSteps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#38BDF8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#C8F135" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#C8F135" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray={chartTheme.grid.strokeDasharray} stroke={chartTheme.grid.stroke} vertical={false} />
                <XAxis dataKey="date" tick={chartTheme.axis.tick} axisLine={false} tickLine={false} />
                <YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTheme.tooltip.contentStyle} labelStyle={chartTheme.tooltip.labelStyle} itemStyle={chartTheme.tooltip.itemStyle} />
                <Area type="monotone" dataKey="Steps"    stroke="#38BDF8" strokeWidth={2} fill="url(#gSteps)" />
                <Area type="monotone" dataKey="Calories" stroke="#C8F135" strokeWidth={2} fill="url(#gCals)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bq-muted)', fontFamily: 'var(--font-inter)', fontSize: 14 }}>
              No activity data yet this week
            </div>
          )}
        </div>
      </div>

      {/* ── Nutrition summary + Last workout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
        {/* Nutrition */}
        <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 600, color: 'var(--bq-white)' }}>Today&apos;s Nutrition</span>
            <Link href="/app/nutrition" style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-lime)', textDecoration: 'none' }}>See all →</Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <StatRing value={calPct} size={90} color="var(--bq-lime)" label="Calories" sublabel={`${nutrition.cal} / ${calTarget} kcal`} />
          </div>
          <MacroBar label="Protein" consumed={nutrition.protein} target={calorieTarget?.protein_target ?? 150} color="#7C5CFC" />
          <MacroBar label="Carbs"   consumed={nutrition.carbs}   target={calorieTarget?.carbs_target ?? 250}   color="#38BDF8" />
          <MacroBar label="Fat"     consumed={nutrition.fat}     target={calorieTarget?.fat_target ?? 65}      color="#F59E0B" />
        </div>

        {/* Last Workout */}
        <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 600, color: 'var(--bq-white)' }}>Last Workout</span>
            <Link href="/app/activity" style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-lime)', textDecoration: 'none' }}>History →</Link>
          </div>
          {lastWorkout ? (
            <div>
              <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', marginBottom: 8 }}>
                {new Date(lastWorkout.started_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 24, color: 'var(--bq-white)' }}>
                    {lastWorkout.calories_burned}
                  </div>
                  <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)' }}>kcal burned</div>
                </div>
                {lastWorkout.ended_at && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 24, color: 'var(--bq-white)' }}>
                      {Math.round((new Date(lastWorkout.ended_at).getTime() - new Date(lastWorkout.started_at).getTime()) / 60000)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)' }}>minutes</div>
                  </div>
                )}
              </div>
              {lastWorkout.notes && (
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-2)', margin: 0, lineHeight: 1.5 }}>
                  {lastWorkout.notes}
                </p>
              )}
              {lastWorkout.ai_feedback && (
                <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(124,92,252,0.1)', border: '1px solid rgba(124,92,252,0.25)', borderRadius: 10 }}>
                  <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, fontWeight: 600, color: 'var(--bq-purple)', marginBottom: 4 }}>🤖 AI Feedback</div>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-white)', margin: 0, lineHeight: 1.5 }}>
                    {lastWorkout.ai_feedback}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120, gap: 8 }}>
              <span style={{ fontSize: 32 }}>🏋️</span>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: 'var(--bq-muted)', textAlign: 'center', margin: 0 }}>
                No workouts recorded yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── AI Insights Preview ── */}
      {insights.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 16, color: 'var(--bq-white)' }}>AI Insights</span>
            <Link href="/app/insights" style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-lime)', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insights.slice(0, 3).map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Local style constants ── */
const tileStyle: React.CSSProperties = {
  background: 'var(--bq-surface-2)',
  border: '1px solid var(--bq-border)',
  borderRadius: 16,
  padding: '18px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};
const tileLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter)',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--bq-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};
const tileValueStyle: React.CSSProperties = {
  fontFamily: 'var(--font-syne)',
  fontWeight: 800,
  fontSize: 28,
  color: 'var(--bq-white)',
  lineHeight: 1,
};
const tileUnitStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter)',
  fontSize: 13,
  color: 'var(--bq-muted)',
  paddingBottom: 3,
};
const barTrackStyle: React.CSSProperties = {
  height: 4,
  borderRadius: 99,
  background: 'rgba(255,255,255,0.08)',
  overflow: 'hidden',
  marginTop: 4,
};
const barFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 99,
  transition: 'width 600ms ease',
};
