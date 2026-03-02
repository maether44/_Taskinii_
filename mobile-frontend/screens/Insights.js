import { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const PERIODS = ['Week', 'Month', '3 Months'];

const TREND_DATA = {
  Week: [65, 70, 68, 75, 80, 85, 88],
  Month: [60, 65, 70, 72, 68, 74, 80, 83, 85, 82, 87, 88],
  '3 Months': [55, 58, 62, 65, 68, 70, 72, 75, 78, 80, 83, 88],
};

const INSIGHTS = [
  {
    icon: '🧬',
    title: 'Recovery Rate Improving',
    text: 'Your HRV has increased 18% this month. Your body is adapting well to training loads.',
    tag: 'Performance',
    color: '#6F4BF2',
  },
  {
    icon: '🌙',
    title: 'Sleep-Nutrition Link',
    text: 'On days you consume 130g+ protein, your sleep quality improves by 22%.',
    tag: 'Correlation',
    color: '#A38DF2',
  },
  {
    icon: '⚡',
    title: 'Peak Performance Window',
    text: 'Your best workout sessions are between 5-7 PM. Consider scheduling training then.',
    tag: 'Optimization',
    color: '#CDF27E',
  },
  {
    icon: '🎯',
    title: 'Goal Forecast',
    text: "At your current pace, you'll reach your body composition goal in 6 weeks.",
    tag: 'Prediction',
    color: '#6F4BF2',
  },
];

const METRICS = [
  { label: 'Avg. Score',  value: '82', delta: '+7%',  up: true },
  { label: 'Workouts',    value: '18',  delta: '+3',   up: true },
  { label: 'Calories',    value: '1.8k', delta: '-2%', up: false },
  { label: 'Posture',     value: '85',  delta: '+12%', up: true },
];

export default function Insights() {
  const [period, setPeriod] = useState('Week');
  const data = TREND_DATA[period];
  const max = Math.max(...data);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>🧠 AI Analysis</Text>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodLabel, period === p && styles.periodLabelActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Line Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Health Score Trend</Text>
          <View style={styles.lineChart}>
            {data.map((val, i) => {
              const barH = (val / 100) * 100;
              const isLast = i === data.length - 1;
              return (
                <View key={i} style={styles.lineBarCol}>
                  {isLast && <Text style={styles.lineBarTip}>{val}</Text>}
                  <View
                    style={[
                      styles.lineBar,
                      { height: barH },
                      isLast && styles.lineBarActive,
                    ]}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.chartFooter}>
            <Text style={styles.chartFooterLabel}>Lowest: {Math.min(...data)}</Text>
            <Text style={styles.chartFooterLabel}>Avg: {Math.round(data.reduce((a, b) => a + b, 0) / data.length)}</Text>
            <Text style={styles.chartFooterLabel}>Peak: {max}</Text>
          </View>
        </View>

        {/* Summary Metrics */}
        <View style={styles.metricsGrid}>
          {METRICS.map((m) => (
            <View key={m.label} style={styles.metricCard}>
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <View style={[styles.deltaBadge, m.up ? styles.deltaUp : styles.deltaDown]}>
                <Text style={[styles.deltaText, m.up ? styles.deltaTextUp : styles.deltaTextDown]}>
                  {m.up ? '↑' : '↓'} {m.delta}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* AI Insights */}
        <Text style={styles.sectionTitle}>AI Discoveries</Text>
        {INSIGHTS.map((ins, i) => (
          <View key={i} style={[styles.insightCard, { borderLeftColor: ins.color }]}>
            <View style={styles.insightHeader}>
              <Text style={styles.insightIcon}>{ins.icon}</Text>
              <View style={styles.insightMeta}>
                <Text style={[styles.insightTag, { color: ins.color }]}>{ins.tag}</Text>
                <Text style={styles.insightTitle}>{ins.title}</Text>
              </View>
            </View>
            <Text style={styles.insightText}>{ins.text}</Text>
          </View>
        ))}

        {/* Weekly Heatmap */}
        <Text style={styles.sectionTitle}>Activity Heatmap</Text>
        <View style={styles.heatmapCard}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, di) => (
            <View key={day} style={styles.heatRow}>
              <Text style={styles.heatDay}>{day}</Text>
              {Array.from({ length: 6 }).map((_, hi) => {
                const intensity = Math.random();
                return (
                  <View
                    key={hi}
                    style={[
                      styles.heatCell,
                      {
                        backgroundColor:
                          intensity > 0.7
                            ? '#6F4BF2'
                            : intensity > 0.4
                            ? '#3D2F7A'
                            : '#2D2252',
                      },
                    ]}
                  />
                );
              })}
            </View>
          ))}
          <View style={styles.heatLegend}>
            <Text style={styles.heatLegendLabel}>Less</Text>
            {['#2D2252', '#3D2F7A', '#6F4BF2', '#A38DF2'].map((c) => (
              <View key={c} style={[styles.heatCell, { backgroundColor: c }]} />
            ))}
            <Text style={styles.heatLegendLabel}>More</Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#241C40' },
  scroll: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  aiBadge: {
    backgroundColor: '#1A1432',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#6F4BF2',
  },
  aiBadgeText: { color: '#A38DF2', fontSize: 12, fontWeight: '700' },

  periodRow: {
    flexDirection: 'row',
    backgroundColor: '#1A1432',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3D2F7A',
  },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  periodBtnActive: { backgroundColor: '#6F4BF2' },
  periodLabel: { color: '#7A6AAA', fontSize: 13, fontWeight: '600' },
  periodLabelActive: { color: '#fff' },

  chartCard: {
    backgroundColor: '#1A1432',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3D2F7A',
  },
  chartTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 16 },
  lineChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 110,
    gap: 4,
    marginBottom: 12,
  },
  lineBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  lineBarTip: { color: '#CDF27E', fontSize: 10, fontWeight: '700', marginBottom: 3 },
  lineBar: { width: '80%', backgroundColor: '#3D2F7A', borderRadius: 4 },
  lineBarActive: { backgroundColor: '#6F4BF2' },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  chartFooterLabel: { color: '#7A6AAA', fontSize: 11 },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: '#1A1432',
    borderRadius: 16,
    padding: 16,
    width: '47%',
    borderWidth: 1,
    borderColor: '#3D2F7A',
    alignItems: 'flex-start',
  },
  metricValue: { color: '#fff', fontSize: 28, fontWeight: '800' },
  metricLabel: { color: '#7A6AAA', fontSize: 12, marginTop: 2, marginBottom: 8 },
  deltaBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  deltaUp: { backgroundColor: 'rgba(205,242,126,0.15)' },
  deltaDown: { backgroundColor: 'rgba(255,100,100,0.15)' },
  deltaText: { fontSize: 11, fontWeight: '700' },
  deltaTextUp: { color: '#CDF27E' },
  deltaTextDown: { color: '#FF6464' },

  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },

  insightCard: {
    backgroundColor: '#1A1432',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3D2F7A',
    borderLeftWidth: 4,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  insightIcon: { fontSize: 26 },
  insightMeta: { flex: 1 },
  insightTag: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  insightTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  insightText: { color: '#C8BFEE', fontSize: 13, lineHeight: 19 },

  heatmapCard: {
    backgroundColor: '#1A1432',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#3D2F7A',
    gap: 6,
  },
  heatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heatDay: { color: '#7A6AAA', fontSize: 10, width: 28 },
  heatCell: { width: 28, height: 28, borderRadius: 6 },
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  heatLegendLabel: { color: '#7A6AAA', fontSize: 10 },
});