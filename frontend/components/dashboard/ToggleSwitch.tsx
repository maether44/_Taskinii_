'use client';
interface ToggleSwitchProps { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean; }
export default function ToggleSwitch({ checked, onChange, label, disabled }: ToggleSwitchProps) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 999, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          background: checked ? 'var(--bq-purple)' : 'var(--bq-surface-3)',
          position: 'relative', transition: 'background 200ms ease', flexShrink: 0,
        }}
      >
        <span style={{ position: 'absolute', top: 4, left: checked ? 'calc(100% - 20px)' : '4px', width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 200ms ease' }} />
      </button>
      {label && <span style={{ fontSize: 13, color: 'var(--bq-text-2)' }}>{label}</span>}
    </label>
  );
}
