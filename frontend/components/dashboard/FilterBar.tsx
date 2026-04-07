'use client';
import { Search } from 'lucide-react';
interface FilterOption { value: string; label: string; }
interface FilterGroup { key: string; label: string; options: FilterOption[]; }
interface FilterBarProps {
  search?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: FilterGroup[];
  values?: Record<string, string>;
  onFilter?: (key: string, value: string) => void;
  actions?: React.ReactNode;
}
const inputStyle: React.CSSProperties = { height: 36, background: 'var(--bq-surface-3)', border: '1px solid var(--bq-border)', borderRadius: 8, padding: '0 12px', fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-1)', outline: 'none', boxSizing: 'border-box' };
export default function FilterBar({ search, onSearch, searchPlaceholder = 'Search...', filters, values, onFilter, actions }: FilterBarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
      {onSearch !== undefined && (
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 340 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--bq-text-3)', pointerEvents: 'none' }} />
          <input type="text" placeholder={searchPlaceholder} value={search} onChange={(e) => onSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 32, width: '100%' }}
            onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--bq-purple)'; }}
            onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--bq-border)'; }} />
        </div>
      )}
      {filters?.map((f) => (
        <select key={f.key} value={values?.[f.key] ?? 'all'} onChange={(e) => onFilter?.(f.key, e.target.value)} style={{ ...inputStyle, paddingRight: 28, cursor: 'pointer' }}>
          <option value="all">{f.label}: All</option>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ))}
      {actions && <div style={{ marginLeft: 'auto' }}>{actions}</div>}
    </div>
  );
}
