import React from 'react';
import { Flame, TrendingUp, Target } from 'lucide-react';
import { PageContainer, Card } from '../components/ui';

export default function DashboardPage() {
  return (
    <PageContainer
      title="Dashboard"
      subtitle="Your fitness overview at a glance."
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
        }}
      >
        <Card
          title="Today's activity"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Flame size={24} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>420</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>kcal burned</div>
            </div>
          </div>
        </Card>
        <Card
          title="This week"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'var(--color-accent-lime)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={24} color="var(--color-background)" />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>4</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>workouts completed</div>
            </div>
          </div>
        </Card>
        <Card
          title="Goal progress"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'var(--color-accent-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Target size={24} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>78%</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>weekly target</div>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}