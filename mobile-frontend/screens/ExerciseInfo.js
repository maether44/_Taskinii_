import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BASE_IMG } from '../services/exerciseService';
import { useAuth } from '../context/AuthContext';
import { useWorkouts } from '../hooks/useWorkout';
import { supabase } from '../lib/supabase';
import { AppEvents, emit } from '../lib/eventBus';
import { warn } from '../lib/logger';
import { successTap, lightTap } from '../lib/haptics';
import { FS } from '../constants/typography';
import { MUSCLE_FATIGUE, exerciseNeedsWeight } from '../constants/muscleFatigue';

const C = {
  bg: '#0F0B1E', card: '#161230', border: '#1E1A35',
  purple: '#7C5CFC', text: '#FFFFFF', sub: '#6B5F8A',
  accent: '#9D85F5', muted: '#4A4160', lime: '#C8F135',
  red: '#FF6B6B',
};

export default function ExerciseInfo({ route, navigation }) {
  const { exercise } = route.params;
  const { user: authUser } = useAuth();
  const userId = authUser?.id;
  const { startSession, logExercise, finishSession } = useWorkouts(userId);

  const primaryMuscles = exercise.primaryMuscles?.join(', ') || 'N/A';
  const secondaryMuscles = exercise.secondaryMuscles?.join(', ') || 'None';
  const showWeight = exerciseNeedsWeight(exercise.equipment);

  const [logOpen, setLogOpen] = useState(false);
  const [sets, setSets] = useState([{ reps: '', weight: '' }]);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('workout_exercises')
      .select(`
        sets, reps, weight_kg,
        exercises!inner(name),
        workout_sessions!inner(started_at, user_id)
      `)
      .eq('exercises.name', exercise.name)
      .eq('workout_sessions.user_id', userId)
      .order('id', { ascending: false })
      .limit(5);
    if (data) setHistory(data);
  }, [userId, exercise.name]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const addSet = () => {
    const last = sets[sets.length - 1];
    setSets([...sets, { reps: last?.reps || '', weight: last?.weight || '' }]);
    lightTap();
  };

  const updateSet = (idx, updated) => {
    const next = [...sets];
    next[idx] = updated;
    setSets(next);
  };

  const removeSet = (idx) => {
    if (sets.length <= 1) return;
    setSets(sets.filter((_, i) => i !== idx));
  };

  const resolveDbExerciseId = useCallback(async () => {
    const { data: existing } = await supabase
      .from('exercises')
      .select('id')
      .eq('name', exercise.name)
      .limit(1)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: inserted } = await supabase
      .from('exercises')
      .insert({
        name: exercise.name,
        category: exercise.category || null,
        muscle_group: (exercise.primaryMuscles || [])[0] || null,
        difficulty: exercise.level || null,
      })
      .select('id')
      .single();

    return inserted?.id ?? null;
  }, [exercise]);

  const handleSaveLog = useCallback(async () => {
    if (!userId || saving) return;

    const validSets = sets.filter(s => s.reps && parseInt(s.reps) > 0);
    if (validSets.length === 0) {
      Alert.alert('No sets logged', 'Enter reps for at least one set.');
      return;
    }

    setSaving(true);
    try {
      const dbId = await resolveDbExerciseId();
      const sessionId = await startSession();
      if (!sessionId) throw new Error('Failed to create session');

      const setCount = validSets.length;
      const repCount = validSets.reduce((sum, s) => sum + parseInt(s.reps || 0), 0);
      const avgWeight = showWeight
        ? validSets.reduce((sum, s) => sum + parseFloat(s.weight || 0), 0) / validSets.length
        : null;

      await logExercise(sessionId, {
        exerciseId: dbId,
        sets: setCount,
        reps: repCount,
        weightKg: avgWeight != null ? Math.round(avgWeight * 10) / 10 || null : null,
        durationSecs: null,
        postureScore: null,
      });

      const calories = Math.max(1, repCount * 5);
      const notesStr = `${exercise.name} — ${setCount} sets · ${repCount} reps`;

      await finishSession(sessionId, { caloriesBurned: calories, notes: notesStr });

      // Update daily_activity
      const TODAY = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('daily_activity')
        .select('id, calories_burned')
        .eq('user_id', userId)
        .eq('date', TODAY)
        .maybeSingle();

      const newTotal = (existing?.calories_burned || 0) + calories;
      if (existing) {
        await supabase.from('daily_activity').update({ calories_burned: newTotal }).eq('id', existing.id);
      } else {
        await supabase.from('daily_activity').insert({ user_id: userId, date: TODAY, calories_burned: calories });
      }

      // Award XP
      const { data: xpResult } = await supabase.rpc('award_xp', {
        p_user_id: userId, p_amount: 50, p_source: 'workout',
        p_description: `Logged: ${exercise.name}`,
      });
      emit(AppEvents.XP_AWARDED, { amount: 50, source: 'workout', result: xpResult });

      await supabase.rpc('check_achievements', { p_user_id: userId });

      // Update muscle fatigue
      const fatigueUpdates = {};
      for (const m of (exercise.primaryMuscles || [])) {
        const entries = MUSCLE_FATIGUE[m.toLowerCase()] || [];
        for (const e of entries) {
          if (!fatigueUpdates[e.name]) fatigueUpdates[e.name] = 0;
          fatigueUpdates[e.name] = Math.min(100, fatigueUpdates[e.name] + e.inc);
        }
      }
      if (Object.keys(fatigueUpdates).length > 0) {
        const { data: currentFatigue } = await supabase
          .from('muscle_fatigue')
          .select('muscle_name, fatigue_pct')
          .eq('user_id', userId);
        const currentMap = {};
        (currentFatigue || []).forEach(r => { currentMap[r.muscle_name] = r.fatigue_pct; });
        const upserts = Object.entries(fatigueUpdates).map(([name, inc]) => ({
          user_id: userId,
          muscle_name: name,
          fatigue_pct: Math.min(100, (currentMap[name] || 0) + inc),
          last_updated: new Date().toISOString(),
        }));
        await supabase.from('muscle_fatigue').upsert(upserts, { onConflict: 'user_id,muscle_name' });
      }

      emit(AppEvents.WORKOUT_COMPLETED, {
        sessionId, exerciseNames: [exercise.name], totalReps: repCount, totalSets: setCount, calories,
      });

      successTap();
      loadHistory();
      setSets([{ reps: '', weight: '' }]);
      setLogOpen(false);
      Alert.alert('Logged!', `${exercise.name}: ${setCount} sets, ${repCount} reps${avgWeight ? `, ${Math.round(avgWeight * 10) / 10}kg avg` : ''}`);
    } catch (e) {
      warn('[ExerciseInfo] Log failed:', e);
      Alert.alert('Save Failed', e?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [userId, saving, sets, exercise, showWeight, startSession, logExercise, finishSession, resolveDbExerciseId, loadHistory]);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Exercise Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.name}>{exercise.name}</Text>

        {/* Meta Info */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Level</Text>
            <Text style={s.metaValue}>{exercise.level}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Category</Text>
            <Text style={s.metaValue}>{exercise.category}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Equipment</Text>
            <Text style={s.metaValue}>{exercise.equipment}</Text>
          </View>
        </View>

        {/* Images */}
        {(exercise.images || []).length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Visual Guide</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.imageScroll}
            >
              {(exercise.images || []).map((img, i) => (
                <Image
                  key={i}
                  source={{ uri: BASE_IMG + img }}
                  style={s.image}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Muscles */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Target Muscles</Text>
          <View style={s.muscleCard}>
            <View style={s.muscleRow}>
              <Text style={s.muscleLabel}>Primary:</Text>
              <Text style={s.musclePrimary}>{primaryMuscles}</Text>
            </View>
            <View style={s.muscleRow}>
              <Text style={s.muscleLabel}>Secondary:</Text>
              <Text style={s.muscleSecondary}>{secondaryMuscles}</Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        {exercise.instructions && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Instructions</Text>
            <Text style={s.instructions}>{exercise.instructions}</Text>
          </View>
        )}

        {/* Force & Mechanic */}
        {(exercise.force || exercise.mechanic) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Additional Info</Text>
            <View style={s.infoCard}>
              {exercise.force && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Force:</Text>
                  <Text style={s.infoValue}>{exercise.force}</Text>
                </View>
              )}
              {exercise.mechanic && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Mechanic:</Text>
                  <Text style={s.infoValue}>{exercise.mechanic}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Progressive Overload History ── */}
        {history.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Your History</Text>
            <View style={s.historyCard}>
              <View style={s.historyHeader}>
                <Text style={[s.historyCol, { flex: 2 }]}>DATE</Text>
                <Text style={s.historyCol}>SETS</Text>
                <Text style={s.historyCol}>REPS</Text>
                {showWeight && <Text style={s.historyCol}>KG</Text>}
              </View>
              {history.map((h, i) => {
                const date = h.workout_sessions?.started_at
                  ? new Date(h.workout_sessions.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—';
                const older = i < history.length - 1 ? history[i + 1] : null;
                const repsUp = older && h.reps > older.reps;
                const weightUp = older && showWeight && (h.weight_kg || 0) > (older.weight_kg || 0);
                return (
                  <View key={i} style={[s.historyRow, i === 0 && s.historyRowLatest]}>
                    <Text style={[s.historyVal, { flex: 2, color: i === 0 ? C.lime : C.text }]}>{date}</Text>
                    <Text style={s.historyVal}>{h.sets ?? '—'}</Text>
                    <View style={s.historyValWrap}>
                      <Text style={[s.historyVal, repsUp && { color: C.lime }]}>{h.reps ?? '—'}</Text>
                      {repsUp && <Ionicons name="arrow-up" size={10} color={C.lime} />}
                    </View>
                    {showWeight && (
                      <View style={s.historyValWrap}>
                        <Text style={[s.historyVal, weightUp && { color: C.lime }]}>
                          {h.weight_kg != null ? h.weight_kg : '—'}
                        </Text>
                        {weightUp && <Ionicons name="arrow-up" size={10} color={C.lime} />}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Inline Exercise Log ── */}
        {logOpen && (
          <Animated.View entering={FadeInDown.duration(300).springify()} style={s.logCard}>
            <View style={s.logHeader}>
              <Ionicons name="create-outline" size={18} color={C.lime} />
              <Text style={s.logTitle}>Log Exercise</Text>
              <TouchableOpacity onPress={() => setLogOpen(false)}>
                <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>

            {/* Column headers */}
            <View style={s.logColHeaders}>
              <Text style={s.logColLabel}>SET</Text>
              <Text style={[s.logColLabel, { flex: showWeight ? 1 : 2, textAlign: 'center' }]}>REPS</Text>
              {showWeight && <Text style={[s.logColLabel, { flex: 1, textAlign: 'center' }]}>KG</Text>}
              <View style={{ width: 24 }} />
            </View>

            {sets.map((set, i) => (
              <View key={i} style={s.setRow}>
                <View style={s.setBadge}>
                  <Text style={s.setBadgeTxt}>{i + 1}</Text>
                </View>
                <View style={[s.setField, !showWeight && { flex: 2 }]}>
                  <TextInput
                    style={s.setInput}
                    value={set.reps}
                    onChangeText={v => updateSet(i, { ...set, reps: v.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    maxLength={4}
                  />
                </View>
                {showWeight && (
                  <View style={s.setField}>
                    <TextInput
                      style={s.setInput}
                      value={set.weight}
                      onChangeText={v => updateSet(i, { ...set, weight: v.replace(/[^0-9.]/g, '') })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      maxLength={6}
                    />
                  </View>
                )}
                <TouchableOpacity onPress={() => removeSet(i)} hitSlop={8} style={{ opacity: sets.length <= 1 ? 0.3 : 1 }}>
                  <Ionicons name="trash-outline" size={16} color={C.red} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={s.logActions}>
              <TouchableOpacity style={s.addSetBtn} onPress={addSet}>
                <Ionicons name="add" size={14} color={C.lime} />
                <Text style={s.addSetTxt}>Add Set</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveLogBtn, saving && { opacity: 0.5 }]}
                onPress={handleSaveLog}
                disabled={saving}
              >
                <Ionicons name={saving ? 'hourglass-outline' : 'checkmark-done'} size={16} color="#000" />
                <Text style={s.saveLogTxt}>{saving ? 'Saving...' : 'Save Log'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Footer */}
      <View style={s.footer}>
        {!logOpen && (
          <TouchableOpacity
            style={s.logActionBtn}
            onPress={() => { lightTap(); setLogOpen(true); }}
          >
            <Ionicons name="create-outline" size={18} color={C.lime} />
            <Text style={s.logActionTxt}>LOG EXERCISE</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={s.mainActionBtn}
          onPress={() => navigation.navigate('WorkoutActive', { exerciseKey: exercise.name.toLowerCase() })}
        >
          <Text style={s.mainActionTxt}>START AI POSTURE COACH</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.text, fontSize: FS.cardTitle, fontWeight: '700' },
  scroll: { padding: 16 },
  name: {
    color: C.text, fontSize: FS.screenTitle, fontWeight: '900',
    letterSpacing: -0.6, marginBottom: 16,
  },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  metaItem: {
    flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border,
  },
  metaLabel: { color: C.sub, fontSize: FS.sub, fontWeight: '600', marginBottom: 4 },
  metaValue: {
    color: C.text, fontSize: FS.btnPrimary, fontWeight: '700', textTransform: 'capitalize',
  },
  section: { marginBottom: 24 },
  sectionTitle: { color: C.text, fontSize: FS.cardTitle, fontWeight: '800', marginBottom: 12 },
  imageScroll: { marginHorizontal: -16 },
  image: { width: 280, height: 220, borderRadius: 16, marginLeft: 16, backgroundColor: C.border },
  muscleCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  muscleLabel: { color: C.sub, fontSize: FS.body, fontWeight: '600', width: 80 },
  musclePrimary: {
    color: C.accent, fontSize: FS.btnPrimary, fontWeight: '700', flex: 1, textTransform: 'capitalize',
  },
  muscleSecondary: {
    color: C.text, fontSize: FS.btnPrimary, flex: 1, textTransform: 'capitalize',
  },
  instructions: { color: '#C9C2DF', fontSize: FS.bodyLarge, lineHeight: 24 },
  infoCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoLabel: { color: C.sub, fontSize: FS.body, fontWeight: '600', width: 80 },
  infoValue: { color: C.text, fontSize: FS.btnPrimary, textTransform: 'capitalize', flex: 1 },

  // ── History ──
  historyCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  historyHeader: {
    flexDirection: 'row', paddingBottom: 8, marginBottom: 6,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  historyCol: {
    flex: 1, color: C.sub, fontSize: 10, fontWeight: '800',
    letterSpacing: 1, textAlign: 'center',
  },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  historyRowLatest: {
    backgroundColor: 'rgba(200,241,53,0.06)', borderRadius: 8, marginHorizontal: -6, paddingHorizontal: 6,
  },
  historyVal: {
    flex: 1, color: C.text, fontSize: FS.body, fontWeight: '700', textAlign: 'center',
  },
  historyValWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2,
  },

  // ── Inline Log Form ──
  logCard: {
    backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(200,241,53,0.25)',
  },
  logHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  logTitle: { color: C.text, fontSize: FS.bodyLarge, fontWeight: '800', flex: 1 },
  logColHeaders: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 4,
  },
  logColLabel: {
    color: C.sub, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, width: 30,
  },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  setBadge: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(124,92,252,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  setBadgeTxt: { color: C.accent, fontSize: FS.sub, fontWeight: '800' },
  setField: { flex: 1 },
  setInput: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    color: C.text, fontSize: FS.body, fontWeight: '700', textAlign: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  logActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  addSetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(200,241,53,0.08)', borderWidth: 1, borderColor: 'rgba(200,241,53,0.2)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  addSetTxt: { color: C.lime, fontSize: FS.sub, fontWeight: '700' },
  saveLogBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.lime, borderRadius: 10, paddingVertical: 10,
  },
  saveLogTxt: { color: '#000', fontSize: FS.body, fontWeight: '800' },

  // ── Footer ──
  footer: {
    padding: 20, paddingBottom: 34, backgroundColor: C.bg,
    borderTopWidth: 1, borderTopColor: C.border, gap: 10,
  },
  logActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: 'rgba(200,241,53,0.4)', borderRadius: 16,
    paddingVertical: 14,
  },
  logActionTxt: { color: C.lime, fontWeight: '900', fontSize: FS.body, letterSpacing: 0.5 },
  mainActionBtn: {
    backgroundColor: C.lime, paddingVertical: 18, borderRadius: 16, alignItems: 'center',
    shadowColor: C.lime, shadowOpacity: 0.3, shadowRadius: 10,
  },
  mainActionTxt: { color: '#000', fontWeight: '900', fontSize: FS.bodyLarge, letterSpacing: 1 },
});
