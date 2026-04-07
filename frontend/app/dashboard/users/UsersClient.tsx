'use client';

import React, { useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/dashboard/PageHeader';
import FilterBar from '@/components/dashboard/FilterBar';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import StatusBadge from '@/components/dashboard/StatusBadge';
import PlanBadge from '@/components/dashboard/PlanBadge';
import UserDrawer from '@/components/dashboard/UserDrawer';
import { AdminUser } from '@/lib/supabase/queries/users';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(str: string): string {
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function UserCell({ user }: { user: AdminUser }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, var(--bq-purple), #4A28D4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 13, color: '#fff',
      }}>
        {(user.full_name ?? user.email ?? '?').charAt(0).toUpperCase()}
      </div>
      <div>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 500, color: 'var(--bq-text-1)', margin: 0 }}>
          {user.full_name ?? '—'}
        </p>
        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', margin: 0 }}>
          {user.email}
        </p>
      </div>
    </div>
  );
}

const columns: Column<AdminUser>[] = [
  {
    key: 'full_name',
    header: 'User',
    render: (u) => <UserCell user={u} />,
  },
  {
    key: 'plan',
    header: 'Plan',
    render: (u) => <PlanBadge plan={u.plan ?? 'free'} />,
  },
  {
    key: 'status',
    header: 'Status',
    render: (u) => <StatusBadge status={u.status ?? 'active'} />,
  },
  {
    key: 'created_at',
    header: 'Joined',
    render: (u) => (
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-2)' }}>
        {formatDate(u.created_at)}
      </span>
    ),
  },
  {
    key: 'last_active',
    header: 'Last Active',
    render: (u) => (
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-muted)' }}>
        {u.last_active ? timeAgo(u.last_active) : '—'}
      </span>
    ),
  },
  {
    key: 'total_sessions',
    header: 'Sessions',
    render: (u) => (
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-2)', fontVariantNumeric: 'tabular-nums' }}>
        {u.total_sessions}
      </span>
    ),
  },
];

const PLAN_OPTIONS = [
  { label: 'All Plans', value: 'all' },
  { label: 'Free', value: 'free' },
  { label: 'Pro', value: 'pro' },
  { label: 'Elite', value: 'elite' },
];

const STATUS_OPTIONS = [
  { label: 'All Status', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Suspended', value: 'suspended' },
];

interface Props {
  users: AdminUser[];
  total: number;
  page: number;
}

export default function UsersClient({ users, total, page }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerUser, setDrawerUser] = useState<AdminUser | null>(null);

  const perPage = 25;
  const totalPages = Math.ceil(total / perPage);

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const goToPage = useCallback((p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const ExportButton = (
    <button
      onClick={() => {
        const csv = [
          ['Name', 'Email', 'Plan', 'Status', 'Joined', 'Last Active'].join(','),
          ...users.map((u) => [u.full_name ?? '', u.email, u.plan ?? 'free', u.status, u.created_at, u.last_active ?? ''].join(',')),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users.csv';
        a.click();
        URL.revokeObjectURL(url);
      }}
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
        title="Users"
        description={`${total.toLocaleString()} registered users`}
        action={ExportButton}
      />

      <FilterBar
        search={searchParams.get('search') ?? ''}
        onSearch={(v) => updateParam('search', v)}
        filters={[
          { key: 'plan', label: 'Plan', options: PLAN_OPTIONS },
          { key: 'status', label: 'Status', options: STATUS_OPTIONS },
        ]}
        values={{
          plan: searchParams.get('plan') ?? 'all',
          status: searchParams.get('status') ?? 'all',
        }}
        onFilter={(key, value) => updateParam(key, value)}
      />

      <DataTable
        columns={columns}
        data={users}
        onRowClick={(u) => setDrawerUser(u)}
        rowKey={(u) => u.id}
        page={page}
        total={total}
        perPage={perPage}
        onPageChange={goToPage}
      />

      <UserDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />
    </div>
  );
}
