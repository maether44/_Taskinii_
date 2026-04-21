import { View, Text, FlatList, StyleSheet, ActivityIndicator,
         TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useExercises } from '../hooks/useExercises';
import ExerciseCard    from '../components/ExerciseCard';
import { supabase }   from '../lib/supabase';
import { useAuth }    from '../context/AuthContext';
import { FS } from '../constants/typography';

const C = {
  bg: '#0F0B1E', card: '#161230', border: '#1E1A35',
  purple: '#7C5CFC', text: '#FFFFFF', sub: '#6B5F8A', red: '#FF3B30',
};

export default function ExerciseList() {
  const navigation = useNavigation();
  const { filtered, loading, refreshing, error, query, setQuery, onRefresh, retry } = useExercises();
  const { user: authUser } = useAuth();
  const authUserId = authUser?.id ?? null;

  // Map: exerciseKey → { formScore, isNew } for Personal Best badges
  const [personalBests, setPersonalBests] = useState({});

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
          // "new" = logged within last 24h and score ≥ 90
          isNew: form >= 90 && (Date.now() - new Date(s.created_at).getTime()) < 86400000,
        };
      }
    }
    setPersonalBests(bests);
  }, [authUserId]);

  useFocusEffect(useCallback(() => { loadPersonalBests(); }, [loadPersonalBests]));

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

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Exercises</Text>
        <Text style={s.subtitle}>{filtered.length} available</Text>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={C.sub} />
        <TextInput
          style={s.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={C.sub}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, i) => item.id || `${item.name}-${i}`}
        renderItem={({ item }) => {
          const key = item.name?.toLowerCase().replace(/\s+/g, '');
          const pb  = personalBests[key] || null;
          return <ExerciseCard exercise={item} navigation={navigation} personalBest={pb} />;
        }}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="barbell-outline" size={52} color={C.sub} />
            <Text style={s.emptyText}>No exercises found</Text>
            <Text style={s.emptySub}>Try another search term</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  header:      { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14 },
  title:       { color: C.text, fontSize: FS.screenTitle, fontWeight: '800', letterSpacing: -0.4 },
  subtitle:    { color: C.sub, fontSize: FS.btnSecondary, marginTop: 4 },
  searchWrap:  { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 46, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, color: C.text, fontSize: FS.btnPrimary },
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