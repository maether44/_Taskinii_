'use client';

import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';

/* ----------------------------------------------------------
   CTA BANNER
   Full-width purple gradient background with floating particles.
   ANIMATION (Framer Motion whileInView):
     Section: scale 0.95 → 1.0 + opacity 0 → 1, 0.6s.
   ANIMATION (CSS, particles):
     10-15 small white dots float on randomized paths using
     @keyframes particle-float-1..5 (defined in globals.css).
     Each particle gets one of the 5 animations.
   ---------------------------------------------------------- */

const PARTICLES = [
  { size: 4,  top: '15%', left: '8%',  animation: 'particle-float-1', duration: '8s',  delay: '0s',    opacity: 0.12 },
  { size: 3,  top: '25%', left: '18%', animation: 'particle-float-2', duration: '11s', delay: '2s',    opacity: 0.08 },
  { size: 5,  top: '60%', left: '5%',  animation: 'particle-float-3', duration: '9s',  delay: '1s',    opacity: 0.15 },
  { size: 3,  top: '80%', left: '22%', animation: 'particle-float-4', duration: '13s', delay: '3s',    opacity: 0.10 },
  { size: 4,  top: '45%', left: '92%', animation: 'particle-float-1', duration: '10s', delay: '0.5s',  opacity: 0.12 },
  { size: 6,  top: '20%', left: '80%', animation: 'particle-float-5', duration: '12s', delay: '1.5s',  opacity: 0.08 },
  { size: 3,  top: '70%', left: '88%', animation: 'particle-float-2', duration: '7s',  delay: '4s',    opacity: 0.15 },
  { size: 5,  top: '10%', left: '65%', animation: 'particle-float-3', duration: '15s', delay: '2.5s',  opacity: 0.10 },
  { size: 4,  top: '88%', left: '55%', animation: 'particle-float-4', duration: '9s',  delay: '0s',    opacity: 0.12 },
  { size: 3,  top: '35%', left: '72%', animation: 'particle-float-5', duration: '11s', delay: '3.5s',  opacity: 0.08 },
  { size: 5,  top: '55%', left: '40%', animation: 'particle-float-1', duration: '14s', delay: '1s',    opacity: 0.10 },
  { size: 4,  top: '12%', left: '45%', animation: 'particle-float-2', duration: '8s',  delay: '2s',    opacity: 0.12 },
];

export default function CTABanner() {
  return (
    <section
      id="cta"
      aria-label="Call to action — start BodyQ"
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ANIMATION: section entrance — scale 0.95→1 + fade in */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          background: 'linear-gradient(135deg, #7C5CFC 0%, #4A28D4 100%)',
          padding: '120px 24px',
          position: 'relative',
          willChange: 'transform',
        }}
      >
        {/* Floating particles */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: p.top,
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              background: '#FFFFFF',
              opacity: p.opacity,
              animation: `${p.animation} ${p.duration} ease-in-out infinite`,
              animationDelay: p.delay,
              willChange: 'transform',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: '760px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          {/* Eyebrow */}
          <p
            style={{
              fontFamily: 'var(--font-inter)',
              fontWeight: 500,
              fontSize: '11px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(200,241,53,0.9)',
              marginBottom: '24px',
            }}
          >
            START TODAY
          </p>

          {/* Headline */}
          <h2
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 800,
              fontSize: 'clamp(36px, 6vw, 56px)',
              color: 'var(--bq-white)',
              textTransform: 'uppercase',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              marginBottom: '20px',
            }}
          >
            YOUR AI FITNESS COACH IS READY
          </h2>

          {/* Subline */}
          <p
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: '18px',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.6,
              marginBottom: '48px',
              maxWidth: '560px',
              margin: '0 auto 48px',
            }}
          >
            Join over 10,000 athletes already training with real-time AI coaching.
            Start for free — no credit card required.
          </p>

          {/* CTA */}
          <Button variant="primary" href="/signup" idlePulse style={{ fontSize: '16px', padding: '18px 52px' } as React.CSSProperties}>
            Let&apos;s Get Started — Free Forever
          </Button>

          {/* Trust line */}
          <p
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.5)',
              marginTop: '20px',
            }}
          >
            Free forever · Upgrade anytime · Cancel anytime
          </p>

          {/* Already have an account */}
          <p style={{
            fontFamily: 'var(--font-inter)',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.45)',
            marginTop: '16px',
          }}>
            Already have an account?{' '}
            <a
              href="/login"
              style={{
                color: 'var(--bq-lime)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Sign in
            </a>
          </p>
        </div>
      </motion.div>
    </section>
  );
}
