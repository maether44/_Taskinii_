'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SectionHeading from '@/components/ui/SectionHeading';
import Button from '@/components/ui/Button';

/* ----------------------------------------------------------
   WORKOUT BROWSER
   Left: vertical tab list (30% width).
   Right: animated content panel (70% width).
   ANIMATION: Framer Motion AnimatePresence on tab switch.
     Exit:  { opacity: 0, x: -16 }
     Enter: { opacity: 1, x: 0 }
     Duration: 300ms
   Mobile: vertical accordion — active item expands panel below it.
   ---------------------------------------------------------- */

const CATEGORIES = [
  {
    id: 'strength',
    label: 'Strength Training',
    headline: 'BUILD UNBREAKABLE STRENGTH',
    description:
      'Progressive overload programs designed by AI to maximize hypertrophy and functional power. Every set, every rep — precision-coached.',
    gradientA: '#4A28D4',
    gradientB: '#7C5CFC',
    icon: '',
    stats: ['4–6 week programs', 'Form-checked reps', 'Auto-progression'],
  },
  {
    id: 'hiit',
    label: 'HIIT',
    headline: 'IGNITE YOUR METABOLISM',
    description:
      'High-intensity interval training sequences that torch fat and spike your VO₂ max. AI adapts rest periods to your real-time heart rate.',
    gradientA: '#1a0d3e',
    gradientB: '#4A28D4',
    icon: '',
    stats: ['15–45 min sessions', 'Heart rate adaptive', 'Calorie maximized'],
  },
  {
    id: 'yoga',
    label: 'Yoga & Mobility',
    headline: 'MOVE WITH FREEDOM',
    description:
      'AI-guided yoga flows and mobility protocols that identify your tightest patterns and systematically restore full range of motion.',
    gradientA: '#0d1a3e',
    gradientB: '#2a4A8C',
    icon: '',
    stats: ['Daily mobility checks', 'Posture correction', 'Flexibility tracking'],
  },
  {
    id: 'cardio',
    label: 'Cardio',
    headline: 'RUN FURTHER. BREATHE EASIER.',
    description:
      'Structured cardio plans from base-building to race preparation. GPS-paced runs, indoor cycle programs, and rowing intervals.',
    gradientA: '#0d2a1a',
    gradientB: '#1a4A2A',
    icon: '',
    stats: ['Pace-based training', 'Zone 2 optimization', 'Distance builder'],
  },
  {
    id: 'recovery',
    label: 'Recovery',
    headline: 'RECOVER LIKE AN ATHLETE',
    description:
      'Sleep quality tracking, active recovery protocols, and HRV-based rest recommendations. Because gains happen during recovery.',
    gradientA: '#1a0d2e',
    gradientB: '#2a1a4A',
    icon: '',
    stats: ['Sleep scoring', 'HRV monitoring', 'Recovery protocols'],
  },
  {
    id: 'recomp',
    label: 'Body Recomposition',
    headline: 'LOSE FAT. BUILD MUSCLE. SIMULTANEOUSLY.',
    description:
      'The hardest goal in fitness — and BodyQ\'s speciality. Our dual-phase AI periodizes nutrition and training for simultaneous recomp.',
    gradientA: '#2a1a0d',
    gradientB: '#4A3A1A',
    icon: '',
    stats: ['Caloric cycling', 'Muscle-sparing cuts', 'Body comp tracking'],
  },
];

export default function WorkoutBrowser() {
  const [activeId, setActiveId] = useState(CATEGORIES[0].id);
  const [openAccordion, setOpenAccordion] = useState<string | null>(CATEGORIES[0].id);

  const activeCategory = CATEGORIES.find((c) => c.id === activeId) ?? CATEGORIES[0];

  return (
    <section
      id="workout-browser"
      aria-label="Workout category browser"
      style={{
        background: 'var(--bq-deep)',
        padding: '120px 24px',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <SectionHeading
          eyebrow="TRAIN YOUR WAY"
          headline="TRAIN THE WAY YOUR BODY NEEDS"
          centered
          className="mb-16"
        />

        {/* ── DESKTOP LAYOUT ── */}
        <div className="hidden lg:flex" style={{ gap: '48px', marginTop: '80px' }}>
          {/* Tab list — left 30% */}
          <div
            role="tablist"
            aria-label="Workout categories"
            style={{ width: '30%', flexShrink: 0 }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = cat.id === activeId;
              return (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${cat.id}`}
                  id={`tab-${cat.id}`}
                  onClick={() => setActiveId(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    width: '100%',
                    padding: '18px 20px',
                    background: isActive ? 'rgba(124,92,252,0.12)' : 'transparent',
                    border: 'none',
                    borderLeft: `3px solid ${isActive ? 'var(--bq-lime)' : 'transparent'}`,
                    borderRadius: '0 12px 12px 0',
                    cursor: 'pointer',
                    textAlign: 'left',
                    // ANIMATION: border-left and bg transition 200ms on tab change
                    transition: 'border-left-color 200ms ease, background 200ms ease',
                    marginBottom: '4px',
                  }}
                >
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{cat.icon}</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-inter)',
                      fontWeight: 500,
                      fontSize: '14px',
                      // ANIMATION: text turns lime on active, white on hover
                      color: isActive ? 'var(--bq-lime)' : 'var(--bq-white)',
                      transition: 'color 200ms ease',
                      lineHeight: 1.3,
                    }}
                  >
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content panel — right 70% */}
          <div
            id={`panel-${activeId}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeId}`}
            style={{ flex: 1 }}
          >
            <AnimatePresence mode="wait">
              {/* ANIMATION: AnimatePresence — exit opacity+x, enter opacity+x, 300ms */}
              <motion.div
                key={activeId}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{
                  background: `linear-gradient(135deg, ${activeCategory.gradientA} 0%, ${activeCategory.gradientB} 100%)`,
                  borderRadius: '24px',
                  padding: '56px 48px',
                  border: '1px solid rgba(124,92,252,0.25)',
                  boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
                  minHeight: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '48px', marginBottom: '24px' }}>
                    {activeCategory.icon}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-syne)',
                      fontWeight: 700,
                      fontSize: '36px',
                      color: 'var(--bq-white)',
                      textTransform: 'uppercase',
                      letterSpacing: '-0.01em',
                      marginBottom: '20px',
                      lineHeight: 1.1,
                    }}
                  >
                    {activeCategory.headline}
                  </h3>
                  <p
                    style={{
                      fontFamily: 'var(--font-inter)',
                      fontSize: '16px',
                      color: 'rgba(255,255,255,0.75)',
                      lineHeight: 1.65,
                      maxWidth: '480px',
                      marginBottom: '32px',
                    }}
                  >
                    {activeCategory.description}
                  </p>

                  {/* Stats chips */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '40px' }}>
                    {activeCategory.stats.map((s) => (
                      <span
                        key={s}
                        style={{
                          fontFamily: 'var(--font-inter)',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'var(--bq-lime)',
                          background: 'rgba(200,241,53,0.12)',
                          border: '1px solid rgba(200,241,53,0.25)',
                          borderRadius: '999px',
                          padding: '6px 14px',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <Button variant="primary" href="#signup" style={{ alignSelf: 'flex-start' } as React.CSSProperties}>
                  Explore Plans →
                </Button>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── MOBILE ACCORDION ── */}
        <div className="lg:hidden" style={{ marginTop: '48px' }}>
          {CATEGORIES.map((cat) => {
            const isOpen = openAccordion === cat.id;
            return (
              <div key={cat.id} style={{ marginBottom: '12px' }}>
                {/* Accordion header */}
                <button
                  aria-expanded={isOpen}
                  aria-controls={`accordion-${cat.id}`}
                  onClick={() => setOpenAccordion(isOpen ? null : cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '18px 20px',
                    background: isOpen ? 'rgba(124,92,252,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isOpen ? 'rgba(124,92,252,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: isOpen ? '16px 16px 0 0' : '16px',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{cat.icon}</span>
                    <span
                      style={{
                        fontFamily: 'var(--font-inter)',
                        fontWeight: 600,
                        fontSize: '15px',
                        color: isOpen ? 'var(--bq-lime)' : 'var(--bq-white)',
                      }}
                    >
                      {cat.label}
                    </span>
                  </span>
                  {/* Chevron */}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--bq-lime)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 200ms ease',
                      flexShrink: 0,
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Accordion panel */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      id={`accordion-${cat.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          background: `linear-gradient(135deg, ${cat.gradientA} 0%, ${cat.gradientB} 100%)`,
                          borderRadius: '0 0 16px 16px',
                          padding: '32px 24px',
                          border: '1px solid rgba(124,92,252,0.25)',
                          borderTop: 'none',
                        }}
                      >
                        <h3
                          style={{
                            fontFamily: 'var(--font-syne)',
                            fontWeight: 700,
                            fontSize: '24px',
                            color: 'var(--bq-white)',
                            textTransform: 'uppercase',
                            marginBottom: '16px',
                          }}
                        >
                          {cat.headline}
                        </h3>
                        <p
                          style={{
                            fontFamily: 'var(--font-inter)',
                            fontSize: '15px',
                            color: 'rgba(255,255,255,0.75)',
                            lineHeight: 1.6,
                            marginBottom: '24px',
                          }}
                        >
                          {cat.description}
                        </p>
                        <Button variant="primary" href="#signup">
                          Explore Plans →
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
