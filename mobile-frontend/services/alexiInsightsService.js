/**
 * mobile-frontend/services/alexiInsightsService.js
 *
 * Generates and caches personalised AI fitness insight cards for the Insights screen.
 * Calls the `yara-insights` Supabase Edge Function (which holds the Groq key server-side).
 * Results are cached in the `ai_insights` table for 6 hours.
 *
 * FLOW
 *   1. Screen calls generateAndCacheInsights(userId, rawStats, period) after RPC loads.
 *   2. Check ai_insights for rows < 6h old for this user + period.
 *   3a. Cache HIT  → return formatted rows immediately (no Groq call).
 *   3b. Cache MISS → call yara-insights Edge Function, write to ai_insights, return cards.
 *
 * OUTPUT per card: { icon, title, text, tag, color }
 */
import { supabase } from '../lib/supabase';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_INSIGHT_CARDS = 4;
const MAX_TITLE_LENGTH = 42;
const MAX_TEXT_LENGTH = 180;

// Deduplication map: prevents concurrent calls for the same user+period
// from each independently missing the cache and both calling Groq.
const inFlight = new Map();

// Valid insight category tags — must match what the Edge Function returns
const VALID_TAGS = ['Performance', 'Correlation', 'Optimization', 'Prediction', 'Recovery', 'Nutrition'];

// Left border / tag text colours per category
const INSIGHT_COLORS = {
  Performance:  '#6F4BF2',
  Correlation:  '#A38DF2',
  Optimization: '#CDF27E',
  Prediction:   '#6F4BF2',
  Recovery:     '#A38DF2',
  Nutrition:    '#CDF27E',
};

// One emoji per category — AI doesn't decide the icon
const ICON_MAP = {
  Performance:  '🧬',
  Correlation:  '🌙',
  Optimization: '⚡',
  Prediction:   '🎯',
  Recovery:     '💪',
  Nutrition:    '🥗',
};


// =============================================================================
// normalizeTag(raw)
// Defensively extracts the first valid single tag from whatever the model returns.
// Handles compound strings like "Performance|Recovery" or "Optimization, Nutrition".
// =============================================================================
function normalizeTag(raw) {
  if (!raw) return 'Performance';
  const parts = String(raw).split(/[|,/\s]+/);
  for (const part of parts) {
    const match = VALID_TAGS.find(t => t.toLowerCase() === part.trim().toLowerCase());
    if (match) return match;
  }
  return 'Performance';
}

function trimSentence(text = '', maxLength = MAX_TEXT_LENGTH) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  const clipped = clean.slice(0, maxLength);
  const lastPunctuation = Math.max(clipped.lastIndexOf('.'), clipped.lastIndexOf('!'), clipped.lastIndexOf('?'));
  if (lastPunctuation >= Math.floor(maxLength * 0.55)) return clipped.slice(0, lastPunctuation + 1).trim();
  const lastSpace = clipped.lastIndexOf(' ');
  const final = clipped.slice(0, lastSpace > 35 ? lastSpace : maxLength).trim();
  // Always end with proper punctuation, never ellipsis
  return final.endsWith('.') || final.endsWith('!') ? final : `${final}.`;
}

function sanitizeInsightTitle(title = '', tag = 'Performance') {
  const clean = String(title)
    .replace(/[_|]+/g, ' ')
    .replace(/[.…]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // ✅ Only use complete full titles that actually fit
  if (!clean || clean.length > MAX_TITLE_LENGTH) {
    // Return proper professional titles by category instead of cutting sentences
    const fallbackTitles = {
      Performance: 'Training Performance',
      Recovery: 'Recovery Progress',
      Nutrition: 'Nutrition Insights',
      Optimization: 'Daily Optimization',
      Prediction: 'Trend Forecast',
      Correlation: 'Habit Correlation',
    };
    return fallbackTitles[tag] || tag;
  }
  
  // Ensure professional capitalization
  let normalized = clean.charAt(0).toUpperCase() + clean.slice(1);

  // No trailing punctuation on titles
  return normalized.replace(/[.,!?…]+$/g, '').trim();
}

function sanitizeInsightText(text = '', tag = 'Performance') {
  const clean = String(text)
    .replace(/[_|]+/g, ' ')
    .replace(/\b(nutrition|performance|recovery|optimization|prediction|correlation)\s*:\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // ✅ Filter out LLM garbage, apologies and error responses completely
  const invalidPatterns = [
    /i'?m not sure/i,
    /i don'?t (know|understand)/i,
    /sorry/i,
    /apologize/i,
    /what you mean/i,
    /i cannot/i,
    /unable to/i,
    /as an ai/i,
    /i don'?t have/i,
    /^\s*i\s+/i,
  ];

  const isInvalid = invalidPatterns.some(pattern => pattern.test(clean)) 
    || clean.length < 20 
    || /^[a-z\s]+$/i.test(clean) && clean.split(' ').some(word => word.length > 12 && !/[aeiou]/i.test(word));

  if (!clean || isInvalid) {
    const fallbackByTag = {
      Performance: 'Your training trend is moving in the right direction.',
      Recovery: 'Recovery is the best lever to improve your next session.',
      Nutrition: 'Small nutrition adjustments will help your consistency.',
      Optimization: 'A small routine change can improve your day.',
      Prediction: 'Your current trend suggests steady progress.',
      Correlation: 'Your habits are shaping how you feel and perform.',
    };
    return fallbackByTag[tag] || 'You are building steady progress.';
  }

  return trimSentence(clean);
}

function normalizeInsight(ins) {
  const tag = normalizeTag(ins?.tag);
  return {
    icon: ICON_MAP[tag] ?? '💡',
    title: sanitizeInsightTitle(ins?.title, tag),
    text: sanitizeInsightText(ins?.text, tag),
    tag,
    color: INSIGHT_COLORS[tag] ?? '#6F4BF2',
  };
}

function dedupeInsights(insights = []) {
  const seenTags = new Set();
  const seenContent = new Set();
  const result = [];

  for (const insight of insights) {
    if (!insight?.title || !insight?.text) continue;

    const contentKey = `${insight.title.toLowerCase()}|${insight.text.toLowerCase()}`;
    if (seenContent.has(contentKey)) continue;

    if (seenTags.has(insight.tag)) {
      const existingIndex = result.findIndex(item => item.tag === insight.tag);
      if (existingIndex >= 0 && result[existingIndex].text.length >= insight.text.length) continue;
      if (existingIndex >= 0) result.splice(existingIndex, 1);
    }

    seenTags.add(insight.tag);
    seenContent.add(contentKey);
    result.push(insight);

    if (result.length >= MAX_INSIGHT_CARDS) break;
  }

  return result.slice(0, MAX_INSIGHT_CARDS);
}


// =============================================================================
// rowToInsight(row)
// Converts an ai_insights DB row back into a display card.
// message format: "Short title|Full body text" (split on first pipe only)
// =============================================================================
function rowToInsight(row) {
  const pipeIdx = row.message.indexOf('|');
  const title = pipeIdx === -1 ? row.message : row.message.slice(0, pipeIdx);
  const text = pipeIdx === -1 ? '' : row.message.slice(pipeIdx + 1);
  return normalizeInsight({
    tag: row.insight_type,
    title,
    text,
  });
}


// =============================================================================
// callEdgeFunction(stats, period) — calls the yara-insights Edge Function.
// The Groq API key lives in Supabase secrets; it never reaches the client.
// =============================================================================
async function callEdgeFunction(stats, period) {
  console.log('[alexiInsightsService] Invoking yara-insights Edge Function for period:', period);
  const { data, error } = await supabase.functions.invoke('yara-insights', {
    body: { period, stats },
  });
  if (error) {
    console.error('[alexiInsightsService] Edge Function error:', error);
    throw error;
  }
  console.log('[alexiInsightsService] Edge Function returned', Array.isArray(data) ? data.length : 0, 'insights');
  return Array.isArray(data) ? data : [];
}


// =============================================================================
// generateAndCacheInsights(userId, rawStats, period) — exported
//
// Main entry point called from the Insights screen once the RPC data is ready.
// Checks the 6h cache first; only calls Groq if stale or absent.
// Returns Promise<Array<{ icon, title, text, tag, color }>>
// =============================================================================
export function generateAndCacheInsights(userId, rawStats, period) {
  const key = `${userId}:${period}`;
  if (inFlight.has(key)) return inFlight.get(key);
  const promise = _generateAndCacheInsights(userId, rawStats, period);
  inFlight.set(key, promise);
  promise.finally(() => inFlight.delete(key));
  return promise;
}

async function _generateAndCacheInsights(userId, rawStats, period) {
  try {
    // ── Step 1: Cache check ────────────────────────────────────────────────
    const since = new Date(Date.now() - CACHE_TTL_MS).toISOString();
    console.log('[alexiInsightsService] Checking ai_insights cache — userId:', userId, 'period:', period, 'since:', since);

    const { data: cached, error: cacheErr } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('period',  period)
      .eq('source',  'alexi')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(4);

    if (cacheErr) {
      console.error('[alexiInsightsService] Cache read error:', cacheErr);
    } else {
      console.log('[alexiInsightsService] Cache returned', cached?.length ?? 0, 'rows');
    }

    if (cached?.length >= 1) {
      const uniqueTags = new Set(cached.map(r => r.insight_type));
      // Stale cache: all rows have same tag (old all-Nutrition bug) → regenerate
      if (cached.length >= 3 && uniqueTags.size === 1) {
        console.log('[alexiInsightsService] Cache stale (all same tag) — regenerating');
      } else {
        console.log('[alexiInsightsService] Cache HIT — returning', cached.length, 'cached insights');
        return dedupeInsights(cached.map(rowToInsight));
      }
    }

    // ── Step 2: Generate via Edge Function ────────────────────────────────
    console.log('[alexiInsightsService] Cache MISS — calling Edge Function');
    const rawInsights = await callEdgeFunction(rawStats, period);
    if (!rawInsights?.length) {
      console.warn('[alexiInsightsService] Edge Function returned 0 insights');
      return [];
    }

    // ── Step 3: Persist to ai_insights ───────────────────────────────────
    const cleanedInsights = dedupeInsights(rawInsights.map(normalizeInsight));
    const rows = cleanedInsights.map(ins => ({
      user_id: userId,
      insight_type: normalizeTag(ins.tag),
      message: `${ins.title}|${ins.text}`,
      period,
      source: 'alexi',
    }));
    // Delete previous rows for this user+period before inserting fresh ones
    await supabase.from('ai_insights').delete().eq('user_id', userId).eq('period', period).eq('source', 'alexi');
    console.log('[alexiInsightsService] Inserting', rows.length, 'rows into ai_insights');
    const { error: insertErr } = rows.length
      ? await supabase.from('ai_insights').insert(rows)
      : { error: null };
    if (insertErr) {
      console.error('[alexiInsightsService] Insert error (non-fatal):', insertErr);
    }

    // ── Step 4: Return formatted cards ───────────────────────────────────
    const cards = cleanedInsights;
    console.log('[alexiInsightsService] Returning', cards.length, 'fresh insight cards');
    return cards;

  } catch (e) {
    console.error('[alexiInsightsService] generateAndCacheInsights error:', e);
    return [];
  }
}
