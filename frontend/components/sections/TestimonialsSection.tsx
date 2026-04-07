'use client';

import InfiniteMarquee from '@/components/ui/InfiniteMarquee';
import GlassCard from '@/components/ui/GlassCard';
import SectionHeading from '@/components/ui/SectionHeading';

/* ----------------------------------------------------------
   TESTIMONIALS SECTION
   Two infinite marquee rows — row 1 scrolls left, row 2 scrolls right.
   ANIMATION: CSS @keyframes marquee-left / marquee-right (globals.css).
              Content arrays are duplicated inside InfiniteMarquee for seamless loop.
              Pauses on hover.
   Background: #0F0B1E.
   ---------------------------------------------------------- */

interface Testimonial {
  name: string;
  country: string;
  handle: string;
  quote: string;
  initials: string;
  avatarGradient: string;
}

const ROW_ONE: Testimonial[] = [
  {
    name: 'Mohamed K.',
    country: '🇺🇸 USA',
    handle: '@mohamed',
    quote: 'BodyQ caught my squat form issues in the first session. My knee pain is completely gone.',
    initials: 'JM',
    avatarGradient: 'linear-gradient(135deg, #7C5CFC, #4A28D4)',
  },
  {
    name: 'Sarra r.',
    country: '🇬🇧 UK',
    handle: '@sarra',
    quote: 'The nutrition AI is unreal. It actually adjusts my calories every week based on my progress.',
    initials: 'PS',
    avatarGradient: 'linear-gradient(135deg, #C8F135, #7C5CFC)',
  },
  {
    name: 'Israa G.',
    country: '🇩🇪 Germany',
    handle: '@israa',
    quote: 'Went from 78kg to 88kg lean muscle in 6 months. The progressive overload AI is elite.',
    initials: 'MT',
    avatarGradient: 'linear-gradient(135deg, #4A28D4, #C8F135)',
  },
  {
    name: 'Mariem T.',
    country: '🇯🇵 Japan',
    handle: '@Mariem',
    quote: 'I\'ve tried 10+ fitness apps. BodyQ is the only one that feels like a real coach.',
    initials: 'AN',
    avatarGradient: 'linear-gradient(135deg, #7C5CFC, #C8F135)',
  },
  {
    name: 'Nour B.',
    country: '🇮🇹 Italy',
    handle: '@nour',
    quote: 'The posture analysis saved me from a serious injury. 94% accuracy is not a marketing claim — it\'s real.',
    initials: 'LB',
    avatarGradient: 'linear-gradient(135deg, #C8F135, #4A28D4)',
  },
  {
    name: 'Sofia R.',
    country: '🇧🇷 Brazil',
    handle: '@sofia',
    quote: 'Lost 12kg in 4 months without losing strength. The body recomp plan is incredible.',
    initials: 'SR',
    avatarGradient: 'linear-gradient(135deg, #4A28D4, #7C5CFC)',
  },
  {
    name: 'Louay D.',
    country: '🇰🇷 South Korea',
    handle: '@Louay',
    quote: 'Real-time coaching beats any YouTube tutorial. The AI cues are perfectly timed.',
    initials: 'DK',
    avatarGradient: 'linear-gradient(135deg, #7C5CFC, #C8F135)',
  },
  {
    name: 'Emna C.',
    country: '🇨🇦 Canada',
    handle: '@emnamoves',
    quote: 'As a physical therapist, I recommend BodyQ to all my patients. The CV engine is clinical-grade.',
    initials: 'EC',
    avatarGradient: 'linear-gradient(135deg, #C8F135, #7C5CFC)',
  },
];

const ROW_TWO: Testimonial[] = [
  {
    name: 'Rami L.',
    country: '🇮🇳 India',
    handle: '@rami',
    quote: 'Community challenges keep me accountable. Hit a 50-day streak and it changed my life.',
    initials: 'RP',
    avatarGradient: 'linear-gradient(135deg, #4A28D4, #C8F135)',
  },
  {
    name: 'Karim J.',
    country: '🇫🇷 France',
    handle: '@Karim',
    quote: 'Went from never working out to running 5K in 8 weeks. The cardio AI structured it perfectly.',
    initials: 'CD',
    avatarGradient: 'linear-gradient(135deg, #7C5CFC, #4A28D4)',
  },
  {
    name: 'Omar A.',
    country: '🇦🇪 UAE',
    handle: '@omar_strong',
    quote: 'Deadlift went from 80kg to 145kg. The strength periodization is science-backed and it works.',
    initials: 'OA',
    avatarGradient: 'linear-gradient(135deg, #C8F135, #7C5CFC)',
  },
  {
    name: 'Huda B.',
    country: '🇷🇺 Russia',
    handle: '@Huda',
    quote: 'Yara the AI coach feels genuinely personal. It remembered my shoulder injury from week 1.',
    initials: 'NV',
    avatarGradient: 'linear-gradient(135deg, #7C5CFC, #C8F135)',
  },
  {
    name: 'Koussay K.',
    country: '🇦🇺 Australia',
    handle: '@koussay',
    quote: 'The sleep + recovery tracking added 15% to my performance. Sleep is training too.',
    initials: 'TH',
    avatarGradient: 'linear-gradient(135deg, #4A28D4, #7C5CFC)',
  },
  {
    name: 'Aziz g.',
    country: '🇨🇳 China',
    handle: '@aziz',
    quote: 'Yoga & Mobility plan fixed my posture from 10 years of desk work. I stand taller now.',
    initials: 'LX',
    avatarGradient: 'linear-gradient(135deg, #C8F135, #4A28D4)',
  },
  {
    name: 'Maya H.',
    country: '🇲🇽 Mexico',
    handle: '@maya',
    quote: 'Elite plan with virtual trainer sessions is worth every cent. My coach knows my body.',
    initials: 'IM',
    avatarGradient: 'linear-gradient(135deg, #7C5CFC, #4A28D4)',
  },
  {
    name: 'Salma A.',
    country: '🇳🇬 Nigeria',
    handle: '@salma',
    quote: 'Best fitness investment I\'ve ever made. The AI adapts faster than any human trainer I\'ve had.',
    initials: 'SO',
    avatarGradient: 'linear-gradient(135deg, #4A28D4, #C8F135)',
  },
];

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <GlassCard
      style={{
        width: '280px',
        flexShrink: 0,
        padding: '20px',
        borderRadius: '18px',
      }}
    >
      {/* Stars */}
      <div style={{ display: 'flex', gap: '3px', marginBottom: '12px' }} aria-label="5 star rating">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} style={{ color: 'var(--bq-lime)', fontSize: '12px' }}>★</span>
        ))}
      </div>

      {/* Quote */}
      <p
        style={{
          fontFamily: 'var(--font-inter)',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.6,
          marginBottom: '16px',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        &ldquo;{t.quote}&rdquo;
      </p>

      {/* Author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Avatar */}
        <div
          aria-hidden="true"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: t.avatarGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--bq-white)',
            fontFamily: 'var(--font-syne)',
          }}
        >
          {t.initials}
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 600,
              fontSize: '13px',
              color: 'var(--bq-white)',
              lineHeight: 1.2,
            }}
          >
            {t.name}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: '11px',
              color: 'var(--bq-muted)',
            }}
          >
            {t.country}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      aria-label="Customer testimonials"
      style={{
        background: 'var(--bq-deep)',
        padding: '120px 0',
        overflow: 'hidden',
      }}
    >
      {/* Heading */}
      <div style={{ padding: '0 24px', marginBottom: '64px' }}>
        <SectionHeading
          eyebrow="WHAT ATHLETES SAY"
          headline="TRUSTED BY ATHLETES WORLDWIDE"
          centered
        />
      </div>

      {/* Row 1: scrolls LEFT */}
      <div style={{ marginBottom: '24px' }}>
        <InfiniteMarquee direction="left" speed={45} gap={20}>
          {ROW_ONE.map((t) => (
            <TestimonialCard key={t.handle} t={t} />
          ))}
        </InfiniteMarquee>
      </div>

      {/* Row 2: scrolls RIGHT */}
      <InfiniteMarquee direction="right" speed={40} gap={20}>
        {ROW_TWO.map((t) => (
          <TestimonialCard key={t.handle} t={t} />
        ))}
      </InfiniteMarquee>
    </section>
  );
}
