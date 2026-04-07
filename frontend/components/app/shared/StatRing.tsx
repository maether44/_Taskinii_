'use client';

interface StatRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export default function StatRing({ value, size = 80, strokeWidth = 8, color = 'var(--bq-purple)', label, sublabel }: StatRingProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(value, 0), 100);
  const dash = (pct / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 600ms ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: size < 60 ? 11 : 14, color: 'var(--bq-white)' }}>
            {Math.round(pct)}%
          </span>
        </div>
      </div>
      {label && <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 600, color: 'var(--bq-white)' }}>{label}</span>}
      {sublabel && <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)' }}>{sublabel}</span>}
    </div>
  );
}
