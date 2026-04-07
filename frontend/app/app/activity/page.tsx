'use client';
import { useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { useAuth } from '@/context/AuthContext';
import { PageSkeleton } from '@/components/app/shared/LoadingSkeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { chartTheme } from '@/lib/chartTheme';

/* ----------------------------------------------------------
   ACTIVITY PAGE  /app/activity
   3 tabs: This Week | History | Body Metrics
   ---------------------------------------------------------- */

type Tab = 'week' | 'history' | 'metrics';

export default function ActivityPage() {
  const [tab, setTab] = useState<Tab>('week');
  const { profile } = useAuth();
  const { weekActivity, recentWorkouts, todayActivity, loading } = useAppData();

  if (loading) return <PageSkeleton />;

  const stepsData = weekActivity.map((d) => ({ date: d.date.slice(5), Steps: d.steps ?? 0 }));
  const sleepData  = weekActivity.map((d) => ({ date: d.date.slice(5), Sleep: d.sleep_hours ?? 0 }));
  const waterData  = weekActivity.map((d) => ({ date: d.date.slice(5), Water: Math.round((d.water_ml ?? 0) / 1000 * 10) / 10 }));

  const weekStepTotal = weekActivity.reduce((s, d) => s + (d.steps ?? 0), 0);
  const weekCalTotal  = weekActivity.reduce((s, d) => s + (d.calories_burned ?? 0), 0);
  const avgSleep = weekActivity.length
    ? weekActivity.reduce((s, d) => s + (d.sleep_hours ?? 0), 0) / weekActivity.length
    : 0;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>
      <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 24, color: 'var(--bq-white)', marginBottom: 6, marginTop: 0 }}>
        Activity
      </h1>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: 'var(--bq-muted)', marginTop: 0, marginBottom: 24 }}>
        Your movement, sleep, and body metrics
      </p>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bq-surface-2)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {([['week', 'This Week'], ['history', 'Workout History'], ['metrics', 'Body Metrics']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 18px',
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter)',
              fontSize: 13,
              fontWeight: 500,
              background: tab === t ? 'var(--bq-purple)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--bq-muted)',
              transition: 'background 200ms ease, color 200ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── THIS WEEK TAB ── */}
      {tab === 'week' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total Steps', value: weekStepTotal.toLocaleString(), color: '#38BDF8' },
              { label: 'Calories Burned', value: `${weekCalTotal.toLocaleString()} kcal`, color: 'var(--bq-lime)' },
              { label: 'Avg Sleep', value: `${avgSleep.toFixed(1)} hrs`, color: '#A78BFA' },
              { label: 'Today Steps', value: (todayActivity?.steps ?? 0).toLocaleString(), color: '#F59E0B' },
            ].map((s) => (
              <div key={s.label} style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 14, padding: '16px' }}>
                <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Steps chart */}
          <ChartCard title="Daily Steps">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stepsData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray={chartTheme.grid.strokeDasharray} stroke={chartTheme.grid.stroke} vertical={false} />
                <XAxis dataKey="date" tick={chartTheme.axis.tick} axisLine={false} tickLine={false} />
                <YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTheme.tooltip.contentStyle} labelStyle={chartTheme.tooltip.labelStyle} itemStyle={chartTheme.tooltip.itemStyle} />
                <Bar dataKey="Steps" fill="#38BDF8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Sleep chart */}
          <ChartCard title="Sleep (hours)">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={sleepData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="gSleep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#A78BFA" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray={chartTheme.grid.strokeDasharray} stroke={chartTheme.grid.stroke} vertical={false} />
                <XAxis dataKey="date" tick={chartTheme.axis.tick} axisLine={false} tickLine={false} />
                <YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} domain={[0, 12]} />
                <Tooltip contentStyle={chartTheme.tooltip.contentStyle} labelStyle={chartTheme.tooltip.labelStyle} itemStyle={chartTheme.tooltip.itemStyle} />
                <Area type="monotone" dataKey="Sleep" stroke="#A78BFA" strokeWidth={2} fill="url(#gSleep)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Water chart */}
          <ChartCard title="Water Intake (L)">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={waterData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray={chartTheme.grid.strokeDasharray} stroke={chartTheme.grid.stroke} vertical={false} />
                <XAxis dataKey="date" tick={chartTheme.axis.tick} axisLine={false} tickLine={false} />
                <YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTheme.tooltip.contentStyle} labelStyle={chartTheme.tooltip.labelStyle} itemStyle={chartTheme.tooltip.itemStyle} />
                <Bar dataKey="Water" fill="#7C5CFC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* ── WORKOUT HISTORY TAB ── */}
      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recentWorkouts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--bq-muted)', fontFamily: 'var(--font-inter)', fontSize: 14 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏋️</div>
              <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--bq-white)', marginBottom: 8 }}>No Workouts Yet</div>
              Complete workouts in the mobile app to see them here.
            </div>
          ) : recentWorkouts.map((w) => {
            const duration = w.ended_at
              ? Math.round((new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000)
              : null;
            return (
              <div key={w.id} style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 600, color: 'var(--bq-white)' }}>
                      {new Date(w.started_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', marginTop: 2 }}>
                      {new Date(w.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {duration != null && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--bq-white)' }}>{duration}</div>
                        <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)' }}>min</div>
                      </div>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--bq-lime)' }}>{w.calories_burned}</div>
                      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)' }}>kcal</div>
                    </div>
                  </div>
                </div>
                {w.notes && (
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-2)', margin: '0 0 10px', lineHeight: 1.5 }}>{w.notes}</p>
                )}
                {w.ai_feedback && (
                  <div style={{ padding: '10px 12px', background: 'rgba(124,92,252,0.1)', border: '1px solid rgba(124,92,252,0.25)', borderRadius: 10 }}>
                    <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, fontWeight: 600, color: 'var(--bq-purple)', marginBottom: 4 }}>🤖 AI Feedback</div>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-white)', margin: 0, lineHeight: 1.5 }}>{w.ai_feedback}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── BODY METRICS TAB ── */}
      {tab === 'metrics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--bq-white)', marginTop: 0, marginBottom: 20 }}>
              Body Metrics
            </h2>
            {profile ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Weight',       value: profile.weight_kg ? `${profile.weight_kg} kg` : '—', color: 'var(--bq-lime)' },
                  { label: 'Height',       value: profile.height_cm ? `${profile.height_cm} cm` : '—', color: '#38BDF8' },
                  { label: 'Target Weight', value: profile.target_weight_kg ? `${profile.target_weight_kg} kg` : '—', color: '#A78BFA' },
                  { label: 'Goal',         value: profile.goal ? profile.goal.replace('_', ' ') : '—', color: '#F59E0B' },
                  { label: 'Activity Level', value: profile.activity_level ? profile.activity_level.replace('_', ' ') : '—', color: '#22C55E' },
                ].map((m) => (
                  <div key={m.label} style={{ background: 'var(--bq-surface-3)', borderRadius: 12, padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: m.color, marginBottom: 4, textTransform: 'capitalize' }}>{m.value}</div>
                    <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--bq-muted)', fontFamily: 'var(--font-inter)', fontSize: 14 }}>
                Complete your profile to see body metrics.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 16, padding: 20 }}>
      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 600, color: 'var(--bq-white)', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}
