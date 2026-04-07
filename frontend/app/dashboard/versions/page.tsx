import PageHeader from '@/components/dashboard/PageHeader';

interface AppVersion {
  version: string;
  build: number;
  platform: 'iOS' | 'Android' | 'Both';
  status: 'live' | 'rollout' | 'deprecated' | 'draft';
  releaseDate: string;
  forceUpdate: boolean;
  adoptionPct: number;
  changelog: string[];
}

const VERSIONS: AppVersion[] = [
  {
    version: '2.4.1', build: 241, platform: 'Both', status: 'live',
    releaseDate: 'Mar 28, 2026', forceUpdate: false, adoptionPct: 62,
    changelog: ['Fixed posture analysis crash on iPhone 15 Pro', 'Improved Yara response latency by 40%', 'Dark mode polish in onboarding flow'],
  },
  {
    version: '2.4.0', build: 240, platform: 'Both', status: 'live',
    releaseDate: 'Mar 15, 2026', forceUpdate: false, adoptionPct: 28,
    changelog: ['RAG-powered AI coaching (Mode B)', 'Muscle heatmap visualisation', 'Supabase workout session persistence'],
  },
  {
    version: '2.3.5', build: 235, platform: 'Android', status: 'deprecated',
    releaseDate: 'Feb 20, 2026', forceUpdate: false, adoptionPct: 7,
    changelog: ['Hotfix: payment webhook signature check', 'Dependency security patches'],
  },
  {
    version: '2.3.4', build: 234, platform: 'iOS', status: 'deprecated',
    releaseDate: 'Feb 14, 2026', forceUpdate: false, adoptionPct: 2,
    changelog: ['App Store compliance update', 'Privacy manifest additions'],
  },
  {
    version: '2.5.0', build: 250, platform: 'Both', status: 'draft',
    releaseDate: 'Scheduled Apr 10, 2026', forceUpdate: false, adoptionPct: 0,
    changelog: ['Social leaderboard beta', 'Video form analysis v1', 'Push notification overhaul'],
  },
];

const STATUS_STYLE: Record<AppVersion['status'], { bg: string; color: string; label: string }> = {
  live:       { bg: 'rgba(34,197,94,0.1)',   color: '#22c55e',             label: 'Live'        },
  rollout:    { bg: 'rgba(56,189,248,0.1)',   color: 'var(--chart-blue)',   label: 'Rolling Out' },
  deprecated: { bg: 'rgba(107,98,128,0.12)', color: 'var(--bq-muted)',     label: 'Deprecated'  },
  draft:      { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b',             label: 'Draft'       },
};

const PLATFORM_STYLE: Record<AppVersion['platform'], { bg: string; color: string }> = {
  iOS:     { bg: 'rgba(124,92,252,0.12)', color: 'var(--bq-purple)' },
  Android: { bg: 'rgba(200,241,53,0.1)',  color: 'var(--bq-lime)'   },
  Both:    { bg: 'rgba(56,189,248,0.1)',  color: 'var(--chart-blue)' },
};

const card: React.CSSProperties = {
  background: 'var(--bq-surface-1)',
  border: '1px solid var(--bq-border)',
  borderRadius: 12, padding: 20,
};

export default function VersionsPage() {
  const liveVersions  = VERSIONS.filter((v) => v.status === 'live' || v.status === 'rollout');
  const totalAdoption = VERSIONS.filter((v) => v.status !== 'draft').reduce((s, v) => s + v.adoptionPct, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="App Versions"
        description="Track releases, adoption, and force-update rules across iOS and Android"
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Versions', value: VERSIONS.length, color: 'var(--bq-text-1)' },
          { label: 'Live Versions', value: liveVersions.length, color: '#22c55e' },
          { label: 'Latest Build', value: `v${liveVersions[0]?.version ?? '—'}`, color: 'var(--bq-purple)' },
          { label: 'Overall Adoption', value: `${totalAdoption}%`, color: 'var(--bq-lime)' },
        ].map((kpi) => (
          <div key={kpi.label} style={card}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{kpi.label}</p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 26, fontWeight: 700, color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Version list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {VERSIONS.map((v) => {
          const ss = STATUS_STYLE[v.status];
          const ps = PLATFORM_STYLE[v.platform];
          return (
            <div key={v.version} style={{ ...card, display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start' }}>
              <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 18, color: 'var(--bq-text-1)' }}>
                    v{v.version}
                  </span>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-text-3)' }}>
                    build {v.build}
                  </span>
                  <span style={{ background: ss.bg, color: ss.color, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontFamily: 'var(--font-inter)', fontWeight: 600 }}>
                    {ss.label}
                  </span>
                  <span style={{ background: ps.bg, color: ps.color, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontFamily: 'var(--font-inter)', fontWeight: 600 }}>
                    {v.platform}
                  </span>
                  {v.forceUpdate && (
                    <span style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontFamily: 'var(--font-inter)', fontWeight: 600 }}>
                      Force Update
                    </span>
                  )}
                </div>

                {/* Date + adoption */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)' }}>
                    {v.releaseDate}
                  </span>
                  {v.adoptionPct > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 4, background: 'var(--bq-surface-3)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${v.adoptionPct}%`, background: ss.color, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 600, color: ss.color }}>
                        {v.adoptionPct}% adoption
                      </span>
                    </div>
                  )}
                </div>

                {/* Changelog */}
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  {v.changelog.map((line, i) => (
                    <li key={i} style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-2)', marginBottom: 3, lineHeight: 1.5 }}>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 120 }}>
                {v.status === 'draft' && (
                  <button style={{
                    background: 'var(--bq-purple)', border: 'none', borderRadius: 7,
                    padding: '8px 16px', fontFamily: 'var(--font-inter)', fontSize: 12,
                    fontWeight: 600, color: '#fff', cursor: 'pointer',
                  }}>Publish</button>
                )}
                {(v.status === 'live' || v.status === 'rollout') && (
                  <button style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7,
                    padding: '8px 16px', fontFamily: 'var(--font-inter)', fontSize: 12,
                    fontWeight: 500, color: '#ef4444', cursor: 'pointer',
                  }}>Force Update</button>
                )}
                <button style={{
                  background: 'var(--bq-surface-3)', border: '1px solid var(--bq-border)', borderRadius: 7,
                  padding: '8px 16px', fontFamily: 'var(--font-inter)', fontSize: 12,
                  color: 'var(--bq-text-2)', cursor: 'pointer',
                }}>Edit Notes</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
