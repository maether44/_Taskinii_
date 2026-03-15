import React from 'react';
import { Activity, Calendar, Award } from 'lucide-react';
import { PageContainer, Card } from '../components/ui';

export default function ActivityPage() {
  return (
    <PageContainer
      title="Activity & Progress"
      subtitle="Track your workouts and see how you're improving."
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}
      >
        <Card title="Recent activity">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
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
              <Activity size={24} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Upper Body Power</div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>45 min • Yesterday</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={24} color="var(--color-accent-lime)" />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Core & Stretch</div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>30 min • 2 days ago</div>
            </div>
          </div>
        </Card>
        <Card title="Calendar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
              <Calendar size={24} color="var(--color-background)" />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
              Weekly view and workout history will appear here. Connect your data to see progress over time.
            </p>
          </div>
        </Card>
        <Card title="Achievements">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
              <Award size={24} color="white" />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
              Badges and milestones based on your activity. Keep training to unlock more.
            </p>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}