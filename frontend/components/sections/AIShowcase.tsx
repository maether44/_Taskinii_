'use client';

import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';

const BULLET_POINTS = [
  'Real-time analysis of 33 skeletal landmarks at 30 frames per second',
  'Instant form correction alerts for squats, deadlifts, push-ups, and 200+ exercises',
  'Injury-prevention scoring that flags dangerous movement patterns before damage occurs',
];

export default function AIShowcase() {
  return (
    <section
      id="ai-showcase"
      aria-label="Computer Vision AI posture analysis"
      style={{
        background: 'var(--bq-black)',
        padding: '120px 24px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '80px',
        }}
        className="flex-col lg:flex-row"
      >
        {/* ── LEFT: Copy ── */}
        <motion.div
          initial={{ x: -80, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ flex: 1, minWidth: 0, willChange: 'transform' }}
        >
          <p className="eyebrow" style={{ marginBottom: '20px' }}>
            COMPUTER VISION ENGINE
          </p>

          <h2
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 800,
              fontSize: 'clamp(32px, 4vw, 52px)',
              color: 'var(--bq-white)',
              textTransform: 'uppercase',
              lineHeight: 1.05,
              marginBottom: '32px',
              letterSpacing: '-0.01em',
            }}
          >
            REAL-TIME AI POSTURE COACHING
          </h2>

          <ul style={{ listStyle: 'none', marginBottom: '48px' }}>
            {BULLET_POINTS.map((point, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 + i * 0.1 }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  marginBottom: '20px',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'rgba(200,241,53,0.15)',
                    border: '1.5px solid var(--bq-lime)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <polyline points="1,4 4,7 9,1" stroke="var(--bq-lime)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.75)',
                    lineHeight: 1.6,
                  }}
                >
                  {point}
                </span>
              </motion.li>
            ))}
          </ul>

          <Button variant="primary" href="#signup">
            See It In Action →
          </Button>
        </motion.div>

        {/* ── RIGHT: Posture Analysis Visual ── */}
        <motion.div
          initial={{ x: 80, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
            willChange: 'transform',
          }}
        >
          <PostureAnalysisUI />
        </motion.div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------
   POSTURE ANALYSIS UI
   Built with SVG + HTML, no images.
   ---------------------------------------------------------- */
function PostureAnalysisUI() {
  const joints = [
    { x: 160, y: 80,  label: 'Head',       color: 'var(--bq-lime)', r: 7 },
    { x: 160, y: 110, label: 'Neck',       color: 'var(--bq-lime)', r: 5 },
    { x: 120, y: 135, label: 'L Shoulder', color: '#7C5CFC',        r: 6 },
    { x: 200, y: 135, label: 'R Shoulder', color: '#7C5CFC',        r: 6 },
    { x: 100, y: 180, label: 'L Elbow',    color: 'var(--bq-lime)', r: 5 },
    { x: 220, y: 180, label: 'R Elbow',    color: 'var(--bq-lime)', r: 5 },
    { x: 88,  y: 220, label: 'L Wrist',    color: '#7C5CFC',        r: 4 },
    { x: 232, y: 220, label: 'R Wrist',    color: '#7C5CFC',        r: 4 },
    { x: 135, y: 230, label: 'L Hip',      color: 'var(--bq-lime)', r: 6 },
    { x: 185, y: 230, label: 'R Hip',      color: 'var(--bq-lime)', r: 6 },
    { x: 130, y: 295, label: 'L Knee',     color: '#7C5CFC',        r: 6 },
    { x: 190, y: 295, label: 'R Knee',     color: '#7C5CFC',        r: 6 },
    { x: 125, y: 355, label: 'L Ankle',    color: 'var(--bq-lime)', r: 5 },
    { x: 195, y: 355, label: 'R Ankle',    color: 'var(--bq-lime)', r: 5 },
  ];

  const bones = [
    [joints[1], joints[2]], [joints[1], joints[3]],
    [joints[2], joints[4]], [joints[4], joints[6]],
    [joints[3], joints[5]], [joints[5], joints[7]],
    [joints[2], joints[8]], [joints[3], joints[9]], [joints[8], joints[9]],
    [joints[8], joints[10]], [joints[10], joints[12]],
    [joints[9], joints[11]], [joints[11], joints[13]],
    [joints[0], joints[1]],
  ];

  return (
    <div style={{ position: 'relative', width: '320px' }}>
      <GlassCard style={{ padding: '24px', borderRadius: '24px', position: 'relative' }}>
        <div
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: '11px',
            color: 'var(--bq-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          Live Analysis · Camera Feed
        </div>

        <svg
          width="272"
          height="380"
          viewBox="0 0 320 400"
          style={{ display: 'block', margin: '0 auto' }}
          aria-label="Skeletal posture analysis diagram"
          role="img"
        >
          <ellipse cx="160" cy="200" rx="68" ry="130" fill="rgba(124,92,252,0.08)" />
          {bones.map(([a, b], i) => (
            <line
              key={i}
              x1={a.x} y1={a.y}
              x2={b.x} y2={b.y}
              stroke="rgba(124,92,252,0.5)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
          {joints.map((j) => (
            <g key={j.label}>
              <circle cx={j.x} cy={j.y} r={j.r + 4} fill={j.color} opacity={0.15} />
              <circle cx={j.x} cy={j.y} r={j.r} fill={j.color} />
            </g>
          ))}
          <rect x="0" y="0" width="320" height="400" fill="url(#scanline)" opacity="0.04" />
          <defs>
            <linearGradient id="scanline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="white" stopOpacity="0"/>
              <stop offset="50%"  stopColor="white" stopOpacity="1"/>
              <stop offset="100%" stopColor="white" stopOpacity="0"/>
            </linearGradient>
          </defs>
        </svg>

        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'var(--bq-lime)',
            color: 'var(--bq-black)',
            borderRadius: '999px',
            padding: '6px 14px',
            fontFamily: 'var(--font-syne)',
            fontWeight: 800,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          aria-label="Form score: 94%"
        >
          <span style={{ fontSize: '10px' }}>⚡</span>
          Form Score: 94%
        </div>

        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--bq-lime)',
              display: 'block',
              boxShadow: '0 0 8px var(--bq-lime)',
            }}
          />
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            33 landmarks detected · Good form
          </span>
        </div>
      </GlassCard>
    </div>
  );
}
