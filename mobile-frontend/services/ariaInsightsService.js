/**
 * mobile-frontend/services/ariaInsightsService.js
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


// =============================================================================
// rowToInsight(row)
// Converts an ai_insights DB row back into a display card.
// message format: "Short title|Full body text" (split on first pipe only)
// =============================================================================
function rowToInsight(row) {
  const pipeIdx = row.message.indexOf('|');
  const title   = pipeIdx === -1 ? row.message         : row.message.slice(0, pipeIdx);
  const text    = pipeIdx === -1 ? ''                  : row.message.slice(pipeIdx + 1);
  const tag     = normalizeTag(row.insight_type);
  return {
    icon:  ICON_MAP[tag]         ?? '💡',
    title,
    text,
    tag,
    color: INSIGHT_COLORS[tag]  ?? '#6F4BF2',
  };
}


// =============================================================================
// callEdgeFunction(stats, period) — calls the yara-insights Edge Function.
// The Groq API key lives in Supabase secrets; it never reaches the client.
// =============================================================================
async function callEdgeFunction(stats, period) {
  console.log('[ariaInsightsService] Invoking yara-insights Edge Function for period:', period);
  const { data, error } = await supabase.functions.invoke('yara-insights', {
    body: { period, stats },
  });
  if (error) {
    console.error('[ariaInsightsService] Edge Function error:', error);
    throw error;
  }
  console.log('[ariaInsightsService] Edge Function returned', Array.isArray(data) ? data.length : 0, 'insights');
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
    console.log('[ariaInsightsService] Checking ai_insights cache — userId:', userId, 'period:', period, 'since:', since);

    const { data: cached, error: cacheErr } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('period',  period)
      .eq('source',  'aria')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(4);

    if (cacheErr) {
      console.error('[ariaInsightsService] Cache read error:', cacheErr);
    } else {
      console.log('[ariaInsightsService] Cache returned', cached?.length ?? 0, 'rows');
    }

    if (cached?.length >= 4) {
      console.log('[ariaInsightsService] Cache HIT — returning', cached.length, 'cached insights');
      return cached.slice(0, 4).map(rowToInsight);
    }

    // ── Step 2: Generate via Edge Function ────────────────────────────────
    console.log('[ariaInsightsService] Cache MISS — calling Edge Function');
    const rawInsights = await callEdgeFunction(rawStats, period);
    if (!rawInsights?.length) {
      console.warn('[ariaInsightsService] Edge Function returned 0 insights');
      return [];
    }

    // ── Step 3: Persist to ai_insights ───────────────────────────────────
    const rows = rawInsights.map(ins => ({
      user_id:      userId,
      insight_type: normalizeTag(ins.tag),
      message:      `${ins.title}|${ins.text}`,
      period,
      source:       'aria',
    }));
    // Delete previous rows for this user+period before inserting fresh ones
    await supabase.from('ai_insights').delete().eq('user_id', userId).eq('period', period).eq('source', 'aria');
    console.log('[ariaInsightsService] Inserting', rows.length, 'rows into ai_insights');
    const { error: insertErr } = await supabase.from('ai_insights').insert(rows);
    if (insertErr) {
      console.error('[ariaInsightsService] Insert error (non-fatal):', insertErr);
    }

    // ── Step 4: Return formatted cards ───────────────────────────────────
    const cards = rawInsights.map(ins => {
      const tag = normalizeTag(ins.tag);
      return {
        icon:  ICON_MAP[tag]         ?? '💡',
        title: ins.title,
        text:  ins.text,
        tag,
        color: INSIGHT_COLORS[tag]  ?? '#6F4BF2',
      };
    });
    console.log('[ariaInsightsService] Returning', cards.length, 'fresh insight cards');
    return cards;

  } catch (e) {
    console.error('[ariaInsightsService] generateAndCacheInsights error:', e);
    return [];
  }
}
