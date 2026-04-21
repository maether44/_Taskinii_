import { Ionicons } from "@expo/vector-icons";
import { FS } from "../../constants/typography";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { searchFoodLibrary } from "../../services/foodScannerApi";
import { useNutrition } from "../../hooks/useNutrition";
import { error as logError } from "../../lib/logger";

const C = {
  bg: "#0F0B1E",
  card: "#181430",
  cardAlt: "#1B1637",
  border: "#251E42",
  purple: "#7C5CFC",
  lime: "#C8F135",
  sub: "#8C80B1",
  dim: "#6B5F8A",
  text: "#fff",
  accent: "#9D85F5",
};

const MEAL_TYPES = [
  { id: "breakfast", label: "Breakfast", icon: "sunny-outline" },
  { id: "lunch", label: "Lunch", icon: "partly-sunny-outline" },
  { id: "dinner", label: "Dinner", icon: "moon-outline" },
  { id: "snack", label: "Snack", icon: "cafe-outline" },
];

function calcTotals(ingredients) {
  return ingredients.reduce(
    (acc, item) => ({
      cal: acc.cal + (item.calories || 0),
      p: Math.round((acc.p + (item.protein || 0)) * 10) / 10,
      c: Math.round((acc.c + (item.carbs || 0)) * 10) / 10,
      f: Math.round((acc.f + (item.fat || 0)) * 10) / 10,
    }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );
}

function scaleFood(food, quantity) {
  const ratio = Math.max(1, quantity) / 100;
  return {
    foodId: food.id,
    foodName: food.name,
    brand: food.brand || "",
    barcode: food.barcode || null,
    quantity,
    calories_per_100g: Number(food.calories_per_100g) || 0,
    protein_per_100g: Number(food.protein_per_100g) || 0,
    carbs_per_100g: Number(food.carbs_per_100g) || 0,
    fat_per_100g: Number(food.fat_per_100g) || 0,
    fiber_per_100g: Number(food.fiber_per_100g) || 0,
    calories: Math.round((Number(food.calories_per_100g) || 0) * ratio),
    protein: Math.round((Number(food.protein_per_100g) || 0) * ratio * 10) / 10,
    carbs: Math.round((Number(food.carbs_per_100g) || 0) * ratio * 10) / 10,
    fat: Math.round((Number(food.fat_per_100g) || 0) * ratio * 10) / 10,
    fiber: Math.round((Number(food.fiber_per_100g) || 0) * ratio * 10) / 10,
  };
}

export default function CustomMealBuilder() {
  const navigation = useNavigation();
  const route = useRoute();
  const { initialMealType = "lunch" } = route.params || {};
  const { saveMealEntries, refresh } = useNutrition();

  const [mealName, setMealName] = useState("");
  const [mealType, setMealType] = useState(initialMealType);
  const [ingredients, setIngredients] = useState([]);
  const [search, setSearch] = useState("");
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("search");

  useEffect(() => {
    if (!search.trim()) {
      setFoods([]);
      setSearchError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    setSearchError("");
    const timeout = setTimeout(async () => {
      try {
        const results = await searchFoodLibrary(search.trim());
        setFoods(results);
      } catch (err) {
        logError("CustomMealBuilder search failed:", err);
        setFoods([]);
        setSearchError(err?.message || "Search failed.");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const uniqueFoods = useMemo(() => {
    const seen = new Map();
    for (const food of foods) {
      const key = `${food.name?.trim().toLowerCase()}::${(food.brand || "").trim().toLowerCase()}`;
      if (!seen.has(key)) seen.set(key, food);
    }
    return Array.from(seen.values());
  }, [foods]);

  const addIngredient = (food) => {
    setIngredients((prev) =>
      prev.some((i) => i.foodId === food.id) ? prev : [...prev, scaleFood(food, 100)]
    );
    setTab("ingredients");
  };

  const removeIngredient = (foodId) => {
    setIngredients((prev) => prev.filter((i) => i.foodId !== foodId));
  };

  const updateQty = (foodId, quantity) => {
    const safeQty = Math.max(1, quantity);
    setIngredients((prev) =>
      prev.map((item) => {
        if (item.foodId !== foodId) return item;
        const ratio = safeQty / 100;
        return {
          ...item,
          quantity: safeQty,
          calories: Math.round(item.calories_per_100g * ratio),
          protein: Math.round(item.protein_per_100g * ratio * 10) / 10,
          carbs: Math.round(item.carbs_per_100g * ratio * 10) / 10,
          fat: Math.round(item.fat_per_100g * ratio * 10) / 10,
          fiber: Math.round(item.fiber_per_100g * ratio * 10) / 10,
        };
      })
    );
  };

  const totals = calcTotals(ingredients);
  const canSave = mealName.trim().length > 0 && ingredients.length > 0 && !saving;

  const handleLog = async () => {
    if (!canSave) return;
    setSaving(true);

    const names = ingredients.map((i) => i.foodName);
    const displayList = names.length > 3
      ? `${names.slice(0, 3).join(", ")}, etc.`
      : names.join(", ");
    const combinedName = `${mealName.trim()} (${displayList})`;
    const totalQty = ingredients.reduce((sum, i) => sum + i.quantity, 0);

    const success = await saveMealEntries({
      mealType,
      items: [{
        foodName: combinedName,
        brand: "",
        barcode: null,
        quantity: totalQty,
        calories: totals.cal,
        protein: totals.p,
        carbs: totals.c,
        fat: totals.f,
        fiber: ingredients.reduce((sum, i) => Math.round((sum + i.fiber) * 10) / 10, 0),
      }],
    });
    setSaving(false);
    if (success) {
      await refresh();
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Build a Meal</Text>
          <Text style={s.subtitle}>Add ingredients, then log it</Text>
        </View>
        <TouchableOpacity style={[s.saveBtn, !canSave && s.saveBtnOff]} onPress={handleLog} disabled={!canSave}>
          <Text style={s.saveTxt}>{saving ? "Logging…" : "Log Meal"}</Text>
        </TouchableOpacity>
      </View>

      {/* Meal name input */}
      <View style={s.nameRow}>
        <Ionicons name="create-outline" size={16} color={C.sub} />
        <TextInput
          style={s.nameInput}
          value={mealName}
          onChangeText={setMealName}
          placeholder="Name your meal (e.g. Chicken Bowl)"
          placeholderTextColor={C.dim}
          maxLength={40}
        />
      </View>

      {/* Meal type selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.mealTypeRow}>
        {MEAL_TYPES.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[s.mealTypeChip, mealType === m.id && s.mealTypeChipActive]}
            onPress={() => setMealType(m.id)}
          >
            <Ionicons name={m.icon} size={14} color={mealType === m.id ? C.lime : C.sub} />
            <Text style={[s.mealTypeLabel, mealType === m.id && s.mealTypeLabelActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Macros totals bar */}
      <View style={s.totalsBar}>
        {[
          { val: totals.cal, lbl: "kcal" },
          { val: `${totals.p}g`, lbl: "protein" },
          { val: `${totals.c}g`, lbl: "carbs" },
          { val: `${totals.f}g`, lbl: "fat" },
        ].map((item) => (
          <View key={item.lbl} style={s.totalItem}>
            <Text style={s.totalVal}>{item.val}</Text>
            <Text style={s.totalLbl}>{item.lbl}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {[
          { id: "search", label: "Food library" },
          { id: "ingredients", label: `Ingredients (${ingredients.length})` },
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

      {tab === "search" && (
        <View style={{ flex: 1 }}>
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={16} color={C.sub} />
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search food library"
              placeholderTextColor={C.dim}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-outline" size={18} color={C.sub} />
              </TouchableOpacity>
            )}
          </View>

          {searchError ? <Text style={s.searchError}>{searchError}</Text> : null}

          {loading ? (
            <View style={s.centered}>
              <ActivityIndicator color={C.purple} />
              <Text style={s.loadingTxt}>Searching…</Text>
            </View>
          ) : (
            <FlatList
              data={uniqueFoods}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              ListEmptyComponent={
                <View style={s.emptyState}>
                  <Text style={s.emptyTitle}>{search ? "No matching foods" : "Search the food library"}</Text>
                  <Text style={s.emptySub}>
                    {search
                      ? "Try a different name or brand."
                      : "Type a food name to find ingredients."}
                  </Text>
                  {!search && (
                    <View style={s.suggestionRow}>
                      {["Chicken Breast", "Brown Rice", "Egg", "Avocado", "Oats"].map((term) => (
                        <TouchableOpacity key={term} style={s.chip} onPress={() => setSearch(term)}>
                          <Text style={s.chipTxt}>{term}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              }
              renderItem={({ item }) => {
                const isAdded = ingredients.some((i) => i.foodId === item.id);
                return (
                  <View style={[s.foodRow, isAdded && s.foodRowAdded]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.foodName}>{item.name}</Text>
                      <Text style={s.foodMeta}>
                        {Math.round(item.calories_per_100g || 0)} kcal · {Math.round(item.protein_per_100g || 0)}g P · {Math.round(item.carbs_per_100g || 0)}g C · {Math.round(item.fat_per_100g || 0)}g F — per 100g
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[s.addBtn, isAdded && s.addBtnDone]}
                      onPress={() => (isAdded ? removeIngredient(item.id) : addIngredient(item))}
                    >
                      <Ionicons name={isAdded ? "checkmark" : "add"} size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

      {tab === "ingredients" && (
        <ScrollView contentContainerStyle={s.addedScroll}>
          {!ingredients.length ? (
            <View style={s.emptyState}>
              <Ionicons name="restaurant-outline" size={40} color={C.dim} style={{ marginBottom: 12 }} />
              <Text style={s.emptyTitle}>No ingredients yet</Text>
              <Text style={s.emptySub}>Go to the food library tab and search for ingredients to add.</Text>
            </View>
          ) : (
            ingredients.map((item) => (
              <View key={item.foodId} style={s.addedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.foodName}>{item.foodName}</Text>
                  <Text style={s.foodMeta}>
                    {item.calories} kcal · {item.protein}g P · {item.carbs}g C · {item.fat}g F
                  </Text>
                </View>
                <View style={s.qtyControl}>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.foodId, item.quantity - 25)}>
                    <Ionicons name="remove" size={13} color={C.accent} />
                  </TouchableOpacity>
                  <Text style={s.qtyVal}>{item.quantity}g</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.foodId, item.quantity + 25)}>
                    <Ionicons name="add" size={13} color={C.accent} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => removeIngredient(item.foodId)} style={s.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={C.sub} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  title: { color: C.text, fontSize: FS.sectionTitle, fontWeight: "800" },
  subtitle: { color: C.sub, fontSize: FS.btnSecondary, marginTop: 3 },
  saveBtn: { backgroundColor: C.purple, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  saveBtnOff: { opacity: 0.4 },
  saveTxt: { color: "#fff", fontSize: FS.body, fontWeight: "800" },
  nameRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginTop: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border,
  },
  nameInput: { flex: 1, color: C.text, fontSize: FS.bodyLarge, fontWeight: "600" },
  mealTypeRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  mealTypeChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border,
  },
  mealTypeChipActive: { backgroundColor: `${C.lime}15`, borderColor: `${C.lime}50` },
  mealTypeLabel: { color: C.sub, fontSize: FS.body, fontWeight: "600" },
  mealTypeLabelActive: { color: C.lime },
  totalsBar: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: C.border,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  totalItem: {
    flex: 1, alignItems: "center",
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingVertical: 8, marginHorizontal: 3,
  },
  totalVal: { color: C.text, fontSize: FS.bodyLarge, fontWeight: "800" },
  totalLbl: { color: C.sub, fontSize: FS.sub, marginTop: 2 },
  tabs: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  tab: {
    flex: 1, alignItems: "center", paddingVertical: 11,
    borderRadius: 14, backgroundColor: C.cardAlt,
    borderWidth: 1, borderColor: C.border,
  },
  tabActive: { backgroundColor: `${C.purple}20`, borderColor: `${C.purple}35` },
  tabTxt: { color: C.sub, fontSize: FS.body, fontWeight: "700" },
  tabTxtActive: { color: C.text },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    margin: 16, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, color: C.text, fontSize: FS.bodyLarge },
  searchError: { color: "#FF8787", fontSize: FS.btnSecondary, marginHorizontal: 16, marginTop: 4 },
  loadingTxt: { color: C.sub, fontSize: FS.body, marginTop: 10 },
  emptyState: { alignItems: "center", paddingTop: 40, paddingHorizontal: 24 },
  emptyTitle: { color: C.text, fontSize: FS.cardTitle, fontWeight: "700", textAlign: "center" },
  emptySub: { color: C.sub, fontSize: FS.body, lineHeight: 19, marginTop: 6, textAlign: "center" },
  suggestionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16, justifyContent: "center" },
  chip: {
    backgroundColor: C.cardAlt, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.border,
  },
  chipTxt: { color: C.lime, fontSize: FS.btnSecondary, fontWeight: "700" },
  foodRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 14, marginBottom: 10,
  },
  foodRowAdded: { borderColor: `${C.purple}40`, backgroundColor: `${C.purple}10` },
  foodName: { color: C.text, fontSize: FS.btnPrimary, fontWeight: "700" },
  foodMeta: { color: C.sub, fontSize: FS.sub, marginTop: 4, lineHeight: 16 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.purple, alignItems: "center", justifyContent: "center",
  },
  addBtnDone: { backgroundColor: "#3DAD6B" },
  addedScroll: { padding: 16 },
  addedRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 14, marginBottom: 10,
  },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  qtyVal: { color: C.text, fontSize: FS.body, fontWeight: "700", minWidth: 44, textAlign: "center" },
  deleteBtn: { padding: 4 },
});
