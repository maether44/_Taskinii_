import React from 'react';

const MAX_WIDTH = 1200;
const PADDING = 'clamp(1rem, 5vw, 3rem)';

export default function PageContainer({ title, subtitle, children, style = {} }) {
  return (
    <main
      style={{
        maxWidth: MAX_WIDTH,
        margin: '0 auto',
        padding: `2rem ${PADDING} 4rem`,
        ...style,
      }}
    >
      {(title || subtitle) && (
        <header style={{ marginBottom: '2rem' }}>
          {title && (
            <h1
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                fontWeight: 800,
                color: 'white',
                marginBottom: subtitle ? '0.5rem' : 0,
              }}
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>{subtitle}</p>
          )}
        </header>
      )}
      {children}
    </main>
  );
}