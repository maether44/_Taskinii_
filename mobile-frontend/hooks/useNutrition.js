import { useCallback, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useToday } from "../context/TodayContext";
import { AppEvents, emit } from "../lib/eventBus";
import { error as logError } from '../lib/logger';

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
  const { user: authUser } = useAuth();
  const userId = authUser?.id ?? null;
  const today = useToday();

  // Read shared state from TodayContext
  const { goals, foodLogs, waterMl, caloriesBurned, loading, logWater, refresh } = today;

  // Guest mode: local-only logs when not authenticated
  const [guestLogs, setGuestLogs] = useState([]);

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

      // Award XP for logging meals
      try {
        const xpAmount = inserts.length * 10;
        const { error: xpError } = await supabase.rpc('award_xp', {
          p_user_id: userId,
          p_amount: xpAmount,
          p_source: 'meal',
          p_description: `Logged ${inserts.length} food item(s)`
        });
        if (xpError) logError('[BodyQ] award_xp meal:', xpError);
      } catch (e) {
        logError('[BodyQ] award_xp meal exception:', e);
      }

      // Check for achievements
      try {
        const { data: achievementsResult, error: achError } = await supabase.rpc('check_achievements', {
          p_user_id: userId
        });
        if (achError) logError('[BodyQ] check_achievements:', achError);
        else if (achievementsResult?.awarded?.length > 0) {
          emit(AppEvents.ACHIEVEMENT_AWARDED, { awarded: achievementsResult.awarded });
        }
      } catch (e) {
        logError('[BodyQ] check_achievements exception:', e);
      }

      // Signal TodayContext to refresh + notify other subscribers
      emit(AppEvents.MEAL_LOGGED, { mealType: dbMealType, itemCount: inserts.length });
      return true;
    } catch (error) {
      logError("saveMealEntries error:", error);
      return false;
    }
  }, [refresh, userId]);

  const deleteFoodLog = useCallback(async (logId) => {
    if (!userId) {
      setGuestLogs((prev) => prev.filter((l) => l.id !== logId));
      return true;
    }
    try {
      const { error } = await supabase.from("food_logs").delete().eq("id", logId).eq("user_id", userId);
      if (error) throw error;
      refresh();
      return true;
    } catch (e) {
      logError("deleteFoodLog error:", e);
      return false;
    }
  }, [userId, refresh]);

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
    deleteFoodLog,
    logWater,
    refresh,
  };
}
