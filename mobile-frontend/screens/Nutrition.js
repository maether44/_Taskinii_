import { Ionicons } from "@expo/vector-icons";
import { FS } from '../constants/typography';
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MacroBar from "../components/shared/MacroBar";
import RingProgress from "../components/shared/RingProgress";
import { useNutrition } from "../hooks/useNutrition";
import { useProfile } from "../hooks/useProfile";
import { invokeEdgePublic, supabase } from "../lib/supabase";
import { AlexiEvents } from "../context/AlexiVoiceContext";

const C = {
  bg: "#0F0B1E",
  card: "#161230",
  cardAlt: "#1B1637",
  border: "#241E45",
  purple: "#7C5CFC",
  lime: "#C8F135",
  accent: "#9D85F5",
  text: "#FFFFFF",
  sub: "#8C80B1",
  dim: "#6B5F8A",
  blue: "#56B8FF",
};

function MacroPill({ label, value, color }) {
  return (
    <View style={[s.macroPill, { borderColor: `${color}35`, backgroundColor: `${color}12` }]}>
      <Text style={[s.macroPillValue, { color }]}>{value}</Text>
      <Text style={s.macroPillLabel}>{label}</Text>
    </View>
  );
}

function buildFallbackMealPlan({ goals, eaten, protein, carbs, fat, mealSections }) {
  const remainingCalories = Math.max((goals?.calorie_target || 0) - (eaten || 0), 0);
  const remainingProtein = Math.max((goals?.protein_target || 0) - (protein || 0), 0);
  const remainingCarbs = Math.max((goals?.carbs_target || 0) - (carbs || 0), 0);
  const remainingFat = Math.max((goals?.fat_target || 0) - (fat || 0), 0);
  const emptyMeals = (mealSections || []).filter((meal) => !meal.logged).map((meal) => meal.label.toLowerCase());
  const nextMeals = emptyMeals.length ? emptyMeals.join(", ") : "your next meal";
  const plan = [];

  if (remainingProtein > 35) {
    plan.push(`Protein is the main gap, so make ${nextMeals} center around chicken, tuna, Greek yogurt, eggs, or tofu.`);
  } else {
    plan.push("Protein is in a decent place, so keep the next meals balanced instead of over-correcting.");
  }

  if (remainingCalories > 600) {
    plan.push(`You still have about ${remainingCalories} kcal left, so you can fit a proper meal plus a snack.`);
  } else if (remainingCalories > 250) {
    plan.push(`You have about ${remainingCalories} kcal left, so one balanced meal should finish the day well.`);
  } else {
    plan.push("Calories are already close to target, so keep the rest of the day light and satisfying.");
  }

  if (remainingCarbs > remainingFat) {
    plan.push("Add quality carbs like rice, oats, potatoes, or fruit to keep energy up.");
  } else if (remainingFat > 15) {
    plan.push("Healthy fats are still low, so avocado, olive oil, nuts, or salmon would balance things nicely.");
  }

  plan.push("Fun version: build one easy plate with a protein, one smart carb, and one colorful fruit or vegetable so Yara has even better data tomorrow.");

  return plan.join(" ");
}

async function extractEdgeFunctionMessage(error) {
  if (!error) return "";

  if (error?.context) {
    try {
      const payload = await error.context.json();
      if (payload?.reason) return payload.reason;
      if (payload?.error) return payload.error;
      if (payload?.message) return payload.message;
    } catch {
      try {
        const text = await error.context.text();
        if (text) return text;
      } catch {
        // Ignore secondary parsing failures.
      }
    }
  }

  return error?.message || "";
}

const INTERNAL_LINE_RE = /^[^\n]*(COMMAND\s*:|MEMORIES\s*:|log_water|water_log|log_sleep|log_weight|log_food|log_workout|log_meal|meal_log|meal_planning|gain_weight|lose_weight|forget_fact|navigate)[^\n]*$/gim;

function cleanAiResponse(text) {
  if (!text) return text;
  return text.replace(INTERNAL_LINE_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

async function invokeYaraPlan(body) {
  try {
    const { data, error } = await supabase.functions.invoke("ai-assistant", { body });
    if (error) {
      const detail = await extractEdgeFunctionMessage(error);
      throw new Error(detail || error.message);
    }
    return data;
  } catch (error) {
    const message = error?.message || "";
    if (/invalid jwt/i.test(message) || /non-2xx/i.test(message) || /unsupported jwt/i.test(message) || /ES256/i.test(message)) {
      return invokeEdgePublic("ai-assistant", body);
    }
    throw error;
  }
}

function buildClientNutritionContext({ goals, eaten, protein, carbs, fat, waterMl, caloriesBurned, mealSections }) {
  const recentMeals = (mealSections || [])
    .filter((meal) => meal.logged)
    .map((meal) => ({
      date: new Date().toISOString().slice(0, 10),
      meal_type: meal.id,
      foods: meal.items.map((item) => item.name).join(", "),
    }));

  return {
    nutrition: {
      avg_calories: eaten || 0,
      avg_protein_g: protein || 0,
      avg_carbs_g: carbs || 0,
      avg_fat_g: fat || 0,
      logged_days: recentMeals.length ? 1 : 0,
      daily_calorie_target: goals?.calorie_target || 2000,
      protein_target: goals?.protein_target || 150,
      carbs_target: goals?.carbs_target || 250,
      fat_target: goals?.fat_target || 65,
      recent_meals: recentMeals,
    },
    activity: {
      avg_water_ml: waterMl || 0,
      calories_burned: caloriesBurned || 0,
    },
  };
}

export default function Nutrition({ navigation }) {
  const { userId } = useProfile();
  const {
    loading,
    goals,
    eaten,
    protein,
    carbs,
    fat,
    waterMl,
    caloriesBurned,
    mealSections,
    deleteFoodLog,
    logWater,
    refresh,
  } = useNutrition();
  const [mealPlan, setMealPlan] = useState("");
  const [mealPlanLoading, setMealPlanLoading] = useState(false);
  const [mealPlanError, setMealPlanError] = useState("");
  const hasBootstrappedPlan = useRef(false);
  const fallbackMealPlan = useMemo(
    () => buildFallbackMealPlan({ goals, eaten, protein, carbs, fat, mealSections }),
    [goals, eaten, protein, carbs, fat, mealSections],
  );
  const clientContext = useMemo(
    () => buildClientNutritionContext({ goals, eaten, protein, carbs, fat, waterMl, caloriesBurned, mealSections }),
    [goals, eaten, protein, carbs, fat, waterMl, caloriesBurned, mealSections],
  );

  const loadMealPlan = useCallback(async () => {
    if (!userId) {
      setMealPlan(fallbackMealPlan);
      setMealPlanError("");
      return;
    }
    setMealPlanLoading(true);
    setMealPlanError("");

    try {
      const prompt = [
        "Use my real recent meals, calorie target, macro target, and goal.",
        "Give me a short enjoyable meal plan for today.",
        "Mention breakfast, lunch, dinner, and snack if useful.",
        "Focus on what I should repeat, swap, or add based on my actual logs.",
        "Keep it concise, practical, and fun.",
      ].join(" ");

      let resolvedData = await invokeYaraPlan({ userId, query: prompt, clientContext });
      if (!resolvedData?.response) {
        resolvedData = await invokeYaraPlan({ query: prompt, clientContext });
      }
      if (resolvedData?.fallback) {
        setMealPlan(cleanAiResponse(resolvedData?.response) || fallbackMealPlan);
        setMealPlanError(resolvedData?.reason
          ? `Yara is using fallback mode right now: ${resolvedData.reason}`
          : "Yara is using fallback mode right now.");
        return;
      }
      setMealPlan(cleanAiResponse(resolvedData?.response) || "");
    } catch (error) {
      const detail = await extractEdgeFunctionMessage(error);
      setMealPlan(fallbackMealPlan);
      setMealPlanError(
        detail
          ? `Yara live planning is unavailable right now: ${detail}`
          : "Yara live planning is unavailable right now, so this card is using a smart local fallback.",
      );
    } finally {
      setMealPlanLoading(false);
    }
  }, [clientContext, fallbackMealPlan, userId]);

  useFocusEffect(useCallback(() => {
    refresh();
  }, [refresh]));

  useEffect(() => {
    const off = AlexiEvents.on('dataUpdated', () => refresh());
    return off;
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    if (!userId) return;
    if (!hasBootstrappedPlan.current) {
      hasBootstrappedPlan.current = true;
      loadMealPlan();
    }
  }, [loading, loadMealPlan, userId]);

  const adjustedGoal = goals.calorie_target + (caloriesBurned || 0);
  const calRemaining = Math.max(adjustedGoal - eaten, 0);
  const calPct = Math.min(eaten / Math.max(1, adjustedGoal), 1);
  const waterPct = Math.min(waterMl / Math.max(1, goals.water_target_ml), 1);

  const openScanner = (mealType = "snack") => {
    navigation.navigate("FoodScanner", {
      currentCalories: eaten,
      currentProtein: protein,
      currentCarbs: carbs,
      currentFat: fat,
      goalCalories: goals.calorie_target,
      goalProtein: goals.protein_target,
      goalCarbs: goals.carbs_target,
      goalFat: goals.fat_target,
      mealType,
    });
  };

  const openMealLogger = (meal) => {
    navigation.navigate("MealLogger", { mealSlot: meal, onSavedAt: Date.now() });
  };

  if (loading) {
    return (
      <View style={[s.root, s.centered]}>
        <ActivityIndicator size="large" color={C.purple} />
        <Text style={s.loadingTxt}>Loading today's nutrition...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Food diary</Text>
            <Text style={s.date}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </Text>
          </View>
          <Image
            source={require("../assets/bodyqfood.png")}
            style={s.headerMascot}
            resizeMode="contain"
          />
          <TouchableOpacity onPress={refresh} style={s.refreshBtn}>
            <Ionicons name="refresh-outline" size={18} color={C.sub} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={() => openScanner("snack")} style={s.heroWrap}>
          <LinearGradient colors={["#7C5CFC", "#9D85F5"]} style={s.heroCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroEyebrow}>Food Scanner</Text>
              <Text style={s.heroTitle}>Scan a barcode or let AI estimate your meal</Text>
              <Text style={s.heroSub}>Then choose exactly where it belongs in today's diary.</Text>
            </View>
            <View style={s.heroIcon}>
              <Ionicons name="scan-outline" size={26} color="#fff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={s.summaryCard}>
          <View style={s.summaryTop}>
            <View>
              <Text style={s.cardLabel}>TODAY</Text>
              <Text style={s.cardTitle}>Calorie budget</Text>
              <Text style={s.cardSub}>
                {caloriesBurned > 0
                  ? `Workout bonus added: +${caloriesBurned} kcal`
                  : "Track meals to help Yara coach you better"}
              </Text>
            </View>
            <RingProgress size={116} stroke={10} progress={calPct} color={eaten > adjustedGoal ? "#FF6B6B" : C.lime}>
              <View style={{ alignItems: "center" }}>
                <Text style={s.ringValue}>{eaten}</Text>
                <Text style={s.ringLabel}>eaten</Text>
              </View>
            </RingProgress>
          </View>

          <View style={s.summaryStats}>
            <View style={s.summaryStat}>
              <Text style={s.summaryValue}>{adjustedGoal}</Text>
              <Text style={s.summaryLabel}>Budget</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryStat}>
              <Text style={s.summaryValue}>{calRemaining}</Text>
              <Text style={s.summaryLabel}>Left</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryStat}>
              <Text style={s.summaryValue}>{Math.round(calPct * 100)}%</Text>
              <Text style={s.summaryLabel}>Done</Text>
            </View>
          </View>

          <View style={s.macroSection}>
            <MacroBar label="Protein" eaten={protein} goal={goals.protein_target} color={C.purple} />
            <MacroBar label="Carbs" eaten={carbs} goal={goals.carbs_target} color={C.accent} />
            <MacroBar label="Fat" eaten={fat} goal={goals.fat_target} color={C.lime} />
          </View>
        </View>

        <View style={s.planCard}>
          <View style={s.planHead}>
            <View>
              <Text style={s.cardLabel}>YARA PLAN</Text>
              <Text style={s.cardTitle}>Today's meal game plan</Text>
            </View>
            <TouchableOpacity style={s.planRefreshBtn} onPress={loadMealPlan} disabled={mealPlanLoading}>
              <Ionicons name="sparkles-outline" size={16} color={C.lime} />
              <Text style={s.planRefreshTxt}>{mealPlanLoading ? "Thinking" : "Refresh"}</Text>
            </TouchableOpacity>
          </View>

          {mealPlanLoading ? (
            <View style={s.planLoading}>
              <ActivityIndicator color={C.lime} />
              <Text style={s.planLoadingTxt}>Yara is building your plan from your real logs...</Text>
            </View>
          ) : mealPlanError ? (
            <Text style={s.planError}>{mealPlanError}</Text>
          ) : mealPlan ? (
            <Text style={s.planBody}>{mealPlan}</Text>
          ) : (
            <Text style={s.planEmpty}>Log a couple meals and Yara will turn them into a more personalized day plan.</Text>
          )}
        </View>

        <View style={s.sectionHeader}>
          <View>
            <Text style={s.sectionTitle}>Meals</Text>
            <Text style={s.sectionSub}>Scan into a meal or add food manually</Text>
          </View>
          <TouchableOpacity style={s.scanMiniBtn} onPress={() => openScanner("snack")}>
            <Ionicons name="scan-outline" size={14} color={C.purple} />
            <Text style={s.scanMiniTxt}>Quick scan</Text>
          </TouchableOpacity>
        </View>

        {mealSections.map((meal) => (
          <View key={meal.id} style={s.mealCard}>
            <View style={s.mealHead}>
              <View style={s.mealTitleRow}>
                <View style={[s.mealIconWrap, { backgroundColor: `${meal.accent}18` }]}>
                  <Text style={s.mealEmoji}>{meal.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.mealName}>{meal.label}</Text>
                  <Text style={s.mealSub}>
                    {meal.logged
                      ? `${meal.itemCount} item${meal.itemCount > 1 ? "s" : ""} logged`
                      : "Nothing logged yet"}
                  </Text>
                </View>
              </View>
              <Text style={s.mealCalories}>{meal.totals.calories} kcal</Text>
            </View>

            {meal.logged ? (
              <>
                <View style={s.pillRow}>
                  <MacroPill label="Protein" value={`${meal.totals.protein}g`} color={C.purple} />
                  <MacroPill label="Carbs" value={`${meal.totals.carbs}g`} color={C.accent} />
                  <MacroPill label="Fat" value={`${meal.totals.fat}g`} color={C.lime} />
                </View>
                <View style={s.foodList}>
                  {meal.items.map((item) => (
                    <View key={item.id} style={s.foodRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.foodName}>{item.name}</Text>
                        <Text style={s.foodMeta}>
                          {item.quantity}g{item.brand ? ` • ${item.brand}` : ""}
                        </Text>
                      </View>
                      <Text style={s.foodCals}>{item.calories} kcal</Text>
                      <TouchableOpacity onPress={() => deleteFoodLog(item.id)} style={s.deleteBtn}>
                        <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={s.emptyMeal}>
                <Text style={s.emptyMealTxt}>Start with a scan or add a food manually.</Text>
              </View>
            )}

            <View style={s.mealActions}>
              <TouchableOpacity style={s.mealPrimaryBtn} onPress={() => openScanner(meal.id)}>
                <Ionicons name="camera-outline" size={15} color="#fff" />
                <Text style={s.mealPrimaryTxt}>Scan to {meal.label}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.mealSecondaryBtn} onPress={() => openMealLogger(meal)}>
                <Text style={s.mealSecondaryTxt}>{meal.logged ? "Add more manually" : "Add manually"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={s.waterCard}>
          <View style={s.sectionHeaderTight}>
            <View>
              <Text style={s.cardLabel}>HYDRATION</Text>
              <Text style={s.cardTitle}>Water tracker</Text>
            </View>
            <Text style={s.waterStat}>
              {(waterMl / 1000).toFixed(1)}L / {(goals.water_target_ml / 1000).toFixed(1)}L
            </Text>
          </View>
          <View style={s.waterBar}>
            <View style={[s.waterFill, { width: `${waterPct * 100}%` }]} />
          </View>
          <View style={s.waterBtns}>
            {[250, 500, 750].map((amount) => (
              <TouchableOpacity key={amount} style={s.waterBtn} onPress={() => logWater(amount)}>
                <Text style={s.waterBtnTxt}>+{amount}ml</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.waterBtn, s.waterUndo]} onPress={() => logWater(-250)}>
              <Text style={[s.waterBtnTxt, { color: "#FF6B6B" }]}>Undo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.yaraCard}>
          <Text style={s.cardLabel}>YARA</Text>
          <Text style={s.cardTitle}>Daily meal coaching works best with real logs</Text>
          <Text style={s.cardSub}>
            Every meal you save here becomes part of the nutrition context Yara can use when you ask for analysis or meal ideas.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { justifyContent: "center", alignItems: "center" },
  loadingTxt: { color: C.sub, marginTop: 12, fontSize: FS.sub },
  scroll: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  title: { color: C.text, fontSize: FS.screenTitle, fontWeight: "800", letterSpacing: -0.8 },
  date: { color: C.sub, fontSize: FS.btnSecondary, marginTop: 2 },
  headerMascot: { width: 72, height: 72 },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  heroWrap: { marginBottom: 14 },
  heroCard: {
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroEyebrow: { color: "rgba(255,255,255,0.7)", fontSize: FS.badge, fontWeight: "800", letterSpacing: 1.2 },
  heroTitle: { color: "#fff", fontSize: FS.sectionTitle, fontWeight: "800", lineHeight: 29, marginTop: 6 },
  heroSub: { color: "rgba(255,255,255,0.75)", fontSize: FS.btnSecondary, lineHeight: 20, marginTop: 8 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    backgroundColor: C.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 20,
  },
  summaryTop: { flexDirection: "row", justifyContent: "space-between", gap: 16, alignItems: "center" },
  cardLabel: { color: C.sub, fontSize: FS.badge, fontWeight: "800", letterSpacing: 1.1 },
  cardTitle: { color: C.text, fontSize: FS.sectionTitle, fontWeight: "800", marginTop: 6 },
  cardSub: { color: C.dim, fontSize: FS.btnSecondary, lineHeight: 20, marginTop: 6 },
  ringValue: { color: C.text, fontSize: FS.sectionTitle, fontWeight: "900" },
  ringLabel: { color: C.sub, fontSize: FS.badge },
  summaryStats: {
    flexDirection: "row",
    marginTop: 18,
    backgroundColor: C.cardAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
  },
  summaryStat: { flex: 1, alignItems: "center" },
  summaryValue: { color: C.text, fontSize: FS.cardTitle, fontWeight: "800" },
  summaryLabel: { color: C.sub, fontSize: FS.badge, marginTop: 4 },
  summaryDivider: { width: 1, backgroundColor: C.border },
  macroSection: { marginTop: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionHeaderTight: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: C.text, fontSize: FS.sectionTitle, fontWeight: "800" },
  sectionSub: { color: C.sub, fontSize: FS.btnSecondary, marginTop: 2 },
  scanMiniBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${C.purple}18`,
    borderWidth: 1,
    borderColor: `${C.purple}35`,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scanMiniTxt: { color: C.purple, fontSize: FS.badge, fontWeight: "700" },
  mealCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
  },
  mealHead: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  mealTitleRow: { flexDirection: "row", gap: 12, flex: 1 },
  mealIconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  mealEmoji: { fontSize: 20 },
  mealName: { color: C.text, fontSize: FS.cardTitle, fontWeight: "700" },
  mealSub: { color: C.sub, fontSize: FS.sub, marginTop: 3 },
  mealCalories: { color: C.lime, fontSize: FS.bodyLarge, fontWeight: "800" },
  pillRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  macroPill: { flex: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1 },
  macroPillValue: { fontSize: FS.btnSecondary, fontWeight: "800" },
  macroPillLabel: { color: C.sub, fontSize: FS.label, marginTop: 2 },
  foodList: { marginTop: 14, gap: 8 },
  foodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  foodName: { color: C.text, fontSize: FS.body, fontWeight: "700" },
  foodMeta: { color: C.sub, fontSize: FS.badge, marginTop: 2 },
  foodCals: { color: C.accent, fontSize: FS.btnSecondary, fontWeight: "700" },
  deleteBtn: { padding: 6 },
  emptyMeal: {
    marginTop: 14,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.cardAlt,
    alignItems: "center",
  },
  emptyMealTxt: { color: C.sub, fontSize: FS.sub },
  mealActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  mealPrimaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.purple,
    borderRadius: 14,
    paddingVertical: 13,
  },
  mealPrimaryTxt: { color: "#fff", fontSize: FS.sub, fontWeight: "800" },
  mealSecondaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 13,
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  mealSecondaryTxt: { color: C.text, fontSize: FS.sub, fontWeight: "700" },
  waterCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginTop: 8,
  },
  waterStat: { color: C.blue, fontSize: FS.btnSecondary, fontWeight: "700" },
  waterBar: { height: 10, borderRadius: 5, backgroundColor: `${C.blue}18`, marginTop: 14, overflow: "hidden" },
  waterFill: { height: "100%", backgroundColor: C.blue, borderRadius: 5 },
  waterBtns: { flexDirection: "row", gap: 8, marginTop: 16 },
  waterBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: `${C.blue}12`,
    borderWidth: 1,
    borderColor: `${C.blue}30`,
  },
  waterUndo: { backgroundColor: "rgba(255,107,107,0.08)", borderColor: "rgba(255,107,107,0.25)" },
  waterBtnTxt: { color: C.blue, fontSize: FS.sub, fontWeight: "700" },
  yaraCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginTop: 14,
  },
  planCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 18,
  },
  planHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  planRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(200,241,53,0.10)",
    borderColor: "rgba(200,241,53,0.24)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  planRefreshTxt: { color: C.lime, fontSize: FS.badge, fontWeight: "800" },
  planLoading: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  planLoadingTxt: { color: C.sub, fontSize: FS.sub, flex: 1, lineHeight: 19 },
  planBody: { color: C.text, fontSize: FS.btnSecondary, lineHeight: 22, marginTop: 16 },
  planEmpty: { color: C.sub, fontSize: FS.sub, lineHeight: 20, marginTop: 16 },
  planError: { color: "#FF6B6B", fontSize: FS.sub, lineHeight: 20, marginTop: 16 },
});
