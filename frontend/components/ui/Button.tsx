'use client';

import { useState, useEffect, useRef } from 'react';

/* ----------------------------------------------------------
   BUTTON COMPONENT
   Variants: primary (lime), secondary (outlined white), ghost (lime text)
   All brand sizing and colors come from CSS custom properties.
   ---------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
  /** Render as <a> tag with this href instead of <button> */
  href?: string;
  /** Show the idle pulse glow after 3s — use only on primary hero CTA */
  idlePulse?: boolean;
}

export default function Button({
  variant = 'primary',
  children,
  href,
  idlePulse = false,
  className = '',
  ...props
}: ButtonProps) {
  // ANIMATION: idle pulse — after 3s of no user interaction, primary CTA glows
  const [pulsing, setPulsing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!idlePulse) return;

    const startTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPulsing(false);
      timerRef.current = setTimeout(() => setPulsing(true), 3000);
    };

    startTimer();

    const resetOnInteraction = () => startTimer();
    window.addEventListener('mousemove', resetOnInteraction, { passive: true });
    window.addEventListener('keydown', resetOnInteraction, { passive: true });
    window.addEventListener('touchstart', resetOnInteraction, { passive: true });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('mousemove', resetOnInteraction);
      window.removeEventListener('keydown', resetOnInteraction);
      window.removeEventListener('touchstart', resetOnInteraction);
    };
  }, [idlePulse]);

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: '999px',
    padding: '16px 40px',
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'var(--font-inter)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'transform 150ms ease-out, box-shadow 150ms ease-out, background-color 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out',
    willChange: 'transform',
    textDecoration: 'none',
    border: 'none',
    outline: 'none',
    whiteSpace: 'nowrap',
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: 'var(--bq-lime)',
      color: 'var(--bq-black)',
      // ANIMATION: idle-pulse — box-shadow oscillates between transparent and lime glow
      animation: pulsing ? 'pulse-glow 2s ease-in-out infinite' : 'none',
    },
    secondary: {
      background: 'transparent',
      color: 'var(--bq-white)',
      border: '2px solid rgba(255,255,255,0.3)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--bq-lime)',
      padding: '8px 0',
      textDecoration: 'underline',
      textUnderlineOffset: '3px',
    },
  };

  const combinedStyle = { ...baseStyles, ...variantStyles[variant] };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    // ANIMATION: hover — scale up 1.04 + color transitions
    el.style.transform = 'scale(1.04)';
    if (variant === 'primary') {
      el.style.background = 'var(--bq-lime-bright)';
    } else if (variant === 'secondary') {
      el.style.borderColor = 'var(--bq-lime)';
      el.style.color = 'var(--bq-lime)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.transform = 'scale(1)';
    if (variant === 'primary') {
      el.style.background = 'var(--bq-lime)';
    } else if (variant === 'secondary') {
      el.style.borderColor = 'rgba(255,255,255,0.3)';
      el.style.color = 'var(--bq-white)';
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    // ANIMATION: active press — scale down to 0.97
    (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)';
  };

  const sharedProps = {
    style: combinedStyle,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    className,
  };

  if (href) {
    return (
      <a href={href} {...sharedProps} role="button">
        {children}
      </a>
    );
  }

  return (
    <button {...props} {...sharedProps}>
      {children}
    </button>
  );
}
