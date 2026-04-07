'use client';

import React, { useState, useMemo } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import { AuditEntry } from '@/lib/supabase/queries/audit';

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  create: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
  update: { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa' },
  delete: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  login: { bg: 'rgba(124,92,252,0.12)', color: 'var(--bq-purple)' },
};

function ActionBadge({ action }: { action: string }) {
  const cat = Object.keys(ACTION_COLORS).find((k) => action.toLowerCase().includes(k)) ?? 'other';
  const style = ACTION_COLORS[cat] ?? { bg: 'var(--bq-surface-3)', color: 'var(--bq-muted)' };
  return (
    <span style={{
      background: style.bg, color: style.color,
      borderRadius: 5, padding: '2px 9px', fontSize: 12,
      fontFamily: 'var(--font-inter)', fontWeight: 500,
    }}>{action}</span>
  );
}

const columns: Column<AuditEntry>[] = [
  {
    key: 'admin_id',
    header: 'Admin',
    render: (e) => (
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 500, color: 'var(--bq-text-1)' }}>
        {e.admin_name ?? e.admin_id.slice(0, 8) + '…'}
      </span>
    ),
  },
  { key: 'action', header: 'Action', render: (e) => <ActionBadge action={e.action} /> },
  {
    key: 'resource',
    header: 'Resource',
    render: (e) => (
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-2)' }}>{e.resource}</span>
    ),
  },
  {
    key: 'details',
    header: 'Details',
    render: (e) => (
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', maxWidth: 240, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {Object.entries(e.details ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}
      </span>
    ),
  },
  {
    key: 'ip',
    header: 'IP',
    render: (e) => (
      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--bq-muted)' }}>{e.ip ?? '—'}</span>
    ),
  },
  {
    key: 'created_at',
    header: 'Time',
    render: (e) => (
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)' }}>
        {new Date(e.created_at).toLocaleString()}
      </span>
    ),
  },
];

const ACTION_FILTER_OPTIONS = [
  { label: 'All Actions', value: 'all' },
  { label: 'Create', value: 'create' },
  { label: 'Update', value: 'update' },
  { label: 'Delete', value: 'delete' },
  { label: 'Login', value: 'login' },
];

interface Props { entries: AuditEntry[]; }

export default function AuditClient({ entries }: Props) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const q = search.toLowerCase();
      const matchSearch = !q || e.action.toLowerCase().includes(q) || e.resource.toLowerCase().includes(q) || (e.admin_name ?? '').toLowerCase().includes(q);
      const matchAction = actionFilter === 'all' || e.action.toLowerCase().includes(actionFilter);
      return matchSearch && matchAction;
    });
  }, [entries, search, actionFilter]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  function handleExport() {
    const csv = [
      ['Admin', 'Action', 'Resource', 'Details', 'IP', 'Time'].join(','),
      ...filtered.map((e) => [
        e.admin_name ?? e.admin_id,
        e.action,
        e.resource,
        Object.entries(e.details ?? {}).map(([k, v]) => `${k}:${v}`).join(';'),
        e.ip ?? '',
        e.created_at,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const ExportButton = (
    <button
      onClick={handleExport}
      style={{
        background: 'none', border: '1px solid var(--bq-border)', borderRadius: 8,
        padding: '8px 16px', fontFamily: 'var(--font-inter)', fontSize: 13,
        color: 'var(--bq-text-2)', cursor: 'pointer',
      }}
    >
      Export CSV
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Audit Log"
        description={`${entries.length} events recorded for compliance`}
        action={ExportButton}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by action, resource, admin…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)',
              borderRadius: 8, padding: '9px 14px 9px 36px',
              fontFamily: 'var(--font-inter)', fontSize: 13,
              color: 'var(--bq-text-1)', outline: 'none',
            }}
          />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--bq-muted)' }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          style={{
            background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)',
            borderRadius: 8, padding: '9px 14px',
            fontFamily: 'var(--font-inter)', fontSize: 13,
            color: 'var(--bq-text-1)', outline: 'none', cursor: 'pointer',
          }}
        >
          {ACTION_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={paginated}
        rowKey={(e) => e.id}
        page={page}
        total={filtered.length}
        perPage={perPage}
        onPageChange={setPage}
      />
    </div>
  );
}
