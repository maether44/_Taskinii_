'use client';
import { UserPlus, CreditCard, Zap, AlertCircle, Settings, FileText } from 'lucide-react';
interface ActivityEvent { id: string; action: string; admin_name?: string | null; resource: string; details?: string | null; created_at: string; }
const EVENT_CONFIG: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  USER_CREATE:     { icon: <UserPlus size={14} />,  bg: 'rgba(124,92,252,0.15)', color: 'var(--bq-purple)' },
  PLAN_CHANGE:     { icon: <CreditCard size={14} />, bg: 'rgba(200,241,53,0.12)', color: 'var(--bq-lime)' },
  AI_ERROR:        { icon: <Zap size={14} />,        bg: 'rgba(239,68,68,0.12)',  color: 'var(--bq-danger)' },
  SETTINGS_CHANGE: { icon: <Settings size={14} />,   bg: 'rgba(56,189,248,0.12)', color: '#38BDF8' },
  CONTENT_UPDATE:  { icon: <FileText size={14} />,   bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
};
const DEFAULT_EVENT = { icon: <AlertCircle size={14} />, bg: 'var(--bq-surface-3)', color: 'var(--bq-text-2)' };
function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}
export default function ActivityFeed({ items }: { items: ActivityEvent[] }) {
  const events = items ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {events.map((e, i) => {
        const cfg = EVENT_CONFIG[e.action] ?? DEFAULT_EVENT;
        return (
        <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderTop: i > 0 ? '1px solid var(--bq-border)' : 'none' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: cfg.color }}>
            {cfg.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--bq-text-1)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>{e.admin_name ?? 'System'}</span>
              <span style={{ color: 'var(--bq-text-3)' }}>·</span>
              <span style={{ color: 'var(--bq-text-2)' }}>{e.action.replace(/_/g, ' ').toLowerCase()}</span>
              <span style={{ color: 'var(--bq-text-3)' }}>·</span>
              <span style={{ color: 'var(--bq-purple)', fontSize: 12 }}>{e.resource}</span>
            </div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--bq-text-3)', flexShrink: 0, whiteSpace: 'nowrap' }}>{timeAgo(e.created_at)}</span>
        </div>
        );
      })}
    </div>
  );
}
