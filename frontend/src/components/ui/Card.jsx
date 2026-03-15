import React from 'react';

export default function Card({ title, children, className = '', style = {} }) {
  return (
    <div
      className={className}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1.5rem',
        ...style,
      }}
    >
      {title && (
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '1rem',
            color: 'white',
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}