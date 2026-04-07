'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { chartTheme } from '@/lib/chartTheme';

interface Series { key: string; label: string; color: string; }
interface AreaChartCardProps { title: string; data: Record<string, unknown>[]; dataKeys: Series[]; height?: number; }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bq-surface-2)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fff' }}>
      <div style={{ color: 'var(--bq-text-3)', marginBottom: 6, fontSize: 11 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--bq-text-2)' }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function AreaChartCard({ title, data, dataKeys, height = 260 }: AreaChartCardProps) {
  const series = dataKeys;
  return (
    <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 12, padding: 20 }}>
      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 15, fontWeight: 600, color: 'var(--bq-white)', marginBottom: 20 }}>{title}</div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray={chartTheme.grid.strokeDasharray} stroke={chartTheme.grid.stroke} vertical={false} />
          <XAxis dataKey="date" tick={chartTheme.axis.tick} axisLine={false} tickLine={false} />
          <YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={chartTheme.tooltip.contentStyle} labelStyle={chartTheme.tooltip.labelStyle} itemStyle={chartTheme.tooltip.itemStyle} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', paddingTop: 12 }} />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} fill={`url(#grad-${s.key})`} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
