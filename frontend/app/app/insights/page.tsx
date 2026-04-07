'use client';
import { useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import InsightCard from '@/components/app/shared/InsightCard';
import { InsightSkeleton } from '@/components/app/shared/LoadingSkeleton';

/* ----------------------------------------------------------
   INSIGHTS PAGE  /app/insights
   Filter pills by insight type.
   Real-time updates via useAppData subscription.
   ---------------------------------------------------------- */

const FILTERS = [
  { key: 'all',        label: 'All' },
  { key: 'nutrition',  label: '🥗 Nutrition' },
  { key: 'workout',    label: '💪 Workout' },
  { key: 'recovery',   label: '🧘 Recovery' },
  { key: 'sleep',      label: '😴 Sleep' },
  { key: 'motivation', label: '⚡ Motivation' },
  { key: 'general',    label: '🤖 General' },
];

export default function InsightsPage() {
  const [filter, setFilter] = useState('all');
  const { insights, loading } = useAppData();

  const filtered = filter === 'all' ? insights : insights.filter((i) => i.insight_type === filter);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 20px' }}>
      <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 24, color: 'var(--bq-white)', marginBottom: 6, marginTop: 0 }}>
        AI Insights
      </h1>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: 'var(--bq-muted)', marginTop: 0, marginBottom: 24 }}>
        Personalized analysis from your AI trainer Yara
      </p>

      {/* ── Filter pills ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '7px 14px',
              borderRadius: 99,
              border: filter === f.key ? 'none' : '1px solid var(--bq-border)',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter)',
              fontSize: 13,
              fontWeight: 500,
              background: filter === f.key ? 'var(--bq-purple)' : 'var(--bq-surface-2)',
              color: filter === f.key ? '#fff' : 'var(--bq-muted)',
              transition: 'background 200ms ease, color 200ms ease',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Count ── */}
      {!loading && (
        <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-muted)', marginBottom: 16 }}>
          {filtered.length} insight{filtered.length !== 1 ? 's' : ''}
          {filter !== 'all' ? ` · ${filter}` : ''}
        </div>
      )}

      {/* ── Insights list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          [1, 2, 3, 4].map((i) => <InsightSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--bq-muted)', fontFamily: 'var(--font-inter)', fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💡</div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, color: 'var(--bq-white)', marginBottom: 8 }}>
              {filter === 'all' ? 'No Insights Yet' : `No ${filter} insights`}
            </div>
            {filter === 'all'
              ? 'Complete workouts and log meals to receive personalized AI insights.'
              : `Switch to "All" to see other insight types.`}
          </div>
        ) : (
          filtered.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        )}
      </div>
    </div>
  );
}
