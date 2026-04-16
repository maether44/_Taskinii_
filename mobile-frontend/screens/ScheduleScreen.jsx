/**
 * ScheduleScreen.js
 * AI-generated weekly plan screen.
 * Shows per-day: workouts, meals, sleep/steps/water targets + live logging.
 * Data comes from Yara via scheduleStore (no Supabase persistence).
 * Route: app/schedule.js  (Expo Router)
 */
import {
  Animated, Dimensions, Easing, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleStore } from '../store/scheduleStore';

const { width: SCREEN_W } = Dimensions.get('window');
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
const WORKOUT_COLORS = {
  push: '#7B61FF', pull: '#FF6B6B', legs: '#C6FF33',
  upper: '#61D4FF', lower: '#FFB347', full: '#FF61D4',
  cardio: '#61FFD4', rest: '#2D2850',
};

const getWorkoutColor = (type = '') => {
  const t = type.toLowerCase();
  for (const [key, val] of Object.entries(WORKOUT_COLORS)) {
    if (t.includes(key)) return val;
  }
  return '#7B61FF';
};

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

// ─── Ring Progress ────────────────────────────────────────────────────────────
function RingProgress({ pct, size = 76, stroke = 7, color, label, value, unit }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* Track ring */}
        <View style={{
          position: 'absolute', width: size, height: size,
          borderRadius: size / 2, borderWidth: stroke, borderColor: '#1E1A35',
        }} />
        {/* Progress segments (4-border trick) */}
        <View style={{
          position: 'absolute', width: size, height: size,
          borderRadius: size / 2, borderWidth: stroke,
          borderColor: 'transparent',
          borderTopColor: pct > 0 ? color : 'transparent',
          borderRightColor: pct > 0.25 ? color : 'transparent',
          borderBottomColor: pct > 0.5 ? color : 'transparent',
          borderLeftColor: pct > 0.75 ? color : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }} />
        {/* Center content */}
        <View style={{
          width: size - stroke * 2 - 4, height: size - stroke * 2 - 4,
          borderRadius: (size - stroke * 2 - 4) / 2,
          backgroundColor: color + '14',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: '#F4F0FF', fontSize: 13, fontWeight: '800' }}>{value}</Text>
          <Text style={{ color: '#4A4268', fontSize: 9, fontWeight: '600' }}>{unit}</Text>
        </View>
      </View>
      <Text style={{ color: '#8B82AD', fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// ─── Log Input ────────────────────────────────────────────────────────────────
function LogInput({ icon, label, unit, value, target, color, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');

  const handleSave = () => {
    const n = parseFloat(draft);
    if (!isNaN(n) && n >= 0) onSave(n);
    setEditing(false);
    setDraft('');
  };

  return (
    <View style={li.wrap}>
      <View style={li.left}>
        <Text style={li.icon}>{icon}</Text>
        <View>
          <Text style={li.label}>{label}</Text>
          <Text style={li.target}>Target: {target}{unit}</Text>
        </View>
      </View>
      {editing ? (
        <View style={li.inputRow}>
          <TextInput
            style={li.input}
            value={draft}
            onChangeText={setDraft}
            keyboardType="decimal-pad"
            placeholder={String(target)}
            placeholderTextColor="#4A4268"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <TouchableOpacity style={[li.saveBtn, { backgroundColor: color }]} onPress={handleSave}>
            <Text style={li.saveTxt}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={li.cancelBtn} onPress={() => setEditing(false)}>
            <Text style={li.cancelTxt}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[li.logBtn, value != null && { borderColor: color + '88' }]}
          onPress={() => setEditing(true)}
          activeOpacity={0.8}
        >
          <Text style={[li.logTxt, value != null && { color }]}>
            {value != null ? `${value}${unit}` : '+ Log'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────
function ExerciseRow({ exercise, index, color }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 280, delay: index * 55, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 280, delay: index * 55, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[ex.row, { opacity: fade, transform: [{ translateY: slide }] }]}>
      <View style={[ex.num, { backgroundColor: color + '22', borderColor: color + '55' }]}>
        <Text style={[ex.numTxt, { color }]}>{index + 1}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ex.name}>{exercise.name}</Text>
        {(exercise.sets || exercise.reps || exercise.duration) && (
          <Text style={ex.meta}>
            {exercise.sets ? `${exercise.sets} sets` : ''}
            {exercise.sets && exercise.reps ? ' × ' : ''}
            {exercise.reps ? `${exercise.reps} reps` : ''}
            {exercise.duration ? `  ${exercise.duration}` : ''}
            {exercise.rest ? `  · rest ${exercise.rest}` : ''}
          </Text>
        )}
      </View>
      {exercise.muscle && (
        <View style={ex.tag}>
          <Text style={ex.tagTxt}>{exercise.muscle}</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Meal Card ────────────────────────────────────────────────────────────────
function MealCard({ meal, index }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 280, delay: index * 70, useNativeDriver: true }).start();
  }, []);
  const icon = MEAL_ICONS[meal.type?.toLowerCase()] || '🍽️';
  return (
    <Animated.View style={[mc.card, { opacity: fade }]}>
      <View style={mc.header}>
        <Text style={mc.icon}>{icon}</Text>
        <Text style={mc.type}>{meal.type}</Text>
        {meal.calories && (
          <View style={mc.calTag}><Text style={mc.calTxt}>{meal.calories} kcal</Text></View>
        )}
      </View>
      {meal.foods?.map((food, i) => (
        <View key={i} style={mc.foodRow}>
          <Text style={mc.dot}>·</Text>
          <Text style={mc.food}>{food}</Text>
        </View>
      ))}
      {meal.note && <Text style={mc.note}>{meal.note}</Text>}
    </Animated.View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={s.emptyWrap}>
      <Animated.Text style={[s.emptyEmoji, { transform: [{ scale: pulse }] }]}>👩‍⚕️</Animated.Text>
      <Text style={s.emptyTitle}>No schedule yet</Text>
      <Text style={s.emptySub}>
        Ask Yara to build your weekly plan.{'\n'}"Give me my weekly schedule"
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const [schedule, setSchedule] = useState(scheduleStore.get());
  const [activeDay, setActiveDay] = useState(0);
  const headerFade  = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsub = scheduleStore.subscribe(data => {
      setSchedule(data);
      setActiveDay(0);
    });
    return unsub;
  }, []);

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerFade,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(contentFade, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    contentFade.setValue(0);
    Animated.timing(contentFade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [activeDay]);

  const day = schedule?.days?.[activeDay];
  const workoutColor = day ? getWorkoutColor(day.workout_type) : '#7B61FF';

  const handleLog = (field, value) => {
    scheduleStore.logDay(activeDay, field, value);
    setSchedule({ ...scheduleStore.get() }); // trigger re-render
  };

  const sleepPct = day?.sleep_target  ? clamp((day.sleep_actual  ?? 0) / day.sleep_target,  0, 1) : 0;
  const stepsPct = day?.steps_target  ? clamp((day.steps_actual  ?? 0) / day.steps_target,  0, 1) : 0;
  const waterPct = day?.water_target  ? clamp((day.water_actual  ?? 0) / day.water_target,  0, 1) : 0;

  const fmtSteps = (v) => v != null ? (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)) : '—';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0E0C1A' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Header ── */}
      <Animated.View style={[s.header, { paddingTop: insets.top + 12, opacity: headerFade }]}>
<TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={s.backTxt}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Weekly Plan</Text>
          {schedule?.generated_at && (
            <Text style={s.headerSub}>
              Yara · {new Date(schedule.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          )}
        </View>
        {schedule && (
          <View style={s.aiBadge}>
            <Text style={s.aiBadgeTxt}>✦ AI</Text>
          </View>
        )}
      </Animated.View>

      {!schedule ? <EmptyState /> : (
        <>
          {/* ── Day Selector ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.dayScroll}
            contentContainerStyle={s.dayScrollContent}
          >
            {schedule.days.map((d, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  s.dayPill,
                  activeDay === i && s.dayPillActive,
                  d.is_rest && s.dayPillRest,
                ]}
                onPress={() => setActiveDay(i)}
                activeOpacity={0.75}
              >
                <Text style={[s.dayPillLabel, activeDay === i && s.dayPillLabelActive]}>
                  {DAY_LABELS[i]}
                </Text>
                {d.is_rest
                  ? <Text style={s.dayRestTxt}>Rest</Text>
                  : <Text style={[s.dayTypeTxt, { color: getWorkoutColor(d.workout_type) }]}>
                      {d.workout_type?.split(' ')[0] || ''}
                    </Text>
                }
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Day Content ── */}
          <Animated.ScrollView
            style={{ flex: 1, opacity: contentFade }}
            contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Day title */}
            <View style={s.dayTitleRow}>
              <View style={[s.dayTitleDot, { backgroundColor: workoutColor }]} />
              <Text style={s.dayTitle}>
                {day.is_rest ? '🛌 Rest Day' : (day.workout_type || 'Workout')}
              </Text>
            </View>
            {day.note && <Text style={s.dayNote}>{day.note}</Text>}

            {/* ── Progress Rings ── */}
            <View style={s.sectionCard}>
              <Text style={s.sectionTitle}>Today's Targets</Text>
              <View style={s.ringsRow}>
                <RingProgress
                  pct={sleepPct} color="#7B61FF" label="Sleep"
                  value={day.sleep_actual ?? '—'} unit="hr"
                />
                <RingProgress
                  pct={stepsPct} color="#C6FF33" label="Steps"
                  value={fmtSteps(day.steps_actual)} unit="steps"
                />
                <RingProgress
                  pct={waterPct} color="#61D4FF" label="Water"
                  value={day.water_actual ?? '—'} unit="ml"
                />
              </View>
            </View>

            {/* ── Log Section ── */}
            <View style={s.sectionCard}>
              <Text style={s.sectionTitle}>Log Your Day</Text>
              <LogInput
                icon="💤" label="Sleep" unit=" hr"
                value={day.sleep_actual} target={day.sleep_target ?? 8}
                color="#7B61FF" onSave={v => handleLog('sleep_actual', v)}
              />
              <View style={s.divider} />
              <LogInput
                icon="👟" label="Steps" unit=" steps"
                value={day.steps_actual} target={day.steps_target ?? 8000}
                color="#C6FF33" onSave={v => handleLog('steps_actual', v)}
              />
              <View style={s.divider} />
              <LogInput
                icon="💧" label="Water" unit=" ml"
                value={day.water_actual} target={day.water_target ?? 2000}
                color="#61D4FF" onSave={v => handleLog('water_actual', v)}
              />
            </View>

            {/* ── Workout ── */}
            {!day.is_rest && day.exercises?.length > 0 && (
              <View style={s.sectionCard}>
                <View style={s.sectionTitleRow}>
                  <Text style={s.sectionTitle}>Workout</Text>
                  <View style={[s.badge, { backgroundColor: workoutColor + '22', borderColor: workoutColor + '55' }]}>
                    <Text style={[s.badgeTxt, { color: workoutColor }]}>{day.exercises.length} exercises</Text>
                  </View>
                </View>
                {day.exercises.map((exercise, i) => (
                  <ExerciseRow key={i} exercise={exercise} index={i} color={workoutColor} />
                ))}
              </View>
            )}

            {/* ── Rest Day ── */}
            {day.is_rest && (
              <View style={[s.sectionCard, s.restCard]}>
                <Text style={s.restEmoji}>🛌</Text>
                <Text style={s.restTitle}>Recovery Day</Text>
                <Text style={s.restSub}>
                  {day.rest_note || 'Focus on sleep, hydration, and light movement like walking or stretching.'}
                </Text>
              </View>
            )}

            {/* ── Meals ── */}
            {day.meals?.length > 0 && (
              <View style={s.sectionCard}>
                <Text style={s.sectionTitle}>Meals</Text>
                {day.meals.map((meal, i) => (
                  <MealCard key={i} meal={meal} index={i} />
                ))}
              </View>
            )}
          </Animated.ScrollView>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header:             { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1A1730' },
  backBtn:            { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E1A35', alignItems: 'center', justifyContent: 'center' },
  backTxt:            { color: '#F4F0FF', fontSize: 18 },
  headerTitle:        { color: '#F4F0FF', fontSize: 20, fontWeight: '800' },
  headerSub:          { color: '#4A4268', fontSize: 11, marginTop: 2 },
  aiBadge:            { backgroundColor: '#7B61FF22', borderRadius: 10, borderWidth: 1, borderColor: '#7B61FF55', paddingHorizontal: 8, paddingVertical: 4 },
  aiBadgeTxt:         { color: '#7B61FF', fontSize: 11, fontWeight: '800' },

  dayScroll:          { maxHeight: 84, borderBottomWidth: 1, borderBottomColor: '#1A1730' },
  dayScrollContent:   { paddingHorizontal: 14, paddingVertical: 12, gap: 8, flexDirection: 'row' },
  dayPill:            { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: '#12102A', borderWidth: 1, borderColor: '#2D2850', minWidth: 58 },
  dayPillActive:      { backgroundColor: '#1E1A35', borderColor: '#7B61FF66' },
  dayPillRest:        { opacity: 0.55 },
  dayPillLabel:       { color: '#8B82AD', fontSize: 12, fontWeight: '700' },
  dayPillLabelActive: { color: '#F4F0FF' },
  dayTypeTxt:         { fontSize: 9, fontWeight: '700', marginTop: 2 },
  dayRestTxt:         { color: '#4A4268', fontSize: 9, fontWeight: '600', marginTop: 2 },

  content:            { padding: 16, gap: 14 },
  dayTitleRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayTitleDot:        { width: 10, height: 10, borderRadius: 5 },
  dayTitle:           { color: '#F4F0FF', fontSize: 22, fontWeight: '800' },
  dayNote:            { color: '#8B82AD', fontSize: 13, lineHeight: 20, marginTop: 2 },

  sectionCard:        { backgroundColor: '#12102A', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1A1730', gap: 12 },
  sectionTitleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:       { color: '#F4F0FF', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  badge:              { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:           { fontSize: 10, fontWeight: '700' },
  divider:            { height: 1, backgroundColor: '#1A1730' },
  ringsRow:           { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4 },

  restCard:           { alignItems: 'center', gap: 8, paddingVertical: 24 },
  restEmoji:          { fontSize: 36 },
  restTitle:          { color: '#F4F0FF', fontSize: 18, fontWeight: '800' },
  restSub:            { color: '#8B82AD', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  emptyWrap:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 },
  emptyEmoji:         { fontSize: 56 },
  emptyTitle:         { color: '#F4F0FF', fontSize: 22, fontWeight: '800' },
  emptySub:           { color: '#8B82AD', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});

const li = StyleSheet.create({
  wrap:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  left:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon:      { fontSize: 22 },
  label:     { color: '#F4F0FF', fontSize: 13, fontWeight: '700' },
  target:    { color: '#4A4268', fontSize: 11 },
  inputRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input:     { backgroundColor: '#0E0C15', borderRadius: 10, borderWidth: 1, borderColor: '#2D2850', color: '#F4F0FF', fontSize: 13, paddingHorizontal: 10, paddingVertical: 6, minWidth: 80, textAlign: 'center' },
  saveBtn:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  saveTxt:   { color: '#000', fontSize: 14, fontWeight: '800' },
  cancelBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1E1A35', alignItems: 'center', justifyContent: 'center' },
  cancelTxt: { color: '#8B82AD', fontSize: 12 },
  logBtn:    { borderRadius: 10, borderWidth: 1, borderColor: '#2D2850', paddingHorizontal: 12, paddingVertical: 6 },
  logTxt:    { color: '#8B82AD', fontSize: 12, fontWeight: '700' },
});

const ex = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  num:    { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  numTxt: { fontSize: 11, fontWeight: '800' },
  name:   { color: '#E8E3FF', fontSize: 13, fontWeight: '600' },
  meta:   { color: '#8B82AD', fontSize: 11, marginTop: 2 },
  tag:    { backgroundColor: '#1E1A35', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tagTxt: { color: '#4A4268', fontSize: 9, fontWeight: '700' },
});

const mc = StyleSheet.create({
  card:    { backgroundColor: '#0E0C15', borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: '#1A1730' },
  header:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon:    { fontSize: 16 },
  type:    { color: '#F4F0FF', fontSize: 13, fontWeight: '700', flex: 1 },
  calTag:  { backgroundColor: '#7B61FF22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  calTxt:  { color: '#7B61FF', fontSize: 10, fontWeight: '700' },
  foodRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  dot:     { color: '#4A4268', fontSize: 14, lineHeight: 20 },
  food:    { color: '#C8BFEE', fontSize: 12, lineHeight: 20, flex: 1 },
  note:    { color: '#4A4268', fontSize: 11, fontStyle: 'italic', marginTop: 2 },
});