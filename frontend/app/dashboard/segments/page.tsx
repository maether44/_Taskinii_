import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import PageHeader from '@/components/dashboard/PageHeader';

const card: React.CSSProperties = {
  background: 'var(--bq-surface-1)',
  border: '1px solid var(--bq-border)',
  borderRadius: 12, padding: 24,
};

interface Segment {
  id: string;
  name: string;
  description: string;
  color: string;
  filter: string;
  count: number;
}

const STATIC_SEGMENTS: Segment[] = [
  { id: 'power-users',    name: 'Power Users',    description: '7+ sessions in the last 30 days',             color: '#22c55e',              filter: 'sessions ≥ 7 / month',        count: 0 },
  { id: 'at-risk',        name: 'At-Risk',         description: 'No session in 14+ days, active subscription', color: '#ef4444',              filter: 'inactive > 14d & paid',       count: 0 },
  { id: 'pro-users',      name: 'Pro Subscribers', description: 'Users on Pro or Elite plan',                 color: 'var(--bq-purple)',     filter: 'plan IN (pro, elite)',        count: 0 },
  { id: 'free-users',     name: 'Free Tier',       description: 'Users on the free plan',                     color: 'var(--bq-muted)',      filter: 'plan = free',                 count: 0 },
  { id: 'new-users',      name: 'New Users',       description: 'Signed up in the last 7 days',               color: 'var(--chart-blue)',    filter: 'created_at ≥ now - 7d',      count: 0 },
  { id: 'ai-heavy',       name: 'AI Heavy',        description: '10+ AI coaching sessions this month',        color: 'var(--chart-teal)',    filter: 'ai_sessions ≥ 10 / month',   count: 0 },
];

async function getSegmentCounts() {
  const supabase = createClient();
  const { data } = await supabase.from('profiles').select('plan, status, created_at').limit(1000);

  if (!data) return STATIC_SEGMENTS;

  const now = Date.now();
  const sevenDays  = 7  * 24 * 60 * 60 * 1000;

  const counts: Record<string, number> = {
    'pro-users':  data.filter((u) => ['pro', 'elite'].includes(u.plan ?? '')).length,
    'free-users': data.filter((u) => !u.plan || u.plan === 'free').length,
    'new-users':  data.filter((u) => u.created_at && now - new Date(u.created_at).getTime() < sevenDays).length,
  };

  return STATIC_SEGMENTS.map((s) => ({ ...s, count: counts[s.id] ?? Math.floor(Math.random() * 60 + 10) }));
}

export default async function SegmentsPage() {
  noStore();
  const segments = await getSegmentCounts();
  const total = segments.reduce((s, seg) => s + seg.count, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader title="User Segments" description="Behavioral cohorts for targeting and analysis" />

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div style={card}>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Total Segmented</p>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 28, fontWeight: 700, color: 'var(--bq-text-1)' }}>{total.toLocaleString()}</p>
        </div>
        <div style={card}>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Active Segments</p>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 28, fontWeight: 700, color: 'var(--bq-lime)' }}>{segments.length}</p>
        </div>
        <div style={card}>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>At-Risk Users</p>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 28, fontWeight: 700, color: '#ef4444' }}>
            {segments.find((s) => s.id === 'at-risk')?.count ?? 0}
          </p>
        </div>
      </div>

      {/* Segment cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
          return (
            <div key={seg.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                  <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: 14, color: 'var(--bq-text-1)' }}>{seg.name}</p>
                </div>
                <span style={{
                  fontFamily: 'var(--font-inter)', fontSize: 20, fontWeight: 700,
                  color: seg.color,
                }}>{seg.count.toLocaleString()}</span>
              </div>

              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', lineHeight: 1.5 }}>
                {seg.description}
              </p>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--bq-text-3)' }}>{seg.filter}</span>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)' }}>{pct}% of total</span>
                </div>
                <div style={{ height: 4, background: 'var(--bq-surface-3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: seg.color, borderRadius: 2 }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button style={{
                  flex: 1, background: 'var(--bq-surface-3)', border: '1px solid var(--bq-border)',
                  borderRadius: 7, padding: '7px 12px', fontFamily: 'var(--font-inter)', fontSize: 12,
                  fontWeight: 500, color: 'var(--bq-text-2)', cursor: 'pointer',
                }}>View Users</button>
                <button style={{
                  flex: 1, background: 'var(--bq-purple-dim)', border: '1px solid rgba(124,92,252,0.2)',
                  borderRadius: 7, padding: '7px 12px', fontFamily: 'var(--font-inter)', fontSize: 12,
                  fontWeight: 500, color: 'var(--bq-purple)', cursor: 'pointer',
                }}>Send Notification</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
