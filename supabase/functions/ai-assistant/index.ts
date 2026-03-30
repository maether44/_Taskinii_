/**
 * supabase/functions/ai-assistant/index.ts
 *
 * Handles two call modes so one Edge Function serves both consumers:
 *
 *   MODE A — Conversation  (YaraAssistant.js)
 *     Body: { messages: Array<{role, content}> }
 *     Forwards the full message array directly to Groq and returns { response }.
 *     The client builds the system prompt and conversation history itself;
 *     this function just proxies the call so the API key stays server-side.
 *
 *   MODE B — RAG query  (Insights screen / direct callers)
 *     Body: { userId, query }
 *     Classifies the query to determine which data slices are relevant, fetches
 *     only those slices from the 5 specialised RPCs, builds a rich context
 *     prompt, calls Groq (70b model), persists the result to ai_insights
 *     (source='rag'), and returns { response, insight_type, model, usage }.
 *
 * SECURITY
 *   GROQ_API_KEY is stored as a Supabase secret and read via Deno.env.get().
 *   It is never sent to the client.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {

  // Handle CORS preflight — browsers and React Native send OPTIONS first
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // ══════════════════════════════════════════════════════════════
    // MODE A — Direct conversation proxy (YaraAssistant)
    // Body contains a `messages` array — forward straight to Groq.
    // ══════════════════════════════════════════════════════════════
    if (Array.isArray(body.messages)) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          model:      'llama-3.1-8b-instant',
          max_tokens: 512,
          messages:   body.messages,
        }),
      })

      const groqData = await groqRes.json()
      if (!groqRes.ok) throw new Error(`Groq error: ${JSON.stringify(groqData?.error)}`)

      const response = groqData.choices?.[0]?.message?.content
        ?? "I'm having trouble connecting. Try again in a moment."

      return new Response(
        JSON.stringify({ response }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ══════════════════════════════════════════════════════════════
    // MODE B — Intelligent RAG query
    // ══════════════════════════════════════════════════════════════
    const { userId, query } = body

    if (!userId) throw new Error('userId is required')
    if (!query)  throw new Error('query is required')

    // Service role key bypasses RLS — safe because this runs server-side only
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── Query classification — decide which data slices we need ───
    const needs = classifyQuery(query)
    console.log(`[ai-assistant] Query classified: ${JSON.stringify(needs)}`)

    // ── LAYER 1: RETRIEVE — fetch only relevant data slices ───────
    const [
      profileRow,
      activityData,
      nutritionData,
      workoutData,
      bodyMetricsData,
      aiHistoryData,
    ] = await Promise.all([
      // Profile is always fetched — needed for tone/goal personalisation
      supabase
        .from('profiles')
        .select(`
          id, full_name, goal, activity_level, height_cm, weight_kg, gender,
          assistant_tone, experience, equipment, diet_pref, sleep_quality, stress_level
        `)
        .eq('id', userId)
        .single(),

      needs.activity
        ? supabase.rpc('get_user_full_activity_summary', { p_user_id: userId })
        : Promise.resolve({ data: null, error: null }),

      needs.nutrition
        ? supabase.rpc('get_user_nutrition_summary', { p_user_id: userId })
        : Promise.resolve({ data: null, error: null }),

      needs.workout
        ? supabase.rpc('get_user_workout_summary', { p_user_id: userId })
        : Promise.resolve({ data: null, error: null }),

      needs.body
        ? supabase.rpc('get_user_body_metrics_history', { p_user_id: userId })
        : Promise.resolve({ data: null, error: null }),

      needs.history
        ? supabase.rpc('get_user_ai_history', { p_user_id: userId })
        : Promise.resolve({ data: null, error: null }),
    ])

    if (profileRow.error) throw new Error(`Profile query failed: ${profileRow.error.message}`)
    if (!profileRow.data)  throw new Error('No profile found for this user')

    const profile      = profileRow.data
    const activity     = activityData.data    ?? null
    const nutrition    = nutritionData.data   ?? null
    const workouts     = workoutData.data     ?? null
    const bodyMetrics  = bodyMetricsData.data ?? null
    const aiHistory    = aiHistoryData.data   ?? null

    // ── LAYER 2: AUGMENT — build the context-rich prompt ──────────
    const prompt = buildPrompt(profile, activity, nutrition, workouts, bodyMetrics, aiHistory, query)

    // ── LAYER 3: GENERATE ──────────────────────────────────────────
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        max_tokens:  400,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      throw new Error(`Groq API error ${groqRes.status}: ${errText}`)
    }

    const groqData   = await groqRes.json()
    const aiResponse = groqData.choices?.[0]?.message?.content

    if (!aiResponse) throw new Error('No response generated by Groq')

    console.log(`[ai-assistant] Tokens — input: ${groqData.usage?.prompt_tokens}, output: ${groqData.usage?.completion_tokens}`)

    // Persist the insight with source='rag' so cache queries can distinguish
    // these rows from 'yara' insight cards written by the yara-insights function.
    const insightType = classifyInsightType(query)
    await supabase.from('ai_insights').insert({
      user_id:      userId,
      insight_type: insightType,
      message:      aiResponse,
      source:       'rag',
      is_read:      false,
    })

    return new Response(
      JSON.stringify({
        response:     aiResponse,
        insight_type: insightType,
        model:        'llama-3.3-70b-versatile',
        usage:        groqData.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('[ai-assistant] error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


// =============================================================================
// classifyQuery(query)
//
// Returns a flags object indicating which data slices are relevant to the query.
// Only flagged slices are fetched — avoids unnecessary RPC calls and latency.
// =============================================================================
function classifyQuery(query: string): {
  activity: boolean
  nutrition: boolean
  workout: boolean
  body: boolean
  history: boolean
} {
  const q = query.toLowerCase()

  return {
    activity:  /step|walk|sleep|rest|water|hydrat|activ|cardio|move|calori/.test(q),
    nutrition: /eat|food|protein|calori|nutrition|meal|diet|macro|carb|fat|vitamin/.test(q),
    workout:   /workout|exercise|train|gym|lift|run|set|rep|weight|muscle|strength|push|pull|squat|bench/.test(q),
    body:      /weight|bmi|body|fat|lean|mass|progress|gain|lose|physique/.test(q),
    history:   /last time|previously|before|history|remember|told|said|advice/.test(q),
  }
}


// =============================================================================
// buildPrompt(...)
//
// Assembles the final Groq user message from whichever data slices were fetched.
// Null slices are replaced with brief "not available" notes so the model always
// has full context on what data exists vs. what was not fetched.
// =============================================================================
function buildPrompt(
  profile:     any,
  activity:    any,
  nutrition:   any,
  workouts:    any,
  bodyMetrics: any,
  aiHistory:   any,
  query:       string,
): string {
  const tone = profile.assistant_tone ?? 'motivational'

  const profileSection = `USER PROFILE:
Name: ${profile.full_name ?? 'User'}
Goal: ${profile.goal ?? 'not set'}
Activity level: ${profile.activity_level ?? 'not set'}
Experience: ${profile.experience ?? 'not set'}
Equipment available: ${profile.equipment ?? 'not set'}
Diet preference: ${profile.diet_pref ?? 'not set'}
Weight: ${profile.weight_kg ?? '?'} kg  |  Height: ${profile.height_cm ?? '?'} cm  |  Gender: ${profile.gender ?? 'not set'}
Baseline sleep quality: ${profile.sleep_quality ?? 'not set'}
Baseline stress level: ${profile.stress_level ?? 'not set'}`

  const activitySection = activity
    ? `ACTIVITY & SLEEP SUMMARY (last 30 days):
Avg daily steps: ${Math.round(activity.avg_steps ?? 0).toLocaleString()}
Avg sleep: ${Number(activity.avg_sleep_hours ?? 0).toFixed(1)} h/night
Avg water intake: ${Math.round(activity.avg_water_ml ?? 0)} ml/day
Active days: ${activity.active_days ?? 0} / 30
Best step day: ${activity.max_steps?.toLocaleString() ?? 'N/A'}`
    : `ACTIVITY & SLEEP SUMMARY: Not fetched (not relevant to this query).`

  const nutritionSection = nutrition
    ? `NUTRITION SUMMARY (last 30 days):
Avg daily calories: ${Math.round(nutrition.avg_calories ?? 0)} kcal
Avg protein: ${Math.round(nutrition.avg_protein_g ?? 0)} g/day
Avg carbs: ${Math.round(nutrition.avg_carbs_g ?? 0)} g/day
Avg fat: ${Math.round(nutrition.avg_fat_g ?? 0)} g/day
Days with food logged: ${nutrition.logged_days ?? 0} / 30
Calorie target: ${nutrition.daily_calorie_target ?? 'not set'} kcal`
    : `NUTRITION SUMMARY: Not fetched (not relevant to this query).`

  const workoutsSection = workouts && Array.isArray(workouts) && workouts.length > 0
    ? `RECENT WORKOUTS (last 3):
${workouts.map((w: any) => {
      const date = new Date(w.started_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const durationMins = w.started_at && w.ended_at
        ? Math.round((new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000)
        : null
      return `- ${date}: ${durationMins ?? '?'} min, ${w.calories_burned ?? '?'} kcal, ${w.exercise_count ?? '?'} exercises, avg posture ${w.avg_posture_score ?? 'N/A'}/100`
    }).join('\n')}`
    : workouts === null
      ? `RECENT WORKOUTS: Not fetched (not relevant to this query).`
      : `RECENT WORKOUTS: No workouts logged yet.`

  const bodySection = bodyMetrics && Array.isArray(bodyMetrics) && bodyMetrics.length > 0
    ? `BODY METRICS HISTORY (last 8 entries):
${bodyMetrics.slice(0, 8).map((b: any) => {
      const date = new Date(b.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return `- ${date}: ${b.weight_kg ?? '?'} kg${b.body_fat_pct ? `, ${b.body_fat_pct}% body fat` : ''}`
    }).join('\n')}`
    : bodyMetrics === null
      ? `BODY METRICS HISTORY: Not fetched (not relevant to this query).`
      : `BODY METRICS HISTORY: No entries logged yet.`

  const historySection = aiHistory && Array.isArray(aiHistory) && aiHistory.length > 0
    ? `RECENT AI COACHING HISTORY (last 3 responses):
${aiHistory.slice(0, 3).map((h: any) => {
      const date = new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return `- ${date} [${h.insight_type}]: ${h.message.slice(0, 120)}...`
    }).join('\n')}`
    : aiHistory === null
      ? `COACHING HISTORY: Not fetched (not relevant to this query).`
      : `COACHING HISTORY: No previous coaching sessions found.`

  return `You are Yara, a personal AI health and fitness coach inside the BodyQ app.
Your coaching tone is: ${tone}

RULES YOU ALWAYS FOLLOW:
- Always reference at least 2 specific numbers from the user's actual data
- Identify the single biggest win and single biggest area to improve
- Give one concrete actionable recommendation for today or tomorrow
- Keep your response under 180 words unless the user explicitly asks for a plan
- Never give advice that contradicts or ignores the user's actual data
- Always consider the user's experience level, equipment, and diet preference

${profileSection}

${activitySection}

${nutritionSection}

${workoutsSection}

${bodySection}

${historySection}

USER QUESTION: ${query}`
}


// =============================================================================
// classifyInsightType(query)
//
// Returns the insight_type tag stored in ai_insights for RAG-generated rows.
// Uses lowercase values to match the original schema convention for 'rag' rows.
// =============================================================================
function classifyInsightType(query: string): string {
  const q = query.toLowerCase()
  if (/eat|food|protein|calori|nutrition|meal|diet|macro/.test(q)) return 'nutrition'
  if (/workout|exercise|train|gym|lift|run/.test(q))               return 'workout'
  if (/sleep|rest|recovery|tired|fatigue|sore/.test(q))            return 'recovery'
  if (/habit|streak|routine|daily|consistent/.test(q))             return 'habit'
  return 'general'
}
