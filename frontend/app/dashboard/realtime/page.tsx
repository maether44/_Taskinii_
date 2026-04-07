'use client';

import { useState, useEffect, useRef } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';

interface LiveEvent {
  id: number;
  type: 'workout_start' | 'session_end' | 'ai_request' | 'signup' | 'subscription';
  user: string;
  detail: string;
  ts: Date;
}

const EVENT_TYPES: LiveEvent['type'][] = ['workout_start', 'session_end', 'ai_request', 'signup', 'subscription'];
const NAMES = ['Yasmine B.', 'Khalil M.', 'Sara A.', 'Adam T.', 'Lina O.', 'Omar H.', 'Nour F.', 'Karim L.'];
const DETAILS: Record<LiveEvent['type'], string[]> = {
  workout_start: ['Upper Body Blast', 'HIIT Cardio', 'Leg Day Pro', 'Core Crusher', 'Full Body Flow'],
  session_end: ['22 min session', '45 min session', '31 min session', '15 min session'],
  ai_request: ['Posture analysis', 'Nutrition advice', 'Progress review', 'Workout suggestion'],
  signup: ['Free tier', 'Pro trial', 'Elite plan'],
  subscription: ['Upgraded to Pro', 'Upgraded to Elite', 'Renewed Pro', 'Downgraded to Free'],
};

const EVENT_COLORS: Record<LiveEvent['type'], string> = {
  workout_start: '#22c55e',
  session_end: 'var(--bq-muted)',
  ai_request: 'var(--bq-purple)',
  signup: 'var(--bq-lime)',
  subscription: 'var(--chart-blue)',
};

const EVENT_LABELS: Record<LiveEvent['type'], string> = {
  workout_start: 'Workout Start',
  session_end: 'Session End',
  ai_request: 'AI Request',
  signup: 'New Signup',
  subscription: 'Subscription',
};

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let counter = 0;

function makeEvent(): LiveEvent {
  const type = randomItem(EVENT_TYPES);
  return {
    id: ++counter,
    type,
    user: randomItem(NAMES),
    detail: randomItem(DETAILS[type]),
    ts: new Date(),
  };
}

const card: React.CSSProperties = {
  background: 'var(--bq-surface-1)',
  border: '1px solid var(--bq-border)',
  borderRadius: 12, padding: 20,
};

export default function RealtimePage() {
  const [events, setEvents] = useState<LiveEvent[]>(() => Array.from({ length: 12 }, makeEvent));
  const [paused, setPaused] = useState(false);
  const [activeUsers] = useState(Math.floor(Math.random() * 40 + 80));
  const [rps, setRps] = useState(2.4);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      setEvents((prev) => [makeEvent(), ...prev].slice(0, 50));
      setRps((r) => Math.max(0.5, +(r + (Math.random() - 0.5) * 0.4).toFixed(1)));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const typeCounts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="Real-Time"
        description="Live activity stream — events update automatically"
        action={
          <button
            onClick={() => setPaused((p) => !p)}
            style={{
              background: paused ? 'var(--bq-purple)' : 'var(--bq-surface-3)',
              border: '1px solid var(--bq-border)', borderRadius: 8,
              padding: '8px 18px', fontFamily: 'var(--font-inter)', fontSize: 13,
              fontWeight: 600, color: 'var(--bq-text-1)', cursor: 'pointer',
            }}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
        }
      />

      {/* Live KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Active Users', value: activeUsers, unit: '', color: '#22c55e' },
          { label: 'Req / sec', value: rps, unit: '', color: 'var(--bq-purple)' },
          { label: 'Events (last 50)', value: events.length, unit: '', color: 'var(--bq-lime)' },
          { label: 'Signups Today', value: typeCounts['signup'] ?? 0, unit: '', color: 'var(--chart-blue)' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ ...card }}>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {kpi.label}
            </p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 28, fontWeight: 700, color: kpi.color }}>
              {kpi.value}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: kpi.color, animation: paused ? 'none' : 'pulse-dot 1.5s infinite' }} />
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-muted)' }}>
                {paused ? 'Paused' : 'Live'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Event breakdown + stream */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        {/* Breakdown */}
        <div style={card}>
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: 14, color: 'var(--bq-text-1)', marginBottom: 16 }}>
            Event Breakdown
          </p>
          {EVENT_TYPES.map((type) => {
            const count = typeCounts[type] ?? 0;
            const pct = events.length > 0 ? Math.round((count / events.length) * 100) : 0;
            return (
              <div key={type} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-text-2)' }}>
                    {EVENT_LABELS[type]}
                  </span>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, fontWeight: 600, color: 'var(--bq-text-1)' }}>
                    {count}
                  </span>
                </div>
                <div style={{ height: 5, background: 'var(--bq-surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: EVENT_COLORS[type], borderRadius: 3, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Live stream */}
        <div style={{ ...card, maxHeight: 420, overflowY: 'auto' }} className="dash-scroll">
          <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: 14, color: 'var(--bq-text-1)', marginBottom: 12 }}>
            Live Event Stream
          </p>
          {events.map((ev) => (
            <div
              key={ev.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '8px 0', borderBottom: '1px solid var(--bq-border)',
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                background: EVENT_COLORS[ev.type],
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: 'var(--font-inter)', fontSize: 11, fontWeight: 600,
                    color: EVENT_COLORS[ev.type],
                    background: `${EVENT_COLORS[ev.type]}18`,
                    borderRadius: 4, padding: '1px 7px',
                  }}>
                    {EVENT_LABELS[ev.type]}
                  </span>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-1)', fontWeight: 500 }}>
                    {ev.user}
                  </span>
                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)' }}>
                    — {ev.detail}
                  </span>
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--bq-text-3)', flexShrink: 0 }}>
                {ev.ts.toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
