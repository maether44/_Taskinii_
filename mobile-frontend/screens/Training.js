import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, Modal, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Reanimated, {
  FadeInDown,
  useSharedValue, useAnimatedStyle, withSpring, interpolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import Svg, { Ellipse, Rect, Circle, Path } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
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

const QUICK_ACTIONS = [
  { icon: 'search',            label: 'Library',   screen: 'ExerciseList' },
  { icon: 'scan-outline',      label: 'PostureAI', screen: 'PostureAI'    },
  { icon: 'analytics-outline', label: 'Progress',  screen: 'Insights'     },
];

// ── Machine Intelligence Hub Data ────────────────────────────
const GYM_EQUIPMENT = [
  {
    id:           'smithMachine',
    name:         'Smith Machine',
    icon:         'barbell-outline',
    primaryMuscle:'Quads · Glutes',
    exerciseKey:  'squat',
    setup: [
      'Set the bar at mid-chest height when standing.',
      'Step under the bar, feet shoulder-width, toes slightly out.',
      'Unrack by rotating the bar forward.',
      'Descend until thighs are parallel. Keep knees tracking over toes.',
    ],
    activation:
      'At the bottom, feel your glutes fully loaded. Drive through your heels — consciously squeeze your glutes hard at the top lockout for a 1-second pause.',
    alternatives: [
      { name: 'Goblet Squat', icon: 'fitness-outline' },
      { name: 'DB Split Squat', icon: 'body-outline' },
    ],
  },
  {
    id:           'legPress',
    name:         'Leg Press',
    icon:         'footsteps-outline',
    primaryMuscle:'Quads · Hamstrings',
    exerciseKey:  'squat',
    setup: [
      'Adjust seat so knees are at 90° with feet on platform.',
      'Place feet hip-width apart, mid-platform.',
      'Keep lower back flat against the pad throughout.',
      'Do NOT lock out knees at the top — keep slight tension.',
    ],
    activation:
      'Focus on the outer quad sweep. Push through the entire foot evenly. On the way back down, control the weight — that eccentric load is where the muscle grows.',
    alternatives: [
      { name: 'DB Bulgarian Split Squat', icon: 'body-outline' },
      { name: 'DB Step-Up', icon: 'fitness-outline' },
    ],
  },
  {
    id:           'latPulldown',
    name:         'Lat Pulldown',
    icon:         'arrow-down-circle-outline',
    primaryMuscle:'Lats · Biceps',
    exerciseKey:  'bicepCurl',
    setup: [
      'Adjust thigh pad to lock hips firmly in place.',
      'Grip bar slightly wider than shoulder-width, overhand.',
      'Lean back 10–15° — this is your fixed position throughout.',
      'Depress your shoulder blades before each pull.',
    ],
    activation:
      'Initiate every rep by pulling your elbows DOWN and BACK — not your hands. Think "elbows to hip pockets." You should feel a deep stretch in your lats at full extension.',
    alternatives: [
      { name: 'DB Single-Arm Row', icon: 'barbell-outline' },
      { name: 'DB Pullover', icon: 'fitness-outline' },
    ],
  },
  {
    id:           'chestPress',
    name:         'Chest Press',
    icon:         'expand-outline',
    primaryMuscle:'Chest · Triceps',
    exerciseKey:  'pushup',
    setup: [
      'Adjust seat so handles are at mid-chest height.',
      'Sit tall — lower back lightly against the pad.',
      'Grip handles with wrists straight, elbows at 75° (not flared to 90°).',
      'Keep shoulder blades pinched together for the entire set.',
    ],
    activation:
      'As you press, imagine trying to bring your elbows together. Squeeze your pecs hard at full extension — hold 1 second. Feel the inner chest fibers contract.',
    alternatives: [
      { name: 'DB Bench Press', icon: 'barbell-outline' },
      { name: 'DB Chest Fly', icon: 'expand-outline' },
    ],
  },
  {
    id:           'cableRow',
    name:         'Cable Row',
    icon:         'swap-horizontal-outline',
    primaryMuscle:'Back · Rear Delts',
    exerciseKey:  'deadlift',
    setup: [
      'Set pulley to hip height. Use a close-grip V-bar attachment.',
      'Sit upright, knees slightly bent, feet on platforms.',
      'Start with arms extended — feel a full lat stretch.',
      'Do NOT lean back more than 10° to initiate the pull.',
    ],
    activation:
      'Drive elbows back past your torso. At the peak contraction, squeeze your shoulder blades hard together for 2 seconds. Your mid-back should feel on fire.',
    alternatives: [
      { name: 'DB Bent-Over Row', icon: 'barbell-outline' },
      { name: 'DB Pendlay Row', icon: 'fitness-outline' },
    ],
  },
  {
    id:           'shoulderPress',
    name:         'Shoulder Press',
    icon:         'arrow-up-circle-outline',
    primaryMuscle:'Shoulders · Triceps',
    exerciseKey:  'shoulderPress',
    setup: [
      'Adjust seat so handles are at ear/jaw height.',
      'Sit with lower back flush against the pad.',
      'Grip handles with palms facing forward, wrists neutral.',
      'Keep core tight — avoid arching your lower back at the top.',
    ],
    activation:
      'Press through the heel of your palm. At the top, shrug slightly — feel the lateral head of the shoulder squeeze. Lower slowly over 3 counts to maximise deltoid activation.',
    alternatives: [
      { name: 'DB Arnold Press', icon: 'fitness-outline' },
      { name: 'DB Lateral Raise', icon: 'body-outline' },
    ],
  },
  {
    id:           'legCurl',
    name:         'Leg Curl',
    icon:         'walk-outline',
    primaryMuscle:'Hamstrings',
    exerciseKey:  'lunge',
    setup: [
      'Adjust pad so it rests just above the heel, not on the ankle.',
      'Lie face-down, hips pressed into the bench.',
      'Hold handles to stabilise — do not lift your hips.',
      'Keep toes pointed slightly inward to target bicep femoris.',
    ],
    activation:
      'Curl through a full range — bring heels toward your glutes. At peak, squeeze hamstrings for a hard 1-second hold. Lower over 3 counts — the eccentric is where the strength gains live.',
    alternatives: [
      { name: 'DB Romanian Deadlift', icon: 'barbell-outline' },
      { name: 'DB Nordic Curl (assisted)', icon: 'body-outline' },
    ],
  },
  {
    id:           'cableBicepCurl',
    name:         'Cable Curl',
    icon:         'hand-right-outline',
    primaryMuscle:'Biceps · Forearms',
    exerciseKey:  'bicepCurl',
    setup: [
      'Set pulley to lowest pin. Use a straight or EZ bar attachment.',
      'Stand one step back from the machine, arms fully extended.',
      'Pin your elbows to your sides — they must NOT move.',
      'Supinate your wrists at the top (rotate pinky up).',
    ],
    activation:
      'At full contraction, your wrists should be supinated with knuckles facing the ceiling. Squeeze the peak of your bicep hard for 1 second. The constant cable tension keeps the muscle under load even at the bottom.',
    alternatives: [
      { name: 'DB Alternating Curl', icon: 'fitness-outline' },
      { name: 'DB Hammer Curl', icon: 'barbell-outline' },
    ],
  },
];

// ── Fatigue → color / label ──────────────────────────────────
function fatigueColor(pct) {
  if (pct >= 70) return '#7C5CFC';
  if (pct >= 30) return '#FF9500';
  return '#C8F135';
}
function fatigueLabel(pct) {
  if (pct >= 70) return 'FATIGUED';
  if (pct >= 30) return 'SORE';
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

// ── Body Silhouette SVG ──────────────────────────────────────
function BodySilhouette({ fatigueMap }) {
  const colorOf = (muscleId) => {
    const entry = fatigueMap[muscleId];
    if (!entry) return UNTRAINED;
    return fatigueColor(entry.fatigue_pct);
  };

  return (
    <Svg width={120} height={265} viewBox="0 0 120 265">
      <Circle cx={60} cy={18} r={14} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={55} y={31} width={10} height={11} rx={4} fill="#1A1538" />
      <Rect x={28} y={40} width={64} height={98} rx={12} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={10} y={46} width={18} height={60} rx={9} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={92} y={46} width={18} height={60} rx={9} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={11} y={104} width={15} height={50} rx={7} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={94} y={104} width={15} height={50} rx={7} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={31} y={136} width={26} height={72} rx={13} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={63} y={136} width={26} height={72} rx={13} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={33} y={205} width={22} height={55} rx={11} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      <Rect x={65} y={205} width={22} height={55} rx={11} fill="#1A1538" stroke="#2A2550" strokeWidth={1} />
      {BODY_SPOTS.map((s, i) => (
        <Ellipse
          key={i}
          cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
          fill={colorOf(s.id)}
          opacity={colorOf(s.id) === UNTRAINED ? 0.6 : 0.75}
        />
      ))}
      <Circle cx={55} cy={15} r={2} fill="rgba(255,255,255,0.15)" />
      <Circle cx={65} cy={15} r={2} fill="rgba(255,255,255,0.15)" />
      <Path d="M55 22 Q60 26 65 22" stroke="rgba(255,255,255,0.15)" strokeWidth={1} fill="none" />
    </Svg>
  );
}

// ── Machine Card ─────────────────────────────────────────────
function MachineCard({ machine, onPress }) {
  return (
    <TouchableOpacity
      style={s.machineCard}
      onPress={() => onPress(machine)}
      activeOpacity={0.82}
    >
      {/* Lime glow behind icon */}
      <View style={s.machineIconWrap}>
        <Ionicons
          name={machine.icon}
          size={32}
          color={C.lime}
          style={{ shadowColor: C.lime, shadowOpacity: 0.9, shadowRadius: 14 }}
        />
      </View>
      <Text style={s.machineName}>{machine.name}</Text>
      <Text style={s.machineMuscle}>{machine.primaryMuscle}</Text>
      <View style={s.machineAiBadge}>
        <Ionicons name="sparkles" size={9} color={C.lime} />
        <Text style={s.machineAiTxt}> AI READY</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Machine Intelligence Modal ────────────────────────────────
function MachineModal({ machine, visible, onClose, onAnalyze }) {
  const prog = useSharedValue(0);
  const [showAlts, setShowAlts] = useState(false);

  const cardStyle = useAnimatedStyle(() => ({
    opacity:   interpolate(prog.value, [0, 0.4, 1], [0, 1, 1]),
    transform: [{ scale: interpolate(prog.value, [0, 1], [0.86, 1]) }],
  }));

  // Animate in/out when visible changes
  React.useEffect(() => {
    if (visible) {
      setShowAlts(false);
      prog.value = withSpring(1, { damping: 16, stiffness: 200, mass: 0.8 });
    } else {
      prog.value = withSpring(0, { damping: 20, stiffness: 260 });
    }
  }, [visible]);

  if (!machine) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={s.modalBackdrop} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <Reanimated.View style={[s.modalCard, cardStyle]}>
            <BlurView intensity={92} tint="dark" style={StyleSheet.absoluteFillObject} />

            {/* Lime top accent line */}
            <View style={s.modalAccent} />

            {/* Header */}
            <View style={s.modalHeader}>
              <View style={s.modalIconWrap}>
                <Ionicons
                  name={machine.icon}
                  size={26}
                  color={C.lime}
                  style={{ shadowColor: C.lime, shadowOpacity: 1, shadowRadius: 12 }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>{machine.name}</Text>
                <Text style={s.modalMuscle}>{machine.primaryMuscle}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={s.modalClose}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* ── OPTIMAL SETUP ── */}
              <View style={s.modalSection}>
                <View style={s.modalSectionHeader}>
                  <Ionicons name="settings-outline" size={13} color={C.lime} />
                  <Text style={s.modalSectionTitle}>OPTIMAL SETUP</Text>
                </View>
                {machine.setup.map((step, i) => (
                  <View key={i} style={s.setupRow}>
                    <View style={s.setupNum}>
                      <Text style={s.setupNumTxt}>{i + 1}</Text>
                    </View>
                    <Text style={s.setupTxt}>{step}</Text>
                  </View>
                ))}
              </View>

              {/* ── MUSCLE ACTIVATION ── */}
              <View style={s.modalSection}>
                <View style={s.modalSectionHeader}>
                  <Ionicons name="flash-outline" size={13} color={C.purple} />
                  <Text style={[s.modalSectionTitle, { color: C.accent }]}>MUSCLE ACTIVATION</Text>
                </View>
                <View style={s.activationBox}>
                  <Text style={s.activationTxt}>"{machine.activation}"</Text>
                </View>
              </View>

              {/* ── SMART PIVOT ── */}
              <View style={s.modalSection}>
                <TouchableOpacity
                  style={[s.pivotBtn, showAlts && s.pivotBtnActive]}
                  onPress={() => setShowAlts(v => !v)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={15}
                    color={showAlts ? C.bg : C.lime}
                  />
                  <Text style={[s.pivotBtnTxt, showAlts && { color: C.bg }]}>
                    {showAlts ? 'Hide Alternatives' : 'Machine Busy?'}
                  </Text>
                </TouchableOpacity>

                {showAlts && (
                  <Reanimated.View entering={FadeInDown.duration(240).springify()}>
                    <Text style={s.altHeading}>Dumbbell Alternatives</Text>
                    {machine.alternatives.map((alt, i) => (
                      <View key={i} style={s.altRow}>
                        <View style={s.altIcon}>
                          <Ionicons name={alt.icon} size={16} color={C.lime} />
                        </View>
                        <Text style={s.altName}>{alt.name}</Text>
                        <View style={s.altBadge}>
                          <Text style={s.altBadgeTxt}>DUMBBELL</Text>
                        </View>
                      </View>
                    ))}
                  </Reanimated.View>
                )}
              </View>

              {/* ── ANALYZE FORM CTA ── */}
              <TouchableOpacity
                style={s.analyzeBtn}
                onPress={() => onAnalyze(machine)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[C.lime, '#A8D020']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.analyzeBtnGradient}
                >
                  <Ionicons name="scan-outline" size={18} color="#000" />
                  <Text style={s.analyzeBtnTxt}>Analyze Form</Text>
                  <Ionicons name="arrow-forward" size={16} color="#000" />
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>

            {/* Lime border overlay */}
            <View style={s.modalBorder} pointerEvents="none" />
          </Reanimated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────
export default function Training({ navigation }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good Morning' :
    hour < 18 ? 'Good Afternoon' :
    'Good Evening';

  const [fatigueMap,     setFatigueMap]     = useState({});
  const [fatigueList,    setFatigueList]    = useState([]);
  const [fatigueLoading, setFatigueLoading] = useState(true);
  const [weekDays,       setWeekDays]       = useState(Array(7).fill(false));
  const [streakCount,    setStreakCount]     = useState(0);
  const [recoveryPct,    setRecoveryPct]    = useState(100);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [modalVisible,    setModalVisible]    = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const rows = await getMuscleFatigue(user.id);
      const map = {};
      rows.forEach(r => { map[r.muscle_name] = r; });
      setFatigueMap(map);
      setFatigueList(rows);
      setRecoveryPct(
        rows.length === 0
          ? 100
          : Math.round(rows.reduce((s, m) => s + (100 - m.fatigue_pct), 0) / rows.length)
      );

      const today = new Date();
      const dow = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 7);

      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', monday.toISOString())
        .lt('created_at', sunday.toISOString());

      const doneSet = new Set(
        (sessions ?? []).map(s => new Date(s.created_at).toISOString().split('T')[0])
      );
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return doneSet.has(d.toISOString().split('T')[0]);
      });
      setWeekDays(days);
      setStreakCount(days.filter(Boolean).length);

    } catch (e) {
      console.warn('[BodyQ] Training fetch:', e);
    } finally {
      setFatigueLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleNav = (screen) => { if (screen) navigation.navigate(screen); };

  const topFatigued = fatigueList.find(m => m.fatigue_pct >= 70);

  const openMachineModal = useCallback((machine) => {
    setSelectedMachine(machine);
    setModalVisible(true);
  }, []);

  const closeMachineModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleAnalyzeForm = useCallback((machine) => {
    setModalVisible(false);
    setTimeout(() => {
      navigation.navigate('WorkoutActive', { exerciseName: machine.exerciseKey });
    }, 300);
  }, [navigation]);

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── HEADER ── */}
        <Reanimated.View entering={FadeInDown.delay(0).springify()} style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting},</Text>
            <Text style={s.subGreeting}>Your studio is ready.</Text>
          </View>
          <View style={[s.recoveryBadge, SHADOW]}>
            <Text style={s.recoveryNum}>{recoveryPct}%</Text>
            <Text style={s.recoveryLabel}>RECOVERY</Text>
          </View>
        </Reanimated.View>

        {/* ── HERO CARD ── */}
        <Reanimated.View entering={FadeInDown.delay(100).springify()}>
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
        </Reanimated.View>

        {/* ── RECOVERY STATUS ── */}
        <Reanimated.View entering={FadeInDown.delay(150).springify()}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Recovery Status</Text>
            <Text style={s.sectionSub}>Last 48 hrs</Text>
          </View>

          <View style={[s.heatmapCard, SHADOW]}>
            <View style={s.heatmapBody}>
              <BodySilhouette fatigueMap={fatigueMap} />
            </View>
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

          {fatigueList.length > 0 && (
            <LinearGradient
              colors={['#7C5CFC', '#4A2FC8']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[s.yaraCard, SHADOW]}
            >
              <View style={s.yaraHeader}>
                <Text style={s.yaraTitle}>YARA INSIGHT</Text>
                <View style={s.yaraLiveDot} />
              </View>
              <Text style={s.yaraText}>
                {topFatigued
                  ? `"Your ${topFatigued.muscle_name} are at ${topFatigued.fatigue_pct}% fatigue. I recommend ${topFatigued.fatigue_pct >= 70 ? 'a rest day or Upper Body' : 'lighter work'} for your next session."`
                  : `"All muscles are recovering well. You're ready for a full session today!"`}
              </Text>
            </LinearGradient>
          )}
        </Reanimated.View>

        {/* ── 7-DAY STREAK ── */}
        <Reanimated.View entering={FadeInDown.delay(200).springify()} style={[s.streakCard, SHADOW]}>
          <View style={s.streakHeader}>
            <Ionicons name="flame" size={16} color={C.lime} />
            <Text style={s.streakTitle}>Consistency</Text>
            <Text style={s.streakSub}>{streakCount} / 7 days</Text>
          </View>
          <View style={s.weekRow}>
            {WEEK.map((day, i) => {
              const done = weekDays[i];
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
        </Reanimated.View>

        {/* ── QUICK ACTIONS ── */}
        <Reanimated.View entering={FadeInDown.delay(250).springify()} style={s.actionRow}>
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
        </Reanimated.View>

        {/* ══ MACHINE INTELLIGENCE HUB ══════════════════════════ */}
        <Reanimated.View entering={FadeInDown.delay(290).springify()}>
          <View style={s.sectionRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Text style={s.sectionTitle}>Machine Intelligence</Text>
              <View style={s.hubBadge}>
                <Text style={s.hubBadgeTxt}>HUB</Text>
              </View>
            </View>
            <Text style={s.sectionSub}>Tap any machine</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.machineScroll}
            decelerationRate="fast"
            snapToInterval={148}
          >
            {GYM_EQUIPMENT.map((machine) => (
              <MachineCard
                key={machine.id}
                machine={machine}
                onPress={openMachineModal}
              />
            ))}
          </ScrollView>
        </Reanimated.View>

        {/* ── PERFORMANCE LIBRARY ── */}
        <Reanimated.View entering={FadeInDown.delay(300).springify()} style={{ marginTop: 4 }}>
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
        </Reanimated.View>

        {/* ── POSTURE AI CARD ── */}
        <Reanimated.View entering={FadeInDown.delay(350).springify()} style={{ marginTop: 14 }}>
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
        </Reanimated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ══ MACHINE INTELLIGENCE MODAL ══════════════════════════ */}
      <MachineModal
        machine={selectedMachine}
        visible={modalVisible}
        onClose={closeMachineModal}
        onAnalyze={handleAnalyzeForm}
      />

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

  // Heatmap
  heatmapCard:    { backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.border, flexDirection: 'row', padding: 16, marginBottom: 10 },
  heatmapBody:    { alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  heatmapList:    { flex: 1, justifyContent: 'center', gap: 6 },
  heatmapLoading: { color: C.sub, fontSize: 12, fontStyle: 'italic' },
  heatmapEmpty:   { color: C.text, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  heatmapEmptySub:{ color: C.lime, fontSize: 11, marginTop: 4, lineHeight: 16 },
  muscleRow:     { flexDirection: 'row', alignItems: 'center', gap: 7 },
  muscleDot:     { width: 8, height: 8, borderRadius: 4 },
  muscleName:    { color: C.text, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  muscleBarBg:   { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'visible' },
  muscleBarFill: { height: 4, borderRadius: 2 },
  muscleTag:     { fontSize: 8, fontWeight: '900', letterSpacing: 0.5, minWidth: 52, textAlign: 'right' },
  legend:      { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:   { width: 7, height: 7, borderRadius: 3.5 },
  legendTxt:   { color: C.sub, fontSize: 9, fontWeight: '700' },

  // Yara
  yaraCard:    { borderRadius: 18, padding: 16, marginBottom: 4 },
  yaraHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  yaraTitle:   { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  yaraLiveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#C8F135', shadowColor: '#C8F135', shadowRadius: 8, shadowOpacity: 1 },
  yaraText:    { color: '#FFF', fontSize: 13, lineHeight: 20, fontWeight: '500' },

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

  // ── Machine Intelligence Hub ─────────────────────────────
  hubBadge:     { backgroundColor: 'rgba(200,241,53,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(200,241,53,0.3)' },
  hubBadgeTxt:  { color: C.lime, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  machineScroll:{ paddingHorizontal: 0, paddingBottom: 8, paddingRight: 20, gap: 12, flexDirection: 'row', marginBottom: 28 },

  machineCard: {
    width: 136,
    backgroundColor: C.bg,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: C.lime,
    alignItems: 'center',
    ...SHADOW,
    shadowColor: C.lime,
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  machineIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(200,241,53,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(200,241,53,0.22)',
    shadowColor: C.lime,
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  machineName:   { color: C.text, fontSize: 12, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  machineMuscle: { color: C.sub, fontSize: 10, textAlign: 'center', marginBottom: 10 },
  machineAiBadge:{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(200,241,53,0.08)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  machineAiTxt:  { color: C.lime, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },

  // ── Modal ────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  modalCard: {
    borderRadius: 28,
    overflow: 'hidden',
    maxHeight: '88%',
    ...SHADOW,
    shadowColor: C.lime,
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  modalAccent: {
    height: 3,
    backgroundColor: C.lime,
    marginHorizontal: 40,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    marginBottom: 0,
  },
  modalBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(200,241,53,0.4)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    paddingBottom: 16,
  },
  modalIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(200,241,53,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200,241,53,0.25)',
  },
  modalTitle:  { color: C.text, fontSize: 18, fontWeight: '900' },
  modalMuscle: { color: C.lime, fontSize: 11, fontWeight: '700', marginTop: 2 },
  modalClose:  { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },

  modalSection: { paddingHorizontal: 20, paddingBottom: 20 },
  modalSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  modalSectionTitle:  { color: C.lime, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },

  // Setup steps
  setupRow: { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
  setupNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(200,241,53,0.12)',
    borderWidth: 1, borderColor: 'rgba(200,241,53,0.35)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  setupNumTxt: { color: C.lime, fontSize: 10, fontWeight: '900' },
  setupTxt:    { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 19, flex: 1 },

  // Activation box
  activationBox: {
    backgroundColor: 'rgba(124,92,252,0.1)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.3)',
  },
  activationTxt: { color: C.accent, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

  // Smart Pivot
  pivotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: C.lime,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  pivotBtnActive:  { backgroundColor: C.lime },
  pivotBtnTxt:     { color: C.lime, fontSize: 13, fontWeight: '800' },
  altHeading:      { color: C.sub, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 14, marginBottom: 8 },
  altRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  altIcon:         { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(200,241,53,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(200,241,53,0.2)' },
  altName:         { color: C.text, fontSize: 13, fontWeight: '700', flex: 1 },
  altBadge:        { backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  altBadgeTxt:     { color: C.sub, fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },

  // Analyze CTA
  analyzeBtn:          { marginHorizontal: 20, marginTop: 4, borderRadius: 18, overflow: 'hidden' },
  analyzeBtnGradient:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  analyzeBtnTxt:       { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },

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
