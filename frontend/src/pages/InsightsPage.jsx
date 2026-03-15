import React from 'react';
import { Sparkles, TrendingUp, Apple, Heart } from 'lucide-react';
import { PageContainer, Card } from '../components/ui';

const recommendationCards = [
  {
    icon: TrendingUp,
    title: 'Workout',
    text: 'Based on your recent activity, try adding one more set to your squats to build strength. Your form has been consistent.',
    accent: 'var(--color-primary)',
  },
  {
    icon: Apple,
    title: 'Nutrition',
    text: 'You’re slightly under on protein today. Consider a post-workout shake or an extra portion of chicken at dinner.',
    accent: 'var(--color-accent-lime)',
  },
  {
    icon: Heart,
    title: 'Recovery',
    text: 'Your rest days are well spaced. Keep aiming for 7–8 hours of sleep to support muscle recovery and energy.',
    accent: 'var(--color-accent-light)',
  },
];

export default function InsightsPage() {
  return (
    <PageContainer
      title="AI Insights"
      subtitle="Personalized recommendations based on your activity and goals."
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'linear-gradient(135deg, rgba(111, 75, 242, 0.2), rgba(163, 141, 242, 0.1))',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            background: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles size={24} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Powered by AI</div>
          <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)' }}>
            Suggestions update as you log workouts and meals. No backend connected yet — this is placeholder content.
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {recommendationCards.map(({ icon: Icon, title, text, accent }) => (
          <Card key={title} title={title}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={22} color="white" />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0, lineHeight: 1.5 }}>{text}</p>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}