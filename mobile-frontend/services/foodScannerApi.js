/**
 * src/services/foodScannerApi.js
 * Barcode  -> OpenFoodFacts (free, no key needed)
 * AI Photo -> Google Gemini Vision
 *
 * Gemini key comes from .env via EXPO_PUBLIC_GEMINI_API_KEY.
 */
const RAW_GEMINI_KEY = (process.env.EXPO_PUBLIC_GEMINI_API_KEY || '').trim();
const GEMINI_KEY = RAW_GEMINI_KEY.includes('PASTE_YOUR_GEMINI_API_KEY_HERE') ? '' : RAW_GEMINI_KEY;
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-001'];

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
      .filter((m) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => String(m?.name || '').replace(/^models\//, ''))
      .filter((m) => m.startsWith('gemini-'));
    return unique([...GEMINI_MODELS, ...supportsGenerate]);
  } catch {
    return GEMINI_MODELS;
  }
}

function clamp(v) {
  return Math.max(0, parseFloat(v) || 0);
}

function roundInt(v) {
  return Math.round(clamp(v));
}

function healthScore(n) {
  let s = 50;
  s -= clamp(n['fat_100g']) > 20 ? 15 : clamp(n['fat_100g']) > 10 ? 7 : 0;
  s -= clamp(n['saturated-fat_100g']) > 10 ? 10 : clamp(n['saturated-fat_100g']) > 5 ? 5 : 0;
  s -= clamp(n['sugars_100g']) > 20 ? 15 : clamp(n['sugars_100g']) > 10 ? 7 : 0;
  s += clamp(n['fiber_100g']) > 6 ? 15 : clamp(n['fiber_100g']) > 3 ? 8 : 0;
  s += clamp(n['proteins_100g']) > 20 ? 15 : clamp(n['proteins_100g']) > 10 ? 8 : 0;
  return Math.max(0, Math.min(100, Math.round(s)));
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
  if (protein < 10) tips.push('Low protein. Pair with eggs, yogurt, tofu, or chicken.');
  if (carbs > 50) tips.push('Higher carb meal. Great before activity or with extra vegetables.');
  if (fat > 20) tips.push('Higher fat serving. Keep your remaining daily fat budget in mind.');
  if (calories > 550) tips.push('Calorie-dense choice. Balance later meals if needed.');
  if (!tips.length) tips.push('Solid overall balance for a single serving.');
  tips.push('Hydrate with this meal to support digestion and satiety.');
  return tips;
}

function normalizeBase64(input) {
  if (typeof input !== 'string' || !input) return '';
  return input.replace(/^data:image\/\w+;base64,/, '').trim();
}

function extractJsonObject(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || text;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const sliced = candidate.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(sliced);
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
  const servingUnit = typeof parsed?.servingUnit === 'string' && parsed.servingUnit.trim()
    ? parsed.servingUnit.trim().toLowerCase()
    : 'g';

  const out = {
    name: typeof parsed?.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'Meal (from photo)',
    brand: typeof parsed?.brand === 'string' ? parsed.brand.trim() : '',
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
    source: 'photo_ai',
    confidence: Math.max(0.15, Math.min(0.99, parseFloat(parsed?.confidence) || 0.72)),
    suggestions: Array.isArray(parsed?.suggestions)
      ? parsed.suggestions.filter((s) => typeof s === 'string' && s.trim()).slice(0, 4)
      : [],
  };

  if (!out.suggestions.length) {
    out.suggestions = buildSuggestions(out);
  }

  return out;
}

function getAlwaysWorksFallback() {
  return {
    name: 'Meal (from photo)',
    brand: '',
    calories: 350,
    protein: 18,
    carbs: 38,
    fat: 14,
    fiber: 4,
    servingSize: 200,
    servingUnit: 'g',
    barcode: null,
    healthScore: 65,
    source: 'estimate',
    confidence: 0.5,
    suggestions: [
      'AI was unavailable, so these are conservative estimates.',
      'You can adjust calories and macros before or after logging.',
      'For packaged items, barcode scan is usually the most accurate path.',
    ],
  };
}

const CACHE_TTL_MS = 3 * 60 * 1000;
let photoCache = { key: '', result: null, ts: 0 };

function cacheKey(base64) {
  const len = base64?.length ?? 0;
  const head = (base64 || '').slice(0, 120);
  return `${len}-${head}`;
}

export async function lookupBarcode(barcode) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  if (!res.ok) throw new Error('Network error. Check your internet connection.');
  const json = await res.json();
  if (json.status !== 1 || !json.product) throw new Error('Product not found in database.');

  const p = json.product;
  const n = p.nutriments ?? {};
  const serving = parseFloat(p.serving_size) || 100;
  const scale = serving / 100;

  const data = {
    name: p.product_name || p.product_name_en || 'Unknown product',
    brand: p.brands || '',
    calories: roundInt(n['energy-kcal_serving'] || n['energy-kcal_100g'] * scale),
    protein: roundInt(n['proteins_serving'] || n['proteins_100g'] * scale),
    carbs: roundInt(n['carbohydrates_serving'] || n['carbohydrates_100g'] * scale),
    fat: roundInt(n['fat_serving'] || n['fat_100g'] * scale),
    fiber: roundInt(n['fiber_serving'] || n['fiber_100g'] * scale),
    servingSize: Math.max(1, roundInt(serving)),
    servingUnit: 'g',
    barcode,
    healthScore: healthScore(n),
    source: 'barcode',
    confidence: 0.98,
  };
  data.suggestions = buildSuggestions(data);
  return data;
}

export async function analysePhotoWithAI(base64Image) {
  const rawBase64 = normalizeBase64(base64Image);
  if (!rawBase64) throw new Error('No image data. Try taking the photo again.');

  const key = cacheKey(rawBase64);
  if (photoCache.key === key && Date.now() - photoCache.ts < CACHE_TTL_MS && photoCache.result) {
    return photoCache.result;
  }

  if (!GEMINI_KEY) {
    const demo = demoFoodResult();
    photoCache = { key, result: demo, ts: Date.now() };
    return demo;
  }

  const prompt = [
    'You are a nutrition assistant.',
    'Identify the PRIMARY food item in the photo.',
    'Estimate realistic nutrition for the visible serving only.',
    'Return ONLY valid JSON, no markdown.',
    'Schema:',
    '{',
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
    '}',
    'Rules:',
    '- Values must be plausible and non-negative.',
    '- confidence must be 0 to 1.',
    '- If uncertain, lower confidence and still provide your best estimate.',
  ].join('\n');

  const modelIds = await resolveGeminiModels();

  let lastError = null;
  for (const modelId of modelIds) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: 'image/jpeg', data: rawBase64 } },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1000,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = payload?.error?.message || `HTTP ${response.status}`;
        lastError = new Error(msg);
        if (response.status === 401 || response.status === 403) break;
        continue;
      }

      const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = extractJsonObject(text);
      if (!parsed) {
        lastError = new Error('Gemini response did not contain valid JSON.');
        continue;
      }

      const out = sanitizeAiResult(parsed);
      photoCache = { key, result: out, ts: Date.now() };
      return out;
    } catch (error) {
      lastError = error;
    }
  }

  const fallback = getAlwaysWorksFallback();
  photoCache = { key, result: fallback, ts: Date.now() };
  console.warn('Food photo AI fallback used:', lastError?.message || 'Unknown AI error');
  return fallback;
}

export function demoFoodResult() {
  return {
    name: 'Avocado Toast',
    brand: '',
    calories: 320,
    protein: 9,
    carbs: 28,
    fat: 19,
    fiber: 7,
    servingSize: 180,
    servingUnit: 'g',
    barcode: null,
    healthScore: 84,
    source: 'demo',
    confidence: 0.75,
    suggestions: [
      'Add eggs or Greek yogurt to increase protein for better satiety.',
      'Whole-grain bread can improve fiber and micronutrient profile.',
      'Portion avocado if you need to keep calories tighter.',
    ],
  };
}
