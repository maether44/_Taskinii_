/**
 * TodayScheduleWidget.js
 * Home page widget showing today's ALEXI schedule.
 * Reads from scheduleStore — no extra API calls.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { scheduleStore } from '../../store/scheduleStore';
import { useToday } from '../../context/TodayContext';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WORKOUT_COLORS = {
  push: '#7B61FF', pull: '#FF6B6B', legs: '#C6FF33',
  upper: '#61D4FF', lower: '#FFB347', full: '#FF61D4', cardio: '#61FFD4',
};

const getWorkoutColor = (type = '') => {
  const t = type.toLowerCase();
  for (const [k, v] of Object.entries(WORKOUT_COLORS)) {
    if (t.includes(k)) return v;
  }
  return '#7B61FF';
};

const getTodayIndex = () => {
  const dow = new Date().getDay(); // 0=Sun
  return dow === 0 ? 6 : dow - 1; // convert to Mon=0
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const fmtSteps = (value) => {
  if (value == null) return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
};

const fmtWater = (value) => {
  if (value == null) return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}L` : `${value}ml`;
};

export default function TodayScheduleWidget({ navigation }) {
  const [schedule, setSchedule] = useState(scheduleStore.get());
  const { steps, waterMl, sleepHours, goals } = useToday();

  useEffect(() => {
    // Sync with store if it updates
    const unsub = scheduleStore.subscribe(setSchedule);
    return unsub;
  }, []);

  if (!schedule?.days) return null;

  const todayIndex = getTodayIndex();
  const today = schedule.days[todayIndex];
  if (!today) return null;

  const color        = today.is_rest ? '#4A4268' : getWorkoutColor(today.workout_type);
  const totalCals    = today.meals?.reduce((s, m) => s + (m.calories ?? 0), 0) ?? 0;
  const exerciseCount = today.exercises?.length ?? 0;
  const sleepTarget = today.sleep_target ?? 8;
  const stepsTarget = today.steps_target ?? goals?.steps_target ?? 8000;
  const waterTarget = today.water_target ?? goals?.water_target_ml ?? 2000;
  const sleepPct = sleepHours != null ? clamp(sleepHours / sleepTarget, 0, 1) : 0;
  const stepsPct = stepsTarget > 0 ? clamp(steps / stepsTarget, 0, 1) : 0;
  const waterPct = waterTarget > 0 ? clamp(waterMl / waterTarget, 0, 1) : 0;

  return (
    <Animated.View entering={FadeInDown.delay(720).springify().damping(15)} style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.label}>📅 TODAY'S PLAN</Text>
          <View style={styles.dayRow}>
            <View style={[styles.typeDot, { backgroundColor: color }]} />
            <Text style={styles.dayType}>
              {today.is_rest ? 'Rest Day' : (today.workout_type || 'Workout')}
            </Text>
            <Text style={styles.dayName}>{DAY_LABELS[todayIndex]}</Text>
          </View>
        </View>
        <Pressable
          style={[styles.viewBtn, { borderColor: color + '66' }]}
          onPress={() => navigation.navigate('Schedule')}
        >
          <Text style={[styles.viewBtnTxt, { color }]}>View →</Text>
        </Pressable>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {!today.is_rest && exerciseCount > 0 && (
          <View style={styles.statChip}>
            <Text style={styles.statEmoji}>💪</Text>
            <Text style={styles.statTxt}>{exerciseCount} exercises</Text>
          </View>
        )}
        {today.sleep_target && (
          <View style={styles.statChip}>
            <Text style={styles.statEmoji}>💤</Text>
            <Text style={styles.statTxt}>{today.sleep_target}h sleep</Text>
          </View>
        )}
        {today.steps_target && (
          <View style={styles.statChip}>
            <Text style={styles.statEmoji}>👟</Text>
            <Text style={styles.statTxt}>{(today.steps_target / 1000).toFixed(0)}k steps</Text>
          </View>
        )}
        {totalCals > 0 && (
          <View style={styles.statChip}>
            <Text style={styles.statEmoji}>🍽️</Text>
            <Text style={styles.statTxt}>{totalCals} kcal</Text>
          </View>
        )}
      </View>

      <View style={styles.progressWrap}>
        <Text style={styles.progressLabel}>TODAY'S PROGRESS</Text>

        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Steps</Text>
            <Text style={styles.progressValue}>{fmtSteps(steps)} / {fmtSteps(stepsTarget)}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${stepsPct * 100}%`, backgroundColor: '#C6FF33' }]} />
          </View>
        </View>

        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Sleep</Text>
            <Text style={styles.progressValue}>{sleepHours != null ? `${Number(sleepHours).toFixed(1)}h` : '—'} / {sleepTarget}h</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${sleepPct * 100}%`, backgroundColor: '#7B61FF' }]} />
          </View>
        </View>

        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Water</Text>
            <Text style={styles.progressValue}>{fmtWater(waterMl)} / {fmtWater(waterTarget)}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${waterPct * 100}%`, backgroundColor: '#61D4FF' }]} />
          </View>
        </View>
      </View>

      {/* Exercise preview (top 3) */}
      {!today.is_rest && today.exercises?.length > 0 && (
        <View style={styles.exercisePreview}>
          {today.exercises.slice(0, 3).map((ex, i) => (
            <View key={i} style={styles.exRow}>
              <View style={[styles.exDot, { backgroundColor: color }]} />
              <Text style={styles.exName} numberOfLines={1}>{ex.name}</Text>
              <Text style={styles.exMeta}>{ex.sets}×{ex.reps}</Text>
            </View>
          ))}
          {today.exercises.length > 3 && (
            <Text style={styles.moreTxt}>+{today.exercises.length - 3} more</Text>
          )}
        </View>
      )}

      {today.is_rest && (
        <Text style={styles.restNote}>
          {today.rest_note || 'Focus on recovery — sleep, hydration, light movement.'}
        </Text>
      )}

      {/* AI badge */}
      <View style={styles.aiBadge}>
        <Text style={styles.aiBadgeTxt}>✦ ALEXI AI</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161230',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E1A35',
    marginBottom: 12,
    gap: 14,
  },
  header:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerLeft:  { gap: 4 },
  label:       { color: '#6B5F8A', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  dayRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeDot:     { width: 8, height: 8, borderRadius: 4 },
  dayType:     { color: '#FFF', fontSize: 18, fontWeight: '900' },
  dayName:     { color: '#6B5F8A', fontSize: 13, fontWeight: '600' },
  viewBtn:     { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  viewBtnTxt:  { fontSize: 12, fontWeight: '700' },

  statsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0F0B1E', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#1E1A35' },
  statEmoji:   { fontSize: 12 },
  statTxt:     { color: '#8B82AD', fontSize: 11, fontWeight: '600' },
  progressWrap: { gap: 10, padding: 12, backgroundColor: '#0F0B1E', borderRadius: 14, borderWidth: 1, borderColor: '#1E1A35' },
  progressLabel: { color: '#6B5F8A', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  progressItem: { gap: 6 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTitle: { color: '#F4F0FF', fontSize: 12, fontWeight: '700' },
  progressValue: { color: '#8B82AD', fontSize: 11, fontWeight: '600' },
  progressTrack: { height: 6, backgroundColor: '#1E1A35', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },

  exercisePreview: { gap: 8 },
  exRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exDot:       { width: 5, height: 5, borderRadius: 3 },
  exName:      { color: '#C8BFEE', fontSize: 13, flex: 1 },
  exMeta:      { color: '#4A4268', fontSize: 11 },
  moreTxt:     { color: '#4A4268', fontSize: 11, marginTop: 2 },

  restNote:    { color: '#8B82AD', fontSize: 13, lineHeight: 19 },

  aiBadge:     { alignSelf: 'flex-start', backgroundColor: '#7B61FF18', borderRadius: 8, borderWidth: 1, borderColor: '#7B61FF33', paddingHorizontal: 8, paddingVertical: 3 },
  aiBadgeTxt:  { color: '#7B61FF', fontSize: 10, fontWeight: '700' },
});
