/**
 * hooks/useNutrition.js
 * Works in GUEST mode (no auth) with local state,
 * and in AUTH mode with Supabase.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../config/supabase";

const DEFAULT_GOALS = {
    daily_calories: 2000,
    protein_target: 150,
    carbs_target: 250,
    fat_target: 65,
    water_ml: 2500,
};

export const MEAL_TYPE_MAP = {
    breakfast: "breakfast",
    lunch: "lunch",
    dinner: "dinner",
    snacks: "snack",
    snack: "snack",
};

export function useNutrition() {
    const [loading, setLoading]         = useState(false);
    const [goals, setGoals]             = useState(DEFAULT_GOALS);
    const [foodLogs, setFoodLogs]       = useState([]);
    const [waterMl, setWaterMl]         = useState(0);
    const [caloriesBurned, setCaloriesBurned] = useState(0);
    const [userId, setUserId]           = useState(null);

    // Local guest logs (when no auth)
    const [guestLogs, setGuestLogs] = useState([]);

    const TODAY = new Date().toISOString().split("T")[0];

    // Check auth once
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) setUserId(data.user.id);
        });
    }, []);

    // Load from Supabase only when authed
    const loadTodayData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const { data: goalsData } = await supabase
                .from("calorie_targets")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (goalsData) setGoals(goalsData);

            const { data: logs } = await supabase
                .from("food_logs")
                .select(`
                    id, meal_type, quantity_grams, consumed_at,
                    foods (
                        id, name, brand,
                        calories_per_100g, protein_per_100g,
                        carbs_per_100g, fat_per_100g, fiber_per_100g
                    )
                `)
                .eq("user_id", userId)
                .gte("consumed_at", `${TODAY}T00:00:00.000Z`)
                .lte("consumed_at", `${TODAY}T23:59:59.999Z`)
                .order("consumed_at", { ascending: true });

            setFoodLogs(logs || []);

            const { data: activity } = await supabase
                .from("daily_activity")
                .select("water_ml, calories_burned")
                .eq("user_id", userId)
                .eq("date", TODAY)
                .single();

            setWaterMl(activity?.water_ml || 0);
            setCaloriesBurned(activity?.calories_burned || 0);
        } catch (e) {
            console.error("loadTodayData error:", e);
        } finally {
            setLoading(false);
        }
    }, [userId, TODAY]);

    useEffect(() => { if (userId) loadTodayData(); }, [userId]);

    // Log scanned food — guest mode stores locally, auth mode uses Supabase
    const logScannedFood = useCallback(async ({
        mealType = "snack",
        foodName, brand = "",
        calories, protein, carbs, fat, fiber = 0,
        quantity = 100, barcode = null,
    }) => {
        const dbMealType = MEAL_TYPE_MAP[mealType] || "snack";

        if (!userId) {
            // Guest mode — store in local state
            setGuestLogs(prev => [...prev, {
                id: Date.now(),
                meal_type: dbMealType,
                quantity_grams: quantity,
                consumed_at: new Date().toISOString(),
                foods: {
                    name: foodName, brand,
                    calories_per_100g: calories,
                    protein_per_100g: protein,
                    carbs_per_100g: carbs,
                    fat_per_100g: fat,
                    fiber_per_100g: fiber,
                },
            }]);
            return true;
        }

        try {
            let foodId = null;
            if (barcode) {
                const { data: existing } = await supabase
                    .from("foods").select("id").eq("barcode", barcode).single();
                if (existing) foodId = existing.id;
            }
            if (!foodId) {
                const { data: newFood } = await supabase
                    .from("foods")
                    .insert({ name: foodName, brand: brand || null, calories_per_100g: calories, protein_per_100g: protein, carbs_per_100g: carbs, fat_per_100g: fat, fiber_per_100g: fiber, barcode: barcode || null })
                    .select().single();
                if (newFood) foodId = newFood.id;
            }
            if (!foodId) throw new Error("Could not create food");
            await supabase.from("food_logs").insert({
                user_id: userId, food_id: foodId, meal_type: dbMealType,
                quantity_grams: quantity, consumed_at: new Date().toISOString(),
            });
            await loadTodayData();
            return true;
        } catch (e) {
            console.error("logScannedFood error:", e);
            return false;
        }
    }, [userId, loadTodayData]);

    // Log water — guest mode uses local state
    const logWater = useCallback(async (mlDelta) => {
        if (!userId) {
            setWaterMl(prev => Math.max(0, prev + mlDelta));
            return;
        }
        try {
            const { data: existing } = await supabase
                .from("daily_activity").select("*")
                .eq("user_id", userId).eq("date", TODAY).single();
            const newMl = Math.max(0, (existing?.water_ml || 0) + mlDelta);
            if (existing) {
                await supabase.from("daily_activity").update({ water_ml: newMl }).eq("id", existing.id);
            } else {
                await supabase.from("daily_activity").insert({ user_id: userId, date: TODAY, water_ml: newMl });
            }
            setWaterMl(newMl);
        } catch (e) {
            console.error("logWater error:", e);
        }
    }, [userId, TODAY]);

    // Combine Supabase logs + guest logs for totals
    const allLogs = userId ? foodLogs : guestLogs;

    const totals = allLogs.reduce((acc, log) => {
        const food = log.foods;
        if (!food) return acc;
        const scale = (log.quantity_grams || 100) / 100;
        return {
            calories: acc.calories + Math.round((food.calories_per_100g || 0) * scale),
            protein:  acc.protein  + Math.round((food.protein_per_100g  || 0) * scale),
            carbs:    acc.carbs    + Math.round((food.carbs_per_100g    || 0) * scale),
            fat:      acc.fat      + Math.round((food.fat_per_100g      || 0) * scale),
        };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const mealsBySlot = ["breakfast", "lunch", "dinner", "snacks"].reduce((acc, slot) => {
        const dbSlot = MEAL_TYPE_MAP[slot] || slot;
        const slotLogs = allLogs.filter(l => l.meal_type === dbSlot);
        acc[slot] = {
            logged: slotLogs.length > 0,
            cal: slotLogs.reduce((s, l) => {
                const food = l.foods;
                return food ? s + Math.round((food.calories_per_100g || 0) * (l.quantity_grams || 100) / 100) : s;
            }, 0),
            items: slotLogs.map(l => l.foods?.name).filter(Boolean),
        };
        return acc;
    }, {});

    return {
        loading,
        goals,
        eaten:          totals.calories,
        protein:        totals.protein,
        carbs:          totals.carbs,
        fat:            totals.fat,
        waterMl,
        caloriesBurned,
        mealsBySlot,
        foodLogs:       allLogs,
        logScannedFood,
        logWater,
        refresh:        loadTodayData,
    };
}