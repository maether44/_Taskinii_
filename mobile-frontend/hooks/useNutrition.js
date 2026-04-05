import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../config/supabase";

const DEFAULT_GOALS = {
  calorie_target: 2000,
  protein_target: 150,
  carbs_target: 250,
  fat_target: 65,
  water_target_ml: 2500,
};

export const MEAL_TYPE_MAP = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  snacks: "snack",
  snack: "snack",
};

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_META = {
  breakfast: { id: "breakfast", label: "Breakfast", icon: "☀️", accent: "#FFB74D" },
  lunch: { id: "lunch", label: "Lunch", icon: "🌤️", accent: "#7C5CFC" },
  dinner: { id: "dinner", label: "Dinner", icon: "🌙", accent: "#9D85F5" },
  snack: { id: "snack", label: "Snack", icon: "🍎", accent: "#C8F135" },
};

function todayString() {
  return new Date().toISOString().split("T")[0];
}

function normalizeGoals(row) {
  if (!row) return DEFAULT_GOALS;
  return {
    calorie_target: row.calorie_target ?? row.daily_calories ?? DEFAULT_GOALS.calorie_target,
    protein_target: row.protein_target ?? DEFAULT_GOALS.protein_target,
    carbs_target: row.carbs_target ?? DEFAULT_GOALS.carbs_target,
    fat_target: row.fat_target ?? DEFAULT_GOALS.fat_target,
    water_target_ml: row.water_target_ml ?? row.water_ml ?? DEFAULT_GOALS.water_target_ml,
  };
}

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function buildFoodPayload({ foodName, brand, barcode, calories, protein, carbs, fat, fiber, quantity }) {
  const safeQuantity = Math.max(1, Number(quantity) || 100);
  const scaleTo100 = 100 / safeQuantity;
  return {
    name: foodName,
    brand: brand || null,
    barcode: barcode || null,
    calories_per_100g: round1((Number(calories) || 0) * scaleTo100),
    protein_per_100g: round1((Number(protein) || 0) * scaleTo100),
    carbs_per_100g: round1((Number(carbs) || 0) * scaleTo100),
    fat_per_100g: round1((Number(fat) || 0) * scaleTo100),
    fiber_per_100g: round1((Number(fiber) || 0) * scaleTo100),
  };
}

function computeLogNutrition(log) {
  const food = log?.foods;
  const quantity = Math.max(1, Number(log?.quantity_grams) || 100);
  const ratio = quantity / 100;
  return {
    calories: Math.round((Number(food?.calories_per_100g) || 0) * ratio),
    protein: round1((Number(food?.protein_per_100g) || 0) * ratio),
    carbs: round1((Number(food?.carbs_per_100g) || 0) * ratio),
    fat: round1((Number(food?.fat_per_100g) || 0) * ratio),
    fiber: round1((Number(food?.fiber_per_100g) || 0) * ratio),
  };
}

async function ensureFoodRecord(payload) {
  let foodId = null;

  if (payload.barcode) {
    const { data: existingByBarcode } = await supabase
      .from("foods")
      .select("id")
      .eq("barcode", payload.barcode)
      .maybeSingle();
    if (existingByBarcode?.id) return existingByBarcode.id;
  }

  const { data: existingByName } = await supabase
    .from("foods")
    .select("id")
    .eq("name", payload.name)
    .is("barcode", null)
    .maybeSingle();

  if (existingByName?.id) {
    foodId = existingByName.id;
  } else {
    const { data: created, error } = await supabase
      .from("foods")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    foodId = created.id;
  }

  return foodId;
}

export function useNutrition() {
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [foodLogs, setFoodLogs] = useState([]);
  const [waterMl, setWaterMl] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [userId, setUserId] = useState(null);
  const [guestLogs, setGuestLogs] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setUserId(data.user.id);
    });
  }, []);

  const loadTodayData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const today = todayString();

    try {
      const [{ data: goalsData }, { data: logs }, { data: activity }] = await Promise.all([
        supabase
          .from("calorie_targets")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("food_logs")
          .select(`
            id, meal_type, quantity_grams, consumed_at,
            foods (
              id, name, brand, barcode,
              calories_per_100g, protein_per_100g,
              carbs_per_100g, fat_per_100g, fiber_per_100g
            )
          `)
          .eq("user_id", userId)
          .gte("consumed_at", `${today}T00:00:00.000Z`)
          .lte("consumed_at", `${today}T23:59:59.999Z`)
          .order("consumed_at", { ascending: true }),
        supabase
          .from("daily_activity")
          .select("water_ml, calories_burned")
          .eq("user_id", userId)
          .eq("date", today)
          .maybeSingle(),
      ]);

      setGoals(normalizeGoals(goalsData));
      setFoodLogs(logs || []);
      setWaterMl(activity?.water_ml || 0);
      setCaloriesBurned(activity?.calories_burned || 0);
    } catch (error) {
      console.error("loadTodayData error:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadTodayData();
  }, [userId, loadTodayData]);

  const saveMealEntries = useCallback(async ({ mealType = "snack", items = [] }) => {
    const dbMealType = MEAL_TYPE_MAP[mealType] || "snack";
    const normalizedItems = items
      .map((item) => ({
        ...item,
        quantity: Math.max(1, Number(item?.quantity) || 100),
      }))
      .filter((item) => item.foodName && item.quantity > 0);

    if (!normalizedItems.length) return false;

    if (!userId) {
      setGuestLogs((prev) => [
        ...prev,
        ...normalizedItems.map((item, index) => ({
          id: `${Date.now()}-${index}`,
          meal_type: dbMealType,
          quantity_grams: item.quantity,
          consumed_at: new Date().toISOString(),
          foods: buildFoodPayload(item),
        })),
      ]);
      return true;
    }

    try {
      const inserts = [];
      for (const item of normalizedItems) {
        const payload = buildFoodPayload(item);
        const foodId = await ensureFoodRecord(payload);
        inserts.push({
          user_id: userId,
          food_id: foodId,
          meal_type: dbMealType,
          quantity_grams: item.quantity,
          consumed_at: new Date().toISOString(),
        });
      }

      const { error } = await supabase.from("food_logs").insert(inserts);
      if (error) throw error;
      await loadTodayData();
      return true;
    } catch (error) {
      console.error("saveMealEntries error:", error);
      return false;
    }
  }, [loadTodayData, userId]);

  const logScannedFood = useCallback(async ({
    mealType = "snack",
    foodName,
    brand = "",
    calories = 0,
    protein = 0,
    carbs = 0,
    fat = 0,
    fiber = 0,
    quantity = 100,
    barcode = null,
  }) => {
    return saveMealEntries({
      mealType,
      items: [{ foodName, brand, calories, protein, carbs, fat, fiber, quantity, barcode }],
    });
  }, [saveMealEntries]);

  const logWater = useCallback(async (mlDelta) => {
    if (!userId) {
      setWaterMl((prev) => Math.max(0, prev + mlDelta));
      return;
    }

    try {
      const today = todayString();
      const { data: existing } = await supabase
        .from("daily_activity")
        .select("*")
        .eq("user_id", userId)
        .eq("date", today)
        .maybeSingle();

      const newMl = Math.max(0, (existing?.water_ml || 0) + mlDelta);
      if (existing?.id) {
        await supabase.from("daily_activity").update({ water_ml: newMl }).eq("id", existing.id);
      } else {
        await supabase.from("daily_activity").insert({ user_id: userId, date: today, water_ml: newMl });
      }
      setWaterMl(newMl);
    } catch (error) {
      console.error("logWater error:", error);
    }
  }, [userId]);

  const allLogs = userId ? foodLogs : guestLogs;

  const totals = useMemo(() => {
    return allLogs.reduce((acc, log) => {
      const entry = computeLogNutrition(log);
      return {
        calories: acc.calories + entry.calories,
        protein: round1(acc.protein + entry.protein),
        carbs: round1(acc.carbs + entry.carbs),
        fat: round1(acc.fat + entry.fat),
        fiber: round1(acc.fiber + entry.fiber),
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  }, [allLogs]);

  const mealSections = useMemo(() => {
    return MEAL_ORDER.map((slotId) => {
      const slotLogs = allLogs.filter((log) => log.meal_type === slotId);
      const items = slotLogs.map((log) => {
        const nutrition = computeLogNutrition(log);
        return {
          id: log.id,
          name: log.foods?.name || "Food item",
          brand: log.foods?.brand || "",
          quantity: Math.max(1, Number(log.quantity_grams) || 100),
          time: log.consumed_at,
          ...nutrition,
        };
      });

      const mealTotals = items.reduce((acc, item) => ({
        calories: acc.calories + item.calories,
        protein: round1(acc.protein + item.protein),
        carbs: round1(acc.carbs + item.carbs),
        fat: round1(acc.fat + item.fat),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      return {
        ...MEAL_META[slotId],
        dbKey: slotId,
        logged: items.length > 0,
        itemCount: items.length,
        items,
        totals: mealTotals,
      };
    });
  }, [allLogs]);

  const mealsBySlot = useMemo(() => {
    return mealSections.reduce((acc, section) => {
      acc[section.id === "snack" ? "snacks" : section.id] = {
        logged: section.logged,
        cal: section.totals.calories,
        items: section.items.map((item) => item.name),
      };
      return acc;
    }, {});
  }, [mealSections]);

  return {
    loading,
    goals,
    eaten: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    fiber: totals.fiber,
    waterMl,
    caloriesBurned,
    mealSections,
    mealsBySlot,
    foodLogs: allLogs,
    logScannedFood,
    saveMealEntries,
    logWater,
    refresh: loadTodayData,
  };
}
