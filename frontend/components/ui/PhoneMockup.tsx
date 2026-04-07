'use client';

/* ----------------------------------------------------------
   PHONE MOCKUP COMPONENT
   3D CSS phone frame with a slot for screen content.
   ANIMATION: continuous float loop — @keyframes float from globals.css
   transform: perspective(1000px) rotateY(-12deg) rotateX(4deg) translateY(...)
   Period: 3s, ease-in-out, infinite
   ---------------------------------------------------------- */

interface PhoneMockupProps {
  children?: React.ReactNode;
  /** If true, renders the default BodyQ app UI inside the screen */
  showDefault?: boolean;
}

export default function PhoneMockup({ children, showDefault = true }: PhoneMockupProps) {
  return (
    // ANIMATION: float — the entire phone continuously floats up and down
    <div
      aria-label="BodyQ app mockup"
      style={{
        animation: 'float 3s ease-in-out infinite',
        willChange: 'transform',
        display: 'inline-block',
      }}
    >
      {/* Phone chassis */}
      <div
        style={{
          width: '260px',
          height: '530px',
          background: 'linear-gradient(160deg, #1a1535 0%, #0d0a1a 100%)',
          borderRadius: '44px',
          border: '2px solid rgba(124,92,252,0.4)',
          boxShadow:
            '0 40px 80px rgba(0,0,0,0.8), 0 0 60px rgba(124,92,252,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
          position: 'relative',
          overflow: 'hidden',
          padding: '12px',
        }}
      >
        {/* Notch / Dynamic Island */}
        <div
          style={{
            width: '80px',
            height: '24px',
            background: '#000',
            borderRadius: '999px',
            margin: '0 auto 8px',
            position: 'relative',
            zIndex: 10,
          }}
        />

        {/* Screen content area */}
        <div
          style={{
            width: '100%',
            height: 'calc(100% - 44px)',
            borderRadius: '32px',
            overflow: 'hidden',
            background: '#0a0818',
            position: 'relative',
          }}
        >
          {children || (showDefault && <DefaultAppScreen />)}
        </div>

        {/* Home indicator bar */}
        <div
          style={{
            width: '100px',
            height: '4px',
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '999px',
            margin: '8px auto 0',
          }}
        />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------
   DEFAULT BODYQ APP SCREEN
   Rendered inside the phone when no children provided.
   Shows a stylized workout dashboard UI.
   ---------------------------------------------------------- */
function DefaultAppScreen() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #110e24 0%, #0a0818 100%)',
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        fontFamily: 'var(--font-inter)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--bq-muted)', fontWeight: 500 }}>
            GOOD MORNING
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--bq-white)',
              fontFamily: 'var(--font-syne)',
            }}
          >
            Alex K.
          </div>
        </div>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--bq-purple), var(--bq-purple-dark))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
          }}
        >
          👤
        </div>
      </div>

      {/* Today's AI plan card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(124,92,252,0.3) 0%, rgba(74,40,212,0.2) 100%)',
          border: '1px solid rgba(124,92,252,0.4)',
          borderRadius: '14px',
          padding: '12px',
        }}
      >
        <div style={{ fontSize: '9px', color: 'var(--bq-lime)', letterSpacing: '0.1em', marginBottom: '4px' }}>
          TODAY&apos;S PLAN
        </div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--bq-white)', marginBottom: '2px' }}>
          Upper Body Strength
        </div>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>45 min · 6 exercises · AI-optimized</div>
        <div
          style={{
            marginTop: '10px',
            background: 'var(--bq-lime)',
            color: 'var(--bq-black)',
            fontSize: '10px',
            fontWeight: 700,
            textAlign: 'center',
            borderRadius: '999px',
            padding: '6px',
            letterSpacing: '0.05em',
          }}
        >
          START WORKOUT
        </div>
      </div>

      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {[
          { icon: '🔥', val: '2,340', label: 'KCAL' },
          { icon: '💪', val: '94%', label: 'FORM SCORE' },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '10px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '16px', marginBottom: '2px' }}>{m.icon}</div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: 'var(--bq-lime)',
                fontFamily: 'var(--font-syne)',
              }}
            >
              {m.val}
            </div>
            <div style={{ fontSize: '8px', color: 'var(--bq-muted)', letterSpacing: '0.08em' }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Streak / activity bar */}
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '9px',
            color: 'var(--bq-muted)',
            letterSpacing: '0.08em',
          }}
        >
          <span>WEEKLY STREAK</span>
          <span style={{ color: 'var(--bq-lime)' }}>🔥 7 days</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  height: '24px',
                  borderRadius: '4px',
                  background: i < 5 ? 'var(--bq-lime)' : i === 5 ? 'rgba(200,241,53,0.3)' : 'rgba(255,255,255,0.08)',
                  marginBottom: '3px',
                }}
              />
              <div style={{ fontSize: '7px', color: 'var(--bq-muted)' }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI assistant pill */}
      <div
        style={{
          background: 'linear-gradient(90deg, rgba(124,92,252,0.25), rgba(200,241,53,0.1))',
          border: '1px solid rgba(124,92,252,0.3)',
          borderRadius: '999px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'var(--bq-purple)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
          }}
        >
          ⚡
        </div>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>
          Yara: <span style={{ color: 'var(--bq-lime)' }}>Ready to coach you today!</span>
        </div>
      </div>
    </div>
  );
}
