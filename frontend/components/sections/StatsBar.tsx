'use client';

import StatCounter from '@/components/ui/StatCounter';

/* ----------------------------------------------------------
   STATS BAR
   Full-width, bg #0F0B1E with purple-tinted top/bottom borders.
   4-column grid of animated stat counters.
   ANIMATION: GSAP-style count-up (via StatCounter component's
              IntersectionObserver + rAF animation) when scrolled into view.
   ---------------------------------------------------------- */

const STATS = [
  { value: 10000, suffix: '+', label: 'Users Coached', prefix: '' },
  { value: 98, suffix: '%', label: 'Posture Accuracy', prefix: '' },
  { value: 50, suffix: '+', label: 'AI Workout Plans', prefix: '' },
  { value: 4.9, suffix: '★', label: 'App Rating', prefix: '', decimals: 1 },
];

export default function StatsBar() {
  return (
    <section
      id="stats"
      aria-label="BodyQ platform statistics"
      style={{
        background: 'var(--bq-deep)',
        borderTop: '1px solid rgba(124,92,252,0.3)',
        borderBottom: '1px solid rgba(124,92,252,0.3)',
        padding: '48px 24px',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '32px',
        }}
        className="grid-cols-2 sm:grid-cols-4"
      >
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              position: 'relative',
              paddingLeft: i > 0 ? '32px' : '0',
            }}
          >
            {/* Vertical divider between columns */}
            {i > 0 && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '10%',
                  height: '80%',
                  width: '1px',
                  background: 'rgba(255,255,255,0.08)',
                }}
              />
            )}
            <StatCounter
              value={stat.value}
              suffix={stat.suffix}
              prefix={stat.prefix}
              label={stat.label}
              decimals={stat.decimals}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
