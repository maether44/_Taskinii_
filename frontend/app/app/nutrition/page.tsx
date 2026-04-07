'use client';
import { useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import MacroBar from '@/components/app/shared/MacroBar';
import StatRing from '@/components/app/shared/StatRing';
import { PageSkeleton } from '@/components/app/shared/LoadingSkeleton';

/* ----------------------------------------------------------
   NUTRITION PAGE  /app/nutrition
   3 tabs: Today | History | My Targets
   ---------------------------------------------------------- */

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const MEAL_LABELS: Record<string, string> = { breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', dinner: '🌙 Dinner', snack: '🍎 Snack' };

type Tab = 'today' | 'history' | 'targets';

function calcTotals(logs: ReturnType<typeof useAppData>['todayFoodLogs']) {
  let cal = 0, protein = 0, carbs = 0, fat = 0, fiber = 0;
  for (const log of logs) {
    const f = log.foods;
    if (!f) continue;
    const factor = log.quantity_grams / 100;
    cal     += f.calories_per_100g * factor;
    protein += f.protein_per_100g * factor;
    carbs   += f.carbs_per_100g * factor;
    fat     += f.fat_per_100g * factor;
    fiber   += (f.fiber_per_100g ?? 0) * factor;
  }
  return { cal: Math.round(cal), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat), fiber: Math.round(fiber) };
}

export default function NutritionPage() {
  const [tab, setTab] = useState<Tab>('today');
  const { todayFoodLogs, recentWorkouts: _rw, calorieTarget, weekActivity: _wa, loading } = useAppData();

  if (loading) return <PageSkeleton />;

  const totals  = calcTotals(todayFoodLogs);
  const calTarget = calorieTarget?.daily_calories ?? 2000;
  const pTarget   = calorieTarget?.protein_target ?? 150;
  const cTarget   = calorieTarget?.carbs_target   ?? 250;
  const fTarget   = calorieTarget?.fat_target      ?? 65;

  // Group logs by meal type
  const grouped: Record<string, typeof todayFoodLogs> = { breakfast: [], lunch: [], dinner: [], snack: [] };
  for (const log of todayFoodLogs) {
    if (grouped[log.meal_type]) grouped[log.meal_type].push(log);
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 20px' }}>
      <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 24, color: 'var(--bq-white)', marginBottom: 6, marginTop: 0 }}>
        Nutrition
      </h1>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: 'var(--bq-muted)', marginTop: 0, marginBottom: 24 }}>
        Track your daily food intake and macros
      </p>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bq-surface-2)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {(['today', 'history', 'targets'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px',
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter)',
              fontSize: 13,
              fontWeight: 500,
              background: tab === t ? 'var(--bq-purple)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--bq-muted)',
              transition: 'background 200ms ease, color 200ms ease',
              textTransform: 'capitalize',
            }}
          >
            {t === 'today' ? 'Today' : t === 'history' ? 'History' : 'My Targets'}
          </button>
        ))}
      </div>

      {/* ── TODAY TAB ── */}
      {tab === 'today' && (
        <div>
          {/* Macro summary card */}
          <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
              <StatRing value={Math.min((totals.cal / calTarget) * 100, 100)} size={88} color="var(--bq-lime)" label="Calories" sublabel={`${totals.cal} / ${calTarget}`} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <MacroBar label="Protein" consumed={totals.protein} target={pTarget} color="#7C5CFC" />
                <MacroBar label="Carbs"   consumed={totals.carbs}   target={cTarget} color="#38BDF8" />
                <MacroBar label="Fat"     consumed={totals.fat}     target={fTarget} color="#F59E0B" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Calories', value: totals.cal, unit: 'kcal', color: 'var(--bq-lime)' },
                { label: 'Protein',  value: totals.protein, unit: 'g', color: '#7C5CFC' },
                { label: 'Carbs',    value: totals.carbs,   unit: 'g', color: '#38BDF8' },
                { label: 'Fat',      value: totals.fat,     unit: 'g', color: '#F59E0B' },
                { label: 'Fiber',    value: totals.fiber,   unit: 'g', color: '#22C55E' },
              ].map((m) => (
                <div key={m.label} style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 20, color: m.color }}>{m.value}</div>
                  <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Meals */}
          {MEAL_ORDER.map((meal) => {
            const logs = grouped[meal];
            if (logs.length === 0) return null;
            const mealCal = logs.reduce((sum, l) => sum + (l.foods ? (l.foods.calories_per_100g * l.quantity_grams / 100) : 0), 0);
            return (
              <div key={meal} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 600, color: 'var(--bq-white)' }}>{MEAL_LABELS[meal]}</span>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)' }}>{Math.round(mealCal)} kcal</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {logs.map((log) => {
                    const f = log.foods;
                    const factor = log.quantity_grams / 100;
                    return (
                      <div key={log.id} style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 500, color: 'var(--bq-white)' }}>{f?.name ?? 'Unknown food'}</div>
                          <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', marginTop: 2 }}>{log.quantity_grams}g</div>
                        </div>
                        {f && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 600, color: 'var(--bq-lime)' }}>
                              {Math.round(f.calories_per_100g * factor)} kcal
                            </div>
                            <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', marginTop: 2 }}>
                              P: {Math.round(f.protein_per_100g * factor)}g · C: {Math.round(f.carbs_per_100g * factor)}g · F: {Math.round(f.fat_per_100g * factor)}g
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {todayFoodLogs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--bq-muted)', fontFamily: 'var(--font-inter)', fontSize: 14 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🥗</div>
              No food logged today. Use the mobile app to log meals.
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--bq-muted)', fontFamily: 'var(--font-inter)', fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--bq-white)', marginBottom: 8 }}>Nutrition History</div>
          Log your meals daily in the mobile app to see your history here.
        </div>
      )}

      {/* ── TARGETS TAB ── */}
      {tab === 'targets' && (
        <div>
          <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--bq-white)', marginTop: 0, marginBottom: 20 }}>
              Daily Targets
            </h2>
            {calorieTarget ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Calories', value: calorieTarget.daily_calories, unit: 'kcal', color: 'var(--bq-lime)' },
                  { label: 'Protein',  value: calorieTarget.protein_target,  unit: 'g',    color: '#7C5CFC' },
                  { label: 'Carbs',    value: calorieTarget.carbs_target,    unit: 'g',    color: '#38BDF8' },
                  { label: 'Fat',      value: calorieTarget.fat_target,      unit: 'g',    color: '#F59E0B' },
                ].map((t) => (
                  <div key={t.label} style={{ background: 'var(--bq-surface-3)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 28, color: t.color }}>{t.value}</div>
                    <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', marginTop: 4 }}>{t.unit} {t.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--bq-muted)', fontFamily: 'var(--font-inter)', fontSize: 14 }}>
                No calorie targets set yet. Complete onboarding to get your personalized plan.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
