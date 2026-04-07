'use client';

import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';

const BULLET_POINTS = [
  'Macro-precise meal plans generated from your body metrics, goals, and food preferences',
  'Automatic caloric recalibration based on weekly progress photos and strength data',
  'Allergy-aware recipe suggestions with 500+ meals in our AI-curated database',
];

const MEALS = [
  { name: 'Overnight Oats',       kcal: 380, macro: 'C 58g · P 18g · F 8g',  time: '07:30' },
  { name: 'Grilled Chicken Bowl', kcal: 520, macro: 'C 45g · P 46g · F 12g', time: '12:30' },
  { name: 'Greek Yogurt Snack',   kcal: 180, macro: 'C 22g · P 14g · F 3g',  time: '15:00' },
  { name: 'Salmon & Quinoa',      kcal: 610, macro: 'C 48g · P 44g · F 20g', time: '19:00' },
];

export default function NutritionSection() {
  return (
    <section
      id="nutrition"
      aria-label="Nutrition AI recommendation engine"
      style={{
        background: 'var(--bq-black)',
        padding: '120px 24px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '80px',
        }}
        className="flex-col lg:flex-row"
      >
        {/* ── LEFT: Copy ── */}
        <motion.div
          initial={{ x: -80, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ flex: 1, minWidth: 0, willChange: 'transform' }}
        >
          <p className="eyebrow" style={{ marginBottom: '20px' }}>
            RECOMMENDATION ENGINE
          </p>

          <h2
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 800,
              fontSize: 'clamp(32px, 4vw, 52px)',
              color: 'var(--bq-white)',
              textTransform: 'uppercase',
              lineHeight: 1.05,
              marginBottom: '32px',
              letterSpacing: '-0.01em',
            }}
          >
            EAT SMARTER WITH PERSONALIZED NUTRITION AI
          </h2>

          <ul style={{ listStyle: 'none', marginBottom: '48px' }}>
            {BULLET_POINTS.map((point, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 + i * 0.1 }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  marginBottom: '20px',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'rgba(200,241,53,0.15)',
                    border: '1.5px solid var(--bq-lime)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <polyline points="1,4 4,7 9,1" stroke="var(--bq-lime)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.75)',
                    lineHeight: 1.6,
                  }}
                >
                  {point}
                </span>
              </motion.li>
            ))}
          </ul>

          <Button variant="primary" href="#signup">
            Start Eating Smarter →
          </Button>
        </motion.div>

        {/* ── RIGHT: Nutrition Dashboard Visual ── */}
        <motion.div
          initial={{ x: 80, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
            willChange: 'transform',
          }}
        >
          <NutritionDashboard />
        </motion.div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------
   NUTRITION DASHBOARD UI
   Built in pure HTML/CSS — no images.
   ---------------------------------------------------------- */
function NutritionDashboard() {
  const carbPct = 48;
  const protPct = 30;
  const fatPct  = 22;
  const carbAngle = (carbPct / 100) * 360;
  const protAngle = (protPct / 100) * 360;

  return (
    <GlassCard style={{ padding: '28px', borderRadius: '24px', width: '320px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '10px', color: 'var(--bq-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Today&apos;s Nutrition
          </div>
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: 'var(--bq-white)' }}>
            1,690 / 2,150 kcal
          </div>
        </div>
        <div
          style={{
            background: 'rgba(200,241,53,0.12)',
            border: '1px solid rgba(200,241,53,0.3)',
            borderRadius: '999px',
            padding: '4px 12px',
            fontSize: '11px',
            color: 'var(--bq-lime)',
            fontWeight: 600,
          }}
        >
          On Track ✓
        </div>
      </div>

      {/* Macro ring + legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
        <div
          aria-label={`Macros: Carbs ${carbPct}%, Protein ${protPct}%, Fat ${fatPct}%`}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: `conic-gradient(
              var(--bq-lime) 0deg ${carbAngle}deg,
              #7C5CFC ${carbAngle}deg ${carbAngle + protAngle}deg,
              rgba(255,255,255,0.15) ${carbAngle + protAngle}deg 360deg
            )`,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '14px', left: '14px',
              width: '52px', height: '52px',
              borderRadius: '50%',
              background: 'rgba(10,8,24,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '13px', color: 'var(--bq-lime)', lineHeight: 1 }}>79%</span>
            <span style={{ fontSize: '8px', color: 'var(--bq-muted)' }}>done</span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {[
            { color: 'var(--bq-lime)',            label: 'Carbs',   pct: carbPct, g: '206g' },
            { color: '#7C5CFC',                   label: 'Protein', pct: protPct, g: '128g' },
            { color: 'rgba(255,255,255,0.2)',      label: 'Fat',     pct: fatPct,  g: '42g'  },
          ].map((m) => (
            <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: m.color, display: 'block' }} />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-inter)' }}>{m.label}</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--bq-white)' }}>
                {m.g} <span style={{ color: 'var(--bq-muted)' }}>· {m.pct}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--bq-border)', marginBottom: '16px' }} />

      {/* Meal list */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', color: 'var(--bq-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Meals
        </div>
        {MEALS.map((meal, i) => (
          <div
            key={meal.name}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: i < MEALS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--font-inter)', fontSize: '12px', fontWeight: 500, color: 'var(--bq-white)' }}>{meal.name}</div>
              <div style={{ fontSize: '10px', color: 'var(--bq-muted)' }}>{meal.macro}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bq-lime)' }}>{meal.kcal}</div>
              <div style={{ fontSize: '10px', color: 'var(--bq-muted)' }}>{meal.time}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Calorie progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--bq-muted)' }}>Daily calories</span>
          <span style={{ fontSize: '10px', color: 'var(--bq-lime)', fontWeight: 600 }}>460 remaining</span>
        </div>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: '79%',
              background: 'linear-gradient(90deg, #7C5CFC, var(--bq-lime))',
              borderRadius: '999px',
            }}
          />
        </div>
      </div>
    </GlassCard>
  );
}
