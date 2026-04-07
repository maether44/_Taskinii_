'use client';

import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import PhoneMockup from '@/components/ui/PhoneMockup';
import GlassCard from '@/components/ui/GlassCard';

/* ----------------------------------------------------------
   HERO SECTION
   Full 100vh, dark background.
   ANIMATION entrance (on page load, Framer Motion):
     - Headline line 1: delay 0ms
     - Headline line 2: delay 120ms
     - Headline line 3: delay 240ms
     - Subline: delay 400ms
     - CTAs: delay 550ms
   Each: initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
         animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
   ---------------------------------------------------------- */

const HEADLINE_LINES = ['TRAIN SMARTER.', 'MOVE BETTER.', 'LIVE LONGER.'];

const STAT_PILLS = [
  { label: '85% Accuracy', icon: '', delay: 0.8 },
  { label: 'AI Coach Active', icon: '', delay: 1.0 },
  { label: '10K+ Users', icon: '', delay: 1.2 },
];

export default function HeroSection() {
  return (
    <section
      id="hero"
      aria-label="Hero — BodyQ AI fitness & Health Assistant platform"
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--bq-black)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        paddingTop: '72px', // navbar height
      }}
    >
      {/* ── AMBIENT BACKGROUND ── */}
      {/* ANIMATION: mesh-drift — slow moving gradient ambiance */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'conic-gradient(from 180deg at 50% 50%, #000000 0deg, #0d0820 60deg, #150d2e 120deg, #0d0820 180deg, #000000 360deg)',
          backgroundSize: '400% 400%',
          animation: 'mesh-drift 20s ease infinite',
          willChange: 'background-position',
          zIndex: 0,
        }}
      />

      {/* Purple radial glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '700px',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(124,92,252,0.45) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* ── CONTENT ── */}
      <div
        className="flex flex-col lg:flex-row items-center"
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '80px 24px',
          gap: '64px',
        }}
      >
        {/* ── LEFT: Text content ── */}
        <div
          className="flex-1"
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Eyebrow */}
          {/* ANIMATION: fade up, delay 0 */}
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0 }}
            style={{ marginBottom: '32px' }}
          >
            AI-POWERED · PERSONALIZED · REAL-TIME
          </motion.p>

          {/* Headline — 3 lines, staggered */}
          <h1
            style={{
              fontFamily: 'var(--font-inter)',
              fontWeight: 800,
              fontSize: 'clamp(52px, 8vw, 88px)',
              color: 'var(--bq-white)',
              textTransform: 'uppercase',
              lineHeight: 0.95,
              marginBottom: '32px',
              letterSpacing: '-0.02em',
            }}
          >
            {HEADLINE_LINES.map((line, i) => (
              // ANIMATION: each line fades up with blur clear, staggered 120ms
              <motion.span
                key={line}
                style={{ display: 'block' }}
                initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.7,
                  ease: 'easeOut',
                  delay: i * 0.12,
                }}
              >
                {line}
              </motion.span>
            ))}
          </h1>

          {/* Subline */}
          {/* ANIMATION: fade up, delay 400ms */}
          <motion.p
            initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.4 }}
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: '18px',
              color: 'rgba(255,255,255,0.65)',
              maxWidth: '560px',
              lineHeight: 1.65,
              marginBottom: '48px',
            }}
          >
            BodyQ is your intelligent personal assistant — combining real-time AI posture
            analysis with fully personalized workout and nutrition plans.
          </motion.p>

          {/* CTAs */}
          {/* ANIMATION: fade up, delay 550ms */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.55 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
          >
            <Button variant="primary" href="/signup" idlePulse>
              Let&apos;s Get Started →
            </Button>

            {/* Already have an account */}
            <p style={{
              fontFamily: 'var(--font-inter)',
              fontSize: '14px',
              color: 'rgba(255,255,255,0.45)',
              margin: 0,
              textAlign: 'center',
            }}>
              Already have an account?{' '}
              <a
                href="/login"
                style={{
                  color: 'var(--bq-lime)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  transition: 'opacity 150ms ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.75'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
              >
                Sign in
              </a>
            </p>
          </motion.div>
        </div>

        {/* ── RIGHT: Phone mockup with stat pills (desktop only) ── */}
        <motion.div
          className="hidden lg:block"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          style={{ position: 'relative', flexShrink: 0 }}
        >
          <PhoneMockup showDefault />

          {/* Stat pills floating around the phone */}
          {STAT_PILLS.map((pill, i) => (
            // ANIMATION: pills slide in with staggered delay after phone appears
            <motion.div
              key={pill.label}
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: pill.delay }}
              style={{
                position: 'absolute',
                ...(i === 0
                  ? { top: '60px', left: '-90px' }
                  : i === 1
                  ? { top: '200px', right: '-80px' }
                  : { bottom: '100px', left: '-80px' }),
              }}
            >
              <GlassCard style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '999px' }}>
                <span style={{ fontSize: '16px' }}>{pill.icon}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: 'var(--bq-white)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {pill.label}
                </span>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── SCROLL HINT ── */}
      {/* ANIMATION: chevron-bounce — pulsing lime chevron at bottom center */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '32px',
          left: '50%',
          animation: 'chevron-bounce 2s ease-in-out infinite',
          willChange: 'transform',
          zIndex: 2,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--bq-lime)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </section>
  );
}
