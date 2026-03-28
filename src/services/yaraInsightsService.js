/**
 *src/services/yaraInsightsService.js — the 4 AI insight cards at the bottom (Groq call, 6h cache, tag normalization)
 * PURPOSE
 *   Generates personalised AI fitness insight cards by sending the user's
 *   aggregated stats to the Groq API (same model and API key used by
 *   YaraAssistant.js).  Results are persisted to the `ai_insights` Supabase
 *   table so repeated calls within a 6-hour window return the cached rows
 *   instead of making a new API request.
 *
 * FLOW
 *   1. Screen calls fetchYaraInsights(userId, period, stats) after the RPC loads.
 *   2. We query ai_insights for rows created in the last 6 hours for this
 *      user + period combination.
 *   3a. Cache HIT  → format the DB rows and return them immediately.
 *   3b. Cache MISS → call Groq, parse the JSON array it returns, write the
 *                    new rows to ai_insights, then return the formatted objects.
 *
 * OUTPUT FORMAT (each element)
 *   {
 *     icon  : string  — emoji chosen by tag category (e.g. '🧬' for Performance)
 *     title : string  — short insight headline (5-8 words)
 *     text  : string  — one or two sentences of personalised coaching text
 *     tag   : string  — category label shown above the title
 *     color : string  — hex colour for the left border and tag text
 *   }
 */
import { supabase } from '../config/supabase';

// How long a generated insight batch is considered fresh.
// After 6 hours the next screen load regenerates insights with new stats.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

// ── Display mappings ──────────────────────────────────────────────────────────
// These mirror the static INSIGHTS array that was in the original screen.
// Each insight tag returned by Groq maps to a colour and emoji.

// Border/tag text colours — purple shades for most types, lime for actionable ones.
const INSIGHT_COLORS = {
  Performance:  '#6F4BF2',
  Correlation:  '#A38DF2',
  Optimization: '#CDF27E',
  Prediction:   '#6F4BF2',
  Recovery:     '#A38DF2',
  Nutrition:    '#CDF27E',
};

// Ordered list of valid tags — used by normalizeTag() to extract the first
// recognised value from whatever string the model returns.
const VALID_TAGS = ['Performance', 'Correlation', 'Optimization', 'Prediction', 'Recovery', 'Nutrition'];

// One emoji per category so the AI doesn't have to decide.
const ICON_MAP = {
  Performance:  '🧬',
  Correlation:  '🌙',
  Optimization: '⚡',
  Prediction:   '🎯',
  Recovery:     '💪',
  Nutrition:    '🥗',
};


// =============================================================================
// normalizeTag(raw)  [private]
//
// Defensively extracts the first recognised tag from whatever string the model
// returns.  Handles compound strings like "Performance|Recovery" or
// "Performance, Optimization" by splitting on |, comma, or space and returning
// the first match.  Falls back to 'Performance' if nothing matches.
// =============================================================================
function normalizeTag(raw) {
  if (!raw) return 'Performance';
  // Split on common separators the model might use
  const parts = String(raw).split(/[|,/\s]+/);
  for (const part of parts) {
    const match = VALID_TAGS.find(t => t.toLowerCase() === part.trim().toLowerCase());
    if (match) return match;
  }
  return 'Performance';
}


// =============================================================================
// callGroqInsights(stats, period)  [private]
//
// Calls the `yara-insights` Supabase Edge Function, which holds the Groq API
// key as a server-side secret and returns the 4 insight objects.
// The key never leaves the server — this client just sends the stats payload.
// =============================================================================
async function callGroqInsights(stats, period) {
  const { data, error } = await supabase.functions.invoke('yara-insights', {
    body: { period, stats },
  });
  if (error) throw error;
  // Edge Function returns the parsed JSON array directly.
  return Array.isArray(data) ? data : [];
}


// =============================================================================
// rowToInsight(row)  [private]
//
// Converts a raw ai_insights database row back into the display object that
// the screen renders.
//
// Storage format:  message = "Short insight title|Full body text"
// We split on the FIRST pipe character so body text can safely contain pipes.
// =============================================================================
function rowToInsight(row) {
  const pipeIdx = row.message.indexOf('|');
  const title = pipeIdx === -1 ? row.message          : row.message.slice(0, pipeIdx);
  const text  = pipeIdx === -1 ? ''                   : row.message.slice(pipeIdx + 1);
  return {
    icon:  ICON_MAP[row.insight_type]       ?? '💡',
    title,
    text,
    tag:   row.insight_type,
    color: INSIGHT_COLORS[row.insight_type] ?? '#6F4BF2',
  };
}


// =============================================================================
// fetchYaraInsights(userId, period, stats)  [exported]
//
// The only public function in this module — called from the Insights screen
// after the RPC has loaded and rawStats is available.
//
// PARAMETERS
//   userId  — Supabase auth UID, used as the RLS filter when reading/writing
//             the ai_insights table.
//   period  — 'Week' | 'Month' | '3 Months', stored per row so cache lookups
//             only return insights that match the currently selected period.
//   stats   — the rawStats object returned by useInsights, forwarded directly
//             to callGroqInsights to build the AI prompt.
//
// RETURNS
//   Promise<Array> of { icon, title, text, tag, color } objects, or [] on error.
//   Errors are caught internally so a Groq outage never crashes the screen.
// =============================================================================
export async function fetchYaraInsights(userId, period, stats) {
  try {
    // ── Step 1: Check the cache ──────────────────────────────────────────────
    // We want at most 4 rows (one insight card set) generated within the last
    // CACHE_TTL_MS milliseconds for this exact user + period combination.
    // The composite index on (user_id, period, created_at DESC) makes this fast.
    const since = new Date(Date.now() - CACHE_TTL_MS).toISOString();
    const { data: cached } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('period', period)
      .gte('created_at', since)           // only rows newer than 6 hours ago
      .order('created_at', { ascending: false })
      .limit(4);

    // If we have a full set of 4 cached insights, return them immediately
    // without touching Groq.  This avoids unnecessary API calls and latency.
    if (cached?.length >= 4) {
      return cached.slice(0, 4).map(rowToInsight);
    }

    // ── Step 2: Generate new insights via Groq ───────────────────────────────
    const rawInsights = await callGroqInsights(stats, period);
    if (!rawInsights?.length) return [];

    // ── Step 3: Persist to ai_insights ──────────────────────────────────────
    // Store title and body text joined by '|' in a single `message` column.
    // This avoids needing separate title/body columns in the schema and keeps
    // the table simple.  rowToInsight() splits them back apart on read.
    const rows = rawInsights.map(ins => ({
      user_id:      userId,
      insight_type: normalizeTag(ins.tag),  // sanitize compound/invalid tags before storing
      message:      `${ins.title}|${ins.text}`,
      period,
    }));
    await supabase.from('ai_insights').insert(rows);

    // ── Step 4: Return the formatted insight objects ─────────────────────────
    // We format directly from the Groq response rather than re-reading from
    // Supabase to save one extra network round-trip.
    return rawInsights.map(ins => {
      const tag = normalizeTag(ins.tag);  // ensure single valid tag for icon/color lookup
      return {
        icon:  ICON_MAP[tag]            ?? '💡',
        title: ins.title,
        text:  ins.text,
        tag,
        color: INSIGHT_COLORS[tag]      ?? '#6F4BF2',
      };
    });
  } catch (e) {
    // Swallow all errors — a Groq outage or DB write failure should not crash
    // the Insights screen.  The screen will simply show no AI cards.
    console.error('yaraInsightsService error:', e);
    return [];
  }
}

// Alias with swapped arg order (userId, rawStats, period) used by the updated screen.
export const generateAndCacheInsights = (userId, rawStats, period) =>
  fetchYaraInsights(userId, period, rawStats);
