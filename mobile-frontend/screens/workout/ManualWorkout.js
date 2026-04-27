import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, FlatList, Alert, Dimensions, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { useWorkouts } from '../../hooks/useWorkout';
import { supabase } from '../../lib/supabase';
import { AppEvents, emit } from '../../lib/eventBus';
import { warn } from '../../lib/logger';
import { mediumTap, successTap, lightTap } from '../../lib/haptics';
import { FS } from '../../constants/typography';

const { width } = Dimensions.get('window');

const C = {
  bg: '#0F0B1E', card: '#161230', border: '#1E1A35',
  purple: '#7C5CFC', lime: '#C8F135', text: '#FFF',
  sub: '#6B5F8A', accent: '#9D85F5', red: '#FF6B6B',
};

const MUSCLE_FATIGUE_MAP = {
  chest:      [{ name: 'Chest', inc: 25 }, { name: 'Triceps', inc: 15 }],
  back:       [{ name: 'Back', inc: 25 }, { name: 'Biceps', inc: 15 }],
  shoulders:  [{ name: 'Shoulders', inc: 25 }, { name: 'Triceps', inc: 10 }],
  legs:       [{ name: 'Quads', inc: 20 }, { name: 'Glutes', inc: 20 }, { name: 'Hamstrings', inc: 15 }],
  arms:       [{ name: 'Biceps', inc: 25 }, { name: 'Triceps', inc: 25 }, { name: 'Forearms', inc: 15 }],
  core:       [{ name: 'Core', inc: 25 }],
  cardio:     [],
  stretching: [],
};

function mapMuscleGroup(group) {
  if (!group) return [];
  const key = group.toLowerCase().replace(/[^a-z]/g, '');
  return MUSCLE_FATIGUE_MAP[key] || MUSCLE_FATIGUE_MAP[key.slice(0, -1)] || [];
}

// ── Rest Timer Overlay ──────────────────────────────────────────
function RestTimer({ seconds, onSkip, onDone }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) { onDone(); return; }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onDone]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <View style={rs.overlay}>
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={rs.content}>
        <Ionicons name="timer-outline" size={32} color={C.lime} />
        <Text style={rs.label}>REST</Text>
        <Text style={rs.time}>{mins}:{String(secs).padStart(2, '0')}</Text>
        <TouchableOpacity style={rs.skipBtn} onPress={onSkip}>
          <Text style={rs.skipTxt}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Exercise Picker Modal ───────────────────────────────────────
function ExercisePicker({ visible, exercises, onSelect, onClose }) {
  const [search, setSearch] = useState('');

  const filtered = exercises.filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase()) ||
    (ex.muscle_group || '').toLowerCase().includes(search.toLowerCase()) ||
    (ex.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const grouped = {};
  filtered.forEach(ex => {
    const group = ex.muscle_group || 'Other';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(ex);
  });
  const sections = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={ep.root}>
        <View style={ep.header}>
          <Text style={ep.title}>Add Exercise</Text>
          <TouchableOpacity onPress={onClose} style={ep.closeBtn}>
            <Ionicons name="close" size={22} color={C.sub} />
          </TouchableOpacity>
        </View>

        <View style={ep.searchWrap}>
          <Ionicons name="search-outline" size={18} color={C.sub} />
          <TextInput
            style={ep.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor={C.sub}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={C.sub} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={sections}
          keyExtractor={([group]) => group}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item: [group, exs] }) => (
            <View>
              <Text style={ep.groupLabel}>{group.toUpperCase()}</Text>
              {exs.map(ex => (
                <TouchableOpacity
                  key={ex.id}
                  style={ep.exerciseRow}
                  onPress={() => { lightTap(); onSelect(ex); }}
                >
                  <View style={ep.exIcon}>
                    <Ionicons name="barbell-outline" size={18} color={C.lime} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ep.exName}>{ex.name}</Text>
                    <Text style={ep.exMeta}>{ex.category}{ex.difficulty ? ` · ${ex.difficulty}` : ''}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={C.lime} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          ListEmptyComponent={
            <Text style={ep.empty}>No exercises found</Text>
          }
        />
      </View>
    </Modal>
  );
}

// ── Set Row ─────────────────────────────────────────────────────
function SetRow({ set, index, onUpdate, onRemove }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={sr.row}>
      <View style={sr.badge}>
        <Text style={sr.badgeTxt}>{index + 1}</Text>
      </View>
      <View style={sr.field}>
        <Text style={sr.fieldLabel}>Reps</Text>
        <TextInput
          style={sr.input}
          value={set.reps}
          onChangeText={v => onUpdate({ ...set, reps: v.replace(/[^0-9]/g, '') })}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor="rgba(255,255,255,0.2)"
          maxLength={4}
        />
      </View>
      <View style={sr.field}>
        <Text style={sr.fieldLabel}>kg</Text>
        <TextInput
          style={sr.input}
          value={set.weight}
          onChangeText={v => onUpdate({ ...set, weight: v.replace(/[^0-9.]/g, '') })}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="rgba(255,255,255,0.2)"
          maxLength={6}
        />
      </View>
      <TouchableOpacity onPress={onRemove} hitSlop={8}>
        <Ionicons name="trash-outline" size={16} color={C.red} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Exercise Card (with sets) ───────────────────────────────────
function ExerciseBlock({ exercise, onRemove, onRestStart }) {
  const [sets, setSets] = useState([{ reps: '', weight: '' }]);
  const exerciseRef = useRef(exercise);
  exerciseRef.current = exercise;

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

  const finishSet = (idx) => {
    if (!sets[idx].reps) return;
    mediumTap();
    onRestStart?.();
  };

  exercise._getSets = () => sets;

  return (
    <Animated.View entering={FadeInDown.duration(300).springify()} style={eb.card}>
      <View style={eb.header}>
        <View style={eb.iconWrap}>
          <Ionicons name="barbell-outline" size={20} color={C.lime} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={eb.name}>{exercise.name}</Text>
          <Text style={eb.meta}>{exercise.muscle_group || exercise.category}</Text>
        </View>
        <TouchableOpacity onPress={onRemove} style={eb.removeBtn}>
          <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      </View>

      <View style={eb.setsHeader}>
        <Text style={eb.setsLabel}>SET</Text>
        <Text style={[eb.setsLabel, { flex: 1, textAlign: 'center' }]}>REPS</Text>
        <Text style={[eb.setsLabel, { flex: 1, textAlign: 'center' }]}>KG</Text>
        <View style={{ width: 16 }} />
      </View>

      {sets.map((set, i) => (
        <SetRow
          key={i}
          set={set}
          index={i}
          onUpdate={(updated) => updateSet(i, updated)}
          onRemove={() => removeSet(i)}
        />
      ))}

      <View style={eb.actions}>
        <TouchableOpacity style={eb.addSetBtn} onPress={addSet}>
          <Ionicons name="add" size={16} color={C.lime} />
          <Text style={eb.addSetTxt}>Add Set</Text>
        </TouchableOpacity>
        {sets.length > 0 && sets[sets.length - 1].reps !== '' && (
          <TouchableOpacity
            style={eb.doneSetBtn}
            onPress={() => finishSet(sets.length - 1)}
          >
            <Ionicons name="checkmark" size={16} color="#000" />
            <Text style={eb.doneSetTxt}>Done · Rest</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────
export default function ManualWorkout({ navigation }) {
  const { user: authUser } = useAuth();
  const userId = authUser?.id;
  const { exercises: dbExercises, startSession, logExercise, finishSession } = useWorkouts(userId);

  const [selectedExercises, setSelectedExercises] = useState([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [restVisible, setRestVisible] = useState(false);
  const [restSeconds, setRestSeconds] = useState(90);
  const startTime = useRef(Date.now());
  const exerciseRefs = useRef([]);

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  const addExercise = useCallback((ex) => {
    if (selectedExercises.find(e => e.id === ex.id)) {
      Alert.alert('Already added', `${ex.name} is already in your workout.`);
      return;
    }
    setSelectedExercises(prev => [...prev, { ...ex, _getSets: () => [] }]);
    setPickerVisible(false);
  }, [selectedExercises]);

  const removeExercise = useCallback((idx) => {
    setSelectedExercises(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(async () => {
    if (!userId || saving) return;
    if (selectedExercises.length === 0) {
      Alert.alert('No exercises', 'Add at least one exercise to your workout.');
      return;
    }

    // Collect all sets data from exercise blocks
    const exerciseData = selectedExercises.map(ex => {
      const sets = ex._getSets?.() || [];
      const validSets = sets.filter(s => s.reps && parseInt(s.reps) > 0);
      return { exercise: ex, sets: validSets };
    }).filter(d => d.sets.length > 0);

    if (exerciseData.length === 0) {
      Alert.alert('No sets logged', 'Enter reps for at least one set.');
      return;
    }

    setSaving(true);
    try {
      // 1. Start session
      const sessionId = await startSession();
      if (!sessionId) throw new Error('Failed to create session');

      // 2. Log each exercise
      let totalReps = 0;
      let totalSets = 0;
      const exerciseNames = [];

      for (const { exercise, sets } of exerciseData) {
        const setCount = sets.length;
        const repCount = sets.reduce((sum, s) => sum + parseInt(s.reps || 0), 0);
        const avgWeight = sets.reduce((sum, s) => sum + parseFloat(s.weight || 0), 0) / sets.length;

        await logExercise(sessionId, {
          exerciseId: exercise.id,
          sets: setCount,
          reps: repCount,
          weightKg: Math.round(avgWeight * 10) / 10 || null,
          durationSecs: null,
          postureScore: null,
        });

        totalReps += repCount;
        totalSets += setCount;
        exerciseNames.push(exercise.name);
      }

      // 3. Calculate calories (rough: reps * 5, minimum 1 per exercise)
      const calories = Math.max(exerciseData.length, totalReps * 5);

      // 4. Build notes string (load-bearing format for Training.js parsing)
      const notesStr = exerciseNames.join(' · ') + ` — ${totalSets} sets · ${totalReps} reps`;

      // 5. Finish session
      await finishSession(sessionId, { caloriesBurned: calories, notes: notesStr });

      // 6. Update daily_activity calories
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

      // 7. Award XP
      const { data: xpResult } = await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_amount: 50,
        p_source: 'workout',
        p_description: `Manual workout: ${exerciseNames.slice(0, 3).join(', ')}`,
      });
      emit(AppEvents.XP_AWARDED, { amount: 50, source: 'workout', result: xpResult });

      // 8. Check achievements
      await supabase.rpc('check_achievements', { p_user_id: userId });

      // 9. Update muscle fatigue
      const fatigueUpdates = {};
      for (const { exercise } of exerciseData) {
        const muscles = mapMuscleGroup(exercise.muscle_group);
        for (const m of muscles) {
          fatigueUpdates[m.name] = Math.min(100, (fatigueUpdates[m.name] || 0) + m.inc);
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

      // 10. Emit completion event
      emit(AppEvents.WORKOUT_COMPLETED, {
        sessionId, exerciseNames, totalReps, totalSets, calories,
      });

      successTap();

      // Navigate to summary
      navigation.replace('WorkoutSummary', {
        exerciseName: exerciseNames.join(' · '),
        repCount: totalReps,
        formScore: 0,
        elapsed,
        sessionId,
      });
    } catch (e) {
      warn('[ManualWorkout] Save failed:', e);
      Alert.alert('Save Failed', e?.message || 'Could not save your workout. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [userId, saving, selectedExercises, elapsed, startSession, logExercise, finishSession, navigation]);

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Manual Log</Text>
          <Text style={s.subtitle}>{selectedExercises.length} exercise{selectedExercises.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={s.timerChip}>
          <Ionicons name="time-outline" size={14} color={C.lime} />
          <Text style={s.timerTxt}>{mins}:{String(secs).padStart(2, '0')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Rest time selector */}
        <View style={s.restRow}>
          <Text style={s.restLabel}>Rest timer</Text>
          <View style={s.restOptions}>
            {[60, 90, 120, 180].map(sec => (
              <TouchableOpacity
                key={sec}
                style={[s.restChip, restSeconds === sec && s.restChipActive]}
                onPress={() => setRestSeconds(sec)}
              >
                <Text style={[s.restChipTxt, restSeconds === sec && s.restChipTxtActive]}>
                  {sec < 120 ? `${sec}s` : `${sec / 60}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Exercise blocks */}
        {selectedExercises.map((ex, i) => (
          <ExerciseBlock
            key={ex.id}
            exercise={ex}
            onRemove={() => removeExercise(i)}
            onRestStart={() => setRestVisible(true)}
          />
        ))}

        {/* Add exercise button */}
        <TouchableOpacity
          style={s.addExerciseBtn}
          onPress={() => { lightTap(); setPickerVisible(true); }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(124,92,252,0.15)', 'rgba(124,92,252,0.05)']}
            style={s.addExerciseGradient}
          >
            <Ionicons name="add-circle-outline" size={24} color={C.accent} />
            <Text style={s.addExerciseTxt}>Add Exercise</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Empty state */}
        {selectedExercises.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="barbell-outline" size={48} color="rgba(255,255,255,0.1)" />
            <Text style={s.emptyTitle}>Start your workout</Text>
            <Text style={s.emptySub}>Tap "Add Exercise" to begin logging sets, reps, and weight.</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Finish button */}
      {selectedExercises.length > 0 && (
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={[s.finishBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[C.lime, '#A8D020']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.finishGradient}
            >
              <Ionicons name={saving ? 'hourglass-outline' : 'checkmark-done'} size={20} color="#000" />
              <Text style={s.finishTxt}>{saving ? 'Saving...' : 'Finish Workout'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Exercise Picker */}
      <ExercisePicker
        visible={pickerVisible}
        exercises={dbExercises}
        onSelect={addExercise}
        onClose={() => setPickerVisible(false)}
      />

      {/* Rest Timer Overlay */}
      {restVisible && (
        <RestTimer
          seconds={restSeconds}
          onSkip={() => setRestVisible(false)}
          onDone={() => setRestVisible(false)}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────��────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 58, paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.text, fontSize: FS.cardTitle, fontWeight: '900' },
  subtitle: { color: C.sub, fontSize: FS.sub, marginTop: 2 },
  timerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(200,241,53,0.1)', borderWidth: 1, borderColor: 'rgba(200,241,53,0.25)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  timerTxt: { color: C.lime, fontSize: FS.btnSecondary, fontWeight: '800', fontVariant: ['tabular-nums'] },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  // Rest selector
  restRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  restLabel: { color: C.sub, fontSize: FS.sub, fontWeight: '600' },
  restOptions: { flexDirection: 'row', gap: 8 },
  restChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  restChipActive: { backgroundColor: C.lime, borderColor: C.lime },
  restChipTxt: { color: C.sub, fontSize: FS.sub, fontWeight: '700' },
  restChipTxtActive: { color: '#000' },

  // Add exercise
  addExerciseBtn: { borderRadius: 18, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(124,92,252,0.2)', borderStyle: 'dashed' },
  addExerciseGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  addExerciseTxt: { color: C.accent, fontSize: FS.btnPrimary, fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyTitle: { color: 'rgba(255,255,255,0.3)', fontSize: FS.bodyLarge, fontWeight: '700' },
  emptySub: { color: 'rgba(255,255,255,0.15)', fontSize: FS.body, textAlign: 'center', lineHeight: 22, paddingHorizontal: 32 },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 34, paddingTop: 12, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
  finishBtn: { borderRadius: 16, overflow: 'hidden' },
  finishGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  finishTxt: { color: '#000', fontSize: FS.btnPrimary, fontWeight: '900' },
});

// ── Exercise Block styles ───────────────────────────────────────
const eb = StyleSheet.create({
  card: {
    backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(200,241,53,0.08)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(200,241,53,0.2)',
  },
  name: { color: C.text, fontSize: FS.bodyLarge, fontWeight: '800' },
  meta: { color: C.sub, fontSize: FS.sub, marginTop: 2 },
  removeBtn: { padding: 4 },
  setsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 4 },
  setsLabel: { color: C.sub, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, width: 30 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  addSetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(200,241,53,0.08)', borderWidth: 1, borderColor: 'rgba(200,241,53,0.2)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  addSetTxt: { color: C.lime, fontSize: FS.sub, fontWeight: '700' },
  doneSetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.lime, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  doneSetTxt: { color: '#000', fontSize: FS.sub, fontWeight: '800' },
});

// ── Set Row styles ──────────────────────────────────────────────
const sr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badge: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(124,92,252,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  badgeTxt: { color: C.accent, fontSize: FS.sub, fontWeight: '800' },
  field: { flex: 1, gap: 2 },
  fieldLabel: { color: C.sub, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, paddingLeft: 4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: C.text, fontSize: FS.body, fontWeight: '700', textAlign: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
});

// ── Exercise Picker styles ───────────────────���──────────────────
const ep = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 58, paddingHorizontal: 20, paddingBottom: 16,
  },
  title: { color: C.text, fontSize: FS.cardTitle, fontWeight: '900' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, color: C.text, fontSize: FS.body },
  groupLabel: { color: C.lime, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  exerciseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  exIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(200,241,53,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  exName: { color: C.text, fontSize: FS.body, fontWeight: '700' },
  exMeta: { color: C.sub, fontSize: FS.sub, marginTop: 2 },
  empty: { color: C.sub, fontSize: FS.body, textAlign: 'center', marginTop: 48 },
});

// ── Rest Timer styles ───────────────────────────────────────────
const rs = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 100,
    justifyContent: 'center', alignItems: 'center',
  },
  content: { alignItems: 'center', gap: 12 },
  label: { color: C.sub, fontSize: FS.label, fontWeight: '900', letterSpacing: 2 },
  time: { color: C.text, fontSize: 64, fontWeight: '900', fontVariant: ['tabular-nums'] },
  skipBtn: {
    marginTop: 16, paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1.5, borderColor: C.lime,
  },
  skipTxt: { color: C.lime, fontSize: FS.btnPrimary, fontWeight: '700' },
});
