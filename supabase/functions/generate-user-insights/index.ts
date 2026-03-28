/**
 * supabase/functions/generate-user-insights/index.ts
 *
 * PURPOSE
 *   Generates personalised profile insight cards for the Yara Assistant sidebar.
 *   Unlike yara-insights (which produces period-scoped Insights-screen cards),
 *   these are behavioral profile insights derived from all available fitness data:
 *   workouts, steps, sleep, nutrition, weight trend, and muscle fatigue.
 *
 * MODES
 *   Single-user  { userId: string }
 *     Called from the mobile app when a user taps "Refresh My Insights".
 *     Generates 4 fresh insight cards, replaces the user's existing rows in
 *     user_insights, and returns the new cards.
 *
 *   Admin bulk   { all: true, adminKey: string }
 *     Called from the admin button (visible only to is_admin users) or a
 *     scheduled cron trigger. Requires the ADMIN_SECRET env var to match.
 *     Iterates over every row in profiles and generates insights for each.
 *
 * SECURITY
 *   Uses the Supabase service-role key (auto-injected by the runtime) to read
 *   all tables and write back to user_insights. The GROQ_API_KEY and
 *   ADMIN_SECRET are stored as Supabase secrets, never shipped with the app.
 *
 * OUTPUT  (each insight object)
 *   { insight_type, message, icon, color }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ── Display config — mirrors yaraInsightsService.js palette ───────────────────
const TYPE_META: Record<string, { icon: string; color: string }> = {
  Activity:  { icon: '🏃', color: '#7B61FF' },
  Nutrition: { icon: '🥗', color: '#CDF27E' },
  Sleep:     { icon: '🌙', color: '#A38DF2' },
  Training:  { icon: '💪', color: '#6F4BF2' },
  Progress:  { icon: '📈', color: '#7B61FF' },
  Mindset:   { icon: '🧠', color: '#A38DF2' },
}
const VALID_TYPES = Object.keys(TYPE_META)

// ── Supabase service-role client ───────────────────────────────────────────────
// Service role bypasses RLS so the function can read/write any user's data.
const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// =============================================================================
// normalizeType(raw) — ensures we always store a single valid type string.
// Splits on |, comma, or whitespace so compound model responses are handled.
// =============================================================================
function normalizeType(raw: string): string {
  if (!raw) return 'Activity'
  const parts = String(raw).split(/[|,/\s]+/)
  for (const p of parts) {
    const match = VALID_TYPES.find(t => t.toLowerCase() === p.trim().toLowerCase())
    if (match) return match
  }
  return 'Activity'
}

// =============================================================================
// fetchStatsForUser(uid) — gathers all available fitness metrics for one user.
// Reuses the get_insights_data RPC (last 30 days) and adds muscle fatigue.
// =============================================================================
async function fetchStatsForUser(uid: string) {
  // Aggregated workout/nutrition/activity stats via existing RPC
  const { data: rpcData } = await sb.rpc('get_insights_data', {
    p_user_id: uid,
    p_period:  'Month',
  })
  const stats = (rpcData as any) ?? {}

  // Top 3 most fatigued muscles for personalised recovery advice
  const { data: fatigue } = await sb
    .from('muscle_fatigue')
    .select('muscle_name, fatigue_pct')
    .eq('user_id', uid)
    .order('fatigue_pct', { ascending: false })
    .limit(3)

  const topMuscles =
    fatigue?.map((f: any) => `${f.muscle_name} (${f.fatigue_pct}%)`).join(', ') || 'none'

  // How many distinct conversation sessions were tracked (proxy for app engagement)
  const { count: sessionCount } = await sb
    .from('workout_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)

  return { stats, topMuscles, sessionCount: sessionCount ?? 0 }
}

// =============================================================================
// buildPrompt(stats, topMuscles, sessionCount) — composes the Groq user prompt.
// =============================================================================
function buildPrompt(
  stats: any,
  topMuscles: string,
  sessionCount: number,
): string {
  const {
    workout_count = 0,
    avg_calories  = 0,
    avg_steps     = 0,
    avg_sleep     = 0,
    weight_delta  = 0,
  } = stats

  return `You are Yara, a personal fitness coach AI inside the BodyQ app.
Analyze this user's 30-day behavioral fitness data and return exactly 4 personalized profile insights.

User data:
- Total workouts logged: ${workout_count}
- Total sessions tracked: ${sessionCount}
- Average daily calories: ${Math.round(avg_calories)} kcal
- Average daily steps: ${Math.round(avg_steps)}
- Average sleep: ${Number(avg_sleep).toFixed(1)} hours/night
- Weight change: ${weight_delta > 0 ? '+' : ''}${Number(weight_delta).toFixed(1)} kg
- Most fatigued muscles: ${topMuscles}

Each insight must use EXACTLY ONE type from: Activity, Nutrition, Sleep, Training, Progress, Mindset.
Do NOT combine types. Pick the single best-fitting type per insight.

Return ONLY a raw JSON array — no markdown, no explanation — with exactly 4 objects:
[{ "type": "Activity", "message": "Two sentences of personalised coaching insight based on the data above." }]`
}

// =============================================================================
// callGroq(prompt) — sends prompt to Groq, returns parsed insights array.
// =============================================================================
async function callGroq(prompt: string): Promise<Array<{ type: string; message: string }>> {
  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:      'llama-3.1-8b-instant',
      max_tokens: 700,
      messages: [
        {
          role:    'system',
          content: 'You are Yara, a fitness analytics AI. Always respond with only the JSON array requested — nothing else.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })

  const data = await groqRes.json()
  if (!groqRes.ok) throw new Error(`Groq error: ${JSON.stringify(data?.error)}`)

  const content   = data.choices?.[0]?.message?.content ?? '[]'
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  return jsonMatch ? JSON.parse(jsonMatch[0]) : []
}

// =============================================================================
// generateInsightsForUser(uid) — full pipeline for one user.
// Deletes existing rows, generates new ones, inserts, returns formatted cards.
// =============================================================================
async function generateInsightsForUser(uid: string) {
  const { stats, topMuscles, sessionCount } = await fetchStatsForUser(uid)
  const prompt   = buildPrompt(stats, topMuscles, sessionCount)
  const rawCards = await callGroq(prompt)

  if (!rawCards.length) return []

  // Map to DB rows with validated type, icon, and color
  const rows = rawCards.slice(0, 4).map((ins: any) => {
    const type = normalizeType(ins.type)
    const meta = TYPE_META[type]
    return {
      user_id:      uid,
      insight_type: type,
      message:      ins.message ?? '',
      icon:         meta.icon,
      color:        meta.color,
    }
  })

  // Replace previous insights for this user atomically
  await sb.from('user_insights').delete().eq('user_id', uid)
  await sb.from('user_insights').insert(rows)

  return rows
}

// =============================================================================
// Main handler
// =============================================================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { userId, all, adminKey } = body

    // ── Admin bulk mode ──────────────────────────────────────────────────────
    if (all) {
      const secret = Deno.env.get('ADMIN_SECRET')
      if (!secret || adminKey !== secret) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch every profile user ID
      const { data: profiles } = await sb.from('profiles').select('id')
      const ids: string[] = profiles?.map((p: any) => p.id) ?? []

      let processed = 0
      for (const uid of ids) {
        try {
          await generateInsightsForUser(uid)
          processed++
        } catch (e) {
          console.error(`generate-user-insights: failed for ${uid}`, e)
        }
      }

      return new Response(
        JSON.stringify({ success: true, processed, total: ids.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Single-user mode ─────────────────────────────────────────────────────
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rows = await generateInsightsForUser(userId)

    // Return the formatted cards so the client can update its UI immediately
    // without an extra round-trip to re-read from Supabase.
    const cards = rows.map(r => ({
      insight_type: r.insight_type,
      message:      r.message,
      icon:         r.icon,
      color:        r.color,
    }))

    return new Response(
      JSON.stringify({ success: true, insights: cards }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('generate-user-insights error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
