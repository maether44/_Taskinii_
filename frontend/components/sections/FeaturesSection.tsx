'use client';

import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import SectionHeading from '@/components/ui/SectionHeading';

/* ----------------------------------------------------------
   FEATURES SECTION
   3×2 grid of glassmorphism feature cards.
   ANIMATION: staggered scroll-triggered fade-up via Framer Motion whileInView.
              0.1s stagger between cards, 0.5s duration, y: 24 → 0.
   Background: #000000 with purple radial glow top-right.
   ---------------------------------------------------------- */

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bq-lime)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M12 12v4m-4 0h8M8 20h8"/>
        <circle cx="8" cy="18" r="1" fill="var(--bq-lime)"/>
        <circle cx="16" cy="18" r="1" fill="var(--bq-lime)"/>
        <circle cx="12" cy="22" r="1" fill="var(--bq-lime)"/>
      </svg>
    ),
    title: 'AI Posture Analysis',
    description:
      'Real-time skeletal tracking identifies form errors before they become injuries. Our CV engine analyzes 33 body landmarks at 30fps.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bq-lime)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
        <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
        <path d="M7 17h10"/>
      </svg>
    ),
    title: 'Smart Nutrition AI',
    description:
      'Personalized meal plans that adapt to your goals, allergies, and progress. Macro tracking that evolves as your body changes.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bq-lime)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: 'Dynamic Workout Plans',
    description:
      'Plans that evolve with you — harder when you\'re ready, easier when you need it. Adaptive AI recalibrates after every session.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bq-lime)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
      </svg>
    ),
    title: 'Real-Time Coaching',
    description:
      'Audio and visual cues during every rep. Like having a certified PT in your pocket — coaching form, pace, and breathing live.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bq-lime)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: 'Progress Intelligence',
    description:
      'Deep analytics on strength, mobility, body composition, and habit streaks. See your improvement curve with AI-generated insights.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bq-lime)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: 'Community Challenges',
    description:
      'Compete with friends, join global challenges, and celebrate milestones together. Leaderboards that make fitness social and fun.',
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      aria-label="BodyQ features"
      style={{
        position: 'relative',
        background: 'var(--bq-black)',
        padding: '120px 24px',
        overflow: 'hidden',
      }}
    >
      {/* Purple glow top-right */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '700px',
          height: '700px',
          background: 'radial-gradient(ellipse at 100% 0%, rgba(124,92,252,0.25) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative' }}>
        {/* Heading */}
        <SectionHeading
          eyebrow="WHAT BODYQ DOES"
          headline="EVERYTHING YOU NEED IN ONE INTELLIGENT PLATFORM"
          centered
          className="mb-16"
        />

        {/* Feature cards grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
            marginTop: '80px',
          }}
          className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((feature, i) => (
            // ANIMATION: staggered whileInView fade-up — each card 0.1s after previous
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.1 }}
            >
              <GlassCard hoverable style={{ padding: '32px', height: '100%' }}>
                {/* Icon */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(200,241,53,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  {feature.icon}
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontWeight: 700,
                    fontSize: '20px',
                    color: 'var(--bq-white)',
                    marginBottom: '12px',
                    lineHeight: 1.2,
                  }}
                >
                  {feature.title}
                </h3>

                {/* Description */}
                <p
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: '15px',
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.65,
                  }}
                >
                  {feature.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
