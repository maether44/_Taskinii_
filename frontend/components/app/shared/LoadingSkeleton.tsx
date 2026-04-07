'use client';

export function AppSkeleton({ width = '100%', height = '16px', borderRadius = 6 }: { width?: string; height?: string; borderRadius?: number }) {
  return <div className="skeleton" style={{ width, height, borderRadius }} />;
}

export function KpiSkeleton() {
  return (
    <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <AppSkeleton width="50%" height="12px" />
      <AppSkeleton width="65%" height="32px" />
      <AppSkeleton width="35%" height="10px" />
    </div>
  );
}

export function InsightSkeleton() {
  return (
    <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 12, padding: 16, display: 'flex', gap: 14 }}>
      <AppSkeleton width="36px" height="36px" borderRadius={99} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AppSkeleton width="30%" height="12px" />
        <AppSkeleton height="14px" />
        <AppSkeleton width="70%" height="14px" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div style={{ padding: '24px 20px', maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <AppSkeleton width="40%" height="32px" borderRadius={8} />
      <AppSkeleton width="60%" height="16px" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginTop: 8 }}>
        {[1, 2, 3, 4].map((i) => <KpiSkeleton key={i} />)}
      </div>
      <AppSkeleton height="220px" borderRadius={12} />
      <AppSkeleton height="220px" borderRadius={12} />
    </div>
  );
}
