'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const NAV_LINKS = [
  { label: 'Overview',  href: '/app' },
  { label: 'Nutrition', href: '/app/nutrition' },
  { label: 'Activity',  href: '/app/activity' },
  { label: 'Insights',  href: '/app/insights' },
];

const BOTTOM_TABS = [
  { label: 'Overview',  href: '/app',            icon: '⊞' },
  { label: 'Nutrition', href: '/app/nutrition',   icon: '🥗' },
  { label: 'Activity',  href: '/app/activity',    icon: '📊' },
  { label: 'Insights',  href: '/app/insights',    icon: '💡' },
  { label: 'Profile',   href: '/app/profile',     icon: '👤' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!avatarOpen) return;
    const handler = () => setAvatarOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [avatarOpen]);

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? '?');

  return (
    <>
      {/* ── TOP NAVBAR ── */}
      <nav
        role="navigation"
        aria-label="App navigation"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
          height: 64,
          display: 'flex', alignItems: 'center',
          paddingLeft: 24, paddingRight: 24,
          background: scrolled ? 'rgba(10,7,25,0.95)' : 'rgba(10,7,25,0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: scrolled ? '1px solid rgba(124,92,252,0.3)' : '1px solid rgba(255,255,255,0.06)',
          transition: 'background 300ms ease, border-color 300ms ease',
        }}
      >
        {/* Logo */}
        <Link href="/app" aria-label="BodyQ home" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 20, color: 'var(--bq-white)', letterSpacing: '-0.01em' }}>
            BodyQ
          </span>
          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--bq-lime)', display: 'block', flexShrink: 0 }} />
        </Link>

        {/* Center nav — desktop only */}
        <div className="hidden md:flex" style={{ flex: 1, justifyContent: 'center', gap: 32 }}>
          {NAV_LINKS.map((link) => {
            const isActive = link.href === '/app' ? pathname === '/app' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontWeight: 500,
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: isActive ? 'var(--bq-lime)' : 'var(--bq-white)',
                  textDecoration: 'none',
                  paddingBottom: 2,
                  borderBottom: isActive ? '1.5px solid var(--bq-lime)' : '1.5px solid transparent',
                  transition: 'color 200ms ease, border-color 200ms ease',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right: Avatar + dropdown */}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setAvatarOpen((o) => !o); }}
            aria-label="User menu"
            aria-expanded={avatarOpen}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--bq-purple) 0%, #9B7DFF 100%)',
              border: '2px solid rgba(124,92,252,0.4)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 13, color: '#fff',
            }}
          >
            {initials}
          </button>

          {avatarOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute', top: 44, right: 0,
                background: 'var(--bq-surface-1)',
                border: '1px solid var(--bq-border)',
                borderRadius: 12, padding: '6px 0',
                minWidth: 180,
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                zIndex: 9999,
              }}
            >
              <div style={{ padding: '8px 14px 10px', borderBottom: '1px solid var(--bq-border)', marginBottom: 4 }}>
                <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 600, color: 'var(--bq-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.full_name ?? 'My Account'}
                </div>
                <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                  {user?.email}
                </div>
              </div>
              <Link
                href="/app/profile"
                role="menuitem"
                onClick={() => setAvatarOpen(false)}
                style={{ display: 'block', padding: '9px 14px', fontFamily: 'var(--font-inter)', fontSize: 14, color: 'var(--bq-white)', textDecoration: 'none', transition: 'background 150ms ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                View Profile
              </Link>
              <button
                role="menuitem"
                onClick={handleSignOut}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontFamily: 'var(--font-inter)', fontSize: 14, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 150ms ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main style={{ paddingTop: 64, paddingBottom: 80, minHeight: '100vh' }}>
        {children}
      </main>

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <nav
        className="md:hidden"
        role="navigation"
        aria-label="Mobile navigation"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
          height: 68,
          display: 'flex',
          background: 'rgba(10,7,25,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(124,92,252,0.2)',
        }}
      >
        {BOTTOM_TABS.map((tab) => {
          const isActive = tab.href === '/app' ? pathname === '/app' : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                textDecoration: 'none',
                color: isActive ? 'var(--bq-lime)' : 'rgba(255,255,255,0.4)',
                transition: 'color 200ms ease',
                paddingBottom: 4,
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden="true">{tab.icon}</span>
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, fontWeight: isActive ? 600 : 400, lineHeight: 1 }}>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
