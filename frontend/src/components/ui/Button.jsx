import React from 'react';

const variants = {
  primary: {
    background: 'var(--color-primary)',
    color: 'white',
    border: 'none',
  },
  secondary: {
    background: 'var(--color-accent-lime)',
    color: 'var(--color-background)',
    border: 'none',
  },
  outline: {
    background: 'transparent',
    color: 'white',
    border: '2px solid rgba(255,255,255,0.3)',
  },
};

export default function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled = false,
  className = '',
  style = {},
  ...rest
}) {
  const base = {
    padding: '0.75rem 1.5rem',
    borderRadius: '50px',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'transform 0.2s ease, opacity 0.2s ease',
    fontFamily: 'var(--font-family)',
    ...variants[variant],
    ...style,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={base}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.transform = 'scale(1.02)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      {...rest}
    >
      {children}
    </button>
  );
}