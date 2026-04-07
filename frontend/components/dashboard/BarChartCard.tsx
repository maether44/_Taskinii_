'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { chartTheme } from '@/lib/chartTheme';

interface Series { key: string; label: string; color: string; }
interface BarChartCardProps { title: string; data: Record<string, unknown>[]; series: Series[]; height?: number; layout?: 'vertical' | 'horizontal'; }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bq-surface-2)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fff' }}>
      <div style={{ color: 'var(--bq-text-3)', marginBottom: 6, fontSize: 11 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: 'inline-block' }} />
          <span>{p.name}: <strong>{p.value.toLocaleString()}</strong></span>
        </div>
      ))}
    </div>
  );
};

export default function BarChartCard({ title, data, series, height = 260, layout = 'horizontal' }: BarChartCardProps) {
  return (
    <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 12, padding: 20 }}>
      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 15, fontWeight: 600, color: 'var(--bq-white)', marginBottom: 20 }}>{title}</div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout={layout} margin={{ top: 4, right: 4, bottom: 0, left: layout === 'vertical' ? 80 : -16 }}>
          <CartesianGrid strokeDasharray={chartTheme.grid.strokeDasharray} stroke={chartTheme.grid.stroke} vertical={false} />
          {layout === 'horizontal' ? (
            <>
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
            </>
          ) : (
            <>
              <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
            </>
          )}
          <Tooltip contentStyle={chartTheme.tooltip.contentStyle} labelStyle={chartTheme.tooltip.labelStyle} itemStyle={chartTheme.tooltip.itemStyle} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', paddingTop: 12 }} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={48} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
