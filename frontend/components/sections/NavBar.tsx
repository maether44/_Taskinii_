'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

/* ----------------------------------------------------------
   NAVBAR COMPONENT
   Fixed position, 72px height.
   ANIMATION: on scroll past 80px — background transitions from transparent
              to rgba(10,7,25,0.92) with a purple-tinted border-bottom.
              Both properties transition via CSS transition.
   Mobile: hamburger icon toggles full-screen overlay drawer.
   ---------------------------------------------------------- */

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#ai-showcase' },
  { label: 'Plans', href: '#plans' },
];

export default function NavBar() {
  // ANIMATION: scroll-triggered background — tracks scroll position
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  return (
    <>
      <nav
        role="navigation"
        aria-label="Main navigation"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '24px',
          paddingRight: '24px',
          // ANIMATION: scroll → background and border-bottom transition
          background: scrolled ? 'rgba(10,7,25,0.92)' : 'rgba(0,0,0,0)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: scrolled
            ? '1px solid rgba(124,92,252,0.3)'
            : '1px solid transparent',
          transition: 'background 300ms ease, border-color 300ms ease',
        }}
      >
        {/* ── LEFT: Logo ── */}
        <a
          href="/"
          aria-label="BodyQ home"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          {/* Logotype */}
          <span
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 800,
              fontSize: '22px',
              color: 'var(--bq-white)',
              letterSpacing: '-0.01em',
            }}
          >
            BodyQ
          </span>
          {/* Lime dot accent */}
          <span
            aria-hidden="true"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--bq-lime)',
              flexShrink: 0,
              display: 'block',
            }}
          />
        </a>

        {/* ── CENTER: Nav Links (desktop) ── */}
        <div
          className="hidden md:flex"
          style={{
            flex: 1,
            justifyContent: 'center',
            gap: '40px',
          }}
        >
          {NAV_LINKS.map((link) => (
            <NavLink key={link.label} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* ── RIGHT: CTA Buttons (desktop) ── */}
        <div className="hidden md:flex" style={{ gap: '12px', alignItems: 'center', flexShrink: 0 }}>
          {user ? (
            <>
              {isAdmin && (
                <Button variant="ghost" href="/dashboard" style={{ fontSize: '13px', padding: '8px 16px' } as React.CSSProperties}>
                  Dashboard
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="ghost" href="/login" style={{ fontSize: '13px', padding: '8px 16px' } as React.CSSProperties}>
                Log In
              </Button>
              <Button variant="primary" href="/signup" style={{ fontSize: '13px', padding: '12px 28px' } as React.CSSProperties}>
                Start Free Trial
              </Button>
            </>
          )}
        </div>

        {/* ── HAMBURGER (mobile) ── */}
        <button
          className="md:hidden"
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={drawerOpen}
          aria-controls="mobile-drawer"
          onClick={() => setDrawerOpen(!drawerOpen)}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            minWidth: '44px',
            minHeight: '44px',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                display: 'block',
                width: '22px',
                height: '2px',
                background: 'var(--bq-white)',
                borderRadius: '2px',
                transition: 'transform 200ms ease, opacity 200ms ease',
                transform: drawerOpen
                  ? i === 0
                    ? 'rotate(45deg) translate(5px, 5px)'
                    : i === 1
                    ? 'scaleX(0)'
                    : 'rotate(-45deg) translate(5px, -5px)'
                  : 'none',
                opacity: drawerOpen && i === 1 ? 0 : 1,
              }}
            />
          ))}
        </button>
      </nav>

      {/* ── MOBILE DRAWER ── */}
      <div
        id="mobile-drawer"
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          background: 'rgba(10,7,25,0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '100px 32px 40px',
          // ANIMATION: slide in from right
          transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        {/* Close button */}
        <button
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--bq-white)',
            fontSize: '28px',
            lineHeight: 1,
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>

        {/* Links */}
        <nav aria-label="Mobile navigation">
          {NAV_LINKS.map((link, i) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setDrawerOpen(false)}
              style={{
                display: 'block',
                fontFamily: 'var(--font-syne)',
                fontWeight: 700,
                fontSize: '32px',
                color: 'var(--bq-white)',
                textDecoration: 'none',
                paddingBottom: '24px',
                borderBottom: '1px solid var(--bq-border)',
                marginBottom: '24px',
                transition: 'color 150ms ease',
                // ANIMATION: staggered entrance via delay
                transitionDelay: `${i * 50}ms`,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--bq-lime)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--bq-white)'; }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA at bottom */}
        <div style={{ marginTop: 'auto' }}>
          {user ? (
            isAdmin ? (
              <Button variant="primary" href="/dashboard" style={{ width: '100%', justifyContent: 'center' } as React.CSSProperties}>
                Go to Dashboard
              </Button>
            ) : null
          ) : (
            <Button variant="primary" href="/signup" style={{ width: '100%', justifyContent: 'center' } as React.CSSProperties}>
              Start Free Trial
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

/* ----------------------------------------------------------
   NAV LINK with lime underline hover animation
   ---------------------------------------------------------- */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: 'var(--font-inter)',
        fontWeight: 500,
        fontSize: '13px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--bq-white)',
        textDecoration: 'none',
        position: 'relative',
        paddingBottom: '4px',
        transition: 'color 200ms ease',
      }}
    >
      {children}
      {/* ANIMATION: lime underline — scaleX(0) → scaleX(1) on hover */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '1.5px',
          background: 'var(--bq-lime)',
          borderRadius: '2px',
          transform: hovered ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left',
          transition: 'transform 200ms ease-out',
          willChange: 'transform',
        }}
      />
    </a>
  );
}
