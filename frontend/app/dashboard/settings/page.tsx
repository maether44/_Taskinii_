'use client';

import React, { useState, useEffect, useTransition } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import ToggleSwitch from '@/components/dashboard/ToggleSwitch';
import { inviteAdmin, removeAdmin } from '@/app/dashboard/actions/settings';

const TABS = ['General', 'Feature Flags', 'Team', 'API Keys', 'Billing'] as const;
type Tab = typeof TABS[number];

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

const card: React.CSSProperties = {
  background: 'var(--bq-surface-1)', border: '1px solid var(--bq-border)',
  borderRadius: 12, padding: 24,
};

function SaveButton({ onClick, label = 'Save Changes' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--bq-purple)', border: 'none', borderRadius: 8,
        padding: '10px 24px', fontFamily: 'var(--font-inter)', fontSize: 13,
        fontWeight: 600, color: '#fff', cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function ProgressBar({ label, value, color = 'var(--bq-purple)' }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-2)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 600, color: 'var(--bq-text-1)' }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--bq-surface-3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  last_active: string | null;
}

function TeamTab() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('admin');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function loadTeam() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/team');
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch {
      // silently fall back to empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTeam(); }, []);

  function flash(type: 'success' | 'error', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  }

  function handleInvite() {
    const fd = new FormData();
    fd.set('email', inviteEmail);
    fd.set('role', inviteRole);
    startTransition(async () => {
      const result = await inviteAdmin(fd);
      if ('error' in result) {
        flash('error', result.error as string);
      } else {
        flash('success', `Invite sent to ${inviteEmail}`);
        setShowInvite(false);
        setInviteEmail('');
        loadTeam();
      }
    });
  }

  function handleRemove(userId: string, name: string | null) {
    startTransition(async () => {
      const result = await removeAdmin(userId);
      if ('error' in result) {
        flash('error', result.error as string);
      } else {
        flash('success', `${name ?? userId} removed from admin team.`);
        loadTeam();
      }
    });
  }

  function formatLastActive(ts: string | null) {
    if (!ts) return 'Never';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {msg && (
        <div style={{
          background: msg.type === 'success' ? 'rgba(200,241,53,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(200,241,53,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 8, padding: '10px 16px',
          fontFamily: 'var(--font-inter)', fontSize: 13,
          color: msg.type === 'success' ? 'var(--bq-lime)' : '#ef4444',
        }}>{msg.text}</div>
      )}

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: 15, color: 'var(--bq-text-1)' }}>
            Team Members
          </p>
          <button
            onClick={() => setShowInvite(!showInvite)}
            style={{
              background: 'var(--bq-purple)', border: 'none', borderRadius: 8,
              padding: '8px 16px', fontFamily: 'var(--font-inter)', fontSize: 13,
              fontWeight: 600, color: '#fff', cursor: 'pointer',
            }}
          >
            + Invite Admin
          </button>
        </div>

        {showInvite && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, padding: 16, background: 'var(--bq-surface-2)', borderRadius: 10 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              type="email"
              placeholder="admin@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select style={{ ...inputStyle, width: 130 }} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={isPending || !inviteEmail}
              style={{
                background: 'var(--bq-purple)', border: 'none', borderRadius: 8,
                padding: '10px 16px', fontFamily: 'var(--font-inter)', fontSize: 13,
                fontWeight: 600, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap',
                opacity: isPending || !inviteEmail ? 0.6 : 1,
              }}
            >
              {isPending ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        )}

        {loading ? (
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-muted)', padding: '20px 0' }}>
            Loading team…
          </p>
        ) : members.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-muted)', padding: '20px 0' }}>
            No admin members found.
          </p>
        ) : (
          members.map((m) => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
              borderBottom: '1px solid var(--bq-border)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--bq-purple), #4A28D4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 14, color: '#fff',
              }}>
                {(m.full_name ?? m.email ?? '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 500, color: 'var(--bq-text-1)', marginBottom: 2 }}>
                  {m.full_name ?? '(no name)'}
                </p>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)' }}>
                  {m.email} · {formatLastActive(m.last_active)}
                </p>
              </div>
              <span style={{
                background: m.role === 'super_admin' ? 'rgba(200,241,53,0.1)' : 'rgba(124,92,252,0.1)',
                color: m.role === 'super_admin' ? 'var(--bq-lime)' : 'var(--bq-purple)',
                borderRadius: 5, padding: '3px 10px', fontSize: 11,
                fontFamily: 'var(--font-inter)', fontWeight: 600, flexShrink: 0,
              }}>
                {m.role.replace('_', ' ')}
              </span>
              <button
                onClick={() => handleRemove(m.id, m.full_name)}
                disabled={isPending}
                style={{
                  background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6,
                  padding: '5px 12px', fontFamily: 'var(--font-inter)', fontSize: 12,
                  color: '#ef4444', cursor: 'pointer', flexShrink: 0,
                  opacity: isPending ? 0.5 : 1,
                }}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('General');
  const [saved, setSaved] = useState<string | null>(null);

  // General
  const [platformName, setPlatformName] = useState('BodyQ');
  const [supportEmail, setSupportEmail] = useState('support@bodyq.app');
  const [maintenance, setMaintenance] = useState(false);

  // Feature flags
  const [flags, setFlags] = useState({
    'AI Posture Analysis': { enabled: true, desc: 'Real-time posture analysis via device camera' },
    'Nutrition Tracking': { enabled: true, desc: 'Macro and calorie tracking with AI suggestions' },
    'Social Features': { enabled: false, desc: 'User profiles, leaderboards, and friends' },
    'Premium Workouts': { enabled: true, desc: 'Unlock advanced workout plans for Pro/Elite users' },
    'Beta Analytics': { enabled: false, desc: 'Show experimental analytics features to admins' },
    'Real-time Coaching': { enabled: true, desc: 'Live AI voice coaching during workouts' },
  });

  // API keys
  const apiKeys = [
    { id: '1', name: 'Production', key: 'sk_live_••••••••••••••••••••3f2a', created: 'Jan 12, 2025', lastUsed: '2h ago' },
    { id: '2', name: 'Staging', key: 'sk_live_••••••••••••••••••••8b1c', created: 'Feb 3, 2025', lastUsed: '5d ago' },
    { id: '3', name: 'Analytics Service', key: 'sk_live_••••••••••••••••••••d4e7', created: 'Mar 20, 2025', lastUsed: '1d ago' },
  ];

  function save(msg: string) {
    setSaved(msg);
    setTimeout(() => setSaved(null), 2500);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader title="Settings" description="Platform configuration and administration" />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--bq-border)' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 18px', fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 500,
              color: tab === t ? 'var(--bq-text-1)' : 'var(--bq-muted)',
              borderBottom: tab === t ? '2px solid var(--bq-lime)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 150ms ease',
            }}
          >{t}</button>
        ))}
      </div>

      {saved && (
        <div style={{
          background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.3)',
          borderRadius: 8, padding: '10px 16px', fontFamily: 'var(--font-inter)',
          fontSize: 13, color: 'var(--bq-lime)',
        }}>
          {saved}
        </div>
      )}

      {/* General */}
      {tab === 'General' && (
        <div style={card}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: 15, color: 'var(--bq-text-1)', marginBottom: 20 }}>Platform Settings</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
            <div>
              <label style={labelStyle}>Platform Name</label>
              <input style={inputStyle} value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Support Email</label>
              <input style={inputStyle} type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--bq-border)' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 600, color: 'var(--bq-text-1)', marginBottom: 2 }}>Maintenance Mode</p>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)' }}>Show maintenance page to all users</p>
              </div>
              <ToggleSwitch checked={maintenance} onChange={setMaintenance} />
            </div>
            <SaveButton onClick={() => save('Settings saved successfully.')} />
          </div>
        </div>
      )}

      {/* Feature Flags */}
      {tab === 'Feature Flags' && (
        <div style={card}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: 15, color: 'var(--bq-text-1)', marginBottom: 20 }}>Feature Flags</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {Object.entries(flags).map(([name, { enabled, desc }], i, arr) => (
              <div
                key={name}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--bq-border)' : 'none',
                }}
              >
                <div>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 500, color: 'var(--bq-text-1)', marginBottom: 2 }}>{name}</p>
                  <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)' }}>{desc}</p>
                </div>
                <ToggleSwitch
                  checked={enabled}
                  onChange={(v) => setFlags((f) => ({ ...f, [name]: { ...f[name as keyof typeof f], enabled: v } }))}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <SaveButton onClick={() => save('Feature flags updated.')} label="Save Flags" />
          </div>
        </div>
      )}

      {/* Team — real data component */}
      {tab === 'Team' && <TeamTab />}

      {/* API Keys */}
      {tab === 'API Keys' && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: 15, color: 'var(--bq-text-1)' }}>API Keys</p>
            <button
              onClick={() => save('New API key generated.')}
              style={{
                background: 'var(--bq-purple)', border: 'none', borderRadius: 8,
                padding: '8px 16px', fontFamily: 'var(--font-inter)', fontSize: 13,
                fontWeight: 600, color: '#fff', cursor: 'pointer',
              }}
            >Generate New Key</button>
          </div>
          {apiKeys.map((k) => (
            <div key={k.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 0', borderBottom: '1px solid var(--bq-border)',
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 500, color: 'var(--bq-text-1)', marginBottom: 4 }}>{k.name}</p>
                <p style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--bq-muted)' }}>{k.key}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', marginBottom: 2 }}>Created {k.created}</p>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)' }}>Used {k.lastUsed}</p>
              </div>
              <button style={{
                background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6,
                padding: '5px 12px', fontFamily: 'var(--font-inter)', fontSize: 12,
                color: '#ef4444', cursor: 'pointer', flexShrink: 0,
              }}>Revoke</button>
            </div>
          ))}
        </div>
      )}

      {/* Billing */}
      {tab === 'Billing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Current Plan</p>
              <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 20, color: 'var(--bq-text-1)', marginBottom: 4 }}>Business Plan</p>
              <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: 'var(--bq-muted)' }}>$299 / month · Renews May 1, 2026</p>
            </div>
            <button style={{
              background: 'none', border: '1px solid var(--bq-border)', borderRadius: 8,
              padding: '10px 20px', fontFamily: 'var(--font-inter)', fontSize: 13,
              color: 'var(--bq-text-2)', cursor: 'pointer',
            }}>Upgrade Plan</button>
          </div>

          <div style={card}>
            <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: 15, color: 'var(--bq-text-1)', marginBottom: 20 }}>Usage This Month</p>
            <ProgressBar label="API Calls (820k / 1M)" value={82} color="var(--chart-purple)" />
            <ProgressBar label="Storage (4.5GB / 10GB)" value={45} color="var(--chart-blue)" />
            <ProgressBar label="AI Sessions (6.7k / 10k)" value={67} color="var(--chart-lime)" />
          </div>

          <div style={card}>
            <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: 15, color: 'var(--bq-text-1)', marginBottom: 16 }}>Invoice History</p>
            {[
              { date: 'Apr 1, 2026', amount: '$299.00', status: 'paid' },
              { date: 'Mar 1, 2026', amount: '$299.00', status: 'paid' },
              { date: 'Feb 1, 2026', amount: '$299.00', status: 'paid' },
              { date: 'Jan 1, 2026', amount: '$299.00', status: 'paid' },
            ].map((inv) => (
              <div key={inv.date} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: '1px solid var(--bq-border)',
              }}>
                <span style={{ flex: 1, fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-2)' }}>{inv.date}</span>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 600, color: 'var(--bq-text-1)' }}>{inv.amount}</span>
                <span style={{
                  background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                  borderRadius: 5, padding: '2px 9px', fontSize: 11,
                  fontFamily: 'var(--font-inter)', fontWeight: 600,
                }}>Paid</span>
                <button style={{
                  background: 'none', border: '1px solid var(--bq-border)', borderRadius: 6,
                  padding: '5px 12px', fontFamily: 'var(--font-inter)', fontSize: 12,
                  color: 'var(--bq-text-2)', cursor: 'pointer',
                }}>Download</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
