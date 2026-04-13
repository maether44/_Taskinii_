/**
 * mobile-frontend/screens/Insights.js
 *
 * Analytics screen — fully connected to Home + Training data.
 *
 * DATA FLOW
 *   useInsights(period) fetches:
 *     • get_insights_data RPC       → chart, heatmap, streak, avg stats
 *     • food_logs direct query      → nutritionSummary (avg cal/protein/carbs/fat)
 *     • workout_sessions direct     → workoutSummary (count, duration, calories)
 *     • getMuscleFatigue()          → muscleFatigue (from Training screen source)
 *     • get_user_ai_history RPC     → aiHistory coaching log
 *   generateAndCacheInsights()      → AI discovery cards via Groq Edge Function
 *                                     (now receives muscle fatigue in rawStats)
 *
 *   useFocusEffect → refresh() on every screen focus so data is always current
 *   after logging food/sleep/water on Home or finishing a workout on Training.
 */
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useInsights } from '../hooks/useInsights';
import { generateAndCacheInsights } from '../services/alexiInsightsService';
import { AlexiEvents } from '../context/AlexiVoiceContext';

const PERIODS = ['Week', 'Month', '3 Months'];

function Skeleton({ width, height, style }) {
  return (
    <View style={[{ width, height, backgroundColor: '#2D2252', borderRadius: 8, opacity: 0.6 }, style]} />
  );
}

// ─── Macro bar ────────────────────────────────────────────────────────────────
function MacroBar({ label, grams, color, total }) {
  const pct = total > 0 ? Math.min((grams / total) * 100, 100) : 0;
  return (
    <View style={st.macroRow}>
      <Text style={st.macroLabel}>{label}</Text>
      <View style={st.macroBarBg}>
        <View style={[st.macroBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[st.macroVal, { color }]}>{grams}g</Text>
    </View>
  );
}

// ─── Muscle fatigue row ───────────────────────────────────────────────────────
function FatigueRow({ muscle }) {
  const color = muscle.fatigue_pct >= 70 ? '#A38DF2'
    : muscle.fatigue_pct >= 40            ? '#FF9500'
    : '#CDF27E';
  return (
    <View style={st.fatigueRow}>
      <View style={[st.fatigueDot, { backgroundColor: color }]} />
      <Text style={st.fatigueName}>{muscle.muscle_name}</Text>
      <View style={st.fatigueBarBg}>
        <View style={[st.fatigueBarFill, { width: `${muscle.fatigue_pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[st.fatiguePct, { color }]}>{muscle.fatigue_pct}%</Text>
    </View>
  );
}


// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Insights() {
  const [period, setPeriod] = useState('Week');

  const {
    metrics, trendData, heatmapData,
    rawStats, userId, isLoading, error,
    nutritionSummary, workoutSummary, muscleFatigue,
    aiHistory, refresh,
  } = useInsights(period);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useEffect(() => {
    const off = AlexiEvents.on('dataUpdated', () => refresh());
    return off;
  }, [refresh]);

  const [aiInsights,      setAiInsights]      = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const data = trendData?.[period]?.length > 0 ? trendData[period] : [0];
  const max  = Math.max(...data, 1);

  useEffect(() => { setAiInsights([]); }, [period]);

  useEffect(() => {
    if (isLoading || !rawStats || !userId) return;
    setInsightsLoading(true);
    generateAndCacheInsights(userId, rawStats, period)
      .then(cards => setAiInsights(cards ?? []))
      .catch(err  => console.error('[Insights] AI cards error:', err))
      .finally(() => setInsightsLoading(false));
  }, [isLoading, period, userId]);

  // Heatmap date math
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow        = today.getDay();
  const daysToMon  = dow === 0 ? 6 : dow - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysToMon);

  function heatColor(intensity) {
    if (intensity >= 4) return '#9D85F5';
    if (intensity === 3) return '#6F4BF2';
    if (intensity === 2) return '#4A2F8A';
    if (intensity === 1) return '#2D1F5E';
    return '#1A1432';
  }

  if (error) {
    return (
      <View style={[st.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#FF6464', fontSize: 14, textAlign: 'center', padding: 20 }}>
          Failed to load insights.{'\n'}Check your connection and try again.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[st.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#7A6AAA', fontSize: 14 }}>Loading your insights...</Text>
      </View>
    );
  }

  const macroTotal = (nutritionSummary?.avgProtein ?? 0) +
                     (nutritionSummary?.avgCarbs   ?? 0) +
                     (nutritionSummary?.avgFat     ?? 0);

  return (
    <View style={st.root}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={st.header}>
          <Text style={st.title}>Insights</Text>
          <View style={st.aiBadge}>
            <Text style={st.aiBadgeText}>🧠 AI Analysis</Text>
          </View>
        </View>

        {/* ── Period selector ── */}
        <View style={st.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p}
              style={[st.periodBtn, period === p && st.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[st.periodLabel, period === p && st.periodLabelActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Health Score Trend ── */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Health Score Trend</Text>
          <Text style={st.cardSub}>Workout · Steps · Food · Sleep · Water</Text>
          <View style={st.lineChart}>
            {data.map((val, i) => {
              const barH   = max > 0 ? (val / max) * 100 : 0;
              const isLast = i === data.length - 1;
              return (
                <View key={i} style={st.lineBarCol}>
                  {isLast && <Text style={st.lineBarTip}>{val}</Text>}
                  <View style={[st.lineBar, { height: barH }, isLast && st.lineBarActive]} />
                </View>
              );
            })}
          </View>
          <View style={st.chartFooter}>
            <Text style={st.chartFooterLabel}>Low: {Math.min(...data)}</Text>
            <Text style={st.chartFooterLabel}>Avg: {Math.round(data.reduce((a, b) => a + b, 0) / data.length)}</Text>
            <Text style={st.chartFooterLabel}>Peak: {max}</Text>
          </View>
        </View>

        {/* ── Summary Metrics Grid ── */}
        <View style={st.metricsGrid}>
          {(metrics ?? []).map(m => (
            <View key={m.label} style={st.metricCard}>
              <Text style={st.metricValue}>{m.value}</Text>
              <Text style={st.metricLabel}>{m.label}</Text>
              <View style={[st.deltaBadge, m.up ? st.deltaUp : st.deltaDown]}>
                <Text style={[st.deltaText, m.up ? st.deltaTextUp : st.deltaTextDown]}>
                  {m.up ? '↑' : '↓'} {m.delta}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Nutrition Overview ── */}
        <Text style={st.sectionTitle}>Nutrition Overview</Text>
        <View style={st.card}>
          {nutritionSummary ? (
            <>
              <View style={st.nutritionHeader}>
                <View>
                  <Text style={st.nutritionCal}>{nutritionSummary.avgCal}</Text>
                  <Text style={st.nutritionCalLabel}>avg kcal / day</Text>
                </View>
                <View style={st.nutritionBadge}>
                  <Text style={st.nutritionBadgeTxt}>
                    {nutritionSummary.loggedDays} day{nutritionSummary.loggedDays !== 1 ? 's' : ''} logged
                  </Text>
                </View>
              </View>
              <MacroBar label="Protein" grams={nutritionSummary.avgProtein} color="#A38DF2" total={macroTotal} />
              <MacroBar label="Carbs"   grams={nutritionSummary.avgCarbs}   color="#CDF27E" total={macroTotal} />
              <MacroBar label="Fat"     grams={nutritionSummary.avgFat}     color="#FF9500" total={macroTotal} />
            </>
          ) : (
            <Text style={st.emptyTxt}>No food logged yet this {period.toLowerCase()}.</Text>
          )}
        </View>

        {/* ── Workout Breakdown ── */}
        <Text style={st.sectionTitle}>Workout Breakdown</Text>
        <View style={[st.card, st.workoutRow]}>
          <View style={st.workoutStat}>
            <Text style={st.workoutStatVal}>{workoutSummary?.count ?? 0}</Text>
            <Text style={st.workoutStatLabel}>Sessions</Text>
          </View>
          <View style={st.workoutDivider} />
          <View style={st.workoutStat}>
            <Text style={st.workoutStatVal}>{workoutSummary?.avgDurationMin ?? 0}</Text>
            <Text style={st.workoutStatLabel}>Avg min</Text>
          </View>
          <View style={st.workoutDivider} />
          <View style={st.workoutStat}>
            <Text style={st.workoutStatVal}>{workoutSummary?.totalCal ?? 0}</Text>
            <Text style={st.workoutStatLabel}>kcal burned</Text>
          </View>
        </View>

        {/* ── Recovery Status ── */}
        {muscleFatigue?.length > 0 && (
          <>
            <Text style={st.sectionTitle}>Recovery Status</Text>
            <View style={st.card}>
              <Text style={st.cardSub}>From your last training sessions</Text>
              {muscleFatigue.slice(0, 5).map(m => (
                <FatigueRow key={m.muscle_name} muscle={m} />
              ))}
              <View style={st.fatigueLegend}>
                {[{ c: '#CDF27E', l: 'Fresh' }, { c: '#FF9500', l: 'Sore' }, { c: '#A38DF2', l: 'Fatigued' }].map(({ c, l }) => (
                  <View key={l} style={st.fatigueLegendItem}>
                    <View style={[st.fatigueDot, { backgroundColor: c }]} />
                    <Text style={st.fatigueLegendTxt}>{l}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ── AI Discoveries ── */}
        <Text style={st.sectionTitle}>AI Discoveries</Text>
        {insightsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[st.insightCard, { borderLeftColor: '#3D2F7A' }]}>
                <View style={st.insightHeader}>
                  <Skeleton width={32} height={32} style={{ borderRadius: 6 }} />
                  <View style={st.insightMeta}>
                    <Skeleton width={70}  height={11} style={{ marginBottom: 6 }} />
                    <Skeleton width={140} height={14} />
                  </View>
                </View>
                <Skeleton width="100%" height={38} style={{ marginTop: 4 }} />
              </View>
            ))
          : aiInsights.length > 0
            ? aiInsights.map((ins, i) => (
                <View key={i} style={[st.insightCard, { borderLeftColor: ins.color }]}>
                  <View style={st.insightHeader}>
                    <Text style={st.insightIcon}>{ins.icon}</Text>
                    <View style={st.insightMeta}>
                      <Text style={[st.insightTag, { color: ins.color }]}>{ins.tag}</Text>
                      <Text style={st.insightTitle}>{ins.title}</Text>
                    </View>
                  </View>
                  <Text style={st.insightText}>{ins.text}</Text>
                </View>
              ))
            : (
                <View style={[st.card, { alignItems: 'center', paddingVertical: 24 }]}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>🤖</Text>
                  <Text style={st.emptyTxt}>Not enough data yet.{'\n'}Keep logging to unlock AI insights!</Text>
                </View>
              )
        }

        {/* ── Activity Heatmap ── */}
        <Text style={st.sectionTitle}>Activity Heatmap</Text>
        <View style={st.card}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, di) => (
            <View key={day} style={st.heatRow}>
              <Text style={st.heatDay}>{day}</Text>
              {Array.from({ length: 6 }).map((_, hi) => {
                const cellDate = new Date(thisMonday);
                cellDate.setDate(thisMonday.getDate() - (5 - hi) * 7 + di);
                const dateStr   = cellDate.toISOString().split('T')[0];
                const intensity = heatmapData?.[dateStr] ?? 0;
                return <View key={hi} style={[st.heatCell, { backgroundColor: heatColor(intensity) }]} />;
              })}
            </View>
          ))}
          <View style={st.heatLegend}>
            <Text style={st.heatLegendLabel}>Less</Text>
            {['#1A1432', '#2D1F5E', '#4A2F8A', '#6F4BF2'].map(c => (
              <View key={c} style={[st.heatCell, { backgroundColor: c }]} />
            ))}
            <Text style={st.heatLegendLabel}>More</Text>
          </View>
        </View>

        {/* ── Recent AI Coaching ── */}
        {aiHistory?.length > 0 && (
          <>
            <Text style={st.sectionTitle}>Recent AI Coaching</Text>
            {aiHistory.slice(0, 5).map((item, i) => (
              <View key={i} style={st.coachCard}>
                <View style={st.coachHeader}>
                  <Text style={st.coachType}>{item.insight_type?.toUpperCase()}</Text>
                  <Text style={st.coachDate}>
                    {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Text style={st.coachText}>{item.message}</Text>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}


const st = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#241C40' },
  scroll: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title:       { color: '#fff', fontSize: 26, fontWeight: '800' },
  aiBadge:     { backgroundColor: '#1A1432', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#6F4BF2' },
  aiBadgeText: { color: '#A38DF2', fontSize: 12, fontWeight: '700' },

  periodRow:         { flexDirection: 'row', backgroundColor: '#1A1432', borderRadius: 12, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: '#3D2F7A' },
  periodBtn:         { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  periodBtnActive:   { backgroundColor: '#6F4BF2' },
  periodLabel:       { color: '#7A6AAA', fontSize: 13, fontWeight: '600' },
  periodLabelActive: { color: '#fff' },

  card:             { backgroundColor: '#1A1432', borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#3D2F7A' },
  cardTitle:        { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardSub:          { color: '#7A6AAA', fontSize: 11, marginBottom: 14 },

  lineChart:        { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 4, marginBottom: 12 },
  lineBarCol:       { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  lineBarTip:       { color: '#CDF27E', fontSize: 10, fontWeight: '700', marginBottom: 3 },
  lineBar:          { width: '80%', backgroundColor: '#3D2F7A', borderRadius: 4 },
  lineBarActive:    { backgroundColor: '#6F4BF2' },
  chartFooter:      { flexDirection: 'row', justifyContent: 'space-between' },
  chartFooterLabel: { color: '#7A6AAA', fontSize: 11 },

  metricsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  metricCard:    { backgroundColor: '#1A1432', borderRadius: 16, padding: 16, width: '47%', borderWidth: 1, borderColor: '#3D2F7A', alignItems: 'flex-start' },
  metricValue:   { color: '#fff', fontSize: 28, fontWeight: '800' },
  metricLabel:   { color: '#7A6AAA', fontSize: 12, marginTop: 2, marginBottom: 8 },
  deltaBadge:    { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  deltaUp:       { backgroundColor: 'rgba(205,242,126,0.15)' },
  deltaDown:     { backgroundColor: 'rgba(255,100,100,0.15)' },
  deltaText:     { fontSize: 11, fontWeight: '700' },
  deltaTextUp:   { color: '#CDF27E' },
  deltaTextDown: { color: '#FF6464' },

  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyTxt:     { color: '#7A6AAA', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Nutrition
  nutritionHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  nutritionCal:       { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  nutritionCalLabel:  { color: '#7A6AAA', fontSize: 11, marginTop: 2 },
  nutritionBadge:     { backgroundColor: 'rgba(111,75,242,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#3D2F7A' },
  nutritionBadgeTxt:  { color: '#A38DF2', fontSize: 11, fontWeight: '700' },
  macroRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  macroLabel:         { color: '#7A6AAA', fontSize: 12, width: 48 },
  macroBarBg:         { flex: 1, height: 6, backgroundColor: '#2D1F5E', borderRadius: 3, overflow: 'hidden' },
  macroBarFill:       { height: 6, borderRadius: 3 },
  macroVal:           { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },

  // Workout breakdown
  workoutRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  workoutStat:     { alignItems: 'center', flex: 1 },
  workoutStatVal:  { color: '#fff', fontSize: 28, fontWeight: '800' },
  workoutStatLabel:{ color: '#7A6AAA', fontSize: 11, marginTop: 4 },
  workoutDivider:  { width: 1, height: 40, backgroundColor: '#3D2F7A' },

  // Recovery / muscle fatigue
  fatigueRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  fatigueDot:        { width: 8, height: 8, borderRadius: 4 },
  fatigueName:       { color: '#C8BFEE', fontSize: 12, fontWeight: '600', width: 80 },
  fatigueBarBg:      { flex: 1, height: 5, backgroundColor: '#2D1F5E', borderRadius: 3, overflow: 'hidden' },
  fatigueBarFill:    { height: 5, borderRadius: 3 },
  fatiguePct:        { fontSize: 11, fontWeight: '800', width: 34, textAlign: 'right' },
  fatigueLegend:     { flexDirection: 'row', gap: 12, marginTop: 8, justifyContent: 'flex-end' },
  fatigueLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fatigueLegendTxt:  { color: '#7A6AAA', fontSize: 10 },

  // AI cards
  insightCard:   { backgroundColor: '#1A1432', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#3D2F7A', borderLeftWidth: 4 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  insightIcon:   { fontSize: 26 },
  insightMeta:   { flex: 1 },
  insightTag:    { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  insightTitle:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  insightText:   { color: '#C8BFEE', fontSize: 13, lineHeight: 19 },

  // Heatmap
  heatRow:          { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  heatDay:          { color: '#7A6AAA', fontSize: 10, width: 28 },
  heatCell:         { width: 28, height: 28, borderRadius: 6 },
  heatLegend:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, justifyContent: 'flex-end' },
  heatLegendLabel:  { color: '#7A6AAA', fontSize: 10 },

  // AI coaching history
  coachCard:   { backgroundColor: '#1A1432', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#3D2F7A', borderLeftWidth: 4, borderLeftColor: '#6F4BF2' },
  coachHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  coachType:   { color: '#6F4BF2', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  coachDate:   { color: '#7A6AAA', fontSize: 10 },
  coachText:   { color: '#C8BFEE', fontSize: 13, lineHeight: 19 },
});
