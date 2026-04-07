'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(240);

  // Sync sidebar width from localStorage
  useEffect(() => {
    const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    setSidebarWidth(collapsed ? 64 : 240);

    // Watch for storage changes (sidebar toggle)
    const handler = () => {
      const c = localStorage.getItem('sidebar-collapsed') === 'true';
      setSidebarWidth(c ? 64 : 240);
    };
    window.addEventListener('storage', handler);
    // Also poll since same-tab storage doesn't fire storage event
    const interval = setInterval(handler, 200);
    return () => { window.removeEventListener('storage', handler); clearInterval(interval); };
  }, []);

  return (
    <div data-dashboard style={{ display: 'flex', minHeight: '100vh', background: 'var(--bq-black)' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: sidebarWidth, transition: 'margin-left 250ms cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar sidebarWidth={sidebarWidth} />
        {/* 3px lime accent line — connects dashboard to marketing site lime language */}
        <div style={{ height: 3, background: 'var(--bq-lime)', flexShrink: 0, marginTop: 60 }} />
        <main style={{ flex: 1, padding: '32px', fontFamily: 'var(--font-inter)' }} className="dash-scroll">
          {children}
        </main>
      </div>
    </div>
  );
}
