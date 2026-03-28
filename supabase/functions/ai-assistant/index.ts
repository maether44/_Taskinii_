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
 *   MODE B — RAG query  (existing ai-assistant consumers)
 *     Body: { userId, query }
 *     Fetches the user's profile, weekly tracking data, and recent workouts
 *     from Supabase, builds a rich context prompt, calls Groq, persists the
 *     result to ai_insights, and returns { response, insight_type, model, usage }.
 *
 * SECURITY
 *   GROQ_API_KEY is stored as a Supabase secret (supabase secrets set GROQ_API_KEY=...)
 *   and read via Deno.env.get().  It is never sent to the client.
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
    // MODE B — RAG query (original behaviour)
    // ══════════════════════════════════════════════════════════════
    const { userId, query } = body

    if (!userId) throw new Error('userId is required')
    if (!query)  throw new Error('query is required')

    // Service role key bypasses RLS — safe because this runs server-side only
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── LAYER 1: RETRIEVE ──────────────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id, full_name, goal, activity_level, height_cm, weight_kg, gender,
        assistant_tone, experience, equipment, diet_pref, sleep_quality, stress_level
      `)
      .eq('id', userId)
      .single()

    if (profileError) throw new Error(`Profile query failed: ${profileError.message}`)
    if (!profile)     throw new Error('No profile found for this user')

    const { data: targets } = await supabase
      .from('calorie_targets')
      .select('daily_calories, protein_target, carbs_target, fat_target, effective_from')
      .eq('user_id', userId)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single()

    const { data: weeklyContext, error: weeklyError } = await supabase
      .rpc('get_user_weekly_context', { p_user_id: userId })

    if (weeklyError) throw new Error(`Weekly context failed: ${weeklyError.message}`)

    const { data: workouts, error: workoutError } = await supabase
      .from('workout_sessions')
      .select(`
        id, started_at, ended_at, calories_burned, notes, ai_feedback,
        workout_exercises ( posture_score, sets, reps, weight_kg )
      `)
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(3)

    if (workoutError) throw new Error(`Workout query failed: ${workoutError.message}`)

    // ── LAYER 2: AUGMENT ───────────────────────────────────────────
    const prompt = buildPrompt(
      profile,
      targets    ?? null,
      weeklyContext ?? [],
      workouts   ?? [],
      query
    )

    // ── LAYER 3: GENERATE ──────────────────────────────────────────
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        max_tokens:  350,
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

    console.log(`Tokens — input: ${groqData.usage?.prompt_tokens}, output: ${groqData.usage?.completion_tokens}`)

    // Persist the insight
    const insightType = classifyInsight(query)
    await supabase.from('ai_insights').insert({
      user_id:      userId,
      insight_type: insightType,
      message:      aiResponse,
      is_read:      false
    })

    return new Response(
      JSON.stringify({
        response:     aiResponse,
        insight_type: insightType,
        model:        'llama-3.3-70b-versatile',
        usage:        groqData.usage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


// ── Prompt builder (Mode B only) ─────────────────────────────────────────────
function buildPrompt(profile: any, targets: any, tracking: any[], workouts: any[], query: string): string {
  const tone = profile.assistant_tone ?? 'motivational'

  const profileSection = `USER PROFILE:
Name: ${profile.full_name ?? 'User'}
Goal: ${profile.goal ?? 'not set'}
Activity level: ${profile.activity_level ?? 'not set'}
Experience: ${profile.experience ?? 'not set'}
Equipment available: ${profile.equipment ?? 'not set'}
Diet preference: ${profile.diet_pref ?? 'not set'}
Weight: ${profile.weight_kg ?? '?'}kg
Height: ${profile.height_cm ?? '?'}cm
Gender: ${profile.gender ?? 'not set'}
Baseline sleep quality: ${profile.sleep_quality ?? 'not set'}
Baseline stress level: ${profile.stress_level ?? 'not set'}
Daily calorie target: ${targets?.daily_calories ?? 'not set'} kcal
Daily protein target: ${targets?.protein_target ?? 'not set'} g
Daily carbs target: ${targets?.carbs_target ?? 'not set'} g
Daily fat target: ${targets?.fat_target ?? 'not set'} g`

  const trackingSection = tracking.length === 0
    ? `LAST 7 DAYS: No tracking data available yet.\nEncourage the user to start logging their daily activity.`
    : `LAST ${tracking.length} DAYS OF DATA (most recent first):
${tracking.map(day => {
      const date = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const sleepFlag   = day.sleep_hours !== null && day.sleep_hours < 6 ? ' ⚠️ LOW' : ''
      const waterFlag   = day.water_ml    !== null && day.water_ml    < 1500 ? ' ⚠️ LOW' : ''
      const calTarget   = targets?.daily_calories ?? 2000
      const calStatus   = day.total_calories !== null
        ? day.total_calories > calTarget
          ? ` (+${Math.round(day.total_calories - calTarget)} OVER target)`
          : ` (-${Math.round(calTarget - day.total_calories)} under target)`
        : ' (not logged)'
      const proteinTarget = targets?.protein_target ?? 150
      const proteinFlag   = day.total_protein_g !== null && day.total_protein_g < proteinTarget * 0.5 ? ' ⚠️ LOW' : ''
      return `\n${date}:\n  Sleep:    ${day.sleep_hours ?? 'not logged'}h${sleepFlag}\n  Steps:    ${day.steps?.toLocaleString() ?? 'not logged'}\n  Water:    ${day.water_ml ?? 'not logged'}ml${waterFlag}\n  Calories: ${day.total_calories ?? 'not logged'} kcal${calStatus}\n  Protein:  ${day.total_protein_g ?? 'not logged'}g${proteinFlag} (target: ${proteinTarget}g)\n  Carbs:    ${day.total_carbs_g ?? 'not logged'}g\n  Fat:      ${day.total_fat_g ?? 'not logged'}g\n  Foods logged: ${day.items_logged ?? 0} items`
    }).join('\n')}`

  const workoutsSection = !workouts || workouts.length === 0
    ? `RECENT WORKOUTS: No workouts logged yet.`
    : `RECENT WORKOUTS:
${workouts.map(w => {
      const date = new Date(w.started_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const durationMins = w.started_at && w.ended_at
        ? Math.round((new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000)
        : null
      const exercises = w.workout_exercises ?? []
      const postureScores = exercises.map((e: any) => e.posture_score).filter((s: any) => s !== null)
      const avgPosture = postureScores.length > 0
        ? (postureScores.reduce((a: number, b: number) => a + b, 0) / postureScores.length).toFixed(1)
        : null
      return `- ${date}:\n    Duration: ${durationMins ?? '?'} min\n    Calories burned: ${w.calories_burned ?? '?'} kcal\n    Exercises: ${exercises.length}\n    Avg posture score: ${avgPosture ?? 'N/A'}/100\n    Notes: ${w.notes ?? 'none'}\n    Previous AI feedback: ${w.ai_feedback ?? 'none'}`
    }).join('\n')}`

  return `You are BodyQ, a personal AI health and fitness coach.
Your coaching tone is: ${tone}

RULES YOU ALWAYS FOLLOW:
- Always reference at least 2 specific numbers from the user's actual data
- Identify the single biggest win and single biggest area to improve this week
- Give one concrete actionable recommendation for today or tomorrow
- Keep your response under 150 words unless the user explicitly asks for a plan
- Never give advice that contradicts or ignores the user's actual data
- If data is missing for some days, acknowledge it briefly
- Always consider the user's experience level, equipment, and diet preference

${profileSection}

${trackingSection}

${workoutsSection}

USER QUESTION: ${query}`
}

function classifyInsight(query: string): string {
  const q = query.toLowerCase()
  if (/eat|food|protein|calorie|nutrition|meal|diet/.test(q))  return 'nutrition'
  if (/workout|exercise|train|gym|lift|run/.test(q))           return 'workout'
  if (/sleep|rest|recovery|tired|fatigue|sore/.test(q))        return 'recovery'
  if (/habit|streak|routine|daily|consistent/.test(q))         return 'habit'
  return 'general'
}
