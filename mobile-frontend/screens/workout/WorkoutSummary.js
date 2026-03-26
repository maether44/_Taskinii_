import { useEffect, useRef, useState } from 'react';
import {
  Animated, ScrollView, StyleSheet,
  Text, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

const C = {
  bg:     '#0F0B1E',
  card:   '#13102A',
  border: '#1E1A38',
  purple: '#7C5CFC',
  lime:   '#C8F135',
  amber:  '#FF9500',
  red:    '#FF3B30',
  sub:    '#6B5F8A',
  text:   '#FFFFFF',
};

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.4,
  shadowRadius: 14,
  elevation: 10,
};

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function scoreColor(pct) {
  if (pct >= 80) return C.lime;
  if (pct >= 55) return C.amber;
  return C.red;
}

function yaraMessage(score) {
  if (score >= 90) return { tag: 'ELITE FORM', msg: `Elite Form! You're operating at peak efficiency. Time to level up the weight.` };
  if (score >= 80) return { tag: 'GREAT FORM', msg: `Your form was ${score}% stable. You are ready for higher weight!` };
  if (score >= 65) return { tag: 'SOLID',      msg: `Solid session at ${score}%. Focus on full range of motion and you'll break through fast.` };
  if (score >= 50) return { tag: 'KEEP GOING', msg: `Good effort — ${score}% accuracy. Slow down slightly and you'll see big improvements next session.` };
  if (score >  0)  return { tag: 'NEEDS WORK', msg: `Form needs refinement at ${score}%. Let's master the technique before adding more load.` };
  return              { tag: 'WELL DONE',   msg: `Consistency beats perfection. Showing up is what counts most — see you next session.` };
}

export default function WorkoutSummary({ route, navigation }) {
  const params    = route?.params || {};
  const sessionId = params.sessionId ?? null;

  // Optimistic values from navigation params (shown instantly, overwritten by DB)
  const [reps,      setReps]      = useState(params.repCount  ?? 0);
  const [score,     setScore]     = useState(params.formScore ?? 0);
  const [elapsed]                  = useState(params.elapsed   ?? 0);
  const [exName,    setExName]    = useState(params.exerciseName ?? 'Workout');
  const [dbLoading, setDbLoading] = useState(!!sessionId);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  // ── Fetch real data from Supabase ────────────────────────────
  useEffect(() => {
    if (!sessionId) { runEntrance(); return; }

    (async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('reps, posture_score, calories_burned, exercise_name, created_at')
        .eq('id', sessionId)
        .single();

      if (!error && data) {
        if (data.reps           != null) setReps(data.reps);
        if (data.posture_score  != null) setScore(data.posture_score);
        if (data.exercise_name)          setExName(data.exercise_name);
      } else {
        console.warn('[BodyQ] Session fetch error:', error?.message);
      }
      setDbLoading(false);
      runEntrance();
    })();
  }, [sessionId]);

  function runEntrance() {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500,             useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }

  const calories = Math.max(1, Math.round(elapsed / 60 * 8));
  const xp       = Math.min(200, reps * 5 + Math.round(score / 2));
  const ringColor = scoreColor(score);
  const yara      = yaraMessage(score);

  const goHome = () => {
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'MainApp' }] })
    );
  };

  const goAgain = () => navigation.goBack();

  if (dbLoading) {
    return (
      <View style={s.loadingScreen}>
        <ActivityIndicator size="large" color={C.lime} />
        <Text style={s.loadingTxt}>Saving session...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <Animated.View style={[s.header, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={s.stampCircle}>
            <Ionicons name="checkmark" size={36} color="#000" />
          </View>
          <Text style={s.doneLabel}>SESSION COMPLETE</Text>
          <Text style={s.workoutName}>{exName}</Text>
          <Text style={s.timestamp}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
        </Animated.View>

        {/* ── PERFORATED DIVIDER ── */}
        <View style={s.perfRow}>
          <View style={s.perfDot} />
          <View style={s.perfLine} />
          <View style={s.perfDot} />
        </View>

        {/* ── HERO REPS ── */}
        <Animated.View
          style={[s.heroRepsCard, SHADOW, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={s.heroRepsLabel}>TOTAL REPS</Text>
          <Text style={s.heroRepsNum}>{reps}</Text>
          <Text style={s.heroRepsSub}>completed this session</Text>
        </Animated.View>

        {/* ── RECEIPT BODY ── */}
        <Animated.View
          style={[s.receiptBody, SHADOW, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={s.statRow}>
            <View style={s.statLeft}>
              <Ionicons name="flame" size={16} color={C.amber} />
              <Text style={s.statLabel}>Calories Burned</Text>
            </View>
            <Text style={[s.statVal, { color: C.amber }]}>{calories} kcal</Text>
          </View>
          <View style={s.divider} />

          <View style={s.statRow}>
            <View style={s.statLeft}>
              <Ionicons name="time-outline" size={16} color={C.purple} />
              <Text style={s.statLabel}>Duration</Text>
            </View>
            <Text style={[s.statVal, { color: C.purple }]}>{fmtTime(elapsed)}</Text>
          </View>
          <View style={s.divider} />

          {/* Form accuracy */}
          <View style={s.formSection}>
            <View style={s.formTopRow}>
              <Text style={s.statLabel}>Form Accuracy</Text>
              <Text style={[s.formPct, { color: ringColor }]}>{score}%</Text>
            </View>
            <View style={s.formBarBg}>
              <View style={[s.formBarFill, { width: `${score}%`, backgroundColor: ringColor }]} />
            </View>
          </View>

          {/* XP */}
          <View style={s.xpRow}>
            <Ionicons name="star" size={14} color={C.lime} />
            <Text style={s.xpTxt}>+{xp} XP earned this session</Text>
          </View>
        </Animated.View>

        {/* ── YARA AI CARD ── */}
        <Animated.View
          style={[s.yaraCard, SHADOW, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={s.yaraHeader}>
            <View style={s.yaraAvatar}>
              <Text style={s.yaraEmoji}>🤖</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.yaraName}>Yara AI</Text>
              <View style={[s.yaraTag, { borderColor: ringColor }]}>
                <Text style={[s.yaraTagTxt, { color: ringColor }]}>{yara.tag}</Text>
              </View>
            </View>
          </View>
          <Text style={s.yaraMsg}>"{yara.msg}"</Text>
        </Animated.View>

        {/* ── ACTIONS ── */}
        <Animated.View style={[s.actionsWrap, { opacity: fadeAnim }]}>
          <TouchableOpacity style={[s.homeBtn, SHADOW]} onPress={goHome}>
            <Text style={s.homeBtnTxt}>Back to Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.againBtn} onPress={goAgain}>
            <Ionicons name="refresh" size={15} color={C.sub} style={{ marginRight: 6 }} />
            <Text style={s.againBtnTxt}>Repeat Workout</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  scroll:        { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 24, alignItems: 'center' },
  loadingScreen: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  loadingTxt:    { color: C.sub, marginTop: 14, fontSize: 14, fontWeight: '600' },

  // Header
  header:      { alignItems: 'center', width: '100%' },
  stampCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', marginBottom: 18, shadowColor: C.lime, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  doneLabel:   { color: C.sub, fontSize: 11, fontWeight: '800', letterSpacing: 2.5, marginBottom: 8 },
  workoutName: { color: C.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  timestamp:   { color: C.sub, fontSize: 12, marginTop: 6 },

  // Perforated divider
  perfRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 20 },
  perfDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  perfLine:{ flex: 1, borderTopWidth: 1, borderColor: C.border, borderStyle: 'dashed', marginHorizontal: -1 },

  // Hero reps
  heroRepsCard: { backgroundColor: C.card, borderRadius: 24, width: '100%', alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  heroRepsLabel:{ color: C.sub, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  heroRepsNum:  { color: C.lime, fontSize: 96, fontWeight: '900', lineHeight: 100, letterSpacing: -4 },
  heroRepsSub:  { color: C.sub, fontSize: 12, marginTop: 4 },

  // Receipt body
  receiptBody: { backgroundColor: C.card, borderRadius: 22, width: '100%', padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  statRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13 },
  statLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statLabel:   { color: '#B0A8CC', fontSize: 14, fontWeight: '600' },
  statVal:     { fontSize: 17, fontWeight: '900', letterSpacing: -0.5 },
  divider:     { height: 1, backgroundColor: C.border },

  formSection: { paddingVertical: 14 },
  formTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  formPct:     { fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  formBarBg:   { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  formBarFill: { height: 8, borderRadius: 4 },

  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
  xpTxt: { color: C.lime, fontSize: 13, fontWeight: '700' },

  // Yara card
  yaraCard:    { backgroundColor: C.card, borderRadius: 22, padding: 20, width: '100%', borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  yaraHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  yaraAvatar:  { width: 42, height: 42, borderRadius: 21, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' },
  yaraEmoji:   { fontSize: 20 },
  yaraName:    { color: C.text, fontSize: 13, fontWeight: '800', marginBottom: 4 },
  yaraTag:     { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  yaraTagTxt:  { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  yaraMsg:     { color: '#C9C2DF', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },

  // Actions
  actionsWrap: { width: '100%', gap: 10 },
  homeBtn:     { backgroundColor: C.purple, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  homeBtnTxt:  { color: '#fff', fontSize: 15, fontWeight: '800' },
  againBtn:    { backgroundColor: C.card, borderRadius: 16, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  againBtnTxt: { color: C.sub, fontSize: 14, fontWeight: '700' },
});
