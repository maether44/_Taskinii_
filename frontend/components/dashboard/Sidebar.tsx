'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, BarChart2, Activity, Users, CreditCard, Filter,
  Dumbbell, Leaf, Cpu, Zap, Bell, Smartphone, Settings, Shield,
  MessageSquare, ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface NavItem { label: string; href: string; icon: React.ReactNode; }
interface NavGroup { group: string; items: NavItem[]; }

const NAV: NavGroup[] = [
  {
    group: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} strokeWidth={1.5} /> },
      { label: 'Analytics', href: '/dashboard/analytics', icon: <BarChart2 size={18} strokeWidth={1.5} /> },
      { label: 'Real-Time', href: '/dashboard/realtime', icon: <Activity size={18} strokeWidth={1.5} /> },
    ],
  },
  {
    group: 'USERS',
    items: [
      { label: 'All Users', href: '/dashboard/users', icon: <Users size={18} strokeWidth={1.5} /> },
      { label: 'Subscriptions', href: '/dashboard/subscriptions', icon: <CreditCard size={18} strokeWidth={1.5} /> },
      { label: 'Segments', href: '/dashboard/segments', icon: <Filter size={18} strokeWidth={1.5} /> },
    ],
  },
  {
    group: 'CONTENT',
    items: [
      { label: 'Workout Plans', href: '/dashboard/content/workouts', icon: <Dumbbell size={18} strokeWidth={1.5} /> },
      { label: 'Nutrition Plans', href: '/dashboard/content/nutrition', icon: <Leaf size={18} strokeWidth={1.5} /> },
      { label: 'AI Prompts', href: '/dashboard/content/prompts', icon: <Cpu size={18} strokeWidth={1.5} /> },
    ],
  },
  {
    group: 'PLATFORM',
    items: [
      { label: 'AI Engine', href: '/dashboard/ai', icon: <Zap size={18} strokeWidth={1.5} /> },
      { label: 'Notifications', href: '/dashboard/notifications', icon: <Bell size={18} strokeWidth={1.5} /> },
      { label: 'App Versions', href: '/dashboard/versions', icon: <Smartphone size={18} strokeWidth={1.5} /> },
    ],
  },
  {
    group: 'SYSTEM',
    items: [
      { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={18} strokeWidth={1.5} /> },
      { label: 'Audit Log', href: '/dashboard/audit', icon: <Shield size={18} strokeWidth={1.5} /> },
      { label: 'Support', href: '/dashboard/support', icon: <MessageSquare size={18} strokeWidth={1.5} /> },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [adminRole, setAdminRole] = useState('admin');

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
        .then(({ data }) => {
          if (data?.full_name) setAdminName(data.full_name);
          if (data?.role) setAdminRole(data.role);
        });
    });
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const w = collapsed ? 64 : 240;

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: `${w}px`,
        background: 'var(--bq-surface-1)',
        borderRight: '1px solid var(--bq-border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 250ms ease-in-out',
        zIndex: 100,
        overflow: 'hidden',
      }}
      className="dash-scroll"
    >
      {/* Logo */}
      <div style={{ padding: collapsed ? '20px 0' : '20px 16px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 8, flexShrink: 0 }}>
        {!collapsed && (
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 20, color: 'var(--bq-white)', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>BodyQ</span>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--bq-lime)', display: 'block', flexShrink: 0 }} />
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--bq-purple) 0%, var(--bq-purple-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 18, color: '#fff' }}>B</span>
            </div>
          </Link>
        )}
        {!collapsed && (
          <button onClick={toggle} aria-label="Collapse sidebar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bq-text-3)', padding: 4, display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Lime divider — matches marketing site lime accent language */}
      <div style={{ height: 1, background: 'var(--bq-lime)', margin: '0 12px 12px', flexShrink: 0 }} />

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 8px' }} className="dash-scroll">
        {NAV.map(({ group, items }) => (
          <div key={group} style={{ marginBottom: 20 }}>
            {!collapsed && (
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', color: 'var(--bq-text-3)', padding: '4px 8px 8px', textTransform: 'uppercase' }}>{group}</div>
            )}
            {items.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: collapsed ? '10px 0' : '9px 10px',
                    borderRadius: 8,
                    marginBottom: 2,
                    textDecoration: 'none',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: active ? 'var(--bq-purple-dim)' : 'transparent',
                    borderLeft: active ? '3px solid var(--bq-purple)' : '3px solid transparent',
                    color: active ? 'var(--bq-text-1)' : 'var(--bq-text-2)',
                    transition: 'all 150ms ease',
                    fontSize: 14,
                    fontWeight: active ? 500 : 400,
                  }}
                  onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--bq-surface-3)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--bq-text-1)'; } }}
                  onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--bq-text-2)'; } }}
                >
                  <span style={{ flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: expand toggle (collapsed mode) + user info + logout */}
      <div style={{ flexShrink: 0, padding: 8, borderTop: '1px solid var(--bq-border)' }}>
        {collapsed && (
          <button onClick={toggle} aria-label="Expand sidebar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bq-text-3)', marginBottom: 8 }}>
            <ChevronRight size={16} />
          </button>
        )}
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 8, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--bq-purple), var(--bq-purple-dark, #4A28D4))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--bq-text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adminName}</div>
              <div style={{ fontSize: 10, color: 'var(--bq-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{adminRole}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          aria-label="Logout"
          title={collapsed ? 'Logout' : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: collapsed ? '10px 0' : '8px 10px', justifyContent: collapsed ? 'center' : 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bq-text-3)', borderRadius: 8, fontSize: 14, transition: 'all 150ms ease' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--bq-danger)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--bq-text-3)'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
        >
          <LogOut size={16} strokeWidth={1.5} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
