import { View, Text, FlatList, StyleSheet, ActivityIndicator,
         TouchableOpacity, RefreshControl, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback, useState, useMemo } from 'react';
import { useExercises } from '../hooks/useExercises';
import ExerciseCard    from '../components/ExerciseCard';
import { supabase }   from '../lib/supabase';
import { useAuth }    from '../context/AuthContext';
import { FS } from '../constants/typography';

const C = {
  bg: '#0F0B1E', card: '#161230', border: '#1E1A35',
  purple: '#7C5CFC', text: '#FFFFFF', sub: '#6B5F8A', red: '#FF3B30',
  lime: '#C8F135',
};

// ─── Filter definitions ───────────────────────────────────────────────────────
const FILTER_TABS = ['Muscle', 'Category', 'Equipment'];

const MUSCLE_GROUPS = [
  { label: 'All',           value: null,              emoji: '💪' },
  { label: 'Chest',         value: 'chest',           emoji: '🫁' },
  { label: 'Back',          value: 'back',            emoji: '🔙' },
  { label: 'Shoulders',     value: 'shoulders',       emoji: '🏋️' },
  { label: 'Biceps',        value: 'biceps',          emoji: '💪' },
  { label: 'Triceps',       value: 'triceps',         emoji: '💪' },
  { label: 'Legs',          value: 'quadriceps',      emoji: '🦵' },
  { label: 'Hamstrings',    value: 'hamstrings',      emoji: '🦵' },
  { label: 'Glutes',        value: 'glutes',          emoji: '🍑' },
  { label: 'Abs',           value: 'abdominals',      emoji: '🔥' },
  { label: 'Calves',        value: 'calves',          emoji: '🦶' },
  { label: 'Forearms',      value: 'forearms',        emoji: '💪' },
];

const CATEGORIES = [
  { label: 'All',           value: null,              emoji: '🏅' },
  { label: 'Strength',      value: 'strength',        emoji: '🏋️' },
  { label: 'Cardio',        value: 'cardio',          emoji: '🏃' },
  { label: 'Stretching',    value: 'stretching',      emoji: '🧘' },
  { label: 'Plyometrics',   value: 'plyometrics',     emoji: '⚡' },
  { label: 'Powerlifting',  value: 'powerlifting',    emoji: '🔱' },
  { label: 'Olympic',       value: 'olympic weightlifting', emoji: '🥇' },
  { label: 'Strongman',     value: 'strongman',       emoji: '🦣' },
];

const EQUIPMENT_LIST = [
  { label: 'All',           value: null,              emoji: '🏅' },
  { label: 'Bodyweight',    value: 'body only',       emoji: '🤸' },
  { label: 'Barbell',       value: 'barbell',         emoji: '🏋️' },
  { label: 'Dumbbell',      value: 'dumbbell',        emoji: '💪' },
  { label: 'Machine',       value: 'machine',         emoji: '⚙️' },
  { label: 'Cable',         value: 'cable',           emoji: '🔗' },
  { label: 'Kettlebell',    value: 'kettlebells',     emoji: '🫙' },
  { label: 'Bands',         value: 'bands',           emoji: '🔄' },
  { label: 'Medicine Ball', value: 'medicine ball',   emoji: '⚽' },
  { label: 'Foam Roll',     value: 'foam roll',       emoji: '🛹' },
];

// ─── Filter Pill ──────────────────────────────────────────────────────────────
function FilterPill({ label, emoji, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[fp.pill, selected && fp.pillActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={fp.emoji}>{emoji}</Text>
      <Text style={[fp.label, selected && fp.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const fp = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 22, borderWidth: 1.5,
    borderColor: '#3D3560', backgroundColor: '#231F3D',
    marginRight: 10,
  },
  pillActive: {
    backgroundColor: '#7C5CFC33',
    borderColor: '#7C5CFC',
  },
  emoji:       { fontSize: 15 },
  label:       { color: '#E8E3FF', fontSize: 13, fontWeight: '700' },
  labelActive: { color: '#FFFFFF' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ExerciseList() {
  const navigation = useNavigation();
  const { filtered: allExercises, loading, refreshing, error, query, setQuery, onRefresh, retry } = useExercises();
  const { user: authUser } = useAuth();
  const authUserId = authUser?.id ?? null;

  const [personalBests, setPersonalBests] = useState({});
  const [activeTab,     setActiveTab]     = useState(0); // 0=Muscle, 1=Category, 2=Equipment
  const [muscleFilter,  setMuscleFilter]  = useState(null);
  const [catFilter,     setCatFilter]     = useState(null);
  const [equipFilter,   setEquipFilter]   = useState(null);

  const loadPersonalBests = useCallback(async () => {
    if (!authUserId) return;
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('notes, created_at')
      .eq('user_id', authUserId)
      .order('created_at', { ascending: false });
    if (!sessions) return;

    const bests = {};
    for (const s of sessions) {
      const keyMatch  = s.notes?.match(/^(\S+)/);
      const formMatch = s.notes?.match(/(\d+)%\s*form/i);
      if (!keyMatch || !formMatch) continue;
      const key  = keyMatch[1].toLowerCase();
      const form = parseInt(formMatch[1]);
      if (!bests[key] || form > bests[key].score) {
        bests[key] = {
          score: form,
          isNew: form >= 90 && (Date.now() - new Date(s.created_at).getTime()) < 86400000,
        };
      }
    }
    setPersonalBests(bests);
  }, [authUserId]);

  useFocusEffect(useCallback(() => { loadPersonalBests(); }, [loadPersonalBests]));

  // Apply all active filters on top of search query
  const exercises = useMemo(() => {
    let list = allExercises;
    if (muscleFilter) {
      list = list.filter(e =>
        (e.primaryMuscles || []).some(m => m.toLowerCase().includes(muscleFilter)) ||
        (e.secondaryMuscles || []).some(m => m.toLowerCase().includes(muscleFilter))
      );
    }
    if (catFilter) {
      list = list.filter(e => e.category?.toLowerCase() === catFilter);
    }
    if (equipFilter) {
      list = list.filter(e => e.equipment?.toLowerCase() === equipFilter);
    }
    return list;
  }, [allExercises, muscleFilter, catFilter, equipFilter]);

  const activeFilterCount = [muscleFilter, catFilter, equipFilter].filter(Boolean).length;

  const clearFilters = () => {
    setMuscleFilter(null);
    setCatFilter(null);
    setEquipFilter(null);
  };

  const currentFilters = activeTab === 0 ? MUSCLE_GROUPS
    : activeTab === 1 ? CATEGORIES
    : EQUIPMENT_LIST;

  const currentValue = activeTab === 0 ? muscleFilter
    : activeTab === 1 ? catFilter
    : equipFilter;

  const setCurrentFilter = activeTab === 0 ? setMuscleFilter
    : activeTab === 1 ? setCatFilter
    : setEquipFilter;

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.purple} />
        <Text style={s.loadingText}>Loading exercises...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <Ionicons name="alert-circle-outline" size={56} color={C.red} />
        <Text style={s.errorText}>Error loading exercises</Text>
        <Text style={s.errorMsg}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={retry}>
          <Text style={s.retryTxt}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ListHeader = (
    <View>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Exercises</Text>
          <Text style={s.subtitle}>{exercises.length} available</Text>
        </View>
        {activeFilterCount > 0 && (
          <TouchableOpacity style={s.clearBtn} onPress={clearFilters}>
            <Ionicons name="close-circle" size={14} color={C.purple} />
            <Text style={s.clearTxt}>Clear {activeFilterCount}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={C.sub} />
        <TextInput
          style={s.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={C.sub}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={C.sub} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={s.tabs}>
        {FILTER_TABS.map((tab, i) => {
          const hasFilter = i === 0 ? !!muscleFilter : i === 1 ? !!catFilter : !!equipFilter;
          return (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === i && s.tabActive]}
              onPress={() => setActiveTab(i)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabTxt, activeTab === i && s.tabTxtActive]}>{tab}</Text>
              {hasFilter && <View style={s.tabDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.pillsScroll}
        contentContainerStyle={s.pillsContent}
        nestedScrollEnabled
      >
        {currentFilters.map(f => (
          <FilterPill
            key={f.label}
            label={f.label}
            emoji={f.emoji}
            selected={currentValue === f.value}
            onPress={() => setCurrentFilter(f.value)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={s.container}>
      <FlatList
        data={exercises}
        keyExtractor={(item, i) => item.id || `${item.name}-${i}`}
        renderItem={({ item }) => {
          const key = item.name?.toLowerCase().replace(/\s+/g, '');
          const pb  = personalBests[key] || null;
          return <ExerciseCard exercise={item} navigation={navigation} personalBest={pb} />;
        }}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="barbell-outline" size={52} color={C.sub} />
            <Text style={s.emptyText}>No exercises found</Text>
            <Text style={s.emptySub}>
              {activeFilterCount > 0 ? 'Try clearing some filters' : 'Try another search term'}
            </Text>
            {activeFilterCount > 0 && (
              <TouchableOpacity style={s.retryBtn} onPress={clearFilters}>
                <Text style={s.retryTxt}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  header:      { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:       { color: C.text, fontSize: FS.screenTitle, fontWeight: '800', letterSpacing: -0.4 },
  subtitle:    { color: C.sub, fontSize: FS.btnSecondary, marginTop: 4 },
  clearBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#7C5CFC18', borderRadius: 10, borderWidth: 1, borderColor: '#7C5CFC44', paddingHorizontal: 10, paddingVertical: 6 },
  clearTxt:    { color: C.purple, fontSize: 12, fontWeight: '700' },

  searchWrap:  { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 46, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, color: C.text, fontSize: FS.btnPrimary },

  // Tabs
  tabs:        { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  tab:         { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1E1A35', borderWidth: 1.5, borderColor: '#2D2850', alignItems: 'center', position: 'relative' },
  tabActive:   { backgroundColor: '#7C5CFC33', borderColor: '#7C5CFC' },
  tabTxt:      { color: '#C8BFEE', fontSize: 13, fontWeight: '700' },
  tabTxtActive:{ color: '#FFFFFF' },
  tabDot:      { position: 'absolute', top: 6, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: C.lime },

  // Pills
  pillsScroll:   { maxHeight: 52, marginBottom: 8, flexShrink: 0 },
  pillsContent:  { paddingHorizontal: 16, alignItems: 'center' },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 20 },
  loadingText: { marginTop: 10, color: C.sub, fontSize: FS.btnPrimary },
  errorText:   { marginTop: 14, color: C.text, fontSize: FS.cardTitle, fontWeight: '700' },
  errorMsg:    { marginTop: 8, color: C.sub, textAlign: 'center', fontSize: FS.body },
  retryBtn:    { marginTop: 16, backgroundColor: C.purple, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  retryTxt:    { color: '#fff', fontWeight: '700', fontSize: FS.body },
  empty:       { alignItems: 'center', justifyContent: 'center', paddingVertical: 70 },
  emptyText:   { marginTop: 12, color: C.text, fontSize: FS.bodyLarge, fontWeight: '700' },
  emptySub:    { marginTop: 4, color: C.sub, fontSize: FS.btnSecondary },
});