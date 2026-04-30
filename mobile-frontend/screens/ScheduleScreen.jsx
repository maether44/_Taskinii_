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

// ← Defined OUTSIDE the component
const getTodayDayIndex = () => {
  const dow = new Date().getDay();
  return dow === 0 ? 6 : dow - 1;
};

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

// ─── Workout Progress Bar ─────────────────────────────────────────────────────
function WorkoutProgressCard({ checked, total, color, totalCals, isDayDone, isRestDay, stepsActual, stepsTarget, syncedAt }) {
  const pct = total > 0 ? clamp(checked / total, 0, 1) : 0;
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: pct, duration: 600,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [pct]);

  const syncTime = syncedAt ? new Date(syncedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null;

  if (isRestDay) {
    return (
      <View style={p.card}>
        <Text style={p.title}>Today's Progress</Text>
        <View style={p.restRow}>
          <Text style={p.restEmoji}>🛌</Text>
          <View style={{ flex: 1 }}>
            <Text style={p.restLabel}>Recovery Day</Text>
            <Text style={p.restSub}>Focus on sleep and light movement</Text>
          </View>
          {totalCals > 0 && (
            <View style={[p.calBadge, { borderColor: color + '44', backgroundColor: color + '18' }]}>
              <Text style={[p.calVal, { color }]}>{totalCals}</Text>
              <Text style={p.calUnit}>kcal</Text>
            </View>
          )}
        </View>
        <StepsRow stepsActual={stepsActual} stepsTarget={stepsTarget} syncTime={syncTime} />
      </View>
    );
  }

  return (
    <View style={p.card}>
      <Text style={p.title}>Today's Progress</Text>
      <View style={p.row}>
        <View style={p.iconWrap}><Text style={p.icon}>💪</Text></View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={p.labelRow}>
            <Text style={p.label}>
              {isDayDone ? 'Workout Complete!' : total > 0 ? `${checked} of ${total} exercises done` : 'No exercises today'}
            </Text>
            <Text style={[p.pctTxt, { color: isDayDone ? '#C6FF33' : color }]}>
              {Math.round(pct * 100)}%
            </Text>
          </View>
          <View style={p.barBg}>
            <Animated.View style={[p.barFill, {
              backgroundColor: isDayDone ? '#C6FF33' : color,
              width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }]} />
          </View>
        </View>
      </View>
      <StepsRow stepsActual={stepsActual} stepsTarget={stepsTarget} syncTime={syncTime} />
      {totalCals > 0 && (
        <View style={p.row}>
          <View style={p.iconWrap}><Text style={p.icon}>🍽️</Text></View>
          <View style={{ flex: 1 }}>
            <View style={p.labelRow}>
              <Text style={p.label}>Planned meals</Text>
              <Text style={[p.pctTxt, { color: '#C6FF33' }]}>{totalCals} kcal</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function StepsRow({ stepsActual, stepsTarget, syncTime }) {
  const stepsPct = stepsActual != null ? clamp(stepsActual / stepsTarget, 0, 1) : 0;
  const barAnim = useRef(new Animated.Value(0)).current;
  const fmtSteps = (v) => v != null ? (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)) : '—';

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: stepsPct, duration: 600,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [stepsPct]);

  return (
    <View style={p.row}>
      <View style={p.iconWrap}><Text style={p.icon}>👟</Text></View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={p.labelRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={p.label}>{fmtSteps(stepsActual)} steps</Text>
            {syncTime && <Text style={p.syncTime}>synced {syncTime}</Text>}
          </View>
          <Text style={[p.pctTxt, { color: '#C6FF33' }]}>
            /{stepsTarget >= 1000 ? `${Math.round(stepsTarget / 1000)}k` : stepsTarget}
          </Text>
        </View>
        <View style={p.barBg}>
          <Animated.View style={[p.barFill, {
            backgroundColor: '#C6FF33',
            width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }]} />
        </View>
      </View>
    </View>
  );
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────
function ExerciseRow({ exercise, index, color, checked, onToggle, carriedOver }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 260, delay: index * 50, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 260, delay: index * 50, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
    onToggle();
  };

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }, { scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[ex.row, checked && { backgroundColor: color + '10', borderColor: color + '30' }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={[ex.checkbox, checked && { backgroundColor: color, borderColor: color }]}>
          {checked && <Text style={ex.checkTxt}>✓</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[ex.name, checked && { textDecorationLine: 'line-through', color: '#4A4268' }]}>
              {exercise.name}
            </Text>
            {carriedOver && (
              <View style={ex.carriedTag}><Text style={ex.carriedTxt}>carried over</Text></View>
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
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Meal Card ────────────────────────────────────────────────────────────────
function MealCard({ meal, index }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 260, delay: index * 60, useNativeDriver: true }).start();
  }, []);
  const icon = MEAL_ICONS[meal.type?.toLowerCase()] || '🍽️';

  // Support both new format: [{name, calories}] and old format: ["string"]
  const foods = meal.foods ?? [];
  const isNewFormat = foods.length > 0 && typeof foods[0] === 'object';
  const totalCals = meal.calories ?? (isNewFormat ? foods.reduce((s, f) => s + (f.calories ?? 0), 0) : null);
  // Fallback: estimate per-food if old string format and total known
  const fallbackPerCal = (!isNewFormat && totalCals && foods.length > 0)
    ? Math.round(totalCals / foods.length)
    : null;

  return (
    <Animated.View style={[mc.card, { opacity: fade }]}>
      <View style={mc.header}>
        <Text style={mc.icon}>{icon}</Text>
        <Text style={mc.type}>{meal.type}</Text>
        {totalCals != null && (
          <View style={mc.calBadge}>
            <Text style={mc.calBig}>{totalCals}</Text>
            <Text style={mc.calUnit}> kcal</Text>
          </View>
        )}
      </View>
      <View style={mc.foodsWrap}>
        {foods.map((food, i) => {
          const foodName = isNewFormat ? food.name : food;
          const foodCal  = isNewFormat ? food.calories : fallbackPerCal;
          return (
            <View key={i} style={mc.foodRow}>
              <View style={mc.foodDot} />
              <Text style={mc.food}>{foodName}</Text>
              {foodCal != null && (
                <View style={mc.foodCalBadge}>
                  <Text style={mc.foodCal}>{foodCal} kcal</Text>
                </View>
              )}
            </View>
          );
        })}
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
      <Text style={s.emptySub}>Go to Train tab and tap "Generate Plan"{'\n'}to build your weekly schedule.</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user }   = useAuth();

  const [schedule,   setSchedule]   = useState(scheduleStore.get());
  const [completion, setCompletion] = useState(scheduleStore.getCompletion());
  const [activityMap, setActivityMap] = useState({});
  const [syncedAt,    setSyncedAt]    = useState(null);

  // ← Single declaration, safe modulo to avoid out-of-bounds crash
  const [activeDay, setActiveDay] = useState(() => {
    const todayIdx  = getTodayDayIndex();
    const planLen   = scheduleStore.get()?.days?.length ?? 7;
    return todayIdx % planLen;
  });

  const headerFade  = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsub = scheduleStore.subscribe((s, c) => {
      setSchedule(s);
      setCompletion(c);
      // When plan changes, reset activeDay safely
      if (s?.days?.length) {
        setActiveDay(prev => prev % s.days.length);
      }
    });
    return unsub;
  }, []);

  // Guard — if activeDay is somehow out of range, reset to 0
  useEffect(() => {
    if (schedule?.days && activeDay >= schedule.days.length) {
      setActiveDay(0);
    }
  }, [schedule, activeDay]);

  const fetchActivity = async () => {
    if (!user) return;
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
    setSyncedAt(new Date());
  };

  useEffect(() => { fetchActivity(); }, [user]);

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

  const todayDate     = new Date().toISOString().slice(0, 10);
  const day           = schedule?.days?.[activeDay];
  const workoutColor  = day ? getWorkoutColor(day.workout_type) : '#7B61FF';
  const dayDate       = getDateForDayIndex(activeDay);
  const activity      = activityMap[dayDate] ?? {};
  const dayCompletion = completion[dayDate] ?? { done: false, checked: [] };

  const getAdjustedTarget = (field, supaField, baseTarget) => {
    if (activeDay === 0) return baseTarget;
    const yActivity = activityMap[getDateForDayIndex(activeDay - 1)] ?? {};
    const yPlan     = schedule?.days?.[activeDay - 1];
    if (!yPlan) return baseTarget;
    const yTarget = yPlan[`${field}_target`] ?? baseTarget;
    const yActual = yActivity[supaField] ?? 0;
    return baseTarget + Math.max(0, yTarget - yActual);
  };

  const stepsTarget = day ? getAdjustedTarget('steps', 'steps', day.steps_target ?? 10000) : 10000;
  const stepsActual = activity.steps ?? null;

  const yesterdayDate       = getDateForDayIndex(activeDay - 1);
  const yesterdayCompletion = completion[yesterdayDate] ?? { done: false, checked: [] };
  const yesterdayPlan       = schedule?.days?.[activeDay - 1];
  const yesterdayWasMissed  = activeDay > 0
    && !yesterdayCompletion.done
    && !yesterdayPlan?.is_rest
    && yesterdayPlan?.exercises?.length > 0
    && getDateForDayIndex(activeDay - 1) < todayDate;

  const baseExercises    = day?.exercises ?? [];
  const carriedExercises = yesterdayWasMissed
    ? (yesterdayPlan?.exercises ?? []).filter((_, i) => !yesterdayCompletion.checked.includes(i))
    : [];
  const allExercises = [
    ...baseExercises.map(e => ({ ...e, _carried: false })),
    ...carriedExercises.map(e => ({ ...e, _carried: true })),
  ];

  const checkedCount = dayCompletion.checked.length;
  const allChecked   = allExercises.length > 0 && checkedCount >= allExercises.length;
  const isDayDone    = dayCompletion.done;
  const isToday      = dayDate === todayDate;

  const hasHealthCarryover = activeDay > 0 && stepsTarget > (day?.steps_target ?? 10000);
  const totalCals = day?.meals?.reduce((sum, m) => sum + (m.calories ?? 0), 0) ?? 0;

  const handleToggle = (index) => {
    if (isDayDone) return;
    scheduleStore.toggleExercise(dayDate, index);
  };

  const handleCompletDay = () => scheduleStore.markDayDone(dayDate);

  // Guard render — if day is still undefined after all checks, show nothing
  if (schedule && !day) return null;

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
              {new Date(schedule.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity style={s.refreshBtn} onPress={fetchActivity} activeOpacity={0.7}>
            <Text style={s.refreshTxt}>↺</Text>
          </TouchableOpacity>
          {schedule && <View style={s.aiBadge}><Text style={s.aiBadgeTxt}>✦ AI</Text></View>}
        </View>
      </Animated.View>

      {!schedule ? <EmptyState /> : (
        <>
          {/* Day Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dayScroll} contentContainerStyle={s.dayScrollContent}>
            {schedule.days.map((d, i) => {
              const dDate   = getDateForDayIndex(i);
              const dComp   = completion[dDate] ?? { done: false, checked: [] };
              const isTodayPill = dDate === todayDate;
              const isMissed = i > 0 && !dComp.done && !d.is_rest && d.exercises?.length > 0 && dDate < todayDate;

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.dayPill,
                    activeDay === i && s.dayPillActive,
                    d.is_rest && s.dayPillRest,
                    isTodayPill && s.dayPillToday,
                    dComp.done && s.dayPillDone,
                  ]}
                  onPress={() => setActiveDay(i)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.dayPillLabel, activeDay === i && s.dayPillLabelActive]}>
                    {DAY_LABELS[i] ?? `D${i + 1}`}
                  </Text>
                  {dComp.done
                    ? <Text style={s.doneTxt}>✓</Text>
                    : d.is_rest
                      ? <Text style={s.dayRestTxt}>Rest</Text>
                      : <Text style={[s.dayTypeTxt, { color: isMissed ? '#FF6B6B' : getWorkoutColor(d.workout_type) }]}>
                          {d.workout_type?.split(' ')[0] || ''}
                        </Text>
                  }
                  {isTodayPill && !dComp.done && <View style={s.todayDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Animated.ScrollView
            style={{ flex: 1, opacity: contentFade }}
            contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={s.dayTitleRow}>
              <View style={[s.dayTitleDot, { backgroundColor: isDayDone ? '#C6FF33' : workoutColor }]} />
              <Text style={s.dayTitle}>
                {isDayDone ? '✅ Day Complete!' : day.is_rest ? '🛌 Rest Day' : (day.workout_type || day.name || 'Workout')}
              </Text>
            </View>
            {(day.note || day.coachTip) && !isDayDone && (
              <Text style={s.dayNote}>{day.note || day.coachTip}</Text>
            )}

            {yesterdayWasMissed && (
              <View style={s.missedBanner}>
                <Text style={s.missedTitle}>⚠️ Yesterday's {yesterdayPlan?.workout_type} was missed</Text>
                <Text style={s.missedSub}>
                  {carriedExercises.length} uncompleted exercise{carriedExercises.length !== 1 ? 's' : ''} added to today
                </Text>
              </View>
            )}

            {hasHealthCarryover && (
              <View style={s.carryoverBanner}>
                <Text style={s.carryoverTxt}>↑ Step targets adjusted from yesterday's shortfall</Text>
              </View>
            )}

            <WorkoutProgressCard
              checked={checkedCount}
              total={allExercises.length}
              color={workoutColor}
              totalCals={totalCals}
              isDayDone={isDayDone}
              isRestDay={day.is_rest}
              stepsActual={stepsActual}
              stepsTarget={stepsTarget}
              syncedAt={syncedAt}
            />

            {!day.is_rest && allExercises.length > 0 && (
              <View style={s.sectionCard}>
                <View style={s.sectionTitleRow}>
                  <Text style={s.sectionTitle}>Workout</Text>
                  <View style={[s.badge, { backgroundColor: workoutColor + '22', borderColor: workoutColor + '55' }]}>
                    <Text style={[s.badgeTxt, { color: workoutColor }]}>{checkedCount}/{allExercises.length} done</Text>
                  </View>
                </View>
                <View style={s.workoutProgressBg}>
                  <View style={[s.workoutProgressFill, {
                    width: `${allExercises.length > 0 ? (checkedCount / allExercises.length) * 100 : 0}%`,
                    backgroundColor: workoutColor,
                  }]} />
                </View>
                {checkedCount === 0 && allExercises.length > 0 && (
                  <Text style={s.tapHint}>Tap any exercise to mark it done</Text>
                )}
                {allExercises.map((exercise, i) => (
                  <ExerciseRow
                    key={i} exercise={exercise} index={i} color={workoutColor}
                    checked={dayCompletion.checked.includes(i)}
                    onToggle={() => handleToggle(i)}
                    carriedOver={exercise._carried}
                  />
                ))}
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

            {day.is_rest && (
              <View style={[s.sectionCard, s.restCard]}>
                <Text style={s.restEmoji}>🛌</Text>
                <Text style={s.restTitle}>Recovery Day</Text>
                <Text style={s.restSub}>{day.rest_note || 'Focus on sleep, hydration, and light movement like walking or stretching.'}</Text>
              </View>
            )}

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

const s = StyleSheet.create({
  header:             { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1A1730' },
  backBtn:            { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E1A35', alignItems: 'center', justifyContent: 'center' },
  backTxt:            { color: '#F4F0FF', fontSize: 18 },
  headerTitle:        { color: '#F4F0FF', fontSize: 20, fontWeight: '800' },
  headerSub:          { color: '#4A4268', fontSize: 11, marginTop: 2 },
  aiBadge:            { backgroundColor: '#7B61FF22', borderRadius: 10, borderWidth: 1, borderColor: '#7B61FF55', paddingHorizontal: 8, paddingVertical: 4 },
  aiBadgeTxt:         { color: '#7B61FF', fontSize: 11, fontWeight: '800' },
  refreshBtn:         { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1E1A35', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2D2850' },
  refreshTxt:         { color: '#7B61FF', fontSize: 16, fontWeight: '700' },
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
  tapHint:            { color: '#4A4268', fontSize: 11, textAlign: 'center', paddingVertical: 4 },
  sectionCard:        { backgroundColor: '#12102A', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1A1730', gap: 12 },
  sectionTitleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:       { color: '#F4F0FF', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  badge:              { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:           { fontSize: 10, fontWeight: '700' },
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
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4, backgroundColor: '#0E0C15', borderWidth: 1, borderColor: '#1A1730' },
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
  foodCalBadge: { backgroundColor: '#C6FF3310', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#C6FF3325' },
  foodCal:   { color: '#C6FF3399', fontSize: 10, fontWeight: '700' },
});

const p = StyleSheet.create({
  card:       { backgroundColor: '#12102A', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1A1730', gap: 14 },
  title:      { color: '#F4F0FF', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap:   { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1E1A35', alignItems: 'center', justifyContent: 'center' },
  icon:       { fontSize: 16 },
  labelRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:      { color: '#C8BFEE', fontSize: 12, fontWeight: '600' },
  pctTxt:     { fontSize: 12, fontWeight: '800' },
  barBg:      { height: 5, backgroundColor: '#1E1A35', borderRadius: 3, overflow: 'hidden' },
  barFill:    { height: 5, borderRadius: 3 },
  syncTime:   { color: '#3D3560', fontSize: 10 },
  restRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  restEmoji:  { fontSize: 22 },
  restLabel:  { color: '#C8BFEE', fontSize: 13, fontWeight: '600' },
  restSub:    { color: '#4A4268', fontSize: 11, marginTop: 2 },
  calBadge:   { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  calVal:     { fontSize: 16, fontWeight: '800' },
  calUnit:    { color: '#4A4268', fontSize: 9, fontWeight: '600' },
});