/**
 * mobile-frontend/screens/Insights.js
 *
 * Displays the user's fitness analytics across three time periods
 * (Week / Month / 3 Months). All data is real — no hardcoded constants.
 *
 * DATA FLOW
 *   1. useInsights(period) calls the Supabase `get_insights_data` RPC and
 *      returns derived state: metrics, trendData, heatmapData, streakData.
 *   2. Once the RPC resolves, a useEffect fires generateAndCacheInsights()
 *      which either reads AI insight cards from the ai_insights cache table
 *      or generates new ones via the yara-insights Edge Function (Groq).
 *   3. While loading, <Skeleton> blocks fill the same space as real content.
 */
import { useCallback, useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useInsights } from '../hooks/useInsights';
import { generateAndCacheInsights } from '../services/yaraInsightsService';

const PERIODS = ['Week', 'Month', '3 Months'];


// =============================================================================
// <Skeleton> — grey placeholder shown while data is loading
// =============================================================================
function Skeleton({ width, height, style }) {
  return (
    <View
      style={[
        { width, height, backgroundColor: '#2D2252', borderRadius: 8, opacity: 0.6 },
        style,
      ]}
    />
  );
}


// =============================================================================
// Insights — main screen component
// =============================================================================
export default function Insights() {
  const [period, setPeriod] = useState('Week');

  const {
    metrics,
    trendData,
    heatmapData,
    rawStats,
    userId,
    isLoading,
    error,
    aiHistory,
    refresh,
  } = useInsights(period);

  // Re-fetch whenever the tab comes into focus
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const [aiInsights,    setAiInsights]    = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Scale chart bars against actual data max, not a fixed 100
  const data = (trendData && trendData[period]?.length > 0) ? trendData[period] : [0];
  const max  = Math.max(...data, 1);

  // Clear stale insights immediately when period changes so old cards don't
  // linger while the new period's insights are being fetched from Groq/cache.
  useEffect(() => {
    setAiInsights([]);
  }, [period]);

  // Fire AI insight generation once RPC data is ready (or when period changes)
  useEffect(() => {
    if (isLoading || !rawStats || !userId) return;
    console.log('[Insights] Triggering Yara insight generation for period:', period);
    setInsightsLoading(true);
    generateAndCacheInsights(userId, rawStats, period)
      .then(insights => {
        console.log('[Insights] Received AI insights:', insights?.length ?? 0, 'cards');
        setAiInsights(insights ?? []);
      })
      .catch(err => {
        console.error('[Insights] Yara insights error:', err);
      })
      .finally(() => setInsightsLoading(false));
  }, [isLoading, period, userId]);   // rawStats omitted intentionally — it changes with period

  // ── Heatmap date math ─────────────────────────────────────────────────────
  // Grid: 7 rows (Mon=0…Sun=6) × 6 columns (hi=0 oldest, hi=5 current week)
  // Anchor: this week's Monday. Each cell = thisMonday − (5−hi)*7 + di days.
  // Monday anchor prevents future-date cells that a Sunday anchor would cause
  // on days Mon–Sat (the majority of the week).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow        = today.getDay();              // 0=Sun, 1=Mon … 6=Sat
  const daysToMon  = dow === 0 ? 6 : dow - 1;    // days since this Monday
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysToMon);

  // Maps intensity 0-3 → purple shade
  function heatColor(intensity) {
    if (intensity >= 4) return '#9D85F5';
    if (intensity === 3) return '#6F4BF2';
    if (intensity === 2) return '#4A2F8A';
    if (intensity === 1) return '#2D1F5E';
    return '#1A1432';
  }

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#FF6464', fontSize: 14, textAlign: 'center', padding: 20 }}>
          Failed to load insights.{'\n'}Check your connection and try again.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#7A6AAA', fontSize: 14 }}>Loading your insights...</Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
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

        {/* Health Score Trend Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Health Score Trend</Text>
          <View style={styles.lineChart}>
            {data.map((val, i) => {
              const barH   = max > 0 ? (val / max) * 100 : 0;
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
            <Text style={styles.chartFooterLabel}>
              Avg: {Math.round(data.reduce((a, b) => a + b, 0) / data.length)}
            </Text>
            <Text style={styles.chartFooterLabel}>Peak: {max}</Text>
          </View>
        </View>

        {/* Summary Metrics Grid */}
        <View style={styles.metricsGrid}>
          {(metrics ?? []).map((m) => (
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

        {/* AI Discoveries */}
        <Text style={styles.sectionTitle}>AI Discoveries</Text>
        {insightsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[styles.insightCard, { borderLeftColor: '#3D2F7A' }]}>
                <View style={styles.insightHeader}>
                  <Skeleton width={32} height={32} style={{ borderRadius: 6 }} />
                  <View style={styles.insightMeta}>
                    <Skeleton width={70}  height={11} style={{ marginBottom: 6 }} />
                    <Skeleton width={140} height={14} />
                  </View>
                </View>
                <Skeleton width="100%" height={38} style={{ marginTop: 4 }} />
              </View>
            ))
          : (aiInsights.length > 0 ? aiInsights : []).map((ins, i) => (
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
            ))
        }

        {/* Activity Heatmap — 7 rows × 6 columns, real calendar dates */}
        <Text style={styles.sectionTitle}>Activity Heatmap</Text>
        <View style={styles.heatmapCard}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, di) => (
            <View key={day} style={styles.heatRow}>
              <Text style={styles.heatDay}>{day}</Text>
              {Array.from({ length: 6 }).map((_, hi) => {
                // thisMonday − (5−hi)*7 weeks + di days = exact calendar date
                const cellDate = new Date(thisMonday);
                cellDate.setDate(thisMonday.getDate() - (5 - hi) * 7 + di);
                const dateStr   = cellDate.toISOString().split('T')[0];
                const intensity = heatmapData?.[dateStr] ?? 0;
                return (
                  <View
                    key={hi}
                    style={[styles.heatCell, { backgroundColor: heatColor(intensity) }]}
                  />
                );
              })}
            </View>
          ))}
          <View style={styles.heatLegend}>
            <Text style={styles.heatLegendLabel}>Less</Text>
            {['#1A1432', '#2D1F5E', '#4A2F8A', '#6F4BF2'].map((c) => (
              <View key={c} style={[styles.heatCell, { backgroundColor: c }]} />
            ))}
            <Text style={styles.heatLegendLabel}>More</Text>
          </View>
        </View>

        {/* Recent AI Coaching */}
        {aiHistory && aiHistory.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent AI Coaching</Text>
            {aiHistory.slice(0, 5).map((item, i) => {
              const dateStr = new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
              });
              return (
                <View key={i} style={styles.coachCard}>
                  <View style={styles.coachHeader}>
                    <Text style={styles.coachType}>{item.insight_type?.toUpperCase()}</Text>
                    <Text style={styles.coachDate}>{dateStr}</Text>
                  </View>
                  <Text style={styles.coachText}>{item.message}</Text>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#241C40' },
  scroll: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title:       { color: '#fff', fontSize: 26, fontWeight: '800' },
  aiBadge:     { backgroundColor: '#1A1432', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#6F4BF2' },
  aiBadgeText: { color: '#A38DF2', fontSize: 12, fontWeight: '700' },

  periodRow:        { flexDirection: 'row', backgroundColor: '#1A1432', borderRadius: 12, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: '#3D2F7A' },
  periodBtn:        { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  periodBtnActive:  { backgroundColor: '#6F4BF2' },
  periodLabel:      { color: '#7A6AAA', fontSize: 13, fontWeight: '600' },
  periodLabelActive:{ color: '#fff' },

  chartCard:        { backgroundColor: '#1A1432', borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#3D2F7A' },
  chartTitle:       { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 16 },
  lineChart:        { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 4, marginBottom: 12 },
  lineBarCol:       { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  lineBarTip:       { color: '#CDF27E', fontSize: 10, fontWeight: '700', marginBottom: 3 },
  lineBar:          { width: '80%', backgroundColor: '#3D2F7A', borderRadius: 4 },
  lineBarActive:    { backgroundColor: '#6F4BF2' },
  chartFooter:      { flexDirection: 'row', justifyContent: 'space-between' },
  chartFooterLabel: { color: '#7A6AAA', fontSize: 11 },

  metricsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  metricCard:     { backgroundColor: '#1A1432', borderRadius: 16, padding: 16, width: '47%', borderWidth: 1, borderColor: '#3D2F7A', alignItems: 'flex-start' },
  metricValue:    { color: '#fff', fontSize: 28, fontWeight: '800' },
  metricLabel:    { color: '#7A6AAA', fontSize: 12, marginTop: 2, marginBottom: 8 },
  deltaBadge:     { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  deltaUp:        { backgroundColor: 'rgba(205,242,126,0.15)' },
  deltaDown:      { backgroundColor: 'rgba(255,100,100,0.15)' },
  deltaText:      { fontSize: 11, fontWeight: '700' },
  deltaTextUp:    { color: '#CDF27E' },
  deltaTextDown:  { color: '#FF6464' },

  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },

  insightCard:   { backgroundColor: '#1A1432', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#3D2F7A', borderLeftWidth: 4 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  insightIcon:   { fontSize: 26 },
  insightMeta:   { flex: 1 },
  insightTag:    { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  insightTitle:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  insightText:   { color: '#C8BFEE', fontSize: 13, lineHeight: 19 },

  heatmapCard: { backgroundColor: '#1A1432', borderRadius: 20, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: '#3D2F7A', gap: 6 },

  coachCard:   { backgroundColor: '#1A1432', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#3D2F7A', borderLeftWidth: 4, borderLeftColor: '#6F4BF2' },
  coachHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  coachType:   { color: '#6F4BF2', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  coachDate:   { color: '#7A6AAA', fontSize: 10 },
  coachText:   { color: '#C8BFEE', fontSize: 13, lineHeight: 19 },
  heatRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heatDay:     { color: '#7A6AAA', fontSize: 10, width: 28 },
  heatCell:    { width: 28, height: 28, borderRadius: 6 },
  heatLegend:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, justifyContent: 'flex-end' },
  heatLegendLabel: { color: '#7A6AAA', fontSize: 10 },
});
