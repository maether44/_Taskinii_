import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { searchFoodLibrary } from '../../services/foodScannerApi';
import { useNutrition } from '../../hooks/useNutrition';
import { error as logError } from '../../lib/logger';

const C = {
  bg: '#0F0B1E',
  card: '#181430',
  cardAlt: '#1B1637',
  border: '#251E42',
  purple: '#7C5CFC',
  lime: '#C8F135',
  sub: '#8C80B1',
  dim: '#6B5F8A',
  text: '#fff',
  accent: '#9D85F5',
};

function calcTotals(added) {
  return added.reduce(
    (acc, item) => {
      return {
        cal: acc.cal + (item.calories || 0),
        p: Math.round((acc.p + (item.protein || 0)) * 10) / 10,
        c: Math.round((acc.c + (item.carbs || 0)) * 10) / 10,
        f: Math.round((acc.f + (item.fat || 0)) * 10) / 10,
      };
    },
    { cal: 0, p: 0, c: 0, f: 0 },
  );
}

function scaleFood(food, quantity) {
  const ratio = Math.max(1, quantity) / 100;
  return {
    foodId: food.id,
    foodName: food.name,
    brand: food.brand || '',
    barcode: food.barcode || null,
    quantity,
    calories: Math.round((Number(food.calories_per_100g) || 0) * ratio),
    protein: Math.round((Number(food.protein_per_100g) || 0) * ratio * 10) / 10,
    carbs: Math.round((Number(food.carbs_per_100g) || 0) * ratio * 10) / 10,
    fat: Math.round((Number(food.fat_per_100g) || 0) * ratio * 10) / 10,
    fiber: Math.round((Number(food.fiber_per_100g) || 0) * ratio * 10) / 10,
  };
}

export default function MealLogger() {
  const navigation = useNavigation();
  const route = useRoute();
  const { mealSlot = { id: 'lunch', label: 'Lunch', icon: '🌤️' } } = route.params || {};
  const { saveMealEntries, refresh } = useNutrition();

  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [searchError, setSearchError] = useState('');
  const [added, setAdded] = useState([]);
  const [tab, setTab] = useState('search');

  useEffect(() => {
    if (!search.trim()) {
      setFoods([]);
      setSearchError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setSearchError('');
    const timeout = setTimeout(async () => {
      try {
        const results = await searchFoodLibrary(search.trim());
        setFoods(results);
      } catch (error) {
        logError('MealLogger food library search failed:', error);
        setFoods([]);
        setSearchError(error?.message || 'Food library search failed.');
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [search]);

  const uniqueFoods = useMemo(() => {
    const seen = new Map();
    for (const food of foods) {
      const key = `${food.name?.trim().toLowerCase() || ''}::${(food.brand || '').trim().toLowerCase()}`;
      if (!seen.has(key)) seen.set(key, food);
    }
    return Array.from(seen.values());
  }, [foods]);

  const filtered = useMemo(() => {
    return uniqueFoods.filter((food) => {
      const haystack = `${food.name} ${food.brand || ''}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [uniqueFoods, search]);

  const addFood = (food) => {
    setAdded((prev) =>
      prev.find((item) => item.foodId === food.id) ? prev : [...prev, scaleFood(food, 100)],
    );
    setTab('added');
  };

  const removeFood = (foodId) => {
    setAdded((prev) => prev.filter((item) => item.foodId !== foodId));
  };

  const updateQty = (foodId, quantity) => {
    const safeQty = Math.max(1, quantity);
    setAdded((prev) =>
      prev.map((item) => {
        if (item.foodId !== foodId) return item;
        const source = foods.find((food) => food.id === foodId);
        return source ? scaleFood(source, safeQty) : item;
      }),
    );
  };

  const totals = calcTotals(added);

  const handleSave = async () => {
    if (!added.length || saving) return;
    setSaving(true);
    const success = await saveMealEntries({
      mealType: mealSlot.id,
      items: added.map((item) => ({
        foodName: item.foodName,
        brand: item.brand,
        barcode: item.barcode,
        quantity: item.quantity,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber,
      })),
    });
    setSaving(false);
    if (success) {
      await refresh();
      navigation.goBack();
    }
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>
            {mealSlot.icon} {mealSlot.label}
          </Text>
          <Text style={s.subtitle}>Build this meal from the food library</Text>
        </View>
        <TouchableOpacity
          style={[s.saveBtn, (!added.length || saving) && s.saveBtnOff]}
          onPress={handleSave}
          disabled={!added.length || saving}
        >
          <Text style={s.saveTxt}>{saving ? 'Saving' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.totalsBar}>
        {[
          { val: totals.cal, lbl: 'kcal' },
          { val: `${totals.p}g`, lbl: 'protein' },
          { val: `${totals.c}g`, lbl: 'carbs' },
          { val: `${totals.f}g`, lbl: 'fat' },
        ].map((item) => (
          <View key={item.lbl} style={s.totalItem}>
            <Text style={s.totalVal}>{item.val}</Text>
            <Text style={s.totalLbl}>{item.lbl}</Text>
          </View>
        ))}
      </View>

      <View style={s.tabs}>
        {[
          { id: 'search', label: 'Food library' },
          { id: 'added', label: `Added (${added.length})` },
        ].map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[s.tab, tab === item.id && s.tabActive]}
            onPress={() => setTab(item.id)}
          >
            <Text style={[s.tabTxt, tab === item.id && s.tabTxtActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'search' && (
        <View style={{ flex: 1 }}>
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={16} color={C.sub} />
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search the food library"
              placeholderTextColor={C.dim}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-outline" size={18} color={C.sub} />
              </TouchableOpacity>
            )}
          </View>

          {searchError ? <Text style={s.searchError}>{searchError}</Text> : null}

          {loading ? (
            <View style={s.centered}>
              <ActivityIndicator color={C.purple} />
              <Text style={s.loadingTxt}>Loading your food database...</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              ListEmptyComponent={
                <View style={s.emptyState}>
                  <Text style={s.emptyTitle}>
                    {search ? 'No matching foods' : 'Search our food library'}
                  </Text>
                  <Text style={s.emptySub}>
                    {search
                      ? 'Try a different food name or brand.'
                      : 'Tap a suggestion or type a food to search OpenFoodFacts.'}
                  </Text>
                  {!search && (
                    <View style={s.suggestionRow}>
                      {['Banana', 'Greek Yogurt', 'Chicken Breast', 'Oats', 'Eggs'].map((term) => (
                        <TouchableOpacity
                          key={term}
                          style={s.suggestionChip}
                          onPress={() => setSearch(term)}
                        >
                          <Text style={s.suggestionTxt}>{term}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              }
              renderItem={({ item }) => {
                const isAdded = added.some((addedItem) => addedItem.foodId === item.id);
                return (
                  <View style={[s.foodRow, isAdded && s.foodRowAdded]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.foodName}>{item.name}</Text>
                      <Text style={s.foodMeta}>
                        {Math.round(item.calories_per_100g || 0)} kcal per 100g •{' '}
                        {Math.round(item.protein_per_100g || 0)}g P •{' '}
                        {Math.round(item.carbs_per_100g || 0)}g C •{' '}
                        {Math.round(item.fat_per_100g || 0)}g F
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[s.addBtn, isAdded && s.addBtnDone]}
                      onPress={() => (isAdded ? removeFood(item.id) : addFood(item))}
                    >
                      <Text style={s.addBtnTxt}>{isAdded ? '✓' : '+'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

      {tab === 'added' && (
        <ScrollView contentContainerStyle={s.addedScroll}>
          {!added.length ? (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>No foods added yet</Text>
              <Text style={s.emptySub}>
                Search your saved foods and build this meal piece by piece.
              </Text>
            </View>
          ) : (
            added.map((item) => (
              <View key={item.foodId} style={s.addedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.foodName}>{item.foodName}</Text>
                  <Text style={s.foodMeta}>
                    {item.calories} kcal • {item.protein}g P • {item.carbs}g C • {item.fat}g F
                  </Text>
                </View>
                <View style={s.qtyControl}>
                  <TouchableOpacity
                    style={s.qtyBtn}
                    onPress={() => updateQty(item.foodId, item.quantity - 25)}
                  >
                    <Ionicons name="remove" size={14} color={C.accent} />
                  </TouchableOpacity>
                  <Text style={s.qtyVal}>{item.quantity}g</Text>
                  <TouchableOpacity
                    style={s.qtyBtn}
                    onPress={() => updateQty(item.foodId, item.quantity + 25)}
                  >
                    <Ionicons name="add" size={14} color={C.accent} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => removeFood(item.foodId)} style={s.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={C.sub} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: C.text, fontSize: 20, fontWeight: '800' },
  subtitle: { color: C.sub, fontSize: 12, marginTop: 3 },
  saveBtn: {
    backgroundColor: C.purple,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveBtnOff: { opacity: 0.45 },
  saveTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  suggestionChip: {
    backgroundColor: '#1B1637',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2D2850',
  },
  suggestionTxt: { color: '#C8F135', fontSize: 12, fontWeight: '700' },
  totalsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 10,
    marginHorizontal: 4,
  },
  totalVal: { color: C.text, fontSize: 16, fontWeight: '800' },
  totalLbl: { color: C.sub, fontSize: 11, marginTop: 3 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabActive: { backgroundColor: `${C.purple}20`, borderColor: `${C.purple}35` },
  tabTxt: { color: C.sub, fontSize: 13, fontWeight: '700' },
  tabTxtActive: { color: C.text },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 15 },
  searchError: { color: '#FF8787', fontSize: 12, marginHorizontal: 16, marginTop: 8 },
  loadingTxt: { color: C.sub, fontSize: 13, marginTop: 10 },
  emptyState: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
  emptyTitle: { color: C.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: C.sub, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  foodRowAdded: { borderColor: `${C.purple}40`, backgroundColor: `${C.purple}10` },
  foodName: { color: C.text, fontSize: 14, fontWeight: '700' },
  foodMeta: { color: C.sub, fontSize: 11, marginTop: 4, lineHeight: 16 },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDone: { backgroundColor: C.lime },
  addBtnTxt: { color: '#fff', fontSize: 18, fontWeight: '800' },
  addedScroll: { padding: 16 },
  addedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: { color: C.text, fontSize: 13, fontWeight: '700', minWidth: 46, textAlign: 'center' },
  deleteBtn: { padding: 4 },
});
