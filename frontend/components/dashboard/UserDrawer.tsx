'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Globe, Calendar, Activity } from 'lucide-react';
import type { AdminUser } from '@/lib/supabase/queries/users';
import StatusBadge from './StatusBadge';
import PlanBadge from './PlanBadge';

interface UserDrawerProps { user: AdminUser | null; onClose: () => void; }

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--bq-border)' }}>
      <span style={{ fontSize: 12, color: 'var(--bq-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--bq-text-1)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function UserDrawer({ user, onClose }: UserDrawerProps) {
  return (
    <AnimatePresence>
      {user && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} onClick={onClose} />
          <motion.aside initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, background: 'var(--bq-surface-1)', borderLeft: '1px solid var(--bq-border)', zIndex: 201, overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="dash-scroll">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--bq-border)', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, color: 'var(--bq-white)' }}>User Profile</div>
              <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bq-text-3)', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 6 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--bq-text-1)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bq-surface-3)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--bq-text-3)'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}>
                <X size={18} />
              </button>
            </div>
            {/* Avatar + name */}
            <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--bq-purple), #4A28D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {(user.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--bq-text-1)', marginBottom: 4 }}>{user.full_name ?? '—'}</div>
                  <div style={{ fontSize: 13, color: 'var(--bq-text-3)' }}>{user.email}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <PlanBadge plan={user.plan ?? 'free'} />
                    <StatusBadge status={user.status ?? 'active'} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Row label="Country" value={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Globe size={12} />{user.country ?? '—'}</span>} />
                <Row label="Joined" value={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={12} />{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span>} />
                <Row label="Last Active" value={user.last_active ? new Date(user.last_active).toLocaleString() : 'Never'} />
                <Row label="Total Sessions" value={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={12} />{user.total_sessions}</span>} />
                <Row label="Email" value={<a href={`mailto:${user.email}`} style={{ color: 'var(--bq-purple)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={12} />{user.email}</a>} />
              </div>
            </div>
            {/* Quick actions */}
            <div style={{ padding: '20px 24px', display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 'auto', borderTop: '1px solid var(--bq-border)', flexShrink: 0 }}>
              {[{ label: 'Send Message', color: 'var(--bq-purple)' }, { label: 'Change Plan', color: 'var(--bq-purple)' }, { label: 'Suspend User', color: 'var(--bq-danger)' }].map((a) => (
                <button key={a.label} style={{ padding: '8px 16px', background: a.color === 'var(--bq-danger)' ? 'rgba(239,68,68,0.1)' : 'var(--bq-purple-dim)', border: `1px solid ${a.color === 'var(--bq-danger)' ? 'rgba(239,68,68,0.25)' : 'rgba(124,92,252,0.25)'}`, borderRadius: 8, color: a.color, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-inter)', transition: 'all 150ms ease' }}>
                  {a.label}
                </button>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
