const MAP: Record<string, { bg: string; color: string; border: string }> = {
  free:  { bg: 'rgba(107,98,128,0.20)',  color: 'rgba(255,255,255,0.60)', border: '1px solid rgba(107,98,128,0.40)' },
  pro:   { bg: 'rgba(124,92,252,0.20)',  color: '#A78EFF',                border: '1px solid rgba(124,92,252,0.40)' },
  elite: { bg: 'rgba(200,241,53,0.12)',  color: 'var(--bq-lime)',          border: '1px solid rgba(200,241,53,0.30)' },
};
export default function PlanBadge({ plan }: { plan: string }) {
  const p = MAP[plan?.toLowerCase()] ?? MAP.free;
  return (
    <span style={{ display: 'inline-block', background: p.bg, color: p.color, border: p.border, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-inter)', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {plan ?? 'Free'}
    </span>
  );
}
