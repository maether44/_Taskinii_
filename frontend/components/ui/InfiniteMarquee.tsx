'use client';

/* ----------------------------------------------------------
   INFINITE MARQUEE COMPONENT
   Reusable infinite horizontal scroll ticker.
   ANIMATION: CSS @keyframes marquee-left / marquee-right (defined in globals.css).
   Direction prop controls which animation is used.
   Items are duplicated to create a seamless loop.
   Pauses on hover.
   ---------------------------------------------------------- */

interface InfiniteMarqueeProps {
  direction?: 'left' | 'right';
  speed?: number; /** px per second, default 40 */
  gap?: number;   /** px gap between items, default 24 */
  children: React.ReactNode;
  className?: string;
}

export default function InfiniteMarquee({
  direction = 'left',
  speed = 40,
  gap = 24,
  children,
  className = '',
}: InfiniteMarqueeProps) {
  // We use CSS animations defined in globals.css.
  // Duration is computed from the speed so faster speed = shorter duration.
  // The actual width of items is variable so we use a fixed large duration.
  // Fine-tuning per page: override speed prop.
  const duration = `${speed}s`;

  const animName = direction === 'left' ? 'marquee-left' : 'marquee-right';

  return (
    <div
      className={className}
      style={{
        overflow: 'hidden',
        width: '100%',
        // Mask edges for a fade-out effect
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        maskImage:
          'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      }}
      aria-hidden="true" // marquee is decorative
    >
      <div
        style={{
          display: 'flex',
          gap: `${gap}px`,
          // ANIMATION: translate the duplicated list for seamless loop
          animation: `${animName} ${duration} linear infinite`,
          willChange: 'transform',
          width: 'max-content',
        }}
        // ANIMATION: pause on hover
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.animationPlayState = 'paused';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.animationPlayState = 'running';
        }}
      >
        {/* Original set */}
        <div style={{ display: 'flex', gap: `${gap}px`, flexShrink: 0 }}>
          {children}
        </div>
        {/* Duplicate for seamless loop */}
        <div style={{ display: 'flex', gap: `${gap}px`, flexShrink: 0 }} aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
