interface SkeletonProps { width?: string; height?: string; borderRadius?: number; }
export function Skeleton({ width = '100%', height = '16px', borderRadius = 6 }: SkeletonProps) {
  return <div className="skeleton" style={{ width, height, borderRadius }} />;
}
export function CardSkeleton() {
  return (
    <div style={{ background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton width="40%" height="11px" />
      <Skeleton width="60%" height="36px" />
      <Skeleton width="30%" height="12px" />
      <Skeleton height="48px" />
    </div>
  );
}
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 16px', alignItems: 'center' }}>
          <Skeleton width="32px" height="32px" borderRadius={999} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="40%" height="13px" />
            <Skeleton width="60%" height="11px" />
          </div>
          <Skeleton width="60px" height="20px" borderRadius={999} />
        </div>
      ))}
    </div>
  );
}
