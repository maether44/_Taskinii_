import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MacroBar from "../components/MacroBar";
import RingProgress from "../components/RingProgress";
import { MEAL_SLOTS } from "../data/mockFoods";
import {
  CALORIE_TARGET,
  MACROS,
  TODAY,
  WATER_TARGET_ML,
} from "../data/mockUser";

const C = {
  bg: "#0F0B1E",
  card: "#161230",
  border: "#1E1A35",
  purple: "#7C5CFC",
  lime: "#C8F135",
  accent: "#9D85F5",
  text: "#FFFFFF",
  sub: "#6B5F8A",
  green: "#34C759",
  orange: "#FF9500",
};

// Mock logged meals state
const INITIAL_MEALS = {
  breakfast: {
    logged: true,
    cal: 480,
    items: ["Oats 80g", "Eggs x2", "Greek Yogurt 150g"],
  },
  lunch: {
    logged: true,
    cal: 620,
    items: ["Chicken Breast 200g", "White Rice 200g", "Broccoli"],
  },
  dinner: { logged: false, cal: 0, items: [] },
  snacks: { logged: false, cal: 0, items: [] },
};

export default function Nutrition({ navigation }) {
  const [meals, setMeals] = useState(INITIAL_MEALS);
  const [waterMl, setWaterMl] = useState(TODAY.water.ml);
  const [tab, setTab] = useState("today"); // today | week
  const [animTrigger, setAnimTrigger] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setAnimTrigger((prev) => prev + 1);
    }, []),
  );

  const totalEaten = Object.values(meals).reduce((a, m) => a + m.cal, 0);
  const calRemaining = Math.max(CALORIE_TARGET - totalEaten, 0);
  const calPct = Math.min(totalEaten / CALORIE_TARGET, 1);
  const waterPct = Math.min(waterMl / WATER_TARGET_ML, 1);
  const waterGlasses = Math.round(waterMl / 250);
  const waterGoalG = Math.round(WATER_TARGET_ML / 250);

  const logMeal = (slotId) => {
    navigation.navigate("MealLogger", {
      mealSlot: MEAL_SLOTS.find((m) => m.id === slotId) || {
        label: slotId,
        icon: "🍽️",
      },
    });
  };

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Nutrition</Text>
          <Text style={s.date}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>

        {/* Tab */}
        <View style={s.tabRow}>
          {["today", "week"].map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.tab, tab === t && s.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
                {t === "today" ? "Today" : "This Week"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── CALORIE SUMMARY ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>CALORIES</Text>
          <View style={s.calRow}>
            <RingProgress
              size={100}
              stroke={9}
              progress={calPct}
              color={C.lime}
            >
              <View style={{ alignItems: "center" }}>
                <Text style={s.ringNum}>{totalEaten}</Text>
                <Text style={s.ringLbl}>eaten</Text>
              </View>
            </RingProgress>
            <View style={s.calStats}>
              <View style={s.calStat}>
                <Text style={s.calStatVal}>{CALORIE_TARGET}</Text>
                <Text style={s.calStatLbl}>Goal</Text>
              </View>
              <View style={s.calDivider} />
              <View style={s.calStat}>
                <Text
                  style={[
                    s.calStatVal,
                    { color: calRemaining > 0 ? C.lime : C.orange },
                  ]}
                >
                  {calRemaining}
                </Text>
                <Text style={s.calStatLbl}>Left</Text>
              </View>
              <View style={s.calDivider} />
              <View style={s.calStat}>
                <Text style={s.calStatVal}>{TODAY.calories.burned}</Text>
                <Text style={s.calStatLbl}>Burned</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── MACROS ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>MACROS</Text>
          <MacroBar
            label="Protein"
            eaten={TODAY.protein.eaten}
            goal={MACROS.protein}
            color={C.purple}
            trigger={animTrigger}
          />
          <MacroBar
            label="Carbs"
            eaten={TODAY.carbs.eaten}
            goal={MACROS.carbs}
            color={C.accent}
            trigger={animTrigger}
          />
          <MacroBar
            label="Fat"
            eaten={TODAY.fat.eaten}
            goal={MACROS.fat}
            color={C.lime}
            trigger={animTrigger}
          />
          <View style={s.macroHints}>
            <Text style={s.macroHint}>
              💡 Protein goal: {MACROS.protein}g/day for muscle retention
            </Text>
          </View>
        </View>

        {/* ── MEALS ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>MEALS</Text>
          {MEAL_SLOTS.map((slot) => {
            const m = meals[slot.id];
            return (
              <View key={slot.id} style={s.mealRow}>
                <View style={s.mealLeft}>
                  <Text style={s.mealIcon}>{slot.icon}</Text>
                  <View>
                    <Text style={s.mealName}>{slot.label}</Text>
                    {m.logged ? (
                      <Text style={s.mealItems}>{m.items.join(" · ")}</Text>
                    ) : (
                      <Text style={s.mealEmpty}>Not logged yet</Text>
                    )}
                  </View>
                </View>
                <View style={s.mealRight}>
                  {m.logged && <Text style={s.mealCal}>{m.cal} kcal</Text>}
                  <TouchableOpacity
                    style={[s.mealBtn, m.logged && s.mealBtnLogged]}
                    onPress={() => logMeal(slot.id)}
                  >
                    <Text
                      style={[s.mealBtnTxt, m.logged && s.mealBtnTxtLogged]}
                    >
                      {m.logged ? "Edit" : "+ Add"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── WATER ── */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardLabel}>WATER</Text>
            <Text style={s.cardSub}>
              {waterGlasses}/{waterGoalG} glasses
            </Text>
          </View>

          {/* Big water display */}
          <View style={s.waterDisplay}>
            <Text style={s.waterNum}>{(waterMl / 1000).toFixed(1)}</Text>
            <Text style={s.waterUnit}>L</Text>
            <Text style={s.waterGoal}>
              of {(WATER_TARGET_ML / 1000).toFixed(1)}L goal
            </Text>
          </View>

          {/* Progress bar */}
          <View style={s.waterBarBg}>
            <View style={[s.waterBarFill, { width: `${waterPct * 100}%` }]} />
          </View>

          {/* Dot grid */}
          <View style={s.waterDots}>
            {Array.from({ length: waterGoalG }).map((_, i) => (
              <View
                key={i}
                style={[s.waterDot, i < waterGlasses && s.waterDotFilled]}
              />
            ))}
          </View>

          {/* Add buttons */}
          <View style={s.waterBtns}>
            {[250, 500, 750].map((ml) => (
              <TouchableOpacity
                key={ml}
                style={s.waterAddBtn}
                onPress={() =>
                  setWaterMl((p) => Math.min(p + ml, WATER_TARGET_ML + 500))
                }
              >
                <Text style={s.waterAddTxt}>+{ml}ml</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                s.waterAddBtn,
                { backgroundColor: "#FF3B3015", borderColor: "#FF3B3030" },
              ]}
              onPress={() => setWaterMl((p) => Math.max(0, p - 250))}
            >
              <Text style={[s.waterAddTxt, { color: "#FF3B30" }]}>Undo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: C.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  date: { color: C.sub, fontSize: 13 },

  tabRow: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 10 },
  tabActive: { backgroundColor: C.purple },
  tabTxt: { color: C.sub, fontSize: 13, fontWeight: "600" },
  tabTxtActive: { color: "#fff", fontWeight: "700" },

  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardLabel: {
    color: C.sub,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardSub: { color: C.sub, fontSize: 12 },

  calRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  ringNum: {
    color: C.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -1,
  },
  ringLbl: { color: C.sub, fontSize: 11, marginTop: 1 },
  calStats: { flex: 1, gap: 10 },
  calStat: {},
  calStatVal: { color: C.text, fontSize: 18, fontWeight: "800" },
  calStatLbl: { color: C.sub, fontSize: 11 },
  calDivider: { height: 1, backgroundColor: C.border },

  macroHints: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  macroHint: { color: C.sub, fontSize: 12, lineHeight: 18 },

  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  mealLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  mealIcon: { fontSize: 22, marginTop: 2 },
  mealName: { color: C.text, fontSize: 14, fontWeight: "700" },
  mealItems: { color: C.sub, fontSize: 11, marginTop: 2, lineHeight: 16 },
  mealEmpty: { color: C.border, fontSize: 11, marginTop: 2 },
  mealRight: { alignItems: "flex-end", gap: 5 },
  mealCal: { color: C.accent, fontSize: 13, fontWeight: "700" },
  mealBtn: {
    backgroundColor: C.purple,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  mealBtnLogged: { backgroundColor: C.border },
  mealBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
  mealBtnTxtLogged: { color: C.sub },

  waterDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 6,
    marginBottom: 14,
  },
  waterNum: {
    color: C.text,
    fontSize: 52,
    fontWeight: "900",
    letterSpacing: -2,
  },
  waterUnit: { color: C.sub, fontSize: 22, fontWeight: "600" },
  waterGoal: {
    color: C.sub,
    fontSize: 13,
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  waterBarBg: {
    height: 8,
    backgroundColor: C.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  waterBarFill: { height: 8, backgroundColor: "#0A84FF", borderRadius: 4 },
  waterDots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginBottom: 16,
  },
  waterDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.border,
  },
  waterDotFilled: { backgroundColor: "#0A84FF" },
  waterBtns: { flexDirection: "row", gap: 8 },
  waterAddBtn: {
    flex: 1,
    backgroundColor: "#0A84FF18",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0A84FF35",
  },
  waterAddTxt: { color: "#0A84FF", fontSize: 13, fontWeight: "700" },
});
