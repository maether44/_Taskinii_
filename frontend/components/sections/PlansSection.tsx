'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import SectionHeading from '@/components/ui/SectionHeading';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';

/* ----------------------------------------------------------
   PLANS SECTION
   3 pricing cards: Free, Pro, Elite.
   Monthly/Annual toggle with "Save 20%" badge.
   Pro card: scaled 1.04, lime border, "MOST POPULAR" badge.
   ANIMATION: staggered whileInView fade-up — 0.12s between cards.
   ---------------------------------------------------------- */

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    cta: 'Get Started',
    popular: false,
    features: [
      'Basic workout library (50+ exercises)',
      'AI recommendations (5/month)',
      'Progress tracking dashboard',
      'Community access',
      '1 custom workout plan',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 12.99,
    annualPrice: 9.99,
    cta: 'Start Pro Trial',
    popular: true,
    features: [
      'Everything in Free',
      'Unlimited AI posture analysis',
      'Full nutrition AI & meal planning',
      'Real-time coaching & form cues',
      'Advanced progress analytics',
      'Priority support',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    monthlyPrice: 24.99,
    annualPrice: 19.99,
    cta: 'Go Elite',
    popular: false,
    features: [
      'Everything in Pro',
      '1-on-1 virtual trainer sessions',
      'Custom meal prep & grocery plans',
      'Early feature access',
      'Dedicated account manager',
      'White-glove onboarding',
    ],
  },
];

export default function PlansSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section
      id="plans"
      aria-label="Pricing plans"
      style={{
        background: 'var(--bq-black)',
        padding: '120px 24px',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <SectionHeading
          eyebrow="SIMPLE PRICING"
          headline="CHOOSE YOUR PLAN"
          centered
          className="mb-12"
        />

        {/* Monthly/Annual toggle */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginTop: '48px',
            marginBottom: '64px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: '14px',
              fontWeight: 500,
              color: !isAnnual ? 'var(--bq-white)' : 'var(--bq-muted)',
              transition: 'color 200ms ease',
            }}
          >
            Monthly
          </span>

          {/* Toggle pill */}
          <button
            role="switch"
            aria-checked={isAnnual}
            aria-label="Toggle annual billing"
            onClick={() => setIsAnnual(!isAnnual)}
            style={{
              width: '52px',
              height: '28px',
              borderRadius: '999px',
              background: isAnnual ? 'var(--bq-lime)' : 'rgba(255,255,255,0.15)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 200ms ease',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '4px',
                left: isAnnual ? 'calc(100% - 24px)' : '4px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: isAnnual ? 'var(--bq-black)' : 'var(--bq-white)',
                transition: 'left 200ms ease, background 200ms ease',
                willChange: 'left',
              }}
            />
          </button>

          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: '14px',
                fontWeight: 500,
                color: isAnnual ? 'var(--bq-white)' : 'var(--bq-muted)',
                transition: 'color 200ms ease',
              }}
            >
              Annual
            </span>
            {/* Save 20% badge */}
            <span
              style={{
                background: 'rgba(200,241,53,0.15)',
                border: '1px solid rgba(200,241,53,0.4)',
                color: 'var(--bq-lime)',
                borderRadius: '999px',
                padding: '2px 10px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              SAVE 20%
            </span>
          </span>
        </motion.div>

        {/* Pricing cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
            alignItems: 'center',
          }}
          className="grid-cols-1 lg:grid-cols-3"
        >
          {PLANS.map((plan, i) => {
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

            return (
              // ANIMATION: staggered whileInView — 0.12s between each card
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.55, ease: 'easeOut', delay: i * 0.12 }}
                style={{
                  // Pro card is scaled up
                  transform: plan.popular ? 'scale(1.04)' : 'scale(1)',
                  willChange: 'transform',
                }}
              >
                <div
                  style={{
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    background: plan.popular
                      ? 'rgba(124,92,252,0.12)'
                      : 'rgba(255,255,255,0.03)',
                    border: plan.popular
                      ? '1.5px solid var(--bq-lime)'
                      : '1px solid var(--bq-border)',
                    borderRadius: '24px',
                    padding: '36px 28px',
                    position: 'relative',
                    boxShadow: plan.popular
                      ? '0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(200,241,53,0.08)'
                      : '0 24px 64px rgba(0,0,0,0.5)',
                  }}
                >
                  {/* MOST POPULAR badge */}
                  {plan.popular && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-14px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--bq-lime)',
                        color: 'var(--bq-black)',
                        borderRadius: '999px',
                        padding: '4px 18px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        fontFamily: 'var(--font-inter)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      MOST POPULAR
                    </div>
                  )}

                  {/* Plan name */}
                  <h3
                    style={{
                      fontFamily: 'var(--font-syne)',
                      fontWeight: 700,
                      fontSize: '24px',
                      color: 'var(--bq-white)',
                      marginBottom: '20px',
                    }}
                  >
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div style={{ marginBottom: '28px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-syne)',
                        fontWeight: 800,
                        fontSize: '48px',
                        color: 'var(--bq-lime)',
                        lineHeight: 1,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {price === 0 ? 'Free' : `$${price}`}
                    </span>
                    {price > 0 && (
                      <span
                        style={{
                          fontFamily: 'var(--font-inter)',
                          fontSize: '16px',
                          color: 'var(--bq-muted)',
                          marginLeft: '4px',
                        }}
                      >
                        /month
                      </span>
                    )}
                    {isAnnual && price > 0 && (
                      <div
                        style={{
                          fontFamily: 'var(--font-inter)',
                          fontSize: '12px',
                          color: 'var(--bq-muted)',
                          marginTop: '4px',
                        }}
                      >
                        Billed annually · ${(price * 12).toFixed(0)}/yr
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div style={{ height: '1px', background: 'var(--bq-border)', marginBottom: '24px' }} />

                  {/* Feature checklist */}
                  <ul style={{ listStyle: 'none', marginBottom: '36px' }}>
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          marginBottom: '14px',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: 'rgba(200,241,53,0.15)',
                            border: '1.5px solid var(--bq-lime)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '1px',
                          }}
                        >
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <polyline points="0.5,3 2.5,5.5 7.5,0.5" stroke="var(--bq-lime)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-inter)',
                            fontSize: '14px',
                            color: 'rgba(255,255,255,0.75)',
                            lineHeight: 1.5,
                          }}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant="primary"
                    href="#signup"
                    idlePulse={plan.popular}
                    style={{ width: '100%', justifyContent: 'center' } as React.CSSProperties}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
