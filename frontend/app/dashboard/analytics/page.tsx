'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import AreaChartCard from '@/components/dashboard/AreaChartCard';
import BarChartCard from '@/components/dashboard/BarChartCard';
import PieChartCard from '@/components/dashboard/PieChartCard';
import { CardSkeleton } from '@/components/dashboard/LoadingSkeleton';

const TABS = ['Users', 'Revenue', 'Engagement', 'AI Performance', 'Retention'] as const;
type Tab = typeof TABS[number];

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--bq-surface-1)', border: '1px solid var(--bq-border)',
      borderRadius: 12, padding: '20px 24px',
    }}>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 28, fontWeight: 700, color: 'var(--bq-text-1)', marginBottom: 4 }}>{value}</p>
      {sub && <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)' }}>{sub}</p>}
    </div>
  );
}

function ProgressBar({ label, value, color = 'var(--bq-purple)' }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-2)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 600, color: 'var(--bq-text-1)' }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--bq-surface-3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3, transition: 'width 600ms ease' }} />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Users');
  const [loading, setLoading] = useState(false);
  const [growthData, setGrowthData] = useState<{ date: string; newUsers: number; churned: number }[]>([]);
  const [revenueData, setRevenueData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [aiTrend, setAiTrend] = useState<{ date: string; accuracy: number; target: number }[]>([]);

  const syntheticGrowth = useCallback(() =>
    Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      newUsers: Math.floor(20 + Math.random() * 80 + i * 2),
      churned: Math.floor(2 + Math.random() * 12),
    })), []);

  const syntheticAiTrend = useCallback(() =>
    Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
      accuracy: Math.floor(88 + Math.random() * 10),
      target: 95,
    })), []);

  useEffect(() => {
    setLoading(true);
    // Simulate a small fetch delay then use synthetic data
    const t = setTimeout(() => {
      setGrowthData(syntheticGrowth());
      setRevenueData([
        { name: 'Pro', value: 4200, color: 'var(--chart-purple)' },
        { name: 'Elite', value: 1800, color: 'var(--chart-lime)' },
        { name: 'Other', value: 300, color: 'var(--chart-blue)' },
      ]);
      setAiTrend(syntheticAiTrend());
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [activeTab, syntheticGrowth, syntheticAiTrend]);

  const mrrTrend = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
    mrr: 4200 + i * 80 + Math.floor(Math.random() * 200),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader title="Analytics" description="Deep-dive platform metrics across all dimensions" />

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4,
        borderBottom: '1px solid var(--bq-border)', paddingBottom: 0,
      }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 18px', fontFamily: 'var(--font-inter)', fontSize: 14, fontWeight: 500,
              color: activeTab === tab ? 'var(--bq-text-1)' : 'var(--bq-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--bq-lime)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 150ms ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          {activeTab === 'Users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <MetricCard label="Total Users" value="10,284" sub="+4.2% this week" />
                <MetricCard label="Active Today" value="1,837" sub="17.9% DAU ratio" />
                <MetricCard label="New This Month" value="624" sub="+12% vs last month" />
              </div>
              <AreaChartCard
                title="User Growth (30 days)"
                data={growthData}
                dataKeys={[
                  { key: 'newUsers', color: 'var(--chart-purple)', label: 'New Users' },
                  { key: 'churned', color: 'var(--chart-teal)', label: 'Churned' },
                ]}
              />
              <BarChartCard
                title="Daily New Signups"
                data={growthData.slice(-14)}
                series={[{ key: 'newUsers', label: 'New Signups', color: 'var(--chart-purple)' }]}
              />
            </div>
          )}

          {activeTab === 'Revenue' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <MetricCard label="MRR" value="$6,300" sub="+6.1% vs last month" />
                <MetricCard label="ARR" value="$75,600" sub="Annualized" />
                <MetricCard label="ARPU" value="$18.40" sub="Per paying user" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <AreaChartCard
                  title="MRR Trend (30 days)"
                  data={mrrTrend}
                  dataKeys={[{ key: 'mrr', color: 'var(--chart-lime)', label: 'MRR ($)' }]}
                />
                <PieChartCard title="Plan Distribution" data={revenueData} />
              </div>
            </div>
          )}

          {activeTab === 'Engagement' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <MetricCard label="Sessions / User" value="4.2" sub="Avg per active user" />
                <MetricCard label="Avg Session" value="18 min" sub="Per workout session" />
                <MetricCard label="DAU / MAU" value="17.9%" sub="Stickiness ratio" />
              </div>
              <div style={{
                background: 'var(--bq-surface-1)', border: '1px solid var(--bq-border)',
                borderRadius: 12, padding: 24,
              }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: 14, color: 'var(--bq-text-1)', marginBottom: 20 }}>Feature Adoption</p>
                <ProgressBar label="AI Posture Analysis" value={68} color="var(--chart-purple)" />
                <ProgressBar label="Nutrition Tracking" value={54} color="var(--chart-lime)" />
                <ProgressBar label="Workout Browser" value={82} color="var(--chart-blue)" />
                <ProgressBar label="Custom Plans" value={41} color="var(--chart-teal)" />
                <ProgressBar label="Social Features" value={23} color="var(--bq-muted)" />
              </div>
            </div>
          )}

          {activeTab === 'AI Performance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <MetricCard label="Avg Accuracy" value="93.2%" sub="Posture analysis" />
                <MetricCard label="Inference Time" value="182ms" sub="P50 latency" />
                <MetricCard label="Error Rate" value="0.8%" sub="Last 7 days" />
                <MetricCard label="Sessions Today" value="847" sub="+12.3% vs yesterday" />
              </div>
              <AreaChartCard
                title="Posture Accuracy Trend"
                data={aiTrend}
                dataKeys={[
                  { key: 'accuracy', color: 'var(--chart-lime)', label: 'Accuracy (%)' },
                  { key: 'target', color: 'var(--chart-purple)', label: 'Target (95%)' },
                ]}
              />
            </div>
          )}

          {activeTab === 'Retention' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <MetricCard label="D1 Retention" value="68%" sub="Users returning day 1" />
                <MetricCard label="D7 Retention" value="42%" sub="Users returning day 7" />
                <MetricCard label="D30 Retention" value="28%" sub="Users returning day 30" />
              </div>
              <div style={{
                background: 'var(--bq-surface-1)', border: '1px solid var(--bq-border)',
                borderRadius: 12, padding: 24,
              }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: 14, color: 'var(--bq-text-1)', marginBottom: 4 }}>Cohort Retention</p>
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-muted)', marginBottom: 20 }}>Monthly cohort analysis — % of users still active</p>
                {[
                  { month: 'Jan 2025', d1: 71, d7: 44, d30: 29 },
                  { month: 'Feb 2025', d1: 69, d7: 43, d30: 27 },
                  { month: 'Mar 2025', d1: 73, d7: 46, d30: 31 },
                  { month: 'Apr 2025', d1: 68, d7: 42, d30: 28 },
                ].map((row) => (
                  <div key={row.month} style={{
                    display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr',
                    gap: 16, alignItems: 'center', padding: '10px 0',
                    borderBottom: '1px solid var(--bq-border)',
                  }}>
                    <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-text-2)' }}>{row.month}</span>
                    {[row.d1, row.d7, row.d30].map((v, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--bq-muted)', fontFamily: 'var(--font-inter)' }}>D{[1, 7, 30][i]}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bq-text-1)', fontFamily: 'var(--font-inter)' }}>{v}%</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--bq-surface-3)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${v}%`, background: 'var(--chart-purple)', borderRadius: 2 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
