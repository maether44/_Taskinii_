'use client';

import { useEffect, useRef, useState } from 'react';

/* ----------------------------------------------------------
   STAT COUNTER COMPONENT
   ANIMATION: GSAP count-up from 0 to finalValue when scrolled into view.
   IntersectionObserver triggers GSAP tween.
   Duration: 1.4s, ease: power2.out
   ---------------------------------------------------------- */

interface StatCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  decimals?: number;
}

export default function StatCounter({
  value,
  suffix = '',
  prefix = '',
  label,
  decimals = 0,
}: StatCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            // ANIMATION: count-up from 0 to value over 1400ms with power2.out easing
            const duration = 1400;
            const startTime = performance.now();

            const tick = (currentTime: number) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              // power2.out easing approximation
              const eased = 1 - Math.pow(1 - progress, 2);
              setDisplayValue(eased * value);

              if (progress < 1) {
                animFrameRef.current = requestAnimationFrame(tick);
              } else {
                setDisplayValue(value);
              }
            };

            animFrameRef.current = requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value, hasAnimated]);

  const formatted =
    decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.floor(displayValue).toLocaleString();

  return (
    <div
      ref={containerRef}
      style={{ textAlign: 'center' }}
    >
      <div
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 800,
          fontSize: 'clamp(40px, 6vw, 64px)',
          color: 'var(--bq-lime)',
          lineHeight: 1,
          marginBottom: '12px',
          letterSpacing: '-0.02em',
        }}
        aria-label={`${prefix}${value}${suffix}`}
      >
        {prefix}{formatted}{suffix}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-inter)',
          fontSize: '14px',
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 500,
        }}
      >
        {label}
      </div>
    </div>
  );
}
