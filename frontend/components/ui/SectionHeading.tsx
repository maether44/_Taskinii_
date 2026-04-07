'use client';

import { motion } from 'framer-motion';

/* ----------------------------------------------------------
   SECTION HEADING COMPONENT
   Animated eyebrow + H2 headline.
   ANIMATION: scroll-triggered fade-up via Framer Motion whileInView.
   Start: { opacity: 0, y: 32 } → End: { opacity: 1, y: 0 }
   Trigger: when 20% of element is visible in viewport.
   ---------------------------------------------------------- */

interface SectionHeadingProps {
  eyebrow?: string;
  headline: string;
  subline?: string;
  centered?: boolean;
  className?: string;
}

export default function SectionHeading({
  eyebrow,
  headline,
  subline,
  centered = false,
  className = '',
}: SectionHeadingProps) {
  return (
    <div
      className={className}
      style={{ textAlign: centered ? 'center' : 'left' }}
    >
      {eyebrow && (
        // ANIMATION: eyebrow fades up first
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ marginBottom: '16px' }}
        >
          {eyebrow}
        </motion.p>
      )}
      {/* ANIMATION: headline fades up 100ms after eyebrow */}
      <motion.h2
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: eyebrow ? 0.1 : 0 }}
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 700,
          fontSize: 'clamp(36px, 5vw, 56px)',
          color: 'var(--bq-white)',
          textTransform: 'uppercase',
          lineHeight: 1.05,
          marginBottom: subline ? '24px' : '0',
          letterSpacing: '-0.01em',
        }}
      >
        {headline}
      </motion.h2>
      {subline && (
        // ANIMATION: subline fades up last
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: '18px',
            color: 'rgba(255,255,255,0.65)',
            maxWidth: centered ? '640px' : '100%',
            margin: centered ? '0 auto' : '0',
            lineHeight: 1.6,
          }}
        >
          {subline}
        </motion.p>
      )}
    </div>
  );
}
