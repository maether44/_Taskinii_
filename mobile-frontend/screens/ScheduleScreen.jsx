/**
 * ScheduleScreen.jsx
 * - Exercise checkboxes + "Complete Day" button
 * - Missed workout warning + carryover to next day
 * - Sleep/steps/water auto-synced from Supabase
 * - Schedule persists across app restarts
 */
import {
  Animated, Easing, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { scheduleStore } from '../store/scheduleStore';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
const WORKOUT_COLORS = {
  push: '#7B61FF', pull: '#FF6B6B', legs: '#C6FF33',
  upper: '#61D4FF', lower: '#FFB347', full: '#FF61D4', cardio: '#61FFD4',
};

const getWorkoutColor = (type = '') => {
  const t = type.toLowerCase();
  for (const [k, v] of Object.entries(WORKOUT_COLORS)) { if (t.includes(k)) return v; }
  return '#7B61FF';
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const getDateForDayIndex = (i) => {
  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const d = new Date(today);
  d.setDate(today.getDate() + mondayOffset + i);
  return d.toISOString().slice(0, 10);
};

const estimateFoodCals = (meal) => {
  if (!meal.calories || !meal.foods?.length) return null;
  return Math.round(meal.calories / meal.foods.length);
};

// ─── Ring Progress ────────────────────────────────────────────────────────────
function RingProgress({ pct, size = 72, stroke = 6, color, label, actual, target, unit }) {
  const p = clamp(pct, 0, 1);
  const done = p >= 1;
  return (
    <View style={{ alignItems: 'center', gap: 5 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: '#1E1A35' }} />
        <View style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke,
          borderColor: 'transparent',
          borderTopColor:    p > 0    ? color : 'transparent',
          borderRightColor:  p > 0.25 ? color : 'transparent',
          borderBottomColor: p > 0.5  ? color : 'transparent',
          borderLeftColor:   p > 0.75 ? color : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }} />
        <View style={{ width: size - stroke * 2 - 4, height: size - stroke * 2 - 4, borderRadius: (size - stroke * 2 - 4) / 2, backgroundColor: done ? color + '22' : color + '14', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: done ? color : '#F4F0FF', fontSize: 11, fontWeight: '800' }}>{actual ?? '—'}</Text>
          <Text style={{ color: '#4A4268', fontSize: 8 }}>{unit}</Text>
        </View>
      </View>
      <Text style={{ color: '#8B82AD', fontSize: 10, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: '#3D3560', fontSize: 9 }}>/{target}{unit}</Text>
    </View>
  );
}

// ─── Exercise Row with checkbox ───────────────────────────────────────────────
function ExerciseRow({ exercise, index, color, checked, onToggle, carriedOver }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 260, delay: index * 50, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 260, delay: index * 50, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[ex.row, { opacity: fade, transform: [{ translateY: slide }] }]}>
      {/* Checkbox */}
      <TouchableOpacity
        style={[ex.checkbox, checked && { backgroundColor: color, borderColor: color }]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        {checked && <Text style={ex.checkTxt}>✓</Text>}
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[ex.name, checked && { textDecorationLine: 'line-through', color: '#4A4268' }]}>
            {exercise.name}
          </Text>
          {carriedOver && (
            <View style={ex.carriedTag}>
              <Text style={ex.carriedTxt}>carried over</Text>
            </View>
          )}
        </View>
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
      {exercise.muscle && <View style={ex.tag}><Text style={ex.tagTxt}>{exercise.muscle}</Text></View>}
    </Animated.View>
  );
}

// ─── Meal Card ────────────────────────────────────────────────────────────────
function MealCard({ meal, index }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 260, delay: index * 60, useNativeDriver: true }).start();
  }, []);
  const icon        = MEAL_ICONS[meal.type?.toLowerCase()] || '🍽️';
  const perFoodCals = estimateFoodCals(meal);
  return (
    <Animated.View style={[mc.card, { opacity: fade }]}>
      <View style={mc.header}>
        <Text style={mc.icon}>{icon}</Text>
        <Text style={mc.type}>{meal.type}</Text>
        {meal.calories != null && (
          <View style={mc.calBadge}>
            <Text style={mc.calBig}>{meal.calories}</Text>
            <Text style={mc.calUnit}> kcal</Text>
          </View>
        )}
      </View>
      <View style={mc.foodsWrap}>
        {meal.foods?.map((food, i) => (
          <View key={i} style={mc.foodRow}>
            <View style={mc.foodDot} />
            <Text style={mc.food}>{food}</Text>
            {perFoodCals != null && <Text style={mc.foodCal}>~{perFoodCals} kcal</Text>}
          </View>
        ))}
      </View>
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
      <Text style={s.emptySub}>Ask Yara to build your weekly plan.{'\n'}"Give me my weekly schedule"</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user }   = useAuth();

  const [schedule,    setSchedule]    = useState(scheduleStore.get());
  const [completion,  setCompletion]  = useState(scheduleStore.getCompletion());
  const [activeDay,   setActiveDay]   = useState(0);
  const [activityMap, setActivityMap] = useState({});

  const headerFade  = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsub = scheduleStore.subscribe((s, c) => {
      setSchedule(s);
      setCompletion(c);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchActivity = async () => {
      const dates = Array.from({ length: 7 }, (_, i) => getDateForDayIndex(i));
      const { data } = await supabase
        .from('daily_activity')
        .select('date, sleep_hours, steps, water_ml')
        .eq('user_id', user.id)
        .in('date', dates);
      if (!data) return;
      const map = {};
      data.forEach(row => { map[row.date] = row; });
      setActivityMap(map);
    };
    fetchActivity();
  }, [user]);

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

  const todayDate    = new Date().toISOString().slice(0, 10);
  const day          = schedule?.days?.[activeDay];
  const workoutColor = day ? getWorkoutColor(day.workout_type) : '#7B61FF';
  const dayDate      = getDateForDayIndex(activeDay);
  const activity     = activityMap[dayDate] ?? {};
  const dayCompletion = completion[dayDate] ?? { done: false, checked: [] };

  // ── Carryover logic ───────────────────────────────────────────────────────
  const getAdjustedTarget = (field, supaField, baseTarget) => {
    if (activeDay === 0) return baseTarget;
    const yActivity = activityMap[getDateForDayIndex(activeDay - 1)] ?? {};
    const yPlan     = schedule?.days?.[activeDay - 1];
    if (!yPlan) return baseTarget;
    const yTarget = yPlan[`${field}_target`] ?? baseTarget;
    const yActual = yActivity[supaField] ?? 0;
    return baseTarget + Math.max(0, yTarget - yActual);
  };

  const sleepTarget = day ? getAdjustedTarget('sleep', 'sleep_hours', day.sleep_target ?? 8)    : 8;
  const stepsTarget = day ? getAdjustedTarget('steps', 'steps',       day.steps_target ?? 8000) : 8000;
  const waterTarget = day ? getAdjustedTarget('water', 'water_ml',    day.water_target ?? 2000) : 2000;

  const sleepActual = activity.sleep_hours ?? null;
  const stepsActual = activity.steps       ?? null;
  const waterActual = activity.water_ml    ?? null;

  const sleepPct = sleepActual != null ? clamp(sleepActual / sleepTarget, 0, 1) : 0;
  const stepsPct = stepsActual != null ? clamp(stepsActual / stepsTarget, 0, 1) : 0;
  const waterPct = waterActual != null ? clamp(waterActual / waterTarget, 0, 1) : 0;
  const fmtSteps = (v) => v != null ? (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)) : null;

  // ── Workout carryover from yesterday ─────────────────────────────────────
  const yesterdayDate       = getDateForDayIndex(activeDay - 1);
  const yesterdayCompletion = completion[yesterdayDate] ?? { done: false, checked: [] };
  const yesterdayPlan       = schedule?.days?.[activeDay - 1];
  const yesterdayWasMissed  = activeDay > 0
    && !yesterdayCompletion.done
    && !yesterdayPlan?.is_rest
    && yesterdayPlan?.exercises?.length > 0
    && getDateForDayIndex(activeDay - 1) < todayDate;

  // Build exercise list for today: regular + carried over from yesterday
  const baseExercises     = day?.exercises ?? [];
  const carriedExercises  = yesterdayWasMissed
    ? (yesterdayPlan?.exercises ?? []).filter((_, i) => !yesterdayCompletion.checked.includes(i))
    : [];
  const allExercises      = [
    ...baseExercises.map(e => ({ ...e, _carried: false })),
    ...carriedExercises.map(e => ({ ...e, _carried: true })),
  ];

  // ── Completion state ──────────────────────────────────────────────────────
  const checkedCount    = dayCompletion.checked.length;
  const allChecked      = allExercises.length > 0 && checkedCount >= allExercises.length;
  const isDayDone       = dayCompletion.done;
  const isToday         = dayDate === todayDate;
  const canComplete     = allChecked && !isDayDone && isToday;

  const hasHealthCarryover = activeDay > 0 && (
    sleepTarget > (day?.sleep_target ?? 8) ||
    stepsTarget > (day?.steps_target ?? 8000) ||
    waterTarget > (day?.water_target ?? 2000)
  );

  const totalCals = day?.meals?.reduce((sum, m) => sum + (m.calories ?? 0), 0) ?? 0;

  const handleToggle = (index) => {
    if (isDayDone) return; // locked after completion
    scheduleStore.toggleExercise(dayDate, index);
  };

  const handleCompletDay = () => {
    scheduleStore.markDayDone(dayDate);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0E0C1A' }}>
      {/* Header */}
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
        {schedule && <View style={s.aiBadge}><Text style={s.aiBadgeTxt}>✦ AI</Text></View>}
      </Animated.View>

      {!schedule ? <EmptyState /> : (
        <>
          {/* Day Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dayScroll} contentContainerStyle={s.dayScrollContent}>
            {schedule.days.map((d, i) => {
              const dDate    = getDateForDayIndex(i);
              const dComp    = completion[dDate] ?? { done: false, checked: [] };
              const isToday  = dDate === todayDate;
              const isMissed = i > 0
                && !dComp.done
                && !d.is_rest
                && d.exercises?.length > 0
                && dDate < todayDate;

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.dayPill,
                    activeDay === i && s.dayPillActive,
                    d.is_rest && s.dayPillRest,
                    isToday && s.dayPillToday,
                    dComp.done && s.dayPillDone,
                  ]}
                  onPress={() => setActiveDay(i)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.dayPillLabel, activeDay === i && s.dayPillLabelActive]}>{DAY_LABELS[i]}</Text>
                  {dComp.done
                    ? <Text style={s.doneTxt}>✓</Text>
                    : d.is_rest
                      ? <Text style={s.dayRestTxt}>Rest</Text>
                      : <Text style={[s.dayTypeTxt, { color: isMissed ? '#FF6B6B' : getWorkoutColor(d.workout_type) }]}>
                          {d.workout_type?.split(' ')[0] || ''}
                        </Text>
                  }
                  {isToday && !dComp.done && <View style={s.todayDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Animated.ScrollView
            style={{ flex: 1, opacity: contentFade }}
            contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Day title */}
            <View style={s.dayTitleRow}>
              <View style={[s.dayTitleDot, { backgroundColor: isDayDone ? '#C6FF33' : workoutColor }]} />
              <Text style={s.dayTitle}>
                {isDayDone ? '✅ Day Complete!' : day.is_rest ? '🛌 Rest Day' : (day.workout_type || 'Workout')}
              </Text>
            </View>
            {day.note && !isDayDone && <Text style={s.dayNote}>{day.note}</Text>}

            {/* Missed workout warning */}
            {yesterdayWasMissed && (
              <View style={s.missedBanner}>
                <Text style={s.missedTitle}>⚠️ Yesterday's {yesterdayPlan?.workout_type} was missed</Text>
                <Text style={s.missedSub}>
                  {carriedExercises.length} uncompleted exercise{carriedExercises.length !== 1 ? 's' : ''} added to today
                </Text>
              </View>
            )}

            {/* Health carryover */}
            {hasHealthCarryover && (
              <View style={s.carryoverBanner}>
                <Text style={s.carryoverTxt}>↑ Sleep/steps/water targets adjusted from yesterday</Text>
              </View>
            )}

            {/* Progress Rings */}
            <View style={s.sectionCard}>
              <Text style={s.sectionTitle}>Today's Progress</Text>
              <View style={s.ringsRow}>
                <RingProgress pct={sleepPct} color="#7B61FF" label="Sleep" actual={sleepActual ?? '—'} target={sleepTarget} unit="hr" />
                <RingProgress pct={stepsPct} color="#C6FF33" label="Steps" actual={fmtSteps(stepsActual) ?? '—'} target={stepsTarget >= 1000 ? `${(stepsTarget/1000).toFixed(0)}k` : stepsTarget} unit="steps" />
                <RingProgress pct={waterPct} color="#61D4FF" label="Water" actual={waterActual ?? '—'} target={waterTarget} unit="ml" />
              </View>
              <Text style={s.syncNote}>Auto-synced from your daily tracking</Text>
            </View>

            {/* Workout with checkboxes */}
            {!day.is_rest && allExercises.length > 0 && (
              <View style={s.sectionCard}>
                <View style={s.sectionTitleRow}>
                  <Text style={s.sectionTitle}>Workout</Text>
                  <View style={[s.badge, { backgroundColor: workoutColor + '22', borderColor: workoutColor + '55' }]}>
                    <Text style={[s.badgeTxt, { color: workoutColor }]}>
                      {checkedCount}/{allExercises.length} done
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={s.workoutProgressBg}>
                  <View style={[s.workoutProgressFill, {
                    width: `${allExercises.length > 0 ? (checkedCount / allExercises.length) * 100 : 0}%`,
                    backgroundColor: workoutColor,
                  }]} />
                </View>

                {allExercises.map((exercise, i) => (
                  <ExerciseRow
                    key={i}
                    exercise={exercise}
                    index={i}
                    color={workoutColor}
                    checked={dayCompletion.checked.includes(i)}
                    onToggle={() => handleToggle(i)}
                    carriedOver={exercise._carried}
                  />
                ))}

                {/* Complete Day button */}
                {isToday && (
                  isDayDone ? (
                    <View style={s.completedBadge}>
                      <Text style={s.completedTxt}>🎉 Workout Complete!</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[s.completeDayBtn, !allChecked && s.completeDayBtnDisabled]}
                      onPress={handleCompletDay}
                      disabled={!allChecked}
                      activeOpacity={0.85}
                    >
                      <Text style={[s.completeDayTxt, !allChecked && { color: '#4A4268' }]}>
                        {allChecked ? '✓ Mark Day as Complete' : `Complete all ${allExercises.length - checkedCount} remaining exercises first`}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            )}

            {/* Rest Day */}
            {day.is_rest && (
              <View style={[s.sectionCard, s.restCard]}>
                <Text style={s.restEmoji}>🛌</Text>
                <Text style={s.restTitle}>Recovery Day</Text>
                <Text style={s.restSub}>{day.rest_note || 'Focus on sleep, hydration, and light movement like walking or stretching.'}</Text>
              </View>
            )}

            {/* Meals */}
            {day.meals?.length > 0 && (
              <View style={s.sectionCard}>
                <View style={s.sectionTitleRow}>
                  <Text style={s.sectionTitle}>Meals</Text>
                  {totalCals > 0 && (
                    <View style={[s.badge, { backgroundColor: '#C6FF3322', borderColor: '#C6FF3355' }]}>
                      <Text style={[s.badgeTxt, { color: '#C6FF33' }]}>{totalCals} kcal total</Text>
                    </View>
                  )}
                </View>
                {day.meals.map((meal, i) => <MealCard key={i} meal={meal} index={i} />)}
              </View>
            )}
          </Animated.ScrollView>
        </>
      )}
    </View>
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

  dayScroll:          { maxHeight: 90, borderBottomWidth: 1, borderBottomColor: '#1A1730' },
  dayScrollContent:   { paddingHorizontal: 14, paddingVertical: 12, gap: 8, flexDirection: 'row' },
  dayPill:            { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: '#12102A', borderWidth: 1, borderColor: '#2D2850', minWidth: 58 },
  dayPillActive:      { backgroundColor: '#1E1A35', borderColor: '#7B61FF66' },
  dayPillRest:        { opacity: 0.55 },
  dayPillToday:       { borderColor: '#C6FF3366' },
  dayPillDone:        { borderColor: '#C6FF3399', backgroundColor: '#C6FF3310' },
  dayPillLabel:       { color: '#8B82AD', fontSize: 12, fontWeight: '700' },
  dayPillLabelActive: { color: '#F4F0FF' },
  dayTypeTxt:         { fontSize: 9, fontWeight: '700', marginTop: 2 },
  dayRestTxt:         { color: '#4A4268', fontSize: 9, fontWeight: '600', marginTop: 2 },
  doneTxt:            { color: '#C6FF33', fontSize: 11, fontWeight: '800', marginTop: 2 },
  todayDot:           { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C6FF33', marginTop: 3 },

  content:            { padding: 16, gap: 14 },
  dayTitleRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayTitleDot:        { width: 10, height: 10, borderRadius: 5 },
  dayTitle:           { color: '#F4F0FF', fontSize: 22, fontWeight: '800' },
  dayNote:            { color: '#8B82AD', fontSize: 13, lineHeight: 20, marginTop: 2 },

  missedBanner:       { backgroundColor: '#FF6B6B18', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FF6B6B33', gap: 3 },
  missedTitle:        { color: '#FF6B6B', fontSize: 13, fontWeight: '700' },
  missedSub:          { color: '#FF6B6B99', fontSize: 11 },

  carryoverBanner:    { backgroundColor: '#FFB34718', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#FFB34733' },
  carryoverTxt:       { color: '#FFB347', fontSize: 12, fontWeight: '600' },

  sectionCard:        { backgroundColor: '#12102A', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1A1730', gap: 12 },
  sectionTitleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:       { color: '#F4F0FF', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  badge:              { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:           { fontSize: 10, fontWeight: '700' },
  ringsRow:           { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4 },
  syncNote:           { color: '#3D3560', fontSize: 10, textAlign: 'center' },

  workoutProgressBg:  { height: 4, backgroundColor: '#1E1A35', borderRadius: 2, overflow: 'hidden' },
  workoutProgressFill:{ height: 4, borderRadius: 2 },

  completeDayBtn:     { backgroundColor: '#C6FF33', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  completeDayBtnDisabled: { backgroundColor: '#1E1A35' },
  completeDayTxt:     { color: '#000', fontSize: 14, fontWeight: '800' },
  completedBadge:     { backgroundColor: '#C6FF3318', borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#C6FF3344' },
  completedTxt:       { color: '#C6FF33', fontSize: 14, fontWeight: '800' },

  restCard:           { alignItems: 'center', gap: 8, paddingVertical: 24 },
  restEmoji:          { fontSize: 36 },
  restTitle:          { color: '#F4F0FF', fontSize: 18, fontWeight: '800' },
  restSub:            { color: '#8B82AD', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  emptyWrap:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 },
  emptyEmoji:         { fontSize: 56 },
  emptyTitle:         { color: '#F4F0FF', fontSize: 22, fontWeight: '800' },
  emptySub:           { color: '#8B82AD', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});

const ex = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox:   { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#2D2850', alignItems: 'center', justifyContent: 'center' },
  checkTxt:   { color: '#000', fontSize: 12, fontWeight: '900' },
  name:       { color: '#E8E3FF', fontSize: 13, fontWeight: '600' },
  meta:       { color: '#8B82AD', fontSize: 11, marginTop: 2 },
  tag:        { backgroundColor: '#1E1A35', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tagTxt:     { color: '#4A4268', fontSize: 9, fontWeight: '700' },
  carriedTag: { backgroundColor: '#FF6B6B22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  carriedTxt: { color: '#FF6B6B', fontSize: 9, fontWeight: '700' },
});

const mc = StyleSheet.create({
  card:      { backgroundColor: '#0E0C15', borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: '#1A1730' },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon:      { fontSize: 20 },
  type:      { color: '#F4F0FF', fontSize: 14, fontWeight: '700', flex: 1 },
  calBadge:  { flexDirection: 'row', alignItems: 'baseline', backgroundColor: '#C6FF3318', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#C6FF3344' },
  calBig:    { color: '#C6FF33', fontSize: 15, fontWeight: '800' },
  calUnit:   { color: '#C6FF3399', fontSize: 10, fontWeight: '600' },
  foodsWrap: { gap: 6 },
  foodRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  foodDot:   { width: 5, height: 5, borderRadius: 3, backgroundColor: '#3D3560' },
  food:      { color: '#C8BFEE', fontSize: 13, lineHeight: 20, flex: 1 },
  foodCal:   { color: '#4A4268', fontSize: 11, fontWeight: '600' },
});