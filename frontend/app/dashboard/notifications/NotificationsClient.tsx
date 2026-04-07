'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PageHeader from '@/components/dashboard/PageHeader';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Campaign } from '@/lib/supabase/queries/notifications';

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    push: { bg: 'rgba(124,92,252,0.12)', color: 'var(--bq-purple)' },
    email: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
    sms: { bg: 'rgba(20,184,166,0.12)', color: '#2dd4bf' },
  };
  const style = map[type] ?? { bg: 'var(--bq-surface-3)', color: 'var(--bq-muted)' };
  return (
    <span style={{
      background: style.bg, color: style.color,
      borderRadius: 5, padding: '2px 9px', fontSize: 12,
      fontFamily: 'var(--font-inter)', fontWeight: 500, textTransform: 'capitalize',
    }}>{type}</span>
  );
}

const columns: Column<Campaign>[] = [
  {
    key: 'name',
    header: 'Campaign',
    render: (c) => (
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 500, color: 'var(--bq-text-1)' }}>{c.name}</span>
    ),
  },
  { key: 'type', header: 'Type', render: (c) => <TypeBadge type={c.type} /> },
  { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
  {
    key: 'sent_count',
    header: 'Sent',
    render: (c) => (
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-2)', fontVariantNumeric: 'tabular-nums' }}>
        {c.sent_count.toLocaleString()}
      </span>
    ),
  },
  {
    key: 'open_rate',
    header: 'Open Rate',
    render: (c) => (
      <span style={{
        fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 600,
        color: c.open_rate >= 30 ? '#22c55e' : c.open_rate >= 15 ? '#eab308' : '#ef4444',
      }}>
        {c.open_rate}%
      </span>
    ),
  },
  {
    key: 'scheduled_at',
    header: 'Scheduled',
    render: (c) => (
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-muted)' }}>
        {c.scheduled_at ? new Date(c.scheduled_at).toLocaleDateString() : '—'}
      </span>
    ),
  },
  {
    key: 'created_at',
    header: 'Created',
    render: (c) => (
      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)' }}>
        {new Date(c.created_at).toLocaleDateString()}
      </span>
    ),
  },
];

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--bq-surface-3)', border: '1px solid var(--bq-border)',
  borderRadius: 8, padding: '10px 14px',
  fontFamily: 'var(--font-inter)', fontSize: 14,
  color: 'var(--bq-text-1)', outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-inter)',
  fontSize: 12, fontWeight: 600, color: 'var(--bq-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
};

interface Props { campaigns: Campaign[]; }

export default function NotificationsClient({ campaigns }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', type: 'push', segment: 'all', message: '', scheduleDate: '',
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleLaunch() {
    setDrawerOpen(false);
    setForm({ name: '', type: 'push', segment: 'all', message: '', scheduleDate: '' });
    showToast('Campaign launched successfully!');
  }

  function handleDraft() {
    setDrawerOpen(false);
    setForm({ name: '', type: 'push', segment: 'all', message: '', scheduleDate: '' });
    showToast('Campaign saved as draft.');
  }

  const CreateButton = (
    <button
      onClick={() => setDrawerOpen(true)}
      style={{
        background: 'var(--bq-purple)', border: 'none', borderRadius: 8,
        padding: '9px 18px', fontFamily: 'var(--font-inter)', fontSize: 13,
        fontWeight: 600, color: '#fff', cursor: 'pointer',
      }}
    >
      + Create Campaign
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="Notifications"
        description="Push, email, and SMS campaign management"
        action={CreateButton}
      />

      <DataTable columns={columns} data={campaigns} rowKey={(c) => c.id} />

      {/* Create Campaign Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }}
            />
            <motion.div
              initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed', top: 0, right: 0, height: '100%',
                width: 440, background: 'var(--bq-surface-1)',
                borderLeft: '1px solid var(--bq-border)',
                zIndex: 101, padding: 28, overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 18, color: 'var(--bq-text-1)', margin: 0 }}>
                  Create Campaign
                </h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--bq-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
                >×</button>
              </div>

              <div>
                <label style={labelStyle}>Campaign Name</label>
                <input style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g., Re-engagement Push" />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select style={inputStyle} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                  <option value="push">Push Notification</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Target Segment</label>
                <select style={inputStyle} value={form.segment} onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}>
                  <option value="all">All Users</option>
                  <option value="pro">Pro Users</option>
                  <option value="elite">Elite Users</option>
                  <option value="inactive">Inactive (7+ days)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Message Body</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Write your message..."
                />
              </div>
              <div>
                <label style={labelStyle}>Schedule Date (optional)</label>
                <input
                  type="datetime-local"
                  style={inputStyle}
                  value={form.scheduleDate}
                  onChange={(e) => setForm((f) => ({ ...f, scheduleDate: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <button
                  onClick={handleLaunch}
                  disabled={!form.name || !form.message}
                  style={{
                    background: 'var(--bq-purple)', border: 'none', borderRadius: 8,
                    padding: '12px', fontFamily: 'var(--font-inter)', fontSize: 14,
                    fontWeight: 600, color: '#fff', cursor: 'pointer',
                    opacity: !form.name || !form.message ? 0.5 : 1,
                  }}
                >
                  Launch Now
                </button>
                <button
                  onClick={handleDraft}
                  style={{
                    background: 'none', border: '1px solid var(--bq-border)', borderRadius: 8,
                    padding: '12px', fontFamily: 'var(--font-inter)', fontSize: 14,
                    color: 'var(--bq-text-2)', cursor: 'pointer',
                  }}
                >
                  Save as Draft
                </button>
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    background: 'none', border: 'none', fontFamily: 'var(--font-inter)',
                    fontSize: 13, color: 'var(--bq-muted)', cursor: 'pointer', padding: '8px',
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            style={{
              position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
              background: 'var(--bq-surface-2)', border: '1px solid var(--bq-lime)',
              color: 'var(--bq-lime)', padding: '12px 20px', borderRadius: 8,
              fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 500,
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
