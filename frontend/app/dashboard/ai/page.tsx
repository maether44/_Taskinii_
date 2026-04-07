import { unstable_noStore as noStore } from 'next/cache';
import { getAIAccuracyTrend, getAIErrorLog } from '@/lib/supabase/queries/ai';
import KPICard from '@/components/dashboard/KPICard';
import AreaChartCard from '@/components/dashboard/AreaChartCard';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import PageHeader from '@/components/dashboard/PageHeader';

const MODEL_HEALTH = [
  { name: 'Posture Model v2.1', status: 'Online', latency: '42ms', ok: true },
  { name: 'Recommendation Engine', status: 'Online', latency: '18ms', ok: true },
  { name: 'Nutrition NLP', status: 'Degraded', latency: '380ms', ok: false },
  { name: 'Edge Functions', status: 'Online', latency: '9ms', ok: true },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const errorColumns: Column<any>[] = [
  {
    key: 'user_id',
    header: 'User',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: (r: any) => (
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-1)' }}>
        {r.profiles?.full_name ?? `${String(r.user_id).slice(0, 8)}…`}
      </span>
    ),
  },
  {
    key: 'type',
    header: 'Type',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: (r: any) => (
      <span style={{
        background: 'rgba(124,92,252,0.12)', color: 'var(--bq-purple)',
        borderRadius: 5, padding: '2px 8px', fontSize: 12,
        fontFamily: 'var(--font-inter)', fontWeight: 500,
      }}>{r.type}</span>
    ),
  },
  {
    key: 'error',
    header: 'Error',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: (r: any) => (
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: '#ef4444' }}>{r.error}</span>
    ),
  },
  {
    key: 'created_at',
    header: 'Time',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: (r: any) => (
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)' }}>
        {new Date(r.created_at).toLocaleString()}
      </span>
    ),
  },
];

export default async function AIPage() {
  noStore();

  const [rawTrend, errorLog] = await Promise.all([
    getAIAccuracyTrend(30).catch(() => []),
    getAIErrorLog(50).catch(() => []),
  ]);

  const trend = rawTrend.length > 0
    ? rawTrend.map((d) => ({ ...d, target: 95 }))
    : Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
        accuracy: Math.floor(88 + Math.random() * 10),
        target: 95,
      }));

  const spark = Array.from({ length: 7 }, (_, i) => ({ day: i, v: Math.floor(88 + i * 0.8) }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = (errorLog as any[]).filter((r: any) => r.error != null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader title="AI Engine" description="Posture analysis, recommendations, and model health" />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard label="Accuracy Today" value={93.2} suffix="%" decimals={1} delta={1.4} deltaLabel="vs yesterday" sparkData={spark} />
        <KPICard label="Avg Inference" value={182} suffix="ms" delta={-8.2} deltaLabel="vs yesterday" sparkData={spark} />
        <KPICard label="Error Rate" value={0.8} suffix="%" decimals={1} delta={-0.2} deltaLabel="vs yesterday" sparkData={spark} />
        <KPICard label="Sessions Today" value={847} delta={12.3} deltaLabel="vs yesterday" sparkData={spark} />
      </div>

      {/* Charts + Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <AreaChartCard
          title="Posture Accuracy Trend"
          data={trend}
          dataKeys={[
            { key: 'accuracy', color: 'var(--chart-lime)', label: 'Accuracy (%)' },
            { key: 'target', color: 'var(--chart-purple)', label: 'Target (95%)' },
          ]}
        />

        {/* Model health card */}
        <div style={{
          background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)',
          borderRadius: 12, padding: 20,
        }}>
          <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, color: 'var(--bq-white)', marginBottom: 16 }}>
            Model Health
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MODEL_HEALTH.map((m) => (
              <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bq-surface-2)', borderRadius: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: m.ok ? '#22c55e' : '#eab308',
                  boxShadow: m.ok ? '0 0 6px #22c55e80' : '0 0 6px #eab30880',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 500, color: 'var(--bq-text-1)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.name}
                  </p>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: m.ok ? '#22c55e' : '#eab308', margin: 0 }}>
                    {m.status}
                  </p>
                </div>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', flexShrink: 0 }}>
                  {m.latency}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error log */}
      <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 12, padding: 20 }}>
        <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, color: 'var(--bq-white)', marginBottom: 16 }}>
          Error Log
        </p>
        <DataTable columns={errorColumns} data={errors} rowKey={(r) => r.id} />
      </div>
    </div>
  );
}
