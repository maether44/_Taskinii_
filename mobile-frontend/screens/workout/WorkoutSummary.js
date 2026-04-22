import { useEffect, useRef, useState } from 'react';
import { FS } from '../../constants/typography';
import {
  Animated, ScrollView, StyleSheet,
  Text, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { warn } from '../../lib/logger';

// ── Design tokens ─────────────────────────────────────────────
const C = {
  bg:     '#0F0B1E',
  card:   '#13102A',
  card2:  '#0D0B22',
  border: '#1E1A38',
  purple: '#7C5CFC',
  lime:   '#C8F135',
  amber:  '#FF9500',
  red:    '#FF3B30',
  sub:    '#6B5F8A',
  text:   '#FFFFFF',
};

const GLOW = (color, r = 16) => ({
  shadowColor: color,
  shadowOpacity: 0.55,
  shadowRadius: r,
  shadowOffset: { width: 0, height: 0 },
  elevation: 12,
});

// ── Helpers ───────────────────────────────────────────────────
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
  if (score >= 90) return {
    tag: 'ELITE FORM',
    msg: 'Elite Form! You are mastering this move. Your body is building real, lasting strength.',
  };
  if (score >= 80) return {
    tag: 'GREAT FORM',
    msg: `Great session at ${score}% stability. You are ready to push the weight higher next time.`,
  };
  if (score >= 65) return {
    tag: 'SOLID',
    msg: `Solid work at ${score}%. Focus on full range of motion and the gains will accelerate.`,
  };
  if (score >= 50) return {
    tag: 'KEEP GOING',
    msg: `Good effort — ${score}% accuracy. Slow down the tempo slightly for big improvements next session.`,
  };
  if (score > 0) return {
    tag: 'NEEDS WORK',
    msg: `Form was ${score}% — let's master the technique before adding more load. Quality over quantity.`,
  };
  return {
    tag: 'WELL DONE',
    msg: 'Consistency beats perfection. Showing up is what counts most — see you next session.',
  };
}

// ── Circular Form Accuracy Ring ───────────────────────────────
function FormRing({ score, color }) {
  const SIZE  = 110;
  const SW    = 9;          // stroke width
  const r     = (SIZE - SW) / 2;
  const circ  = 2 * Math.PI * r;
  const pct   = Math.max(0, Math.min(100, score));
  const dash  = (pct / 100) * circ;

  return (
    <View style={ring.wrap}>
      <Svg width={SIZE} height={SIZE} style={ring.svg}>
        {/* Track */}
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={r}
          stroke={C.border} strokeWidth={SW} fill="none"
        />
        {/* Arc */}
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={r}
          stroke={color} strokeWidth={SW} fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90, ${SIZE / 2}, ${SIZE / 2})`}
        />
      </Svg>
      <View style={ring.label}>
        <Text style={[ring.pct, { color }]}>{score}</Text>
        <Text style={ring.sub}>FORM %</Text>
      </View>
    </View>
  );
}

const ring = StyleSheet.create({
  wrap:  { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
  svg:   { position: 'absolute' },
  label: { alignItems: 'center' },
  pct:   { fontSize: FS.screenTitle, fontWeight: '900', lineHeight: 28 },
  sub:   { color: 'rgba(255,255,255,0.35)', fontSize: 8, fontWeight: '800', letterSpacing: 1.5, marginTop: 2 },
});

// ── Main screen ───────────────────────────────────────────────
export default function WorkoutSummary({ route, navigation }) {
  const params    = route?.params || {};
  const sessionId = params.sessionId ?? null;

  // Optimistic values — shown instantly, overwritten by DB fetch
  const [reps,      setReps]      = useState(params.repCount    ?? 0);
  const [score,     setScore]     = useState(params.formScore   ?? 0);
  const [calories,  setCalories]  = useState(Math.max(1, (params.repCount ?? 0) * 5));
  const [elapsed]                  = useState(params.elapsed     ?? 0);
  const [exName,    setExName]    = useState(params.exerciseName ?? 'Workout');
  const [dbLoading, setDbLoading] = useState(!!sessionId);

  // Staggered entrance anims
  const trophyScale   = useRef(new Animated.Value(0.15)).current;
  const trophyOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide     = useRef(new Animated.Value(40)).current;
  const cardOpacity   = useRef(new Animated.Value(0)).current;
  const yaraSlide     = useRef(new Animated.Value(40)).current;
  const yaraOpacity   = useRef(new Animated.Value(0)).current;
  const actionsOpacity= useRef(new Animated.Value(0)).current;

  // ── Fetch confirmed data from Supabase ──────────────────────
  useEffect(() => {
    if (!sessionId) { runEntrance(); return; }

    (async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('reps, posture_score, calories_burned, exercise_name')
        .eq('id', sessionId)
        .single();

      if (!error && data) {
        if (data.reps            != null) setReps(data.reps);
        if (data.posture_score   != null) setScore(data.posture_score);
        if (data.calories_burned != null) setCalories(data.calories_burned);
        if (data.exercise_name)           setExName(data.exercise_name);
      } else {
        warn('[BodyQ] Session fetch error:', error?.message);
      }
      setDbLoading(false);
      runEntrance();
    })();
  }, [sessionId]);

  function runEntrance() {
    // Trophy springs in first
    Animated.parallel([
      Animated.spring(trophyScale,   { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }),
      Animated.timing(trophyOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Stats card slides up 200ms later
    globalThis.setTimeout(() => {
      Animated.parallel([
        Animated.spring(cardSlide,   { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    }, 200);

    // Yara card 400ms later
    globalThis.setTimeout(() => {
      Animated.parallel([
        Animated.spring(yaraSlide,   { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
        Animated.timing(yaraOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    }, 400);

    // Actions 600ms later
    globalThis.setTimeout(() => {
      Animated.timing(actionsOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }, 600);
  }

  const xp        = Math.min(200, reps * 5 + Math.round(score / 2));
  const ringColor = scoreColor(score);
  const yara      = yaraMessage(score);

  const goHome = () =>
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'MainApp' }] })
    );

  const goAgain = () => navigation.goBack();
  const goFlappyBird = () => navigation.navigate('FlappyBirdGame');

  // ── Loading screen while DB confirms save ──────────────────
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

        {/* ── TROPHY HEADER ── */}
        <Animated.View
          style={[s.header, { opacity: trophyOpacity, transform: [{ scale: trophyScale }] }]}
        >
          <View style={[s.trophyCircle, GLOW(C.lime, 24)]}>
            <Text style={s.trophyEmoji}>🏆</Text>
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

        {/* ── MAIN STATS CARD ── */}
        <Animated.View
          style={[s.card, { opacity: cardOpacity, transform: [{ translateY: cardSlide }] }]}
        >
          {/* Top row: Total Reps + Form Ring */}
          <View style={s.heroRow}>
            <View style={s.heroRepsBlock}>
              <Text style={s.heroRepsLabel}>TOTAL REPS</Text>
              <Text style={[s.heroRepsNum, GLOW(C.lime, 12)]}>{reps}</Text>
              <Text style={s.heroRepsSub}>perfect reps</Text>
            </View>
            <View style={s.ringBlock}>
              <FormRing score={score} color={ringColor} />
            </View>
          </View>

          <View style={s.divider} />

          {/* Calories Earned */}
          <View style={s.statRow}>
            <View style={s.statLeft}>
              <Ionicons name="flame" size={16} color={C.amber} />
              <View>
                <Text style={s.statLabel}>Calories Earned</Text>
                <Text style={s.statSublabel}>Added back to your daily budget</Text>
              </View>
            </View>
            <Text style={[s.statVal, { color: C.amber }]}>{calories} kcal</Text>
          </View>

          <View style={s.divider} />

          {/* Duration */}
          <View style={s.statRow}>
            <View style={s.statLeft}>
              <Ionicons name="time-outline" size={16} color={C.purple} />
              <Text style={s.statLabel}>Duration</Text>
            </View>
            <Text style={[s.statVal, { color: C.purple }]}>{fmtTime(elapsed)}</Text>
          </View>

          {/* XP row */}
          <View style={s.xpRow}>
            <Ionicons name="star" size={13} color={C.lime} />
            <Text style={s.xpTxt}>+{xp} XP earned this session</Text>
          </View>
        </Animated.View>

        {/* ── YARA AI CARD ── */}
        <Animated.View
          style={[s.yaraCard, { opacity: yaraOpacity, transform: [{ translateY: yaraSlide }] }]}
        >
          <View style={s.yaraHeader}>
            <View style={[s.yaraAvatar, GLOW(C.purple, 10)]}>
              <Text style={s.yaraEmoji}>🤖</Text>
            </View>
            <View>
              <Text style={s.yaraName}>Yara AI Coach</Text>
              <View style={[s.yaraTagPill, { backgroundColor: `${ringColor}22`, borderColor: `${ringColor}55` }]}>
                <Text style={[s.yaraTagTxt, { color: ringColor }]}>{yara.tag}</Text>
              </View>
            </View>
          </View>
          <Text style={s.yaraMsg}>"{yara.msg}"</Text>
        </Animated.View>

        {/* ── ACTIONS ── */}
        <Animated.View style={[s.actionsWrap, { opacity: actionsOpacity }]}>
          <TouchableOpacity style={s.gameBtn} onPress={goFlappyBird}>
            <Ionicons name="game-controller" size={15} color={C.lime} style={{ marginRight: 8 }} />
            <Text style={s.gameBtnTxt}>Play Flappy Bird</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.homeBtn, GLOW(C.purple, 14)]} onPress={goHome}>
            <Ionicons name="home" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.homeBtnTxt}>Back to Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.againBtn} onPress={goAgain}>
            <Ionicons name="refresh" size={14} color={C.sub} style={{ marginRight: 6 }} />
            <Text style={s.againBtnTxt}>Repeat Workout</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  scroll:        { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24, alignItems: 'center' },
  loadingScreen: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  loadingTxt:    { color: C.sub, marginTop: 14, fontSize: FS.btnPrimary, fontWeight: '600' },

  // ── Header ──────────────────────────────────────────────────
  header:       { alignItems: 'center', width: '100%', marginBottom: 4 },
  trophyCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: C.lime,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  trophyEmoji:  { fontSize: 42 },
  doneLabel:    { color: C.lime, fontSize: FS.sub, fontWeight: '900', letterSpacing: 3, marginBottom: 8 },
  workoutName:  { color: C.text, fontSize: FS.screenTitle, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  timestamp:    { color: C.sub, fontSize: FS.btnSecondary, marginTop: 6 },

  // ── Perforated divider ──────────────────────────────────────
  perfRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 22 },
  perfDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  perfLine:{ flex: 1, borderTopWidth: 1, borderColor: C.border, borderStyle: 'dashed', marginHorizontal: -1 },

  // ── Stats card ───────────────────────────────────────────────
  card: {
    backgroundColor: C.card, borderRadius: 26, width: '100%',
    borderWidth: 1, borderColor: C.border, marginBottom: 14,
    overflow: 'hidden',
  },

  // Hero row: reps + form ring
  heroRow:       { flexDirection: 'row', alignItems: 'center', padding: 24, paddingBottom: 20 },
  heroRepsBlock: { flex: 1 },
  heroRepsLabel: { color: C.sub, fontSize: FS.label, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  heroRepsNum:   { color: C.lime, fontSize: FS.hero, fontWeight: '900', lineHeight: 90, letterSpacing: -4 },
  heroRepsSub:   { color: C.sub, fontSize: FS.sub, marginTop: 2 },
  ringBlock:     { alignItems: 'center', justifyContent: 'center', paddingLeft: 12 },

  // Stat rows
  divider:       { height: 1, backgroundColor: C.border, marginHorizontal: 20 },
  statRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  statLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statLabel:     { color: '#B0A8CC', fontSize: FS.btnPrimary, fontWeight: '600' },
  statSublabel:  { color: C.sub, fontSize: FS.label, marginTop: 2 },
  statVal:       { fontSize: FS.cardTitle, fontWeight: '900', letterSpacing: -0.5 },

  xpRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 4, marginBottom: 18,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border,
  },
  xpTxt: { color: C.lime, fontSize: FS.body, fontWeight: '700' },

  // ── Yara card ────────────────────────────────────────────────
  yaraCard:    {
    backgroundColor: C.card, borderRadius: 22, padding: 20,
    width: '100%', borderWidth: 1, borderColor: C.border, marginBottom: 20,
  },
  yaraHeader:  { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  yaraAvatar:  {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center',
  },
  yaraEmoji:   { fontSize: 22 },
  yaraName:    { color: C.text, fontSize: FS.btnPrimary, fontWeight: '800', marginBottom: 5 },
  yaraTagPill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  yaraTagTxt:  { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  yaraMsg:     { color: '#C9C2DF', fontSize: FS.btnPrimary, lineHeight: 23, fontStyle: 'italic' },

  // ── Actions ──────────────────────────────────────────────────
  actionsWrap: { width: '100%', gap: 10 },
  gameBtn: {
    backgroundColor: C.card,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${C.lime}55`,
  },
  gameBtnTxt: { color: C.lime, fontSize: FS.btnPrimary, fontWeight: '800' },
  homeBtn:     {
    backgroundColor: C.purple, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
  },
  homeBtnTxt:  { color: '#fff', fontSize: FS.bodyLarge, fontWeight: '900' },
  againBtn:    {
    backgroundColor: C.card, borderRadius: 16, paddingVertical: 15,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  againBtnTxt: { color: C.sub, fontSize: FS.btnPrimary, fontWeight: '700' },
});
