'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import EmptyState from '@/components/dashboard/EmptyState';
import { SupportTicket } from '@/lib/supabase/queries/support';
import { fetchTickets, changeTicketStatus } from './actions';

const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  critical: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  high: { bg: 'rgba(249,115,22,0.1)', color: '#f97316' },
  medium: { bg: 'rgba(234,179,8,0.1)', color: '#eab308' },
  low: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
};

const STATUS_OPTS = [
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function PriorityBadge({ priority }: { priority: string }) {
  const s = PRIORITY_COLORS[priority] ?? { bg: 'var(--bq-surface-3)', color: 'var(--bq-muted)' };
  return (
    <span style={{
      background: s.bg, color: s.color, borderRadius: 5, padding: '2px 8px',
      fontSize: 11, fontFamily: 'var(--font-inter)', fontWeight: 600, textTransform: 'capitalize',
    }}>{priority}</span>
  );
}

const STATUS_TABS = ['All', 'Open', 'In Progress', 'Resolved'] as const;
type StatusTab = typeof STATUS_TABS[number];

const STATUS_MAP: Record<StatusTab, string | undefined> = {
  'All': undefined,
  'Open': 'open',
  'In Progress': 'in_progress',
  'Resolved': 'resolved',
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<StatusTab>('All');
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');
  const [localMessages, setLocalMessages] = useState<SupportTicket['messages']>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('open');

  useEffect(() => {
    setLoading(true);
    fetchTickets(STATUS_MAP[statusTab])
      .then((data) => { setTickets(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [statusTab]);

  useEffect(() => {
    if (selected) {
      setLocalMessages(selected.messages ?? []);
      setSelectedStatus(selected.status);
    }
  }, [selected]);

  async function handleStatusChange(ticketId: string, newStatus: string) {
    setUpdatingStatus(true);
    await changeTicketStatus(ticketId, newStatus).catch(() => null);
    setUpdatingStatus(false);
    setSelectedStatus(newStatus);
    setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: newStatus as SupportTicket['status'] } : t));
    if (selected?.id === ticketId) {
      setSelected((s) => s ? { ...s, status: newStatus as SupportTicket['status'] } : null);
    }
  }

  function handleSendReply() {
    if (!reply.trim() || !selected) return;
    const newMsg = { role: 'admin', text: reply.trim(), ts: new Date().toISOString() };
    setLocalMessages((m) => [...m, newMsg]);
    setReply('');
  }

  const StatusBadgeInline = ({ status }: { status: string }) => {
    const map: Record<string, string> = { open: '#22c55e', in_progress: '#eab308', resolved: 'var(--bq-muted)' };
    return (
      <span style={{
        display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
        background: map[status] ?? 'var(--bq-muted)', marginRight: 6, flexShrink: 0,
      }} />
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 84px)', gap: 0, overflow: 'hidden' }}>
      {/* Left: Ticket list */}
      <div style={{
        width: 380, flexShrink: 0,
        borderRight: '1px solid var(--bq-border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bq-surface-1)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 0', borderBottom: '1px solid var(--bq-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <h1 style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 18, color: 'var(--bq-text-1)', margin: 0 }}>
              Support
            </h1>
            {!loading && (
              <span style={{
                background: 'var(--bq-surface-3)', color: 'var(--bq-muted)',
                borderRadius: 99, padding: '1px 8px', fontSize: 12,
                fontFamily: 'var(--font-inter)', fontWeight: 600,
              }}>{tickets.length}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 0 }}>
            {STATUS_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setStatusTab(t)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '6px 12px', fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 500,
                  color: statusTab === t ? 'var(--bq-text-1)' : 'var(--bq-muted)',
                  borderBottom: statusTab === t ? '2px solid var(--bq-lime)' : '2px solid transparent',
                  marginBottom: -1, transition: 'all 150ms ease',
                }}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 20, fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-muted)' }}>Loading…</div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-muted)' }}>
              No tickets found.
            </div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                style={{
                  display: 'block', width: '100%', border: 'none',
                  borderLeft: selected?.id === t.id ? '3px solid var(--bq-purple)' : '3px solid transparent',
                  borderBottom: '1px solid var(--bq-border)',
                  padding: '14px 16px 14px 13px', textAlign: 'left', cursor: 'pointer',
                  background: selected?.id === t.id ? 'rgba(124,92,252,0.06)' : 'transparent',
                  transition: 'all 100ms ease',
                } as React.CSSProperties}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 600, color: 'var(--bq-text-1)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                    {t.subject}
                  </p>
                  <PriorityBadge priority={t.priority} />
                </div>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', margin: '0 0 6px' }}>
                  {t.user_name} · {timeAgo(t.created_at)}
                </p>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <StatusBadgeInline status={t.status} />
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', textTransform: 'capitalize' }}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Ticket detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {!selected ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <EmptyState title="Select a ticket" description="Click a ticket on the left to view the conversation." />
            </motion.div>
          ) : (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              {/* Detail header */}
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid var(--bq-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0,
              }}>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 16, color: 'var(--bq-text-1)', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selected.subject}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PriorityBadge priority={selected.priority} />
                    <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)' }}>
                      {selected.user_name} · {timeAgo(selected.created_at)}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{
                      background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)',
                      borderRadius: 8, padding: '7px 12px',
                      fontFamily: 'var(--font-inter)', fontSize: 13,
                      color: 'var(--bq-text-1)', outline: 'none', cursor: 'pointer',
                    }}
                  >
                    {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button
                    onClick={() => handleStatusChange(selected.id, selectedStatus)}
                    disabled={updatingStatus || selectedStatus === selected.status}
                    style={{
                      background: 'var(--bq-purple)', border: 'none', borderRadius: 8,
                      padding: '8px 16px', fontFamily: 'var(--font-inter)', fontSize: 13,
                      fontWeight: 600, color: '#fff', cursor: 'pointer',
                      opacity: updatingStatus || selectedStatus === selected.status ? 0.5 : 1,
                    }}
                  >
                    {updatingStatus ? 'Saving…' : 'Update'}
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {localMessages.length === 0 ? (
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-muted)', textAlign: 'center', marginTop: 40 }}>No messages yet.</p>
                ) : (
                  localMessages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: msg.role === 'admin' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div style={{
                        maxWidth: '70%',
                        background: msg.role === 'admin' ? 'rgba(124,92,252,0.2)' : 'var(--bq-surface-2)',
                        border: `1px solid ${msg.role === 'admin' ? 'rgba(124,92,252,0.35)' : 'var(--bq-border)'}`,
                        borderRadius: 10,
                        padding: '10px 14px',
                      }}>
                        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', marginBottom: 4, textTransform: 'capitalize' }}>
                          {msg.role}
                        </p>
                        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-1)', lineHeight: 1.5 }}>
                          {msg.text}
                        </p>
                        <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', marginTop: 4 }}>
                          {timeAgo(msg.ts)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply input */}
              <div style={{
                padding: '16px 24px', borderTop: '1px solid var(--bq-border)',
                display: 'flex', gap: 10, flexShrink: 0,
              }}>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                  placeholder="Reply to ticket… (Enter to send)"
                  rows={2}
                  style={{
                    flex: 1, resize: 'none',
                    background: 'var(--bq-surface-2)', border: '1px solid var(--bq-border)',
                    borderRadius: 8, padding: '10px 14px',
                    fontFamily: 'var(--font-inter)', fontSize: 13,
                    color: 'var(--bq-text-1)', outline: 'none',
                  }}
                />
                <button
                  onClick={handleSendReply}
                  disabled={!reply.trim()}
                  style={{
                    background: 'var(--bq-purple)', border: 'none', borderRadius: 8,
                    padding: '0 20px', fontFamily: 'var(--font-inter)', fontSize: 13,
                    fontWeight: 600, color: '#fff', cursor: 'pointer',
                    opacity: !reply.trim() ? 0.5 : 1, alignSelf: 'stretch',
                  }}
                >
                  Send
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
