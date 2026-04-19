// src/services/nutritionService.js
// All nutrition DB operations — matches the exact Supabase schema
import { supabase } from '../lib/supabase';
import { DEFAULT_TARGETS } from '../constants/targets';

const TODAY = () => new Date().toISOString().split('T')[0];

// ── Food Logs ────────────────────────────────────────────────────────────────

export async function getTodayFoodLogs(userId) {
    const today = TODAY();
    const { data, error } = await supabase
        .from('food_logs')
        .select(`
      id, meal_type, quantity_grams, consumed_at,
      foods (
        id, name, brand,
        calories_per_100g, protein_per_100g,
        carbs_per_100g, fat_per_100g, fiber_per_100g
      )
    `)
        .eq('user_id', userId)
        .gte('consumed_at', `${today}T00:00:00.000Z`)
        .lte('consumed_at', `${today}T23:59:59.999Z`)
        .order('consumed_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
}

// Find or create food in foods table, then log it
export async function logFood(userId, {
    foodName, brand = '', barcode = null,
    calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g = 0,
    quantity_grams = 100,
    meal_type = 'snack',
}) {
    // Validate meal_type against DB CHECK constraint
    const validTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    const dbMealType = validTypes.includes(meal_type) ? meal_type : 'snack';

    // Step 1: find or create food
    let foodId = null;

    if (barcode) {
        const { data: existing } = await supabase
            .from('foods').select('id').eq('barcode', barcode).single();
        if (existing) foodId = existing.id;
    }

    if (!foodId) {
        const { data: newFood, error: foodError } = await supabase
            .from('foods')
            .insert({
                name: foodName, brand: brand || null, barcode: barcode || null,
                calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g
            })
            .select('id').single();
        if (foodError) throw foodError;
        foodId = newFood.id;
    }

    // Step 2: insert food_log
    const { error: logError } = await supabase.from('food_logs').insert({
        user_id: userId,
        food_id: foodId,
        meal_type: dbMealType,
        quantity_grams: quantity_grams,
        consumed_at: new Date().toISOString(),
    });
    if (logError) throw logError;
    refreshAfterFoodLog(userId);
    return true;
}

export async function deleteFoodLog(logId) {
    const { error } = await supabase.from('food_logs').delete().eq('id', logId);
    if (error) throw error;
}

// ── Calorie Targets ──────────────────────────────────────────────────────────

export async function getCalorieTargets(userId) {
    const { data, error } = await supabase
        .from('calorie_targets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ?? {
        daily_calories: DEFAULT_TARGETS.calorie_target,
        protein_target: DEFAULT_TARGETS.protein_target,
        carbs_target:   DEFAULT_TARGETS.carbs_target,
        fat_target:     DEFAULT_TARGETS.fat_target,
    };
}

export async function saveCalorieTargets(userId, targets) {
    const { data, error } = await supabase
        .from('calorie_targets')
        .insert({ user_id: userId, ...targets })
        .select().single();
    if (error) throw error;
    return data;
}

// ── Water ────────────────────────────────────────────────────────────────────

export async function getWaterToday(userId) {
    const { data } = await supabase
        .from('daily_activity')
        .select('water_ml')
        .eq('user_id', userId)
        .eq('date', TODAY())
        .single();
    return data?.water_ml ?? 0;
}

export async function logWater(userId, mlDelta) {
    const today = TODAY();
    const { data: existing } = await supabase
        .from('daily_activity').select('*').eq('user_id', userId).eq('date', today).single();

    const newMl = Math.max(0, (existing?.water_ml || 0) + mlDelta);
    if (existing) {
        await supabase.from('daily_activity').update({ water_ml: newMl }).eq('id', existing.id);
    } else {
        await supabase.from('daily_activity').insert({ user_id: userId, date: today, water_ml: newMl });
    }
    refreshAfterWaterLog(userId);
    return newMl;
}