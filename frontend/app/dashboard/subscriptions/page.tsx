import { unstable_noStore as noStore } from 'next/cache';
import { getRevenueBreakdown } from '@/lib/supabase/queries/analytics';
import KPICard from '@/components/dashboard/KPICard';
import AreaChartCard from '@/components/dashboard/AreaChartCard';
import PieChartCard from '@/components/dashboard/PieChartCard';
import PageHeader from '@/components/dashboard/PageHeader';
import PlanBadge from '@/components/dashboard/PlanBadge';

const AT_RISK_DEMO = [
  { id: '1', name: 'Rami L.', plan: 'pro', lastActive: '9 days ago', daysInactive: 9 },
  { id: '2', name: 'Karim J.', plan: 'elite', lastActive: '12 days ago', daysInactive: 12 },
  { id: '3', name: 'Omar A.', plan: 'pro', lastActive: '8 days ago', daysInactive: 8 },
  { id: '4', name: 'Huda B.', plan: 'pro', lastActive: '15 days ago', daysInactive: 15 },
  { id: '5', name: 'Maya H.', plan: 'elite', lastActive: '10 days ago', daysInactive: 10 },
];

export default async function SubscriptionsPage() {
  noStore();

  const revenue = await getRevenueBreakdown().catch(() => [
    { name: 'Pro', value: 4200, color: 'var(--chart-purple)' },
    { name: 'Elite', value: 1800, color: 'var(--chart-lime)' },
    { name: 'Other', value: 300, color: 'var(--chart-blue)' },
  ]);

  const mrrTrend = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
    mrr: 4200 + i * 80 + Math.floor(i * 1.3 * 20),
  }));

  const spark = Array.from({ length: 7 }, (_, i) => ({ day: i, v: Math.floor(60 + i * 5) }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader title="Subscriptions" description="MRR, churn, and plan distribution" />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <KPICard label="MRR" value={6300} prefix="$" delta={6.1} deltaLabel="vs last month" sparkData={spark} highlight />
        <KPICard label="Active Subscribers" value={342} delta={3.8} deltaLabel="vs last month" sparkData={spark} />
        <KPICard label="Churn Rate" value={2.1} suffix="%" decimals={1} delta={-0.3} deltaLabel="churn vs last month" sparkData={spark} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <AreaChartCard
          title="MRR Trend (30 days)"
          data={mrrTrend}
          dataKeys={[{ key: 'mrr', color: 'var(--chart-lime)', label: 'MRR ($)' }]}
        />
        <PieChartCard title="Revenue by Plan" data={revenue} />
      </div>

      {/* At-risk users */}
      <div style={{
        background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)',
        borderRadius: 12, padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: 15, color: 'var(--bq-text-1)', marginBottom: 4 }}>
              At-Risk Users
            </p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-muted)' }}>
              Paid subscribers inactive for 7+ days
            </p>
          </div>
          <button style={{
            background: 'none', border: '1px solid var(--bq-border)', borderRadius: 8,
            padding: '7px 14px', fontFamily: 'var(--font-inter)', fontSize: 12,
            color: 'var(--bq-text-2)', cursor: 'pointer',
          }}>
            Export
          </button>
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 100px 120px 120px 120px',
          gap: 12, padding: '8px 12px',
          borderBottom: '1px solid var(--bq-border)',
        }}>
          {['User', 'Plan', 'Last Active', 'Days Inactive', 'Action'].map((h) => (
            <span key={h} style={{ fontFamily: 'var(--font-inter)', fontSize: 11, fontWeight: 600, color: 'var(--bq-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
          ))}
        </div>

        {AT_RISK_DEMO.map((u) => (
          <div key={u.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 120px 120px 120px',
            gap: 12, padding: '12px',
            borderBottom: '1px solid var(--bq-border)',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--bq-purple), #4A28D4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 12, color: '#fff', flexShrink: 0,
              }}>
                {u.name.charAt(0)}
              </div>
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-1)', fontWeight: 500 }}>{u.name}</span>
            </div>
            <PlanBadge plan={u.plan} />
            <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-muted)' }}>{u.lastActive}</span>
            <span style={{
              fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 600,
              color: u.daysInactive >= 14 ? '#ef4444' : '#eab308',
            }}>{u.daysInactive}d</span>
            <button style={{
              background: 'none', border: '1px solid var(--bq-border)', borderRadius: 6,
              padding: '5px 12px', fontFamily: 'var(--font-inter)', fontSize: 12,
              color: 'var(--bq-purple)', cursor: 'pointer',
            }}>
              Send Nudge
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
