'use client';

interface StreakBadgeProps {
  count: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StreakBadge({ count, label, size = 'md' }: StreakBadgeProps) {
  const emojiSize = size === 'lg' ? 28 : size === 'md' ? 22 : 16;
  const numSize = size === 'lg' ? 24 : size === 'md' ? 18 : 14;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: emojiSize }} aria-hidden="true">🔥</span>
        <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: numSize, color: count > 0 ? 'var(--bq-lime)' : 'var(--bq-muted)' }}>
          {count}
        </span>
      </div>
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', textAlign: 'center' }}>{label}</span>
    </div>
  );
}
