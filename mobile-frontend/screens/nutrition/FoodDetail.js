import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNutrition } from "../../hooks/useNutrition";

const C = {
  bg: "#0F0B1E",
  card: "#161230",
  border: "#1E1A35",
  purple: "#7C5CFC",
  lime: "#C8F135",
  accent: "#9D85F5",
  text: "#FFFFFF",
  sub: "#6B5F8A",
};

function scale(food, qty) {
  const ratio = Math.max(1, qty) / 100;
  return {
    calories: Math.round((Number(food?.calories_per_100g) || 0) * ratio),
    protein: Math.round((Number(food?.protein_per_100g) || 0) * ratio * 10) / 10,
    carbs: Math.round((Number(food?.carbs_per_100g) || 0) * ratio * 10) / 10,
    fat: Math.round((Number(food?.fat_per_100g) || 0) * ratio * 10) / 10,
  };
}

export default function FoodDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  const { saveMealEntries } = useNutrition();
  const { food, mealType = "snack" } = route.params || {};
  const [qty, setQty] = useState(100);

  const totals = useMemo(() => scale(food, qty), [food, qty]);

  if (!food) {
    return (
      <View style={[s.root, s.centered]}>
        <Text style={s.title}>No food selected</Text>
      </View>
    );
  }

  const handleAdd = async () => {
    const ok = await saveMealEntries({
      mealType,
      items: [
        {
          foodName: food.name,
          brand: food.brand,
          barcode: food.barcode,
          quantity: qty,
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
          fiber: Math.round((Number(food?.fiber_per_100g) || 0) * (qty / 100) * 10) / 10,
        },
      ],
    });
    if (ok) navigation.goBack();
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title}>{food.name}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.calCard}>
          <Text style={s.calNum}>{totals.calories}</Text>
          <Text style={s.calUnit}>kcal for {qty}g</Text>
        </View>
        <View style={s.row}>
          {[
            { label: "Protein", value: `${totals.protein}g`, color: C.purple },
            { label: "Carbs", value: `${totals.carbs}g`, color: C.accent },
            { label: "Fat", value: `${totals.fat}g`, color: C.lime },
          ].map((item) => (
            <View key={item.label} style={s.statCard}>
              <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
        <View style={s.qtyRow}>
          <TouchableOpacity
            style={s.qtyBtn}
            onPress={() => setQty((prev) => Math.max(25, prev - 25))}
          >
            <Ionicons name="remove" size={18} color={C.accent} />
          </TouchableOpacity>
          <Text style={s.qtyText}>{qty}g</Text>
          <TouchableOpacity style={s.qtyBtn} onPress={() => setQty((prev) => prev + 25)}>
            <Ionicons name="add" size={18} color={C.accent} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={handleAdd}>
          <Text style={s.addBtnTxt}>Add to meal</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: C.text, fontSize: 18, fontWeight: "800" },
  scroll: { padding: 16 },
  calCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  calNum: { color: C.text, fontSize: 52, fontWeight: "900" },
  calUnit: { color: C.sub, fontSize: 14, marginTop: 4 },
  row: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  statValue: { fontSize: 20, fontWeight: "900" },
  statLabel: { color: C.sub, fontSize: 12, marginTop: 4 },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 20,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  qtyText: { color: C.text, fontSize: 28, fontWeight: "900" },
  addBtn: {
    backgroundColor: C.purple,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  addBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
