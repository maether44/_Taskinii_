import { Inbox } from 'lucide-react';
interface EmptyStateProps { title?: string; description?: string; icon?: React.ReactNode; action?: React.ReactNode; }
export default function EmptyState({ title = 'No data yet', description = 'Nothing to show here.', icon, action }: EmptyStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 16, textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bq-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bq-text-3)' }}>
        {icon ?? <Inbox size={24} strokeWidth={1.5} />}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-syne)', fontSize: 15, fontWeight: 700, color: 'var(--bq-white)', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--bq-text-3)', maxWidth: 300 }}>{description}</div>
      </div>
      {action}
    </div>
  );
}
