'use client';
import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import SparkLine from './SparkLine';

interface KPICardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  delta: number;
  deltaLabel?: string;
  sparkData: { day: number; v: number }[];
  highlight?: boolean;
}

export default function KPICard({ label, value, prefix = '', suffix = '', decimals = 0, delta, deltaLabel, sparkData, highlight }: KPICardProps) {
  const [display, setDisplay] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const dur = 800;
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(eased * value);
      if (t < 1) requestAnimationFrame(tick);
      else setDisplay(value);
    };
    requestAnimationFrame(tick);
  }, [visible, value]);

  const positive = delta >= 0;
  const fmt = decimals > 0 ? display.toFixed(decimals) : Math.floor(display).toLocaleString();
  const isChurn = deltaLabel?.toLowerCase().includes('churn');
  const good = isChurn ? !positive : positive;

  return (
    <div ref={ref} style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 12, padding: '20px 20px 14px', display: 'flex', flexDirection: 'column', gap: 4, cursor: 'default', transition: 'border-color 150ms' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--bq-border-hover)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--bq-border)'; }}
    >
      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, fontWeight: 500, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--bq-text-3)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-syne)', fontSize: 36, fontWeight: 700, color: highlight ? 'var(--bq-lime)' : 'var(--bq-white)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
        {prefix}{fmt}{suffix}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        {positive ? <TrendingUp size={13} color={good ? 'var(--bq-success)' : 'var(--bq-danger)'} /> : <TrendingDown size={13} color={good ? 'var(--bq-success)' : 'var(--bq-danger)'} />}
        <span style={{ fontSize: 12, color: good ? 'var(--bq-success)' : 'var(--bq-danger)', fontWeight: 500 }}>
          {positive ? '+' : ''}{delta}%
        </span>
        {deltaLabel && <span style={{ fontSize: 12, color: 'var(--bq-text-3)' }}>{deltaLabel}</span>}
      </div>
      <div style={{ marginTop: 8 }}>
        <SparkLine data={sparkData} color={highlight ? 'var(--chart-lime)' : 'var(--chart-purple)'} />
      </div>
    </div>
  );
}
