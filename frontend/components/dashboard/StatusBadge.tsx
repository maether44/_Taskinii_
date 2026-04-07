type Status = 'active' | 'inactive' | 'banned' | 'trialing' | 'past_due' | 'cancelled' | 'open' | 'in_progress' | 'resolved' | 'draft' | 'scheduled' | 'sent' | 'paused';
const MAP: Record<string, { bg: string; color: string; border: string; label: string }> = {
  active:      { bg: 'rgba(34,197,94,0.15)',   color: 'var(--bq-success)', border: '1px solid rgba(34,197,94,0.30)',   label: 'Active' },
  inactive:    { bg: 'rgba(245,158,11,0.15)',  color: 'var(--bq-warning)', border: '1px solid rgba(245,158,11,0.30)',  label: 'Inactive' },
  banned:      { bg: 'rgba(239,68,68,0.15)',   color: 'var(--bq-danger)',  border: '1px solid rgba(239,68,68,0.30)',   label: 'Banned' },
  trialing:    { bg: 'rgba(56,189,248,0.15)',  color: 'var(--bq-info)',    border: '1px solid rgba(56,189,248,0.30)',  label: 'Trial' },
  past_due:    { bg: 'rgba(239,68,68,0.15)',   color: 'var(--bq-danger)',  border: '1px solid rgba(239,68,68,0.30)',   label: 'Past Due' },
  cancelled:   { bg: 'rgba(107,98,128,0.20)',  color: 'var(--bq-text-3)', border: '1px solid rgba(107,98,128,0.40)',  label: 'Cancelled' },
  open:        { bg: 'rgba(56,189,248,0.15)',  color: 'var(--bq-info)',    border: '1px solid rgba(56,189,248,0.30)',  label: 'Open' },
  in_progress: { bg: 'rgba(245,158,11,0.15)',  color: 'var(--bq-warning)', border: '1px solid rgba(245,158,11,0.30)',  label: 'In Progress' },
  resolved:    { bg: 'rgba(34,197,94,0.15)',   color: 'var(--bq-success)', border: '1px solid rgba(34,197,94,0.30)',   label: 'Resolved' },
  draft:       { bg: 'rgba(107,98,128,0.20)',  color: 'var(--bq-text-3)', border: '1px solid rgba(107,98,128,0.40)',  label: 'Draft' },
  scheduled:   { bg: 'rgba(56,189,248,0.15)',  color: 'var(--bq-info)',    border: '1px solid rgba(56,189,248,0.30)',  label: 'Scheduled' },
  sent:        { bg: 'rgba(34,197,94,0.15)',   color: 'var(--bq-success)', border: '1px solid rgba(34,197,94,0.30)',   label: 'Sent' },
  paused:      { bg: 'rgba(245,158,11,0.15)',  color: 'var(--bq-warning)', border: '1px solid rgba(245,158,11,0.30)',  label: 'Paused' },
};
export default function StatusBadge({ status }: { status: string }) {
  const s = MAP[status.toLowerCase()] ?? { bg: 'rgba(107,98,128,0.20)', color: 'var(--bq-text-3)', border: '1px solid rgba(107,98,128,0.40)', label: status };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: s.bg, color: s.color, border: s.border, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-inter)', whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
      {s.label}
    </span>
  );
}
