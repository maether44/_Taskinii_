'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Bell, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type DateRange = '7d' | '30d' | '90d';

interface TopBarProps {
  sidebarWidth: number;
  onDateRangeChange?: (range: DateRange) => void;
}

function buildBreadcrumb(pathname: string): string[] {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '));
}

export default function TopBar({ sidebarWidth, onDateRangeChange }: TopBarProps) {
  const pathname = usePathname();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [search, setSearch] = useState('');
  const [adminName, setAdminName] = useState('Admin');
  const breadcrumb = buildBreadcrumb(pathname);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('full_name').eq('id', user.id).single()
        .then(({ data }) => { if (data?.full_name) setAdminName(data.full_name); });
    });
  }, []);

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('dash-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function handleDateRange(r: DateRange) {
    setDateRange(r);
    onDateRangeChange?.(r);
  }

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: sidebarWidth,
        right: 0,
        height: 60,
        background: 'var(--bq-surface-1)',
        borderBottom: '1px solid var(--bq-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
        zIndex: 90,
        transition: 'left 250ms ease-in-out',
      }}
    >
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-inter)', flexShrink: 0 }}>
        {breadcrumb.map((crumb, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <ChevronRight size={14} style={{ color: 'var(--bq-text-3)', flexShrink: 0 }} />}
            <span style={{
              fontSize: 14,
              fontWeight: i === breadcrumb.length - 1 ? 500 : 400,
              color: i === breadcrumb.length - 1 ? 'var(--bq-white)' : 'var(--bq-text-3)',
              whiteSpace: 'nowrap',
            }}>{crumb}</span>
          </span>
        ))}
      </div>

      {/* Search */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bq-text-3)' }} />
          <input
            id="dash-search"
            type="text"
            placeholder="Search users, plans, tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              background: 'var(--bq-surface-3)',
              border: '1px solid var(--bq-border)',
              borderRadius: 8,
              padding: '0 80px 0 36px',
              fontFamily: 'var(--font-inter)',
              fontSize: 13,
              color: 'var(--bq-text-1)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--bq-purple)'; }}
            onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--bq-border)'; }}
          />
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)', borderRadius: 4, padding: '1px 6px', fontSize: 10, color: 'var(--bq-text-3)', fontFamily: 'var(--font-inter)', whiteSpace: 'nowrap' }}>⌘K</span>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {/* Date range */}
        <div style={{ display: 'flex', background: 'var(--bq-surface-3)', border: '1px solid var(--bq-border)', borderRadius: 8, overflow: 'hidden' }}>
          {(['7d', '30d', '90d'] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => handleDateRange(r)}
              style={{
                padding: '5px 12px',
                background: dateRange === r ? 'var(--bq-purple-dim)' : 'transparent',
                border: 'none',
                color: dateRange === r ? 'var(--bq-text-1)' : 'var(--bq-text-3)',
                fontFamily: 'var(--font-inter)',
                fontSize: 12,
                fontWeight: dateRange === r ? 500 : 400,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Notifications */}
        <button aria-label="Notifications" style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bq-text-2)', padding: 4, display: 'flex', alignItems: 'center' }}>
          <Bell size={18} strokeWidth={1.5} />
          <span style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: 'var(--bq-lime)', border: '2px solid var(--bq-surface-1)' }} />
        </button>

        {/* Admin avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--bq-purple), #4A28D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {adminName.charAt(0).toUpperCase()}
          </div>
          <ChevronDown size={14} style={{ color: 'var(--bq-text-3)' }} />
        </div>
      </div>
    </header>
  );
}
