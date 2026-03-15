import React from 'react';

export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  error,
  disabled = false,
  id,
  className = '',
  ...rest
}) {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s/g, '-') || 'field'}`;
  return (
    <div className={className} style={{ marginBottom: '1rem' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            fontSize: '0.9rem',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.8)',
            marginBottom: '0.5rem',
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          border: `1px solid ${error ? 'var(--color-error, #e74c3c)' : 'rgba(255,255,255,0.2)'}`,
          background: 'rgba(0,0,0,0.2)',
          color: 'white',
          fontSize: '1rem',
          fontFamily: 'var(--font-family)',
          boxSizing: 'border-box',
        }}
        {...rest}
      />
      {error && (
        <span
          style={{
            display: 'block',
            fontSize: '0.8rem',
            color: 'var(--color-error, #e74c3c)',
            marginTop: '0.25rem',
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}