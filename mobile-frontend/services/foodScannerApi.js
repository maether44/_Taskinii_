const RAW_GEMINI_KEY = (process.env.EXPO_PUBLIC_GEMINI_API_KEY || "").trim();
const GEMINI_KEY = RAW_GEMINI_KEY.includes("PASTE_YOUR_GEMINI_API_KEY_HERE") ? "" : RAW_GEMINI_KEY;
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-001"];

import commonFoods from '../data/commonFoods.json';
import comprehensiveFoods from '../data/comprehensiveFoods.json';
import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';

function unique(values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

async function resolveGeminiModels() {
  if (!GEMINI_KEY) return GEMINI_MODELS;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`);
    if (!res.ok) return GEMINI_MODELS;
    const payload = await res.json().catch(() => ({}));
    const available = Array.isArray(payload?.models) ? payload.models : [];
    const supportsGenerate = available
      .filter((m) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
      .map((m) => String(m?.name || "").replace(/^models\//, ""))
      .filter((m) => m.startsWith("gemini-"));
    return unique([...GEMINI_MODELS, ...supportsGenerate]);
  } catch {
    return GEMINI_MODELS;
  }
}

function clamp(value) {
  return Math.max(0, parseFloat(value) || 0);
}

function roundInt(value) {
  return Math.round(clamp(value));
}

function healthScore(n) {
  let score = 50;
  score -= clamp(n["fat_100g"]) > 20 ? 15 : clamp(n["fat_100g"]) > 10 ? 7 : 0;
  score -= clamp(n["saturated-fat_100g"]) > 10 ? 10 : clamp(n["saturated-fat_100g"]) > 5 ? 5 : 0;
  score -= clamp(n["sugars_100g"]) > 20 ? 15 : clamp(n["sugars_100g"]) > 10 ? 7 : 0;
  score += clamp(n["fiber_100g"]) > 6 ? 15 : clamp(n["fiber_100g"]) > 3 ? 8 : 0;
  score += clamp(n["proteins_100g"]) > 20 ? 15 : clamp(n["proteins_100g"]) > 10 ? 8 : 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function computeHealthScoreFromMacros({ calories, protein, carbs, fat, fiber }) {
  let score = 70;
  if (protein >= 20) score += 8;
  if (protein < 8) score -= 8;
  if (fiber >= 6) score += 8;
  if (fiber < 2) score -= 6;
  if (fat > 30) score -= 8;
  if (carbs > 70) score -= 5;
  if (calories > 800) score -= 10;
  if (calories < 80) score -= 6;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildSuggestions({ protein, carbs, fat, calories }) {
  const tips = [];
  if (protein < 10) tips.push("Low protein. Pair with eggs, yogurt, tofu, or chicken.");
  if (carbs > 50) tips.push("Higher carb meal. Great before activity or with extra vegetables.");
  if (fat > 20) tips.push("Higher fat serving. Keep your remaining daily fat budget in mind.");
  if (calories > 550) tips.push("Calorie-dense choice. Balance later meals if needed.");
  if (!tips.length) tips.push("Solid overall balance for a single serving.");
  tips.push("Hydrate with this meal to support digestion and satiety.");
  return tips;
}

function normalizeBase64(input) {
  if (typeof input !== "string" || !input) return "";
  return input.replace(/^data:image\/\w+;base64,/, "").trim();
}

function extractJsonObject(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || text;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function sanitizeAiResult(parsed) {
  const protein = roundInt(parsed?.protein);
  const carbs = roundInt(parsed?.carbs);
  const fat = roundInt(parsed?.fat);
  const fiber = roundInt(parsed?.fiber);
  const macroCalories = protein * 4 + carbs * 4 + fat * 9;
  const providedCalories = roundInt(parsed?.calories);
  const calories = providedCalories > 0 ? providedCalories : macroCalories;
  const servingSize = Math.max(1, roundInt(parsed?.servingSize || 100));
  const servingUnit = typeof parsed?.servingUnit === "string" && parsed.servingUnit.trim()
    ? parsed.servingUnit.trim().toLowerCase()
    : "g";

  const out = {
    name: typeof parsed?.name === "string" && parsed.name.trim() ? parsed.name.trim() : "Meal from photo",
    brand: typeof parsed?.brand === "string" ? parsed.brand.trim() : "",
    calories,
    protein,
    carbs,
    fat,
    fiber,
    servingSize,
    servingUnit,
    barcode: null,
    healthScore: clamp(parsed?.healthScore) > 0
      ? Math.max(0, Math.min(100, roundInt(parsed.healthScore)))
      : computeHealthScoreFromMacros({ calories, protein, carbs, fat, fiber }),
    source: "photo_ai",
    confidence: Math.max(0.15, Math.min(0.99, parseFloat(parsed?.confidence) || 0.72)),
    suggestions: Array.isArray(parsed?.suggestions)
      ? parsed.suggestions.filter((tip) => typeof tip === "string" && tip.trim()).slice(0, 4)
      : buildSuggestions({ calories, protein, carbs, fat }),
  };

  if (!out.suggestions.length) out.suggestions = buildSuggestions(out);
  return out;
}

const CACHE_TTL_MS = 3 * 60 * 1000;
let photoCache = { key: "", result: null, ts: 0 };

function cacheKey(base64) {
  const len = base64?.length ?? 0;
  const head = (base64 || "").slice(0, 120);
  return `${len}-${head}`;
}

function parseOpenFoodFactsProduct(p) {
  const n = p.nutriments ?? {};
  const calories100 = roundInt(n["energy-kcal_100g"] || n["energy-kcal_value"] || 0);
  const protein100 = roundInt(n["proteins_100g"] || n["protein_100g"] || 0);
  const carbs100 = roundInt(n["carbohydrates_100g"] || n["carbohydrates_value"] || 0);
  const fat100 = roundInt(n["fat_100g"] || n["fat_value"] || 0);
  const fiber100 = roundInt(n["fiber_100g"] || n["fiber_value"] || 0);

  return {
    id: String(p.code || p._id || `${p.product_name || 'food'}-${Math.random().toString(36).slice(2, 8)}`),
    name: p.product_name || p.product_name_en || p.generic_name || "Food item",
    brand: p.brands || "",
    barcode: p.code || null,
    calories_per_100g: calories100,
    protein_per_100g: protein100,
    carbs_per_100g: carbs100,
    fat_per_100g: fat100,
    fiber_per_100g: fiber100,
    unit: "g",
    serving: Math.max(100, parseFloat(p.serving_quantity) || 100),
  };
}

function localSearch(query) {
  const q = query.toLowerCase().trim();
  const allFoods = [...commonFoods, ...comprehensiveFoods];
  const seen = new Map();
  for (const food of allFoods) {
    if (
      food.name.toLowerCase().includes(q) ||
      food.brand?.toLowerCase().includes(q)
    ) {
      const key = `${food.name.toLowerCase()}::${(food.brand || '').toLowerCase()}`;
      if (!seen.has(key)) seen.set(key, food);
    }
  }
  return Array.from(seen.values()).slice(0, 40);
}

async function openFoodFactsSearch(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const params = new URLSearchParams({
      q: query.trim(), page: "1", size: "30",
      fields: "code,product_name,brands,nutriments,serving_quantity",
    });
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/search?${params}`,
      { headers: { Accept: "application/json", "User-Agent": "Expo/ReactNative" }, signal: controller.signal }
    );
    if (!res.ok) throw new Error(`OFF ${res.status}`);
    const json = await res.json().catch(() => ({}));
    const products = Array.isArray(json?.products) ? json.products : [];
    const unique = new Map();
    for (const p of products) {
      const parsed = parseOpenFoodFactsProduct(p);
      if (parsed.name && parsed.name !== "Food item" && !unique.has(parsed.id))
        unique.set(parsed.id, parsed);
    }
    return Array.from(unique.values());
  } finally {
    clearTimeout(timer);
  }
}

export async function searchFoodLibrary(query) {
  if (!query || !query.trim()) return [];

  // 1 — Supabase foods table (primary, always reliable)
  try {
    const { data, error } = await supabase.rpc('search_foods', {
      p_query: query.trim(),
      p_limit: 40,
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((r) => ({
        id: String(r.id),
        name: r.name,
        brand: r.brand || "",
        barcode: r.barcode || null,
        calories_per_100g: Number(r.calories_per_100g) || 0,
        protein_per_100g: Number(r.protein_per_100g) || 0,
        carbs_per_100g: Number(r.carbs_per_100g) || 0,
        fat_per_100g: Number(r.fat_per_100g) || 0,
        fiber_per_100g: Number(r.fiber_per_100g) || 0,
        unit: "g",
        serving: 100,
      }));
    }
  } catch (e) {
    log("Supabase food search failed, falling back:", e.message);
  }

  // 2 — Local JSON bundle (instant, offline-safe)
  const local = localSearch(query);
  if (local.length > 0) return local;

  // 3 — OpenFoodFacts (last resort, may be slow or unavailable)
  try {
    const results = await openFoodFactsSearch(query);
    if (results.length > 0) return results;
  } catch (e) {
    log("OpenFoodFacts search failed:", e.message);
  }

  throw new Error("No foods found. Try a different name, or add one manually.");
}

export async function lookupBarcode(barcode) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  if (!res.ok) throw new Error("Network error. Check your internet connection.");
  const json = await res.json();
  if (json.status !== 1 || !json.product) throw new Error("Product not found in database.");

  const p = json.product;
  const n = p.nutriments ?? {};
  const serving = parseFloat(p.serving_quantity) || parseFloat(p.product_quantity) || 100;
  const scale = serving / 100;

  const data = {
    name: p.product_name || p.product_name_en || "Unknown product",
    brand: p.brands || "",
    calories: roundInt(n["energy-kcal_serving"] || n["energy-kcal_100g"] * scale),
    protein: roundInt(n["proteins_serving"] || n["proteins_100g"] * scale),
    carbs: roundInt(n["carbohydrates_serving"] || n["carbohydrates_100g"] * scale),
    fat: roundInt(n["fat_serving"] || n["fat_100g"] * scale),
    fiber: roundInt(n["fiber_serving"] || n["fiber_100g"] * scale),
    servingSize: Math.max(1, roundInt(serving)),
    servingUnit: "g",
    barcode,
    healthScore: healthScore(n),
    source: "barcode",
    confidence: 0.98,
    suggestions: buildSuggestions({
      calories: roundInt(n["energy-kcal_serving"] || n["energy-kcal_100g"] * scale),
      protein: roundInt(n["proteins_serving"] || n["proteins_100g"] * scale),
      carbs: roundInt(n["carbohydrates_serving"] || n["carbohydrates_100g"] * scale),
      fat: roundInt(n["fat_serving"] || n["fat_100g"] * scale),
    }),
  };

  return data;
}

export async function analysePhotoWithAI(base64Image) {
  const rawBase64 = normalizeBase64(base64Image);
  if (!rawBase64) throw new Error("No image data. Try taking the photo again.");
  if (!GEMINI_KEY) {
    throw new Error("AI photo scanning is not configured yet. Add your Gemini API key first.");
  }

  const key = cacheKey(rawBase64);
  if (photoCache.key === key && Date.now() - photoCache.ts < CACHE_TTL_MS && photoCache.result) {
    return photoCache.result;
  }

  const prompt = [
    "You are a nutrition assistant.",
    "Identify the primary food item or plated meal in the image.",
    "Estimate realistic nutrition for the visible serving only.",
    "Return only valid JSON and no markdown.",
    "{",
    '  "name": "string",',
    '  "brand": "string or empty",',
    '  "calories": number,',
    '  "protein": number,',
    '  "carbs": number,',
    '  "fat": number,',
    '  "fiber": number,',
    '  "servingSize": number,',
    '  "servingUnit": "g",',
    '  "healthScore": number,',
    '  "confidence": number,',
    '  "suggestions": ["short tip 1", "short tip 2", "short tip 3"]',
    "}",
    "Use plausible, non-negative values.",
    "Confidence must be from 0 to 1.",
    "If uncertain, lower confidence and still provide your best estimate.",
  ].join("\n");

  const modelIds = await resolveGeminiModels();
  let lastError = null;

  for (const modelId of modelIds) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: "image/jpeg", data: rawBase64 } },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1000,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        lastError = new Error(payload?.error?.message || `HTTP ${response.status}`);
        if (response.status === 401 || response.status === 403) break;
        continue;
      }

      const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parsed = extractJsonObject(text);
      if (!parsed) {
        lastError = new Error("AI returned unreadable nutrition data.");
        continue;
      }

      const result = sanitizeAiResult(parsed);
      photoCache = { key, result, ts: Date.now() };
      return result;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(lastError?.message || "AI photo scan failed. Please try again.");
}
