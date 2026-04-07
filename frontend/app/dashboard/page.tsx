import { unstable_noStore as noStore } from 'next/cache';
import { getKPISummary, getUserGrowth, getRevenueBreakdown } from '@/lib/supabase/queries/analytics';
import { getTopActiveUsers } from '@/lib/supabase/queries/users';
import { getRecentAISessions } from '@/lib/supabase/queries/ai';
import { getAuditLog } from '@/lib/supabase/queries/audit';
import KPICard from '@/components/dashboard/KPICard';
import AreaChartCard from '@/components/dashboard/AreaChartCard';
import PieChartCard from '@/components/dashboard/PieChartCard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import PlanBadge from '@/components/dashboard/PlanBadge';
import PageHeader from '@/components/dashboard/PageHeader';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function AccuracyBadge({ v }: { v: number | null }) {
  const color = v == null ? 'var(--bq-muted)' : v >= 90 ? '#22c55e' : v >= 75 ? '#eab308' : '#ef4444';
  return (
    <span style={{ color, fontWeight: 600, fontSize: 13 }}>
      {v != null ? `${v}%` : '—'}
    </span>
  );
}

export default async function AdminDashboardPage() {
  noStore();

  const [kpi, growth, revenue, topUsers, aiSessions, auditEntries] = await Promise.all([
    getKPISummary().catch(() => null),
    getUserGrowth(30).catch(() => []),
    getRevenueBreakdown().catch(() => []),
    getTopActiveUsers(6).catch(() => []),
    getRecentAISessions(8).catch(() => []),
    getAuditLog(12).catch(() => []),
  ]);

  const sparkBase = Array.from({ length: 7 }, (_, i) => ({ day: i, v: Math.floor(60 + Math.random() * 40) }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="Overview"
        description="Real-time platform snapshot"
      />

      {/* ── Row 1: KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        <KPICard
          label="Total Users"
          value={kpi?.totalUsers ?? 0}
          delta={kpi?.totalUsersDelta ?? 0}
          deltaLabel="vs last week"
          sparkData={sparkBase}
        />
        <KPICard
          label="Active Today"
          value={kpi?.activeToday ?? 0}
          delta={kpi?.activeTodayDelta ?? 0}
          deltaLabel="vs yesterday"
          sparkData={sparkBase}
        />
        <KPICard
          label="MRR"
          value={(kpi?.mrr ?? 0) / 100}
          prefix="$"
          delta={kpi?.mrrDelta ?? 0}
          deltaLabel="vs last month"
          sparkData={sparkBase}
          highlight
        />
        <KPICard
          label="AI Sessions Today"
          value={kpi?.aiSessionsToday ?? 0}
          delta={kpi?.aiSessionsDelta ?? 0}
          deltaLabel="vs yesterday"
          sparkData={sparkBase}
        />
        <KPICard
          label="Churn Rate"
          value={kpi?.churnRate ?? 0}
          suffix="%"
          decimals={1}
          delta={kpi?.churnDelta ?? 0}
          deltaLabel="churn vs last month"
          sparkData={sparkBase}
        />
      </div>

      {/* ── Row 2: Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <AreaChartCard
          title="User Growth (30 days)"
          data={growth as Record<string, unknown>[]}
          dataKeys={[
            { key: 'newUsers', color: 'var(--chart-purple)', label: 'New Users' },
            { key: 'churned', color: 'var(--chart-teal)', label: 'Churned' },
          ]}
        />
        <PieChartCard title="Revenue Breakdown" data={revenue} />
      </div>

      {/* ── Row 3: Top Users + AI Sessions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Top Active Users */}
        <div style={{
          background: 'var(--bq-surface-2)',
          border: '1px solid var(--bq-border)',
          borderRadius: 12,
          padding: 20,
        }}>
          <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, color: 'var(--bq-white)', marginBottom: 16 }}>
            Top Active Users
          </p>
          {topUsers.length === 0 ? (
            <p style={{ color: 'var(--bq-muted)', fontSize: 13, fontFamily: 'var(--font-inter)' }}>No active users today.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topUsers.map((u) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--bq-purple), #4A28D4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 13, color: '#fff',
                  }}>
                    {(u.full_name ?? u.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 500, color: 'var(--bq-text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.full_name ?? u.email}
                    </p>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)' }}>
                      {u.last_active ? timeAgo(u.last_active) : 'N/A'}
                    </p>
                  </div>
                  <PlanBadge plan={u.plan ?? 'free'} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent AI Sessions */}
        <div style={{
          background: 'var(--bq-surface-2)',
          border: '1px solid var(--bq-border)',
          borderRadius: 12,
          padding: 20,
        }}>
          <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, color: 'var(--bq-white)', marginBottom: 16 }}>
            Recent AI Sessions
          </p>
          {aiSessions.length === 0 ? (
            <p style={{ color: 'var(--bq-muted)', fontSize: 13, fontFamily: 'var(--font-inter)' }}>No sessions yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {aiSessions.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: s.error ? '#ef4444' : '#22c55e',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.user_name ?? 'Unknown'} — <span style={{ color: 'var(--bq-muted)' }}>{s.type}</span>
                    </p>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)' }}>
                      {s.duration}s · {timeAgo(s.created_at)}
                    </p>
                  </div>
                  <AccuracyBadge v={s.accuracy} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Activity Feed ── */}
      <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 12, padding: 20 }}>
        <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, color: 'var(--bq-white)', marginBottom: 16 }}>Recent Activity</p>
        <ActivityFeed
          items={auditEntries.map((e) => ({
            id: e.id,
            action: e.action,
            resource: e.resource,
            details: typeof e.details === 'string' ? e.details : JSON.stringify(e.details ?? ''),
            created_at: e.created_at,
            admin_name: e.admin_name,
          }))}
        />
      </div>
    </div>
  );
}
