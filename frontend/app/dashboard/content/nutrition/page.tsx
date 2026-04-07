'use client';

import { useState } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';

interface NutritionPlan {
  id: string;
  name: string;
  goal: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'performance';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: number;
  status: 'active' | 'draft' | 'archived';
  assignedTo: number;
}

const PLANS: NutritionPlan[] = [
  { id: '1', name: 'Lean Shred 12-Week', goal: 'weight_loss', calories: 1800, protein: 160, carbs: 140, fat: 60, meals: 5, status: 'active', assignedTo: 347 },
  { id: '2', name: 'Mass Builder Pro', goal: 'muscle_gain', calories: 3200, protein: 240, carbs: 380, fat: 90, meals: 6, status: 'active', assignedTo: 219 },
  { id: '3', name: 'Balanced Lifestyle', goal: 'maintenance', calories: 2200, protein: 150, carbs: 260, fat: 70, meals: 4, status: 'active', assignedTo: 512 },
  { id: '4', name: 'Athletic Performance', goal: 'performance', calories: 2800, protein: 200, carbs: 340, fat: 80, meals: 5, status: 'active', assignedTo: 128 },
  { id: '5', name: 'Keto Fat Burn', goal: 'weight_loss', calories: 1600, protein: 120, carbs: 30, fat: 120, meals: 3, status: 'draft', assignedTo: 0 },
  { id: '6', name: 'Vegan Muscle', goal: 'muscle_gain', calories: 2900, protein: 190, carbs: 380, fat: 75, meals: 5, status: 'draft', assignedTo: 0 },
];

const GOAL_LABELS: Record<NutritionPlan['goal'], string> = {
  weight_loss: 'Weight Loss',
  muscle_gain: 'Muscle Gain',
  maintenance: 'Maintenance',
  performance: 'Performance',
};

const GOAL_COLORS: Record<NutritionPlan['goal'], string> = {
  weight_loss:  '#ef4444',
  muscle_gain:  'var(--bq-purple)',
  maintenance:  'var(--chart-blue)',
  performance:  'var(--bq-lime)',
};

const STATUS_STYLES: Record<NutritionPlan['status'], { bg: string; color: string; label: string }> = {
  active:   { bg: 'rgba(34,197,94,0.1)',  color: '#22c55e', label: 'Active'   },
  draft:    { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: 'Draft'    },
  archived: { bg: 'rgba(107,98,128,0.1)', color: 'var(--bq-muted)', label: 'Archived' },
};

const card: React.CSSProperties = {
  background: 'var(--bq-surface-1)',
  border: '1px solid var(--bq-border)',
  borderRadius: 12, padding: 20,
};

function MacroBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  const pPct = Math.round((protein * 4 / total) * 100);
  const cPct = Math.round((carbs * 4 / total) * 100);
  const fPct = 100 - pPct - cPct;
  return (
    <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', gap: 1 }}>
      <div style={{ width: `${pPct}%`, background: 'var(--bq-purple)', borderRadius: '3px 0 0 3px' }} />
      <div style={{ width: `${cPct}%`, background: 'var(--bq-lime)' }} />
      <div style={{ width: `${fPct}%`, background: '#f59e0b', borderRadius: '0 3px 3px 0' }} />
    </div>
  );
}

export default function NutritionPage() {
  const [filter, setFilter] = useState<'all' | NutritionPlan['status']>('all');

  const filtered = filter === 'all' ? PLANS : PLANS.filter((p) => p.status === filter);
  const activeCount = PLANS.filter((p) => p.status === 'active').length;
  const totalAssigned = PLANS.reduce((s, p) => s + p.assignedTo, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="Nutrition Plans"
        description="Manage meal plans and macro targets for all users"
        action={
          <button style={{
            background: 'var(--bq-purple)', border: 'none', borderRadius: 8,
            padding: '9px 18px', fontFamily: 'var(--font-inter)', fontSize: 13,
            fontWeight: 600, color: '#fff', cursor: 'pointer',
          }}>
            + New Plan
          </button>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Plans', value: PLANS.length, color: 'var(--bq-text-1)' },
          { label: 'Active Plans', value: activeCount, color: '#22c55e' },
          { label: 'Users Assigned', value: totalAssigned.toLocaleString(), color: 'var(--bq-purple)' },
        ].map((kpi) => (
          <div key={kpi.label} style={card}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{kpi.label}</p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['all', 'active', 'draft', 'archived'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? 'var(--bq-purple)' : 'var(--bq-surface-2)',
              border: '1px solid var(--bq-border)', borderRadius: 7,
              padding: '6px 14px', fontFamily: 'var(--font-inter)', fontSize: 13,
              fontWeight: 500, color: filter === f ? '#fff' : 'var(--bq-text-2)',
              cursor: 'pointer', textTransform: 'capitalize',
            }}
          >{f}</button>
        ))}
      </div>

      {/* Plan grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {filtered.map((plan) => {
          const ss = STATUS_STYLES[plan.status];
          return (
            <div key={plan.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: 14, color: 'var(--bq-text-1)', marginBottom: 4 }}>{plan.name}</p>
                  <span style={{
                    background: `${GOAL_COLORS[plan.goal]}18`, color: GOAL_COLORS[plan.goal],
                    borderRadius: 5, padding: '2px 8px', fontSize: 11,
                    fontFamily: 'var(--font-inter)', fontWeight: 600,
                  }}>{GOAL_LABELS[plan.goal]}</span>
                </div>
                <span style={{ background: ss.bg, color: ss.color, borderRadius: 5, padding: '3px 9px', fontSize: 11, fontFamily: 'var(--font-inter)', fontWeight: 600 }}>
                  {ss.label}
                </span>
              </div>

              {/* Calories */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', marginBottom: 2 }}>Calories</p>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 18, fontWeight: 700, color: 'var(--bq-text-1)' }}>{plan.calories.toLocaleString()}</p>
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', marginBottom: 2 }}>Meals/day</p>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 18, fontWeight: 700, color: 'var(--bq-text-1)' }}>{plan.meals}</p>
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', marginBottom: 2 }}>Assigned</p>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 18, fontWeight: 700, color: plan.assignedTo > 0 ? 'var(--bq-purple)' : 'var(--bq-muted)' }}>{plan.assignedTo}</p>
                </div>
              </div>

              {/* Macros */}
              <div style={{ marginBottom: 8 }}>
                <MacroBar protein={plan.protein} carbs={plan.carbs} fat={plan.fat} />
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  {[
                    { label: 'Protein', val: `${plan.protein}g`, color: 'var(--bq-purple)' },
                    { label: 'Carbs',   val: `${plan.carbs}g`,   color: 'var(--bq-lime)'   },
                    { label: 'Fat',     val: `${plan.fat}g`,     color: '#f59e0b'            },
                  ].map((m) => (
                    <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color }} />
                      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-text-2)' }}>{m.label} {m.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={{
                  flex: 1, background: 'var(--bq-surface-3)', border: '1px solid var(--bq-border)',
                  borderRadius: 7, padding: '7px 0', fontFamily: 'var(--font-inter)', fontSize: 12,
                  color: 'var(--bq-text-2)', cursor: 'pointer',
                }}>Edit</button>
                <button style={{
                  flex: 1, background: 'var(--bq-surface-3)', border: '1px solid var(--bq-border)',
                  borderRadius: 7, padding: '7px 0', fontFamily: 'var(--font-inter)', fontSize: 12,
                  color: 'var(--bq-text-2)', cursor: 'pointer',
                }}>Duplicate</button>
                {plan.status === 'draft' && (
                  <button style={{
                    flex: 1, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                    borderRadius: 7, padding: '7px 0', fontFamily: 'var(--font-inter)', fontSize: 12,
                    color: '#22c55e', cursor: 'pointer', fontWeight: 600,
                  }}>Publish</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
