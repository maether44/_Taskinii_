'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { chartTheme } from '@/lib/chartTheme';

interface PieSlice { name: string; value: number; color: string; }
interface PieChartCardProps { title: string; data: PieSlice[]; height?: number; donut?: boolean; }

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: PieSlice }[] }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{ background: 'var(--bq-surface-2)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: p.payload.color, display: 'inline-block' }} />
        <span>{p.name}: <strong>${p.value.toLocaleString()}</strong></span>
      </div>
    </div>
  );
};

export default function PieChartCard({ title, data, height = 260, donut = true }: PieChartCardProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 12, padding: 20 }}>
      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 15, fontWeight: 600, color: 'var(--bq-white)', marginBottom: 20 }}>{title}</div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={90} innerRadius={donut ? 50 : 0} paddingAngle={2}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={chartTheme.tooltip.contentStyle} labelStyle={chartTheme.tooltip.labelStyle} itemStyle={chartTheme.tooltip.itemStyle} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', paddingTop: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {data.map((d) => (
          <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, display: 'inline-block' }} />
              <span style={{ fontSize: 13, color: 'var(--bq-text-2)' }}>{d.name}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bq-text-1)' }}>
              ${d.value.toLocaleString()} <span style={{ fontSize: 11, color: 'var(--bq-text-3)', fontWeight: 400 }}>({total > 0 ? Math.round((d.value / total) * 100) : 0}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
