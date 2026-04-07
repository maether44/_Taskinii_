'use client';
import type { AiInsight } from '@/hooks/useAppData';

const TYPE_COLORS: Record<string, string> = {
  nutrition: '#C8F135',
  workout: '#7C5CFC',
  recovery: '#38BDF8',
  sleep: '#A78BFA',
  motivation: '#F59E0B',
  general: 'rgba(255,255,255,0.4)',
};

const TYPE_ICONS: Record<string, string> = {
  nutrition: '🥗',
  workout: '💪',
  recovery: '🧘',
  sleep: '😴',
  motivation: '⚡',
  general: '🤖',
};

interface InsightCardProps {
  insight: AiInsight;
}

export default function InsightCard({ insight }: InsightCardProps) {
  const color = TYPE_COLORS[insight.insight_type] ?? TYPE_COLORS.general;
  const icon = TYPE_ICONS[insight.insight_type] ?? TYPE_ICONS.general;
  const date = new Date(insight.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      style={{
        background: 'var(--bq-surface-2)',
        border: '1px solid var(--bq-border)',
        borderLeft: `3px solid ${color}`,
        borderRadius: 12,
        padding: '16px 18px',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }} aria-hidden="true">{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 600, color, textTransform: 'capitalize' }}>
            {insight.insight_type}
          </span>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-text-3)' }}>{date}</span>
        </div>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: 'var(--bq-white)', lineHeight: 1.55, margin: 0 }}>
          {insight.message}
        </p>
        {insight.source && (
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-text-3)', marginTop: 6, display: 'block' }}>
            via {insight.source}
          </span>
        )}
      </div>
    </div>
  );
}
