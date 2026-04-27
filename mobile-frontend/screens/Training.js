import React, { useState, useCallback, useRef } from 'react';
import { FS } from '../constants/typography';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, Modal, Pressable, Image, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Reanimated, {
  FadeInDown,
  useSharedValue, useAnimatedStyle, withSpring, interpolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { getMuscleFatigue } from '../services/workoutService';
import { useAuth } from '../context/AuthContext';
import { AppEvents, emit, on } from '../lib/eventBus';
import { warn, log } from '../lib/logger';
import { loadPlan, generatePlan } from '../services/aiPlanService';
import { mediumTap } from '../lib/haptics';
import {
  STREAK_MILESTONES, WEEK, COMBINED_EQUIPMENT, PLAN_CIRCUITS,
  BODY_SPOTS, fatigueColor, fatigueLabel, C, SHADOW,
} from '../data/trainingData';
import BodySilhouette from '../components/training/BodySilhouette';
import MachineCard from '../components/training/MachineCard';

const { width } = Dimensions.get('window');

// ── Uniform Section Header ────────────────────────────────────
function SectionHeader({ title, sub }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionHeaderTxt}>{title}</Text>
      {sub ? <Text style={s.sectionHeaderSub}>{sub}</Text> : null}
    </View>
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
  const { user: authUser } = useAuth();
  const authUserId = authUser?.id ?? null;
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
  const prevStreakRef = useRef(0);
  const [recoveryPct,    setRecoveryPct]    = useState(100);
  const [selectedMachine,  setSelectedMachine]  = useState(null);
  const [modalVisible,     setModalVisible]     = useState(false);
  const [overloadTip,      setOverloadTip]      = useState(null);
  const [nutritionTip,     setNutritionTip]     = useState(null);
  const [selectedMuscle,   setSelectedMuscle]   = useState(null);
  const [environment,      setEnvironment]      = useState('gym');  // 'gym' | 'home'
  const [todayPlan,        setTodayPlan]        = useState([]);
  const machineScrollRef = useRef(null);
  const [recommendation,   setRecommendation]   = useState({
    title: 'Full Body\nStrength', duration: '25 min', kcal: '280 kcal',
    focus: 'Strength Focus', exerciseKey: 'squat',
    reason: '"Based on your current fitness status — let\'s push today."',
  });
  const [aiPlan,           setAiPlan]           = useState(null);   // full AI plan object
  const [aiPlanLoading,    setAiPlanLoading]    = useState(false);
  const [aiPlanDate,       setAiPlanDate]       = useState(null);   // when the plan was generated

  const loadData = useCallback(async () => {
    if (!authUserId) return;
    try {
      // ── 0. Environment preference from profiles ───────────
      const { data: profile } = await supabase
        .from('profiles')
        .select('environment')
        .eq('id', authUserId)
        .maybeSingle();
      if (profile?.environment) setEnvironment(profile.environment);

      // ── 0b. Load saved AI training plan ────────────────────
      const saved = await loadPlan(authUserId);
      if (saved?.plan_json?.days?.length) {
        setAiPlan(saved.plan_json);
        setAiPlanDate(saved.created_at);
      }

      // ── 1. Muscle fatigue ──────────────────────────────────
      const rows = await getMuscleFatigue(authUserId);
      const map = {};
      rows.forEach(r => { map[r.muscle_name] = r; });
      setFatigueMap(map);
      setFatigueList(rows);
      const recPct = rows.length === 0
        ? 100
        : Math.round(rows.reduce((s, m) => s + (100 - m.fatigue_pct), 0) / rows.length);
      setRecoveryPct(recPct);

      // ── 2. Sleep today ─────────────────────────────────────
      const TODAY_STR = new Date().toISOString().split('T')[0];
      const { data: activityRow } = await supabase
        .from('daily_activity')
        .select('sleep_hours')
        .eq('user_id', authUserId)
        .eq('date', TODAY_STR)
        .maybeSingle();
      const sleepHours = activityRow?.sleep_hours ?? null;

      // ── 3. Smart recommendation logic ──────────────────────
      const topFatigued = rows.find(m => m.fatigue_pct >= 70);
      const lowSleep    = sleepHours !== null && sleepHours < 6;

      if (lowSleep) {
        setRecommendation({
          title: 'Recovery &\nMobility',
          duration: '18 min', kcal: '120 kcal', focus: 'Active Recovery',
          exerciseKey: 'plank',
          reason: `"Only ${sleepHours}h of sleep detected. Low-intensity mobility will help you recover faster."`,
        });
      } else if (topFatigued) {
        const muscle = topFatigued.muscle_name;
        const isLower = ['Quads','Hamstrings','Glutes','Calves'].includes(muscle);
        setRecommendation({
          title: isLower ? 'Upper Body\nFocus' : 'Lower Body\nFocus',
          duration: '22 min', kcal: '210 kcal',
          focus: isLower ? 'Upper Body' : 'Lower Body',
          exerciseKey: isLower ? 'shoulderPress' : 'squat',
          reason: `"Your ${muscle} are at ${topFatigued.fatigue_pct}% fatigue. Switching to ${isLower ? 'upper body' : 'lower body'} today is the smart move."`,
        });
      } else {
        setRecommendation({
          title: 'Full Body\nStrength',
          duration: '25 min', kcal: '280 kcal', focus: 'Strength Focus',
          exerciseKey: 'squat',
          reason: '"All muscles are fresh and recovery is strong — push hard today."',
        });
      }

      // ── 3b. Build Today's Plan from AI plan or fallback circuits ──
      let circuit;
      const currentSaved = saved?.plan_json;
      if (currentSaved?.days?.length) {
        // Use the AI plan — pick today's day (cycle through plan days by weekday)
        const dow = new Date().getDay(); // 0=Sun, 1=Mon...
        const adjustedDow = dow === 0 ? 6 : dow - 1; // 0=Mon, 6=Sun
        const aiDay = currentSaved.days[adjustedDow % currentSaved.days.length];
        // Map AI plan exercises to the circuit format
        circuit = (aiDay.exercises || []).slice(0, 5).map((ex) => ({
          name:   ex.name,
          icon:   'barbell-outline',
          key:    ex.name.toLowerCase().replace(/\s+/g, '_'),
          sets:   typeof ex.sets === 'number' ? `${ex.sets}×${ex.reps}` : `${ex.sets}`,
          target: aiDay.focus || '',
        }));
        // Update recommendation to reflect the AI day
        setRecommendation(prev => ({
          ...prev,
          title: aiDay.name?.replace(/\s+/g, '\n') || prev.title,
          focus: aiDay.focus || prev.focus,
          reason: aiDay.coachTip ? `"${aiDay.coachTip}"` : prev.reason,
        }));
      } else {
        const planKey = lowSleep ? 'recovery'
          : topFatigued
            ? (['Quads','Hamstrings','Glutes','Calves'].includes(topFatigued.muscle_name) ? 'upper' : 'lower')
            : 'strength';
        circuit = PLAN_CIRCUITS[planKey] || PLAN_CIRCUITS.strength;
      }

      // Fetch previous best for each circuit exercise
      const planWithBests = await Promise.all(circuit.map(async (ex) => {
        const { data: prev } = await supabase
          .from('workout_sessions')
          .select('notes, created_at')
          .eq('user_id', authUserId)
          .ilike('notes', `%${ex.key}%`)
          .order('created_at', { ascending: false })
          .limit(1);
        const note = prev?.[0]?.notes || '';
        const repM = note.match(/(\d+)\s*reps/i);
        const formM = note.match(/(\d+)%\s*form/i);
        return {
          ...ex,
          prevReps: repM ? parseInt(repM[1]) : null,
          prevForm: formM ? parseInt(formM[1]) : null,
        };
      }));
      setTodayPlan(planWithBests);

      // ── 4. Progressive overload: last 2 sessions for recommended exercise ──
      let chosenKey = 'squat';
      if (lowSleep) chosenKey = 'plank';
      else if (topFatigued) {
        const isLower = ['Quads','Hamstrings','Glutes','Calves'].includes(topFatigued.muscle_name);
        chosenKey = isLower ? 'shoulderPress' : 'squat';
      }

      const { data: pastSessions } = await supabase
        .from('workout_sessions')
        .select('notes, created_at')
        .eq('user_id', authUserId)
        .ilike('notes', `%${chosenKey}%`)
        .order('created_at', { ascending: false })
        .limit(2);

      if (pastSessions && pastSessions.length > 0) {
        const last = pastSessions[0];
        const formMatch = last.notes?.match(/(\d+)%\s*form/i);
        const repMatch  = last.notes?.match(/(\d+)\s*reps/i);
        const lastForm  = formMatch ? parseInt(formMatch[1]) : null;
        const lastReps  = repMatch  ? parseInt(repMatch[1])  : null;

        if (lastForm !== null && lastForm >= 85) {
          setOverloadTip(`Form was ${lastForm}%${lastReps ? ` for ${lastReps} reps` : ''} last time — add 2.5kg today for progressive overload!`);
        } else if (lastForm !== null && lastForm < 60) {
          setOverloadTip(`Form was ${lastForm}% last time — focus on technique before adding weight.`);
        } else {
          setOverloadTip(null);
        }
      } else {
        setOverloadTip(null);
      }

      // ── 5. This week's dots (Mon–Sun) ──────────────────────
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
        .eq('user_id', authUserId)
        .gte('created_at', monday.toISOString())
        .lt('created_at', sunday.toISOString());

      // Use local date string to avoid UTC off-by-one when user is ahead of UTC
      const toLocal = d => {
        const dt = new Date(d);
        return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
      };

      const weekDoneSet = new Set(
        (sessions ?? []).map(s => toLocal(s.created_at))
      );
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return weekDoneSet.has(toLocal(d));
      });
      setWeekDays(days);

      // ── 5. True consecutive streak ─────────────────────────
      const { data: allSessions } = await supabase
        .from('workout_sessions')
        .select('created_at')
        .eq('user_id', authUserId)
        .order('created_at', { ascending: false });

      const allDates = new Set(
        (allSessions ?? []).map(s => toLocal(s.created_at))
      );

      let streak = 0;
      const cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      // Allow streak to include today OR start from yesterday
      if (!allDates.has(toLocal(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
      }
      while (allDates.has(toLocal(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
      setStreakCount(streak);

      // Emit milestone event when crossing a new milestone (not on first load)
      if (
        prevStreakRef.current > 0 &&
        streak > prevStreakRef.current &&
        STREAK_MILESTONES.includes(streak)
      ) {
        emit(AppEvents.STREAK_MILESTONE, { streak });
      }
      prevStreakRef.current = streak;

      // ── 7. High-protein meal tip from today's food logs ────
      const { data: foodLogs } = await supabase
        .from('food_logs')
        .select('quantity_grams, foods(protein_per_100g, name)')
        .eq('user_id', authUserId)
        .gte('consumed_at', `${TODAY_STR}T00:00:00.000Z`)
        .lte('consumed_at', `${TODAY_STR}T23:59:59.999Z`);

      if (foodLogs && foodLogs.length > 0) {
        const totalProtein = foodLogs.reduce((sum, log) => {
          const p = log.foods?.protein_per_100g || 0;
          const q = log.quantity_grams || 100;
          return sum + Math.round(p * q / 100);
        }, 0);
        if (totalProtein >= 30) {
          setNutritionTip(`You've already hit ${totalProtein}g of protein today — muscles are fuelled. Push hard!`);
        } else if (totalProtein > 0) {
          setNutritionTip(`${totalProtein}g protein logged today. Aim for more before training for better recovery.`);
        } else {
          setNutritionTip(null);
        }
      } else {
        setNutritionTip(null);
      }

    } catch (e) {
      warn('[BodyQ] Training fetch:', e);
    } finally {
      setFatigueLoading(false);
    }
  }, [authUserId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // React to workout completion anywhere in the app
  React.useEffect(() => {
    const off = on(AppEvents.WORKOUT_COMPLETED, loadData);
    return off;
  }, [loadData]);

  const toggleEnvironment = useCallback(async (env) => {
    setEnvironment(env);
    if (!authUserId) return;
    try {
      await supabase.from('profiles').update({ environment: env }).eq('id', authUserId);
    } catch (e) { /* non-critical */ }
  }, [authUserId]);

  const handleMusclePress = useCallback((muscleId) => {
    setSelectedMuscle(muscleId);
    // Auto-scroll machine hub into view
    if (muscleId && machineScrollRef.current) {
      machineScrollRef.current.scrollTo({ x: 0, animated: true });
    }
  }, []);

  const topMuscle = fatigueList[0]; // most fatigued overall (for Yara card)

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

  const handleGeneratePlan = useCallback(async () => {
    if (!authUserId || aiPlanLoading) return;
    setAiPlanLoading(true);
    try {
      const plan = await generatePlan(authUserId);
      setAiPlan(plan);
      setAiPlanDate(new Date().toISOString());
      // Reload the full screen to pick up the new plan for today's circuit
      loadData();
    } catch (e) {
      warn('[Training] AI plan generation failed:', e?.message ?? e);
      Alert.alert('Plan Generation Failed', e?.message ?? 'Unknown error. Check your connection and try again.');
    } finally {
      setAiPlanLoading(false);
    }
  }, [authUserId, aiPlanLoading, loadData]);

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ────────────── HEADER ────────────── */}
        <Reanimated.View entering={FadeInDown.delay(0).springify()} style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting},</Text>
            <Text style={s.subGreeting}>Training Command Center</Text>
          </View>
          <View style={s.headerChips}>
            <View style={s.liveChip}>
              <Ionicons name="flame" size={11} color={C.lime} />
              <Text style={s.liveChipTxt}>{streakCount > 0 ? `${streakCount}d` : '—'}</Text>
            </View>
            <View style={[s.liveChip, { borderColor: 'rgba(124,92,252,0.35)', backgroundColor: 'rgba(124,92,252,0.1)' }]}>
              <Ionicons name="battery-charging-outline" size={11} color={C.accent} />
              <Text style={[s.liveChipTxt, { color: C.accent }]}>{recoveryPct}%</Text>
            </View>
          </View>
        </Reanimated.View>

        {/* ══════════════════════════════════════
            §1  THE DAILY BLUEPRINT
        ══════════════════════════════════════ */}
        <Reanimated.View entering={FadeInDown.delay(50).springify()}>
          <SectionHeader title="THE DAILY BLUEPRINT" sub="AI-driven program" />

          {/* Blueprint Card — AI reason + circuit in one connected card */}
          <LinearGradient
            colors={[C.purple, C.purpleD, '#1A0E4F']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[s.heroCard, SHADOW]}
          >
            <View style={s.heroAccentLine} />

            {/* Environment badge — top right */}
            <TouchableOpacity
              style={s.envBadge}
              onPress={() => toggleEnvironment(environment === 'gym' ? 'home' : 'gym')}
              activeOpacity={0.75}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name={environment === 'gym' ? 'barbell-outline' : 'home-outline'} size={11} color={C.lime} />
              <Text style={s.envBadgeTxt}>{environment === 'gym' ? 'Full Gym' : 'Home'}</Text>
            </TouchableOpacity>

            {/* AI header */}
            <View style={s.heroBadge}>
              <Ionicons name="sparkles" size={10} color={C.lime} />
              <Text style={s.heroBadgeTxt}>  {aiPlan ? 'AI PERSONALISED PLAN' : 'AI RECOMMENDED'}</Text>
            </View>
            <Text style={s.heroLabel}>DAILY BLUEPRINT</Text>
            <Text style={s.heroTitle}>{recommendation.title}</Text>
            <View style={s.heroMeta}>
              {[
                { icon: 'time-outline',  val: recommendation.duration },
                { icon: 'flame-outline', val: recommendation.kcal },
                { icon: 'body-outline',  val: recommendation.focus },
              ].map((m, i) => (
                <View key={i} style={s.metaChip}>
                  <Ionicons name={m.icon} size={11} color="rgba(255,255,255,0.6)" />
                  <Text style={s.metaChipTxt}> {m.val}</Text>
                </View>
              ))}
            </View>
            {overloadTip && (
              <View style={s.overloadBadge}>
                <Ionicons name="trending-up" size={11} color="#000" />
                <Text style={s.overloadBadgeTxt}>{overloadTip}</Text>
              </View>
            )}
            {/* Why this workout */}
            <Text style={s.heroLogic}>{recommendation.reason}</Text>

            {/* ── Circuit ── */}
            <View style={s.circuitDivider} />
            <Text style={s.circuitLabel}>TODAY'S CIRCUIT</Text>
            {todayPlan.map((ex, i) => (
              <TouchableOpacity
                key={i}
                style={[s.circuitRow, i === todayPlan.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => navigation.navigate('WorkoutActive', { exerciseName: ex.key })}
                activeOpacity={0.7}
              >
                <View style={s.circuitNumCircle}>
                  <Text style={s.circuitNumTxt}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.circuitName}>{ex.name}</Text>
                  <Text style={s.circuitTarget}>{ex.target}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.circuitSets}>{ex.sets}</Text>
                  {ex.prevReps !== null && (
                    <Text style={s.circuitPrev}>
                      Last: {ex.prevReps}r{ex.prevForm ? ` · ${ex.prevForm}%` : ''}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {/* Start CTA */}
            <TouchableOpacity
              style={s.startBtn}
              onPress={() => { mediumTap(); navigation.navigate('WorkoutActive', { exerciseName: todayPlan[0]?.key ?? recommendation.exerciseKey }); }}
              activeOpacity={0.85}
            >
              <Text style={s.startBtnTxt}>Start Workout</Text>
              <Ionicons name="arrow-forward" size={16} color="#000" />
            </TouchableOpacity>

            {/* Manual Log CTA */}
            <TouchableOpacity
              style={s.manualLogBtn}
              onPress={() => { mediumTap(); navigation.navigate('ManualWorkout'); }}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={15} color={C.lime} />
              <Text style={s.manualLogBtnTxt}>Log Manually</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Reanimated.View>

        {/* ══════════════════════════════════════
            §2  BODY RECOVERY ARCHITECT
        ══════════════════════════════════════ */}
        <Reanimated.View entering={FadeInDown.delay(120).springify()}>
          <SectionHeader title="BODY RECOVERY ARCHITECT" sub="Last 48 hrs" />

          {/* Glass heatmap card */}
          <View style={[s.glassCard, SHADOW]}>
            <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={s.glassCardBorder} pointerEvents="none" />
            <View style={s.heatmapInner}>
              <View style={s.heatmapBody}>
                <BodySilhouette
                  fatigueMap={fatigueMap}
                  selectedMuscle={selectedMuscle}
                  onMusclePress={handleMusclePress}
                />
                {selectedMuscle && (
                  <TouchableOpacity onPress={() => setSelectedMuscle(null)} style={s.clearMuscleBtn}>
                    <Text style={s.clearMuscleTxt}>✕ {selectedMuscle}</Text>
                  </TouchableOpacity>
                )}
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
                    const isActive = selectedMuscle === m.muscle_name;
                    return (
                      <TouchableOpacity
                        key={m.muscle_name}
                        style={[s.muscleRow, isActive && s.muscleRowActive]}
                        onPress={() => handleMusclePress(isActive ? null : m.muscle_name)}
                        activeOpacity={0.7}
                      >
                        <View style={[s.muscleDot, { backgroundColor: col }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.muscleName, isActive && { color: C.lime }]}>{m.muscle_name}</Text>
                          <View style={s.muscleBarBg}>
                            <View style={[s.muscleBarFill, { width: `${m.fatigue_pct}%`, backgroundColor: col }]} />
                          </View>
                        </View>
                        <Text style={[s.muscleTag, { color: col }]}>{fatigueLabel(m.fatigue_pct)}</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
                <View style={s.legend}>
                  {[{ color: C.lime, label: 'Fresh' }, { color: '#FF9500', label: 'Sore' }, { color: C.purple, label: 'Fatigued' }].map(l => (
                    <View key={l.label} style={s.legendItem}>
                      <View style={[s.legendDot, { backgroundColor: l.color }]} />
                      <Text style={s.legendTxt}>{l.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Yara Insight */}
          {fatigueList.length > 0 && (
            <View style={[s.glassCard, s.yaraGlass, SHADOW]}>
              <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFillObject} />
              <LinearGradient
                colors={['rgba(124,92,252,0.18)', 'rgba(74,47,200,0.08)']}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={s.glassCardBorder} pointerEvents="none" />
              <View style={s.yaraHeader}>
                <Text style={s.yaraTitle}>YARA INSIGHT</Text>
                <View style={s.yaraLiveDot} />
              </View>
              {nutritionTip && (
                <View style={s.nutritionTipRow}>
                  <Ionicons name="nutrition-outline" size={12} color={C.lime} />
                  <Text style={s.nutritionTipTxt}>{nutritionTip}</Text>
                </View>
              )}
              <Text style={s.yaraText}>
                {topMuscle
                  ? topMuscle.fatigue_pct >= 70
                    ? `"Your ${topMuscle.muscle_name} are at ${topMuscle.fatigue_pct}% fatigue — danger zone. Skip direct loading, focus on antagonists."`
                    : topMuscle.fatigue_pct >= 30
                    ? `"Your ${topMuscle.muscle_name} are ${topMuscle.fatigue_pct}% fatigued. Train lighter — reduce weight 15–20% and prioritise form."`
                    : `"${topMuscle.muscle_name} at ${topMuscle.fatigue_pct}% — ideal overload window. Push a little harder than last time."`
                  : `"All muscle groups fully fresh. Today is a perfect max-effort session — your body is primed."`}
              </Text>
            </View>
          )}

          {/* Streak tracker */}
          <View style={[s.glassCard, s.streakGlass, SHADOW]}>
            <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={s.glassCardBorder} pointerEvents="none" />
            <View style={s.streakHeader}>
              <Ionicons name="flame" size={15} color={C.lime} />
              <Text style={s.streakTitle}>Workout Streak</Text>
              <Text style={s.streakSub}>{streakCount} day{streakCount !== 1 ? 's' : ''}</Text>
            </View>
            <View style={s.weekRow}>
              {WEEK.map((day, i) => {
                const done = weekDays[i];
                return (
                  <View key={i} style={s.dayCol}>
                    <View style={[s.dayDot, done && s.dayDotDone]}>
                      {done && <Ionicons name="checkmark" size={10} color="#000" />}
                    </View>
                    <Text style={[s.dayLabel, done && s.dayLabelDone]}>{day}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Reanimated.View>

        {/* ══════════════════════════════════════
            §3  THE EQUIPMENT FLOOR
        ══════════════════════════════════════ */}
        <Reanimated.View entering={FadeInDown.delay(190).springify()}>
          <SectionHeader
            title="THE EQUIPMENT FLOOR"
            sub={selectedMuscle ? `Filtered: ${selectedMuscle}` : 'Gym + Home · Tap to explore'}
          />
          <ScrollView
            ref={(r) => { machineScrollRef.current = r; }}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.machineScroll}
            decelerationRate="fast"
            snapToInterval={156}
          >
            {(selectedMuscle
              ? COMBINED_EQUIPMENT.filter(m =>
                  m.primaryMuscle.toLowerCase().includes(selectedMuscle.toLowerCase()))
              : COMBINED_EQUIPMENT
            ).map((item) => (
              <MachineCard
                key={item.id}
                machine={item}
                onPress={(m) => {
                  if (m.isHome) {
                    navigation.navigate('WorkoutActive', { exerciseName: m.exerciseKey });
                  } else {
                    openMachineModal(m);
                  }
                }}
              />
            ))}
          </ScrollView>
        </Reanimated.View>

        {/* ══════════════════════════════════════
            §4  AI WEEKLY PLAN
        ══════════════════════════════════════ */}
        <Reanimated.View entering={FadeInDown.delay(230).springify()}>
          <SectionHeader
            title="AI WEEKLY PLAN"
            sub={aiPlan ? `Generated ${aiPlanDate ? new Date(aiPlanDate).toLocaleDateString() : ''}` : 'Personalised to your profile'}
          />

          {aiPlan ? (
            <View style={[s.glassCard, SHADOW, { padding: 18 }]}>
              <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFillObject} />
              <View style={s.glassCardBorder} pointerEvents="none" />
              {/* Plan intro */}
              {aiPlan.intro ? (
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 17, marginBottom: 14 }}>
                  {aiPlan.intro}
                </Text>
              ) : null}
              {/* Day pills */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {aiPlan.days.map((day, i) => {
                  const dow = new Date().getDay();
                  const adjustedDow = dow === 0 ? 6 : dow - 1;
                  const isToday = i === (adjustedDow % aiPlan.days.length);
                  return (
                    <View key={i} style={{
                      backgroundColor: isToday ? C.lime : 'rgba(255,255,255,0.06)',
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                      borderWidth: 1, borderColor: isToday ? C.lime : 'rgba(255,255,255,0.08)',
                    }}>
                      <Text style={{
                        color: isToday ? '#000' : C.text,
                        fontSize: 11, fontWeight: '800',
                      }}>Day {i + 1}</Text>
                      <Text style={{
                        color: isToday ? 'rgba(0,0,0,0.7)' : C.sub,
                        fontSize: 10, marginTop: 2,
                      }}>{day.name}</Text>
                    </View>
                  );
                })}
              </View>
              {/* Notes row */}
              {(aiPlan.nutritionNote || aiPlan.recoveryNote) && (
                <View style={{ gap: 6, marginBottom: 14 }}>
                  {aiPlan.nutritionNote ? (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                      <Ionicons name="nutrition-outline" size={12} color={C.lime} style={{ marginTop: 2 }} />
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, flex: 1, lineHeight: 16 }}>
                        {aiPlan.nutritionNote}
                      </Text>
                    </View>
                  ) : null}
                  {aiPlan.recoveryNote ? (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                      <Ionicons name="bed-outline" size={12} color={C.accent} style={{ marginTop: 2 }} />
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, flex: 1, lineHeight: 16 }}>
                        {aiPlan.recoveryNote}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
              {/* Regenerate button */}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
                  backgroundColor: 'rgba(124,92,252,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                  borderWidth: 1, borderColor: 'rgba(124,92,252,0.3)', opacity: aiPlanLoading ? 0.5 : 1 }}
                onPress={handleGeneratePlan}
                disabled={aiPlanLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={14} color={C.accent} />
                <Text style={{ color: C.accent, fontSize: 12, fontWeight: '700' }}>
                  {aiPlanLoading ? 'Generating...' : 'Regenerate Plan'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.glassCard, SHADOW, { padding: 24, alignItems: 'center' }]}
              onPress={handleGeneratePlan}
              disabled={aiPlanLoading}
              activeOpacity={0.8}
            >
              <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFillObject} />
              <View style={s.glassCardBorder} pointerEvents="none" />
              <LinearGradient
                colors={['rgba(124,92,252,0.18)', 'rgba(74,47,200,0.08)']}
                style={StyleSheet.absoluteFillObject}
              />
              <Ionicons name="sparkles" size={32} color={C.accent} style={{ marginBottom: 10 }} />
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 6 }}>
                {aiPlanLoading ? 'Generating your plan...' : 'Generate AI Weekly Plan'}
              </Text>
              <Text style={{ color: C.sub, fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 16 }}>
                Create a personalised training split based on your goals, equipment, and experience level.
              </Text>
              <View style={{
                backgroundColor: C.lime, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12,
                opacity: aiPlanLoading ? 0.5 : 1,
              }}>
                <Text style={{ color: '#000', fontWeight: '800', fontSize: 13 }}>
                  {aiPlanLoading ? 'Please wait...' : 'Generate Plan'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </Reanimated.View>

        {/* ══════════════════════════════════════
            §5  THE PERFORMANCE LAB
        ══════════════════════════════════════ */}
        <Reanimated.View entering={FadeInDown.delay(290).springify()}>
          <SectionHeader title="THE PERFORMANCE LAB" sub="Tools & analytics" />
          <View style={s.labGrid}>

            {/* Exercise Library */}
            <TouchableOpacity
              style={[s.labCard, s.labCardWide]}
              onPress={() => navigation.navigate('ExerciseList')}
              activeOpacity={0.82}
            >
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
              <View style={s.glassCardBorder} pointerEvents="none" />
              <LinearGradient colors={['rgba(200,241,53,0.12)', 'transparent']} style={StyleSheet.absoluteFillObject} />
              <View style={s.labWideInner}>
                <View style={[s.labIconWrap, { borderColor: 'rgba(200,241,53,0.25)', marginBottom: 0, marginRight: 14 }]}>
                  <Ionicons name="barbell-outline" size={26} color={C.lime} />
                </View>
                <View>
                  <Text style={s.labCardTitle}>Exercise Library</Text>
                  <Text style={s.labCardSub}>1,300+ exercises with AI form check</Text>
                </View>
              </View>
              <View style={[s.labArrow, { backgroundColor: C.lime, position: 'absolute', top: 16, right: 16 }]}>
                <Ionicons name="arrow-forward" size={13} color="#000" />
              </View>
            </TouchableOpacity>

            {/* Strength Analytics */}
            <TouchableOpacity
              style={[s.labCard, s.labCardWide]}
              onPress={() => navigation.navigate('Insights')}
              activeOpacity={0.82}
            >
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
              <View style={s.glassCardBorder} pointerEvents="none" />
              <LinearGradient colors={['rgba(157,133,245,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} />
              <View style={s.labWideInner}>
                <View style={[s.labIconWrap, { borderColor: 'rgba(157,133,245,0.3)', marginBottom: 0, marginRight: 14 }]}>
                  <Ionicons name="analytics-outline" size={26} color={C.accent} />
                </View>
                <View>
                  <Text style={s.labCardTitle}>Strength Analytics</Text>
                  <Text style={s.labCardSub}>Volume · PRs · Trends</Text>
                </View>
              </View>
              <View style={[s.labArrow, { backgroundColor: C.accent, position: 'absolute', top: 16, right: 16 }]}>
                <Ionicons name="arrow-forward" size={13} color="#000" />
              </View>
            </TouchableOpacity>

          </View>
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
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  greeting:      { color: C.text, fontSize: FS.screenTitle, fontWeight: '900', letterSpacing: -0.5 },
  subGreeting:   { color: C.sub, fontSize: FS.btnPrimary, marginTop: 2 },
  recoveryBadge: { backgroundColor: C.card, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: C.lime },
  recoveryNum:   { color: C.lime, fontSize: FS.sectionTitle, fontWeight: '900', lineHeight: 22 },
  recoveryLabel: { color: C.sub, fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: 2 },

  // Hero
  heroCard:       { borderRadius: 28, padding: 26, marginBottom: 16, overflow: 'hidden' },
  heroAccentLine: { position: 'absolute', top: 0, left: 26, right: 26, height: 2, backgroundColor: C.lime, opacity: 0.5, borderRadius: 1 },
  heroBadge:      { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(200,241,53,0.12)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(200,241,53,0.25)' },
  heroBadgeTxt:   { color: C.lime, fontSize: FS.label, fontWeight: '900', letterSpacing: 1.2 },
  heroLabel:      { color: 'rgba(255,255,255,0.4)', fontSize: FS.label, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  heroTitle:      { color: C.text, fontSize: FS.screenTitle, fontWeight: '900', letterSpacing: -0.5, lineHeight: 34, marginBottom: 16 },
  heroMeta:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  metaChip:       { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  metaChipTxt:    { color: 'rgba(255,255,255,0.6)', fontSize: FS.sub, fontWeight: '600' },
  heroLogic:       { color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', fontSize: FS.btnSecondary, lineHeight: 18, marginBottom: 0 },
  overloadBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#C8F135', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10, alignSelf: 'flex-start' },
  overloadBadgeTxt: { color: '#000', fontSize: FS.sub, fontWeight: '800', flex: 1, flexShrink: 1 },
  nutritionTipRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, backgroundColor: 'rgba(200,241,53,0.07)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  nutritionTipTxt:  { color: C.lime, fontSize: FS.sub, fontWeight: '600', flex: 1 },
  playCircle:     { width: 52, height: 52, backgroundColor: C.lime, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },

  // Section row
  sectionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:{ color: C.text, fontSize: FS.sectionTitle, fontWeight: '800' },
  sectionLink: { color: C.lime, fontSize: FS.btnSecondary, fontWeight: '700' },
  sectionSub:  { color: C.sub, fontSize: FS.btnSecondary },

  // Heatmap
  heatmapCard:    { backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.border, flexDirection: 'row', padding: 16, marginBottom: 10 },
  heatmapBody:    { alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  heatmapList:    { flex: 1, justifyContent: 'center', gap: 6 },
  heatmapLoading: { color: C.sub, fontSize: FS.btnSecondary, fontStyle: 'italic' },
  heatmapEmpty:   { color: C.text, fontSize: FS.body, fontWeight: '700', lineHeight: 18 },
  heatmapEmptySub:{ color: C.lime, fontSize: FS.sub, marginTop: 4, lineHeight: 16 },
  muscleRow:       { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 3, paddingHorizontal: 4, borderRadius: 8 },
  muscleRowActive: { backgroundColor: 'rgba(200,241,53,0.08)', borderRadius: 8 },
  muscleDot:     { width: 8, height: 8, borderRadius: 4 },
  muscleName:    { color: C.text, fontSize: FS.sub, fontWeight: '700', marginBottom: 3 },
  muscleBarBg:   { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
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
  yaraText:    { color: '#FFF', fontSize: FS.body, lineHeight: 20, fontWeight: '500' },

  // Streak
  streakCard:   { backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: C.border, marginTop: 16 },
  streakHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  streakTitle:  { color: C.text, fontSize: FS.btnPrimary, fontWeight: '800', flex: 1 },
  streakSub:    { color: C.lime, fontSize: FS.btnSecondary, fontWeight: '700' },
  weekRow:      { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol:       { alignItems: 'center', gap: 6 },
  dayDot:       { width: 34, height: 34, borderRadius: 17, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2A2548' },
  dayDotDone:   { backgroundColor: C.lime, borderColor: C.lime, shadowColor: C.lime, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6 },
  dayLabel:     { color: C.sub, fontSize: FS.sub, fontWeight: '600' },
  dayLabelDone: { color: C.lime },

  // Quick Actions
  actionRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  actionBtn:      { width: (width - 56) / 3, backgroundColor: C.card, paddingVertical: 16, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  actionIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(200,241,53,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(200,241,53,0.2)' },
  actionTxt:      { color: C.text, fontSize: FS.sub, fontWeight: '700' },

  // ── Machine Intelligence Hub ─────────────────────────────
  hubBadge:     { backgroundColor: 'rgba(200,241,53,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(200,241,53,0.3)' },
  hubBadgeTxt:  { color: C.lime, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  machineScroll:{ paddingHorizontal: 0, paddingBottom: 8, paddingRight: 20, gap: 12, flexDirection: 'row', marginBottom: 28 },

  machineCard: {
    width: 148,
    height: 180,
    backgroundColor: C.bg,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.lime,
    ...SHADOW,
    shadowColor: C.lime,
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  machineIconWrap: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  machineName:   { color: C.text, fontSize: FS.btnSecondary, fontWeight: '800', marginBottom: 2 },
  machineMuscle: { color: 'rgba(255,255,255,0.55)', fontSize: 9 },
  machineAiBadge:{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(200,241,53,0.18)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(200,241,53,0.4)' },
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
  modalTitle:  { color: C.text, fontSize: FS.cardTitle, fontWeight: '900' },
  modalMuscle: { color: C.lime, fontSize: FS.sub, fontWeight: '700', marginTop: 2 },
  modalClose:  { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },

  modalSection: { paddingHorizontal: 20, paddingBottom: 20 },
  modalSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  modalSectionTitle:  { color: C.lime, fontSize: FS.label, fontWeight: '900', letterSpacing: 1.4 },

  // Setup steps
  setupRow: { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
  setupNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(200,241,53,0.12)',
    borderWidth: 1, borderColor: 'rgba(200,241,53,0.35)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  setupNumTxt: { color: C.lime, fontSize: FS.label, fontWeight: '900' },
  setupTxt:    { color: 'rgba(255,255,255,0.82)', fontSize: FS.body, lineHeight: 19, flex: 1 },

  // Activation box
  activationBox: {
    backgroundColor: 'rgba(124,92,252,0.1)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.3)',
  },
  activationTxt: { color: C.accent, fontSize: FS.body, lineHeight: 20, fontStyle: 'italic' },

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
  pivotBtnTxt:     { color: C.lime, fontSize: FS.body, fontWeight: '800' },
  altHeading:      { color: C.sub, fontSize: FS.label, fontWeight: '800', letterSpacing: 1, marginTop: 14, marginBottom: 8 },
  altRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  altIcon:         { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(200,241,53,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(200,241,53,0.2)' },
  altName:         { color: C.text, fontSize: FS.body, fontWeight: '700', flex: 1 },
  altBadge:        { backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  altBadgeTxt:     { color: C.sub, fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },

  // Analyze CTA
  analyzeBtn:          { marginHorizontal: 20, marginTop: 4, borderRadius: 18, overflow: 'hidden' },
  analyzeBtnGradient:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  analyzeBtnTxt:       { color: '#000', fontSize: FS.bodyLarge, fontWeight: '900', letterSpacing: 0.3 },

  // Library
  libCard:    { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  libGradient:{ flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  libIconBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(200,241,53,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(200,241,53,0.2)' },
  libInfo:    { flex: 1 },
  libMain:    { color: C.text, fontSize: FS.bodyLarge, fontWeight: '700' },
  libSub:     { color: C.sub, fontSize: FS.sub, marginTop: 3 },

  // Posture AI
  postureCard:   { backgroundColor: C.card, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: C.border },
  postureLeft:   { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  postureIconBox:{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(124,92,252,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(124,92,252,0.3)' },
  postureTitle:  { color: C.text, fontSize: FS.bodyLarge, fontWeight: '700' },
  postureSub:    { color: C.sub, fontSize: FS.sub, marginTop: 2 },
  postureArrow:  { width: 32, height: 32, borderRadius: 16, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' },

  liveChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(200,241,53,0.1)', borderWidth: 1, borderColor: 'rgba(200,241,53,0.25)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  liveChipTxt: { color: C.lime, fontSize: FS.label, fontWeight: '800' },

  // Environment Toggle
  envToggleWrap: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: C.border, alignSelf: 'flex-start', gap: 2 },
  envBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  envBtnActive:  { backgroundColor: C.lime },
  envBtnTxt:     { color: C.sub, fontSize: FS.body, fontWeight: '700' },
  envBtnTxtActive:{ color: '#000', fontWeight: '800' },

  // Today's Plan
  planCircuitBadge: { backgroundColor: 'rgba(124,92,252,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(124,92,252,0.3)' },
  planCircuitTxt:   { color: C.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  planScroll:       { paddingBottom: 8, paddingRight: 20, gap: 10, flexDirection: 'row', marginBottom: 8 },
  planCardNum:      { position: 'absolute', top: 10, right: 12, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  planCardNumTxt:   { color: 'rgba(255,255,255,0.7)', fontSize: FS.label, fontWeight: '900' },
  planIconCircle:   { width: 44, height: 44, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  planExName:       { color: C.text, fontSize: FS.body, fontWeight: '800', marginBottom: 2 },
  planTarget:       { color: 'rgba(255,255,255,0.45)', fontSize: 9, marginBottom: 8 },
  planSetsRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  planSets:         { color: 'rgba(255,255,255,0.55)', fontSize: FS.sub, fontWeight: '600' },
  planPrevBest:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(200,241,53,0.1)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  planPrevBestTxt:  { color: C.lime, fontSize: 9, fontWeight: '800' },

  // Muscle filter
  clearMuscleBtn: { marginTop: 6, alignSelf: 'center', backgroundColor: 'rgba(200,241,53,0.12)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(200,241,53,0.3)' },
  clearMuscleTxt: { color: C.lime, fontSize: FS.label, fontWeight: '800' },

  // Netflix machine card
  machineCardBg:     { ...StyleSheet.absoluteFillObject, borderRadius: 22 },
  machineCardBottom: { position: 'absolute', bottom: 14, left: 12, right: 12 },

  // ── Section Headers (unified) ────────────────────────────
  sectionHeader:    { marginTop: 32, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(200,241,53,0.13)', paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionHeaderTxt: { color: C.lime, fontSize: FS.sub, fontWeight: '900', letterSpacing: 2.2 },
  sectionHeaderSub: { color: C.sub, fontSize: FS.label, fontWeight: '600' },

  // ── Header chips ─────────────────────────────────────────
  headerChips:   { flexDirection: 'row', gap: 6 },

  // ── Glassmorphism base card ───────────────────────────────
  glassCard: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(22,18,48,0.85)', // fallback for Android BlurView
  },
  glassCardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heatmapInner:  { flexDirection: 'row', padding: 16 },
  yaraGlass:     { marginTop: 2 },
  streakGlass:   { marginTop: 2, padding: 18 },

  // ── Environment badge (inside hero card) ─────────────────
  envBadge:    { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(200,241,53,0.14)', borderWidth: 1, borderColor: 'rgba(200,241,53,0.35)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  envBadgeTxt: { color: C.lime, fontSize: FS.label, fontWeight: '800' },

  // ── Blueprint Circuit (embedded in hero card) ─────────────
  circuitDivider:   { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 16, marginBottom: 14 },
  circuitLabel:     { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 1.8, marginBottom: 10 },
  circuitRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  circuitNumCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(200,241,53,0.12)', borderWidth: 1, borderColor: 'rgba(200,241,53,0.3)', alignItems: 'center', justifyContent: 'center' },
  circuitNumTxt:    { color: C.lime, fontSize: FS.label, fontWeight: '900' },
  circuitName:      { color: C.text, fontSize: FS.body, fontWeight: '800' },
  circuitTarget:    { color: 'rgba(255,255,255,0.45)', fontSize: FS.label, marginTop: 1 },
  circuitSets:      { color: C.lime, fontSize: FS.btnSecondary, fontWeight: '800' },
  circuitPrev:      { color: 'rgba(255,255,255,0.35)', fontSize: 9, marginTop: 2 },
  startBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.lime, borderRadius: 14, paddingVertical: 14, marginTop: 16 },
  startBtnTxt:      { color: '#000', fontSize: FS.bodyLarge, fontWeight: '900' },
  manualLogBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: 'rgba(200,241,53,0.35)', borderRadius: 14, paddingVertical: 12, marginTop: 8 },
  manualLogBtnTxt:  { color: C.lime, fontSize: FS.body, fontWeight: '800' },

  // ── Equipment Floor badge ─────────────────────────────────
  floorBadge:     { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  floorBadgeGym:  { backgroundColor: 'rgba(124,92,252,0.55)' },
  floorBadgeHome: { backgroundColor: 'rgba(200,241,53,0.45)' },
  floorBadgeTxt:  { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },

  // ── Performance Lab ───────────────────────────────────────
  labGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  labCard: {
    width: (width - 50) / 2,
    minHeight: 150,
    borderRadius: 22,
    overflow: 'hidden',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    ...SHADOW,
  },
  labCardWide: { width: width - 40, minHeight: 72 },
  labIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(124,92,252,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(124,92,252,0.3)',
    marginBottom: 12,
  },
  labCardTitle: { color: C.text, fontSize: FS.btnPrimary, fontWeight: '800', marginBottom: 4 },
  labCardSub:   { color: C.sub, fontSize: FS.sub, lineHeight: 16 },
  labArrow: { position: 'absolute', bottom: 14, right: 14, width: 28, height: 28, borderRadius: 14, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' },
  labWideInner: { flexDirection: 'row', alignItems: 'center' },
});
