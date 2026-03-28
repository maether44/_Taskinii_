import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Ellipse, Rect, Circle, Path } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import { getMuscleFatigue } from '../services/workoutService';

const { width } = Dimensions.get('window');

const C = {
  bg:      '#0F0B1E',
  card:    '#161230',
  border:  '#1E1A35',
  purple:  '#7C5CFC',
  purpleD: '#4A2FC8',
  lime:    '#C8F135',
  text:    '#FFFFFF',
  sub:     '#6B5F8A',
  accent:  '#9D85F5',
};

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 8,
};

// ── Static data ──────────────────────────────────────────────
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DONE_DAYS = new Set([0, 1, 2, 4]);

const QUICK_ACTIONS = [
  { icon: 'search',            label: 'Library',   screen: 'ExerciseList' },
  { icon: 'scan-outline',      label: 'PostureAI', screen: 'PostureAI'    },
  { icon: 'analytics-outline', label: 'Progress',  screen: 'Insights'     },
];

// ── Fatigue → color / label ──────────────────────────────────
function fatigueColor(pct) {
  if (pct >= 70) return '#7C5CFC'; // Electric Violet — Fatigued
  if (pct >= 40) return '#FF9500'; // Amber — Sore
  return '#C8F135';                // Neon Lime — Fresh
}
function fatigueLabel(pct) {
  if (pct >= 70) return 'FATIGUED';
  if (pct >= 40) return 'SORE';
  return 'FRESH';
}
const UNTRAINED = 'rgba(255,255,255,0.07)';

// ── SVG body muscle spots ────────────────────────────────────
const BODY_SPOTS = [
  { id: 'Shoulders', cx: 17,  cy: 52,  rx: 11, ry: 9  },
  { id: 'Shoulders', cx: 103, cy: 52,  rx: 11, ry: 9  },
  { id: 'Chest',     cx: 60,  cy: 64,  rx: 22, ry: 16 },
  { id: 'Biceps',    cx: 15,  cy: 80,  rx: 8,  ry: 14 },
  { id: 'Biceps',    cx: 105, cy: 80,  rx: 8,  ry: 14 },
  { id: 'Triceps',   cx: 13,  cy: 93,  rx: 7,  ry: 10 },
  { id: 'Triceps',   cx: 107, cy: 93,  rx: 7,  ry: 10 },
  { id: 'Forearms',  cx: 14,  cy: 118, rx: 6,  ry: 12 },
  { id: 'Forearms',  cx: 106, cy: 118, rx: 6,  ry: 12 },
  { id: 'Core',      cx: 60,  cy: 98,  rx: 17, ry: 22 },
  { id: 'Glutes',    cx: 42,  cy: 137, rx: 13, ry: 10 },
  { id: 'Glutes',    cx: 78,  cy: 137, rx: 13, ry: 10 },
  { id: 'Quads',     cx: 42,  cy: 162, rx: 12, ry: 22 },
  { id: 'Quads',     cx: 78,  cy: 162, rx: 12, ry: 22 },
  { id: 'Hamstrings',cx: 42,  cy: 185, rx: 11, ry: 12 },
  { id: 'Hamstrings',cx: 78,  cy: 185, rx: 11, ry: 12 },
  { id: 'Back',      cx: 60,  cy: 78,  rx: 20, ry: 20 },
];

// ── Body Silhouette SVG Component ────────────────────────────
function BodySilhouette({ fatigueMap }) {
  const colorOf = (muscleId) => {
    const entry = fatigueMap[muscleId];
    if (!entry) return UNTRAINED;
    return fatigueColor(entry.fatigue_pct);
  };

  return (
    <Svg width={120} height={265} viewBox="0 0 120 265">
      {/* Head */}
      <Circle cx={60} cy={18} r={14} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      {/* Neck */}
      <Rect x={55} y={31} width={10} height={11} rx={4} fill="#1A1538" />
      {/* Torso */}
      <Rect x={28} y={40} width={64} height={98} rx={12} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      {/* Left upper arm */}
      <Rect x={10} y={46} width={18} height={60} rx={9} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      {/* Right upper arm */}
      <Rect x={92} y={46} width={18} height={60} rx={9} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      {/* Left forearm */}
      <Rect x={11} y={104} width={15} height={50} rx={7} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      {/* Right forearm */}
      <Rect x={94} y={104} width={15} height={50} rx={7} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      {/* Left thigh */}
      <Rect x={31} y={136} width={26} height={72} rx={13} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      {/* Right thigh */}
      <Rect x={63} y={136} width={26} height={72} rx={13} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      {/* Left calf */}
      <Rect x={33} y={205} width={22} height={55} rx={11} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      {/* Right calf */}
      <Rect x={65} y={205} width={22} height={55} rx={11} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />

      {/* Muscle colour overlays */}
      {BODY_SPOTS.map((s, i) => (
        <Ellipse
          key={i}
          cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
          fill={colorOf(s.id)}
          opacity={colorOf(s.id) === UNTRAINED ? 0.6 : 0.75}
        />
      ))}

      {/* Face details */}
      <Circle cx={55} cy={15} r={2} fill="rgba(255,255,255,0.15)" />
      <Circle cx={65} cy={15} r={2} fill="rgba(255,255,255,0.15)" />
      <Path d="M55 22 Q60 26 65 22" stroke="rgba(255,255,255,0.15)" strokeWidth={1} fill="none" />
    </Svg>
  );
}

// ── Main Screen ───────────────────────────────────────────────
export default function Training({ navigation }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good Morning' :
    hour < 18 ? 'Good Afternoon' :
    'Good Evening';

  const [fatigueMap, setFatigueMap]   = useState({});
  const [fatigueList, setFatigueList] = useState([]);
  const [fatigueLoading, setFatigueLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const rows = await getMuscleFatigue(user.id);
        const map = {};
        rows.forEach(r => { map[r.muscle_name] = r; });
        setFatigueMap(map);
        setFatigueList(rows);
      } catch (e) {
        console.warn('[BodyQ] fatigue fetch:', e);
      } finally {
        setFatigueLoading(false);
      }
    })();
  }, []);

  const handleNav = (screen) => { if (screen) navigation.navigate(screen); };

  const topFatigued = fatigueList.find(m => m.fatigue_pct >= 70);

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── HEADER ── */}
        <Animated.View entering={FadeInDown.delay(0).springify()} style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting},</Text>
            <Text style={s.subGreeting}>Your studio is ready.</Text>
          </View>
          <View style={[s.recoveryBadge, SHADOW]}>
            <Text style={s.recoveryNum}>88%</Text>
            <Text style={s.recoveryLabel}>RECOVERY</Text>
          </View>
        </Animated.View>

        {/* ── HERO CARD ── */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('WorkoutActive', { exerciseName: 'squat' })}
          >
            <LinearGradient
              colors={[C.purple, C.purpleD, '#1A0E4F']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[s.heroCard, SHADOW]}
            >
              <View style={s.heroAccentLine} />
              <View style={s.heroBadge}>
                <Ionicons name="sparkles" size={10} color={C.lime} />
                <Text style={s.heroBadgeTxt}>  AI RECOMMENDED</Text>
              </View>
              <Text style={s.heroLabel}>TODAY'S PROGRAM</Text>
              <Text style={s.heroTitle}>Hyper-Mobility{'\n'}Reset</Text>
              <View style={s.heroMeta}>
                {[
                  { icon: 'time-outline',  val: '18 min' },
                  { icon: 'flame-outline', val: '240 kcal' },
                  { icon: 'body-outline',  val: 'Posture Focus' },
                ].map((m, i) => (
                  <View key={i} style={s.metaChip}>
                    <Ionicons name={m.icon} size={11} color="rgba(255,255,255,0.6)" />
                    <Text style={s.metaChipTxt}> {m.val}</Text>
                  </View>
                ))}
              </View>
              <View style={s.heroFooter}>
                <Text style={s.heroLogic}>"Based on your 6h sleep &{'\n'}4h desk session today."</Text>
                <View style={s.playCircle}>
                  <Ionicons name="play" size={22} color="#000" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ── RECOVERY STATUS (Muscle Heatmap) ── */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Recovery Status</Text>
            <Text style={s.sectionSub}>Last 48 hrs</Text>
          </View>

          <View style={[s.heatmapCard, SHADOW]}>
            {/* Body silhouette */}
            <View style={s.heatmapBody}>
              <BodySilhouette fatigueMap={fatigueMap} />
            </View>

            {/* Muscle list */}
            <View style={s.heatmapList}>
              {fatigueLoading ? (
                <Text style={s.heatmapLoading}>Syncing...</Text>
              ) : fatigueList.length === 0 ? (
                <>
                  <Text style={s.heatmapEmpty}>No workout{'\n'}data yet.</Text>
                  <Text style={s.heatmapEmptySub}>All muscles{'\n'}are fresh!</Text>
                </>
              ) : (
                fatigueList.slice(0, 6).map((m) => {
                  const col = fatigueColor(m.fatigue_pct);
                  return (
                    <View key={m.muscle_name} style={s.muscleRow}>
                      <View style={[s.muscleDot, { backgroundColor: col }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.muscleName}>{m.muscle_name}</Text>
                        <View style={s.muscleBarBg}>
                          <View
                            style={[
                              s.muscleBarFill,
                              {
                                width: `${m.fatigue_pct}%`,
                                backgroundColor: col,
                                shadowColor: col,
                                shadowOpacity: 0.7,
                                shadowRadius: 6,
                                elevation: 4,
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <Text style={[s.muscleTag, { color: col }]}>{fatigueLabel(m.fatigue_pct)}</Text>
                    </View>
                  );
                })
              )}

              {/* Legend */}
              <View style={s.legend}>
                {[
                  { color: C.lime,    label: 'Fresh'    },
                  { color: '#FF9500', label: 'Sore'     },
                  { color: C.purple,  label: 'Fatigued' },
                ].map(l => (
                  <View key={l.label} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: l.color }]} />
                    <Text style={s.legendTxt}>{l.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Callout if a muscle is fatigued */}
          {topFatigued && (
            <View style={[s.calloutCard, SHADOW]}>
              <Ionicons name="warning-outline" size={16} color="#FF9500" />
              <Text style={s.calloutTxt}>
                <Text style={{ color: '#FF9500', fontWeight: '900' }}>{topFatigued.muscle_name}</Text>
                {` is at ${topFatigued.fatigue_pct}% fatigue — consider a rest day or switch muscle groups.`}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ── 7-DAY STREAK ── */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={[s.streakCard, SHADOW]}>
          <View style={s.streakHeader}>
            <Ionicons name="flame" size={16} color={C.lime} />
            <Text style={s.streakTitle}>Consistency</Text>
            <Text style={s.streakSub}>4 / 7 days</Text>
          </View>
          <View style={s.weekRow}>
            {WEEK.map((day, i) => {
              const done = DONE_DAYS.has(i);
              return (
                <View key={i} style={s.dayCol}>
                  <View style={[s.dayDot, done && s.dayDotDone]}>
                    {done && <Ionicons name="checkmark" size={11} color="#000" />}
                  </View>
                  <Text style={[s.dayLabel, done && s.dayLabelDone]}>{day}</Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* ── QUICK ACTIONS ── */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={s.actionRow}>
          {QUICK_ACTIONS.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={[s.actionBtn, SHADOW]}
              onPress={() => handleNav(a.screen)}
              activeOpacity={0.8}
            >
              <View style={s.actionIconWrap}>
                <Ionicons name={a.icon} size={20} color={C.lime} />
              </View>
              <Text style={s.actionTxt}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* ── PERFORMANCE LIBRARY ── */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={{ marginTop: 4 }}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Performance Library</Text>
            <TouchableOpacity onPress={() => handleNav('ExerciseList')}>
              <Text style={s.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[s.libCard, SHADOW]} onPress={() => handleNav('ExerciseList')} activeOpacity={0.85}>
            <LinearGradient
              colors={['#1A1535', C.card]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.libGradient}
            >
              <View style={s.libIconBox}>
                <Ionicons name="barbell-outline" size={28} color={C.lime} />
              </View>
              <View style={s.libInfo}>
                <Text style={s.libMain}>Browse 1,300+ Exercises</Text>
                <Text style={s.libSub}>Bodyweight · Barbell · Cable · Machine</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.lime} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ── POSTURE AI CARD ── */}
        <Animated.View entering={FadeInDown.delay(350).springify()} style={{ marginTop: 14 }}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => handleNav('PostureAI')}>
            <View style={[s.postureCard, SHADOW]}>
              <View style={s.postureLeft}>
                <View style={s.postureIconBox}>
                  <Ionicons name="scan-outline" size={26} color={C.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.postureTitle}>AI Posture Coach</Text>
                  <Text style={s.postureSub}>Real-time form correction</Text>
                </View>
              </View>
              <View style={s.postureArrow}>
                <Ionicons name="arrow-forward" size={16} color="#000" />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 62, paddingBottom: 20 },

  // Header
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  greeting:      { color: C.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  subGreeting:   { color: C.sub, fontSize: 14, marginTop: 2 },
  recoveryBadge: { backgroundColor: C.card, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: C.lime },
  recoveryNum:   { color: C.lime, fontSize: 20, fontWeight: '900', lineHeight: 22 },
  recoveryLabel: { color: C.sub, fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: 2 },

  // Hero
  heroCard:       { borderRadius: 28, padding: 26, marginBottom: 16, overflow: 'hidden' },
  heroAccentLine: { position: 'absolute', top: 0, left: 26, right: 26, height: 2, backgroundColor: C.lime, opacity: 0.5, borderRadius: 1 },
  heroBadge:      { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(200,241,53,0.12)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(200,241,53,0.25)' },
  heroBadgeTxt:   { color: C.lime, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  heroLabel:      { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  heroTitle:      { color: C.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.5, lineHeight: 34, marginBottom: 16 },
  heroMeta:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  metaChip:       { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  metaChipTxt:    { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },
  heroFooter:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  heroLogic:      { color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', fontSize: 12, lineHeight: 18, flex: 1 },
  playCircle:     { width: 52, height: 52, backgroundColor: C.lime, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },

  // Section row
  sectionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:{ color: C.text, fontSize: 16, fontWeight: '800' },
  sectionLink: { color: C.lime, fontSize: 12, fontWeight: '700' },
  sectionSub:  { color: C.sub, fontSize: 12 },

  // Heatmap card
  heatmapCard:    { backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.border, flexDirection: 'row', padding: 16, marginBottom: 10 },
  heatmapBody:    { alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  heatmapList:    { flex: 1, justifyContent: 'center', gap: 6 },
  heatmapLoading: { color: C.sub, fontSize: 12, fontStyle: 'italic' },
  heatmapEmpty:   { color: C.text, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  heatmapEmptySub:{ color: C.lime, fontSize: 11, marginTop: 4, lineHeight: 16 },

  // Per-muscle row
  muscleRow:     { flexDirection: 'row', alignItems: 'center', gap: 7 },
  muscleDot:     { width: 8, height: 8, borderRadius: 4 },
  muscleName:    { color: C.text, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  muscleBarBg:   { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'visible' },
  muscleBarFill: { height: 4, borderRadius: 2 },
  muscleTag:     { fontSize: 8, fontWeight: '900', letterSpacing: 0.5, minWidth: 52, textAlign: 'right' },

  // Legend
  legend:      { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:   { width: 7, height: 7, borderRadius: 3.5 },
  legendTxt:   { color: C.sub, fontSize: 9, fontWeight: '700' },

  // Fatigue callout
  calloutCard: { backgroundColor: '#FF950018', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: '#FF950040', marginBottom: 4 },
  calloutTxt:  { color: '#FFFFFF', fontSize: 12, lineHeight: 18, flex: 1 },

  // Streak
  streakCard:   { backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: C.border, marginTop: 16 },
  streakHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  streakTitle:  { color: C.text, fontSize: 14, fontWeight: '800', flex: 1 },
  streakSub:    { color: C.lime, fontSize: 12, fontWeight: '700' },
  weekRow:      { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol:       { alignItems: 'center', gap: 6 },
  dayDot:       { width: 34, height: 34, borderRadius: 17, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2A2548' },
  dayDotDone:   { backgroundColor: C.lime, borderColor: C.lime, shadowColor: C.lime, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6 },
  dayLabel:     { color: C.sub, fontSize: 11, fontWeight: '600' },
  dayLabelDone: { color: C.lime },

  // Quick Actions
  actionRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  actionBtn:      { width: (width - 56) / 3, backgroundColor: C.card, paddingVertical: 16, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  actionIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(200,241,53,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(200,241,53,0.2)' },
  actionTxt:      { color: C.text, fontSize: 11, fontWeight: '700' },

  // Library
  libCard:    { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  libGradient:{ flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  libIconBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(200,241,53,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(200,241,53,0.2)' },
  libInfo:    { flex: 1 },
  libMain:    { color: C.text, fontSize: 15, fontWeight: '700' },
  libSub:     { color: C.sub, fontSize: 11, marginTop: 3 },

  // Posture AI
  postureCard:   { backgroundColor: C.card, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: C.border },
  postureLeft:   { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  postureIconBox:{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(124,92,252,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(124,92,252,0.3)' },
  postureTitle:  { color: C.text, fontSize: 15, fontWeight: '700' },
  postureSub:    { color: C.sub, fontSize: 11, marginTop: 2 },
  postureArrow:  { width: 32, height: 32, borderRadius: 16, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' },
});
