'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

/* ----------------------------------------------------------
   AUTH PAGE SHELL
   Shared two-panel layout used by both /login and /signup.
   Left panel (desktop): brand visual + motivational copy.
   Right panel: the form slot.
   Styled in BodyQ brand — dark bg, purple glow, lime accents.
   ---------------------------------------------------------- */

interface AuthPageShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthPageShell({
  title,
  subtitle,
  children,
}: AuthPageShellProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bq-black)',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── LEFT PANEL: Brand visual (desktop only) ── */}
      <div
        className="hidden lg:flex"
        style={{
          width: '48%',
          flexShrink: 0,
          background: 'linear-gradient(160deg, #0F0B1E 0%, #1a1040 50%, #0F0B1E 100%)',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px 64px',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid rgba(124,92,252,0.2)',
        }}
      >
        {/* Animated orb glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-15%',
            left: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at 40% 40%, rgba(124,92,252,0.35) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '-10%',
            right: '-5%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(200,241,53,0.08) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        {/* Logo */}
        <Link
          href="/"
          aria-label="BodyQ home"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            marginBottom: '72px',
            position: 'relative',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 800,
              fontSize: '24px',
              color: 'var(--bq-white)',
            }}
          >
            BodyQ
          </span>
          <span
            aria-hidden="true"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--bq-lime)',
              display: 'block',
            }}
          />
        </Link>

        {/* Tagline block */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ position: 'relative' }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 800,
              fontSize: 'clamp(36px, 3.5vw, 52px)',
              color: 'var(--bq-white)',
              textTransform: 'uppercase',
              lineHeight: 1.05,
              marginBottom: '20px',
              letterSpacing: '-0.01em',
            }}
          >
            TRAIN SMARTER.{' '}
            <span style={{ color: 'var(--bq-lime)' }}>MOVE BETTER.</span>{' '}
            LIVE LONGER.
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: '16px',
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.65,
              maxWidth: '400px',
            }}
          >
            Join us for real-time AI posture coaching, personalized plans,
            and smart nutrition all in one place.
            <br /><br />
            We are the route to wellbeing.
          </p>
        </motion.div>

      </div>

      {/* ── RIGHT PANEL: Form ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          position: 'relative',
        }}
      >
        {/* Mobile-only logo */}
        <Link
          href="/"
          className="lg:hidden"
          aria-label="BodyQ home"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            marginBottom: '40px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 800,
              fontSize: '20px',
              color: 'var(--bq-white)',
            }}
          >
            BodyQ
          </span>
          <span
            aria-hidden="true"
            style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--bq-lime)', display: 'block' }}
          />
        </Link>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.05 }}
          style={{
            width: '100%',
            maxWidth: '420px',
          }}
        >
          {/* Form heading */}
          <div style={{ marginBottom: '32px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 700,
                fontSize: '28px',
                color: 'var(--bq-white)',
                marginBottom: '8px',
              }}
            >
              {title}
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: '15px',
                color: 'var(--bq-muted)',
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </p>
          </div>

          {/* Form content slot */}
          {children}
        </motion.div>
      </div>
    </div>
  );
}
