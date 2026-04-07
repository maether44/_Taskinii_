interface PageHeaderProps { title: string; description?: string; action?: React.ReactNode; }
export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 700, color: 'var(--bq-white)', margin: 0, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{title}</h1>
        {description && <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: 'var(--bq-text-2)', marginTop: 8, marginBottom: 0 }}>{description}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
