'use client';

/* ----------------------------------------------------------
   GLASS CARD COMPONENT
   Reusable glassmorphism card wrapper.
   Hover: translateY(-8px) + purple glow shadow.
   ---------------------------------------------------------- */

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
  role?: string;
  'aria-label'?: string;
}

export default function GlassCard({
  children,
  className = '',
  hoverable = false,
  style = {},
  onClick,
  role,
  'aria-label': ariaLabel,
}: GlassCardProps) {
  const baseStyle: React.CSSProperties = {
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    background: 'rgba(124, 92, 252, 0.08)',
    border: '1px solid var(--bq-border)',
    borderRadius: '20px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    transition: hoverable
      ? 'transform 200ms ease-out, box-shadow 200ms ease-out'
      : 'none',
    willChange: hoverable ? 'transform' : 'auto',
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hoverable) return;
    // ANIMATION: card hover — lift 8px and apply purple glow
    const el = e.currentTarget;
    el.style.transform = 'translateY(-8px)';
    el.style.boxShadow = '0 0 48px rgba(124,92,252,0.35), 0 24px 64px rgba(0,0,0,0.6)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hoverable) return;
    const el = e.currentTarget;
    el.style.transform = 'translateY(0)';
    el.style.boxShadow = '0 24px 64px rgba(0,0,0,0.6)';
  };

  return (
    <div
      style={baseStyle}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
