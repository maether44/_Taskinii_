/**
 * supabase/functions/ai-assistant/index.ts
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type QueryFlags = {
  activity: boolean
  nutrition: boolean
  workout: boolean
  body: boolean
  history: boolean
}

type ProfileShape = {
  full_name?: string
  goal?: string
  activity_level?: string
  height_cm?: number | null
  weight_kg?: number | null
  gender?: string
  assistant_tone?: string
  experience?: string
  equipment?: string
  diet_pref?: string
  sleep_quality?: string
  stress_level?: string
}

type ClientContextShape = {
  profile?: ProfileShape | null
  activity?: any
  nutrition?: any
  workouts?: any
  bodyMetrics?: any
  aiHistory?: any
}

const GROQ_KEY    = Deno.env.get('GROQ_API_KEY') ?? ''
const OPENAI_KEY  = Deno.env.get('OPENAI_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function safeRpc(supabase: any, fn: string, params: Record<string, unknown>) {
  try {
    const { data, error } = await supabase.rpc(fn, params)
    if (error) {
      console.error(`[ai-assistant] rpc ${fn} failed:`, error.message)
      return null
    }
    return data ?? null
  } catch (error: any) {
    console.error(`[ai-assistant] rpc ${fn} crashed:`, error?.message ?? error)
    return null
  }
}

/** Parses and executes COMMAND:{...} lines embedded in the AI reply. */
async function executeVoiceCommands(supabase: any, userId: string, aiText: string): Promise<string[]> {
  const executed: string[] = []
  const commandRegex = /COMMAND:(\{[^\n]+\})/g
  let match
  const TODAY = new Date().toISOString().split('T')[0]

  while ((match = commandRegex.exec(aiText)) !== null) {
    try {
      const cmd = JSON.parse(match[1])

      if (cmd.action === 'log_water') {
        const { data: ex } = await supabase
          .from('daily_activity').select('id, water_ml').eq('user_id', userId).eq('date', TODAY).maybeSingle()
        const newMl = (ex?.water_ml ?? 0) + (cmd.amount ?? 250)
        if (ex) await supabase.from('daily_activity').update({ water_ml: newMl }).eq('id', ex.id)
        else     await supabase.from('daily_activity').insert({ user_id: userId, date: TODAY, water_ml: newMl })
        executed.push(`logged_water:${newMl}ml`)

      } else if (cmd.action === 'log_sleep') {
        await supabase.from('daily_activity')
          .upsert({ user_id: userId, date: TODAY, sleep_hours: cmd.hours }, { onConflict: 'user_id,date' })
        executed.push(`logged_sleep:${cmd.hours}h`)

      } else if (cmd.action === 'log_weight') {
        await supabase.from('body_metrics').insert({
          user_id: userId, weight_kg: cmd.weight_kg, logged_at: new Date().toISOString(),
        })
        executed.push(`logged_weight:${cmd.weight_kg}kg`)

      } else if (cmd.action === 'log_food') {
        // Schema: foods(id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
        //         food_logs(user_id, food_id, consumed_at, meal_type, quantity_grams, ...)
        const NOW_TS = new Date().toISOString()
        let foodId: string | null = null
        const { data: existing } = await supabase
          .from('foods').select('id').ilike('name', cmd.name).maybeSingle()
        if (existing) {
          foodId = existing.id
        } else {
          const { data: newFood } = await supabase.from('foods').insert({
            name: cmd.name,
            calories_per_100g: cmd.calories ?? 0,
            protein_per_100g:  cmd.protein_g ?? 0,
            carbs_per_100g:    cmd.carbs_g ?? 0,
            fat_per_100g:      cmd.fat_g ?? 0,
            source: 'alexi_voice',
          }).select('id').single()
          foodId = newFood?.id ?? null
        }
        if (foodId) {
          // quantity_grams=100 so per-100g values equal the logged macros directly
          await supabase.from('food_logs').insert({
            user_id:       userId,
            food_id:       foodId,
            consumed_at:   NOW_TS,   // timestamptz — NOT a date column
            meal_type:     cmd.meal_type ?? 'snack',
            quantity_grams: 100,     // column name is quantity_grams, NOT quantity_g
          })
        }
        executed.push(`logged_food:${cmd.name}:calories=${cmd.calories ?? 0}:protein=${cmd.protein_g ?? 0}`)

      } else if (cmd.action === 'log_workout') {
        const now = new Date().toISOString()
        const startedAt = new Date(Date.now() - (cmd.duration_minutes ?? 30) * 60000).toISOString()
        await supabase.from('workout_sessions').insert({
          user_id: userId,
          started_at: startedAt,
          ended_at: now,
          calories_burned: cmd.calories_burned ?? null,
          notes: cmd.exercise_name ? `${cmd.exercise_name}${cmd.intensity ? ' · ' + cmd.intensity : ''}` : null,
          source: 'alexi_voice',
        })
        const XP = 50
        await supabase.from('xp_log').insert({ user_id: userId, source: 'workout', amount: XP, earned_at: now })
        await supabase.rpc('increment_xp', { p_user_id: userId, p_amount: XP }).catch(() => {})
        executed.push(`logged_workout:${cmd.duration_minutes ?? 30}min +${XP}xp`)

      } else if (cmd.action === 'log_metric') {
        // Schema: body_metrics(user_id, weight_kg, body_fat_pct, logged_at)
        const row: Record<string, unknown> = {
          user_id:    userId,
          logged_at:  new Date().toISOString(),
        }
        if (cmd.weight_kg  != null) row.weight_kg    = cmd.weight_kg
        if (cmd.body_fat   != null) row.body_fat_pct = cmd.body_fat
        await supabase.from('body_metrics').insert(row)
        executed.push(`logged_metric:${JSON.stringify({ weight_kg: cmd.weight_kg, body_fat_pct: cmd.body_fat })}`)

      } else if (cmd.action === 'check_status') {
        // Query daily_activity + xp_log and return a summary text in executed[]
        const { data: act } = await supabase
          .from('daily_activity').select('steps, water_ml, sleep_hours')
          .eq('user_id', userId).eq('date', TODAY).maybeSingle()
        const { data: xpRows } = await supabase
          .from('xp_log').select('amount')
          .eq('user_id', userId)
          .gte('earned_at', new Date(Date.now() - 7 * 86400000).toISOString())
        const weeklyXP = (xpRows ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0)
        const steps = act?.steps ?? 0
        const water = act?.water_ml ?? 0
        const sleep = act?.sleep_hours ?? 0
        executed.push(
          `status:steps=${steps},water=${water}ml,sleep=${sleep}h,weeklyXP=${weeklyXP}`
        )
      }
    } catch (e: any) {
      console.error('[ai-assistant] executeVoiceCommands failed on:', match[1], e?.message)
    }
  }
  return executed
}

async function safeInsertInsight(supabase: any, row: Record<string, unknown>) {
  try {
    const { error } = await supabase.from('ai_insights').insert(row)
    if (error) console.error('[ai-assistant] ai_insights insert failed:', error.message)
  } catch (error: any) {
    console.error('[ai-assistant] ai_insights insert crashed:', error?.message ?? error)
  }
}

function classifyQuery(query: string): QueryFlags {
  const q = query.toLowerCase()
  return {
    activity: /step|walk|sleep|rest|water|hydrat|activ|cardio|move|calori/.test(q),
    nutrition: /eat|food|protein|calori|nutrition|meal|diet|macro|carb|fat|vitamin/.test(q),
    workout: /workout|exercise|train|gym|lift|run|set|rep|weight|muscle|strength|push|pull|squat|bench/.test(q),
    body: /weight|bmi|body|fat|lean|mass|progress|gain|lose|physique/.test(q),
    history: /last time|previously|before|history|remember|told|said|advice/.test(q),
  }
}

function classifyInsightType(query: string): string {
  const q = query.toLowerCase()
  if (/eat|food|protein|calori|nutrition|meal|diet|macro/.test(q)) return 'nutrition'
  if (/workout|exercise|train|gym|lift|run/.test(q)) return 'workout'
  if (/sleep|rest|recovery|tired|fatigue|sore/.test(q)) return 'recovery'
  if (/habit|streak|routine|daily|consistent/.test(q)) return 'habit'
  return 'general'
}

function defaultProfile(): ProfileShape {
  return {
    full_name: 'User',
    goal: 'general_health',
    activity_level: 'not set',
    assistant_tone: 'motivational',
    experience: 'not set',
    equipment: 'not set',
    diet_pref: 'not set',
    sleep_quality: 'not set',
    stress_level: 'not set',
  }
}

function buildFallbackResponse(query: string, profile?: ProfileShape | null, nutrition?: any, _activity?: any) {
  const q = query.toLowerCase()
  const name = profile?.full_name || 'there'

  if (/meal plan|what should i eat|food plan|eat today|meal ideas|nutrition/.test(q)) {
    const target = nutrition?.daily_calorie_target ?? 2000
    const protein = nutrition?.protein_target ?? 150
    const avgCalories = nutrition?.avg_calories ?? 0
    const avgProtein = nutrition?.avg_protein_g ?? 0
    const meals = Array.isArray(nutrition?.recent_meals) ? nutrition.recent_meals.slice(0, 3) : []
    const recent = meals.length
      ? `Recent meals logged: ${meals.map((meal: any) => `${meal.meal_type} (${meal.foods})`).join('; ')}.`
      : 'You do not have enough recent meal logs yet, so start by logging breakfast and lunch today.'
    return `Hey ${name}, here’s a solid fallback plan: aim for about ${target} kcal and ${protein}g protein today. Your recent average is around ${avgCalories} kcal and ${avgProtein}g protein. ${recent} Build each meal around one clear protein, add a smart carb if energy feels low, and finish with fruit or vegetables.`
  }

  if (/sleep|water|steps|activity/.test(q)) {
    return `Hey ${name}, your latest coaching data is loading, so here’s the simple version: keep water steady, aim for a short walk today, and protect sleep tonight because consistency beats perfect days.`
  }

  return `Hey ${name}, I can still coach you even while live data is limited. Ask me about meals, training, recovery, or habits and I’ll keep the advice practical and tailored to your goal of ${profile?.goal ?? 'general health'}.`
}

function buildPrompt(
  profile: any,
  activity: any,
  nutrition: any,
  workouts: any,
  bodyMetrics: any,
  aiHistory: any,
  query: string,
  voiceMode = false,
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
    : `ACTIVITY & SLEEP SUMMARY: Not available.`

  const nutritionSection = nutrition
    ? `NUTRITION SUMMARY (last 30 days):
Avg daily calories: ${Math.round(nutrition.avg_calories ?? 0)} kcal
Avg protein: ${Math.round(nutrition.avg_protein_g ?? 0)} g/day
Avg carbs: ${Math.round(nutrition.avg_carbs_g ?? 0)} g/day
Avg fat: ${Math.round(nutrition.avg_fat_g ?? 0)} g/day
Days with food logged: ${nutrition.logged_days ?? 0} / 30
Calorie target: ${nutrition.daily_calorie_target ?? 'not set'} kcal
Protein target: ${nutrition.protein_target ?? 'not set'} g
Carb target: ${nutrition.carbs_target ?? 'not set'} g
Fat target: ${nutrition.fat_target ?? 'not set'} g
Recent meals:
${Array.isArray(nutrition.recent_meals) && nutrition.recent_meals.length > 0
  ? nutrition.recent_meals.slice(0, 8).map((meal: any) => `- ${meal.date} [${meal.meal_type}]: ${meal.foods}`).join('\n')
  : 'No recent meals logged.'}`
    : `NUTRITION SUMMARY: Not available.`

  const workoutsSection = workouts && Array.isArray(workouts) && workouts.length > 0
    ? `RECENT WORKOUTS:
${workouts.map((w: any) => {
  const date = new Date(w.started_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const durationMins = w.started_at && w.ended_at
    ? Math.round((new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000)
    : null
  return `- ${date}: ${durationMins ?? '?'} min, ${w.calories_burned ?? '?'} kcal, ${w.exercise_count ?? '?'} exercises, avg posture ${w.avg_posture_score ?? 'N/A'}/100`
}).join('\n')}`
    : `RECENT WORKOUTS: Not available.`

  const bodySection = bodyMetrics && Array.isArray(bodyMetrics) && bodyMetrics.length > 0
    ? `BODY METRICS HISTORY:
${bodyMetrics.slice(0, 8).map((b: any) => {
  const date = new Date(b.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `- ${date}: ${b.weight_kg ?? '?'} kg${b.body_fat_pct ? `, ${b.body_fat_pct}% body fat` : ''}`
}).join('\n')}`
    : `BODY METRICS HISTORY: Not available.`

  const historySection = aiHistory && Array.isArray(aiHistory) && aiHistory.length > 0
    ? `RECENT AI COACHING HISTORY:
${aiHistory.slice(0, 3).map((h: any) => {
  const date = new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `- ${date} [${h.insight_type}]: ${String(h.message ?? '').slice(0, 120)}...`
}).join('\n')}`
    : `COACHING HISTORY: Not available.`

  const voiceRules = voiceMode
    ? `
VOICE MODE — SYSTEM CONTROLLER:
You are a system controller, not a chatbot. Your PRIMARY job is to move the user to the correct screen or log their data.
- Keep spoken reply under 20 words. No bullets, no markdown, no emojis.
- For navigation: say where you're going in ≤8 words, append the COMMAND. Done.
- For logging: confirm in ≤10 words, append the COMMAND. Done.
- NEVER suggest opening a chat window.

AVAILABLE COMMANDS (append after spoken reply, one per line):
  Navigate:     COMMAND:{"action":"navigate","target":"<route>"}
  Log water:    COMMAND:{"action":"log_water","amount":<ml, default 250>}
  Log sleep:    COMMAND:{"action":"log_sleep","hours":<number>}
  Log food:     COMMAND:{"action":"log_food","name":"<food>","calories":<kcal>,"protein_g":<g>,"carbs_g":<g>,"fat_g":<g>,"meal_type":"breakfast|lunch|dinner|snack"}
  Log weight:   COMMAND:{"action":"log_weight","weight_kg":<number>}
  Log body fat: COMMAND:{"action":"log_metric","body_fat":<percent>}
  Log workout:  COMMAND:{"action":"log_workout","exercise_name":"<name>","duration_minutes":<n>,"intensity":"low|medium|high","calories_burned":<n>}
  Check status: COMMAND:{"action":"check_status"}
- Only append a COMMAND when the user explicitly asked for that action. Never guess.

━━━ STRICT_MAP — NO EXCEPTIONS ━━━
You MUST use exact target values. Pattern-match the user's words to the map below.
Do NOT infer. Do NOT pick a "close" route. If you see the keyword → use that target.

  Keyword(s) heard           → target value (copy exactly)
  ─────────────────────────────────────────────────────
  profile / account / my account / settings / my settings  → "Profile"
  train / workout / exercise / gym / lift / workouts        → "Train"
  fuel / food / nutrition / eating / diet / meals           → "Fuel"
  insights / stats / analytics / analysis / data            → "Insights"
  home / dashboard / main screen / overview                 → "Home"
  progress / metrics / body metrics / weight history        → "Progress"
  start workout / begin workout / let's train / start a workout → "WorkoutActive"

EXAMPLE: user says "take me to my profile" → COMMAND:{"action":"navigate","target":"Profile"}
EXAMPLE: user says "open my workout" → COMMAND:{"action":"navigate","target":"Train"}
EXAMPLE: user says "I weigh 74kg" → COMMAND:{"action":"log_weight","weight_kg":74}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    : ''

  return `You are Alexi, a personal AI system assistant inside the BodyQ fitness app.
Your tone is: ${tone}. Act like a system controller — move users to screens and log data. Save long coaching for the chat.

DATABASE SCHEMA (exact column names — use these in COMMAND generation):
  daily_activity:   user_id, date(date), steps(int), water_ml(int), sleep_hours(numeric)
  food_logs:        user_id, food_id(uuid→foods), consumed_at(timestamptz), meal_type, quantity_grams(numeric)
  foods:            id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source
  workout_sessions: user_id, started_at(timestamptz), ended_at(timestamptz), calories_burned(int), notes, source
  workout_exercises:workout_session_id, exercise_name, sets, reps, weight_kg, duration_seconds
  body_metrics:     user_id, weight_kg(numeric), body_fat_pct(numeric), logged_at(timestamptz)
  xp_log:           user_id, source, amount(int), earned_at(timestamptz)
  profiles:         goal, activity_level, assistant_tone, xp_current

COMMAND SCHEMA (what the frontend parses from your reply):
  log_water    → daily_activity.water_ml += amount
  log_sleep    → daily_activity.sleep_hours = hours
  log_food     → foods upsert + food_logs insert (consumed_at=now, quantity_grams=100)
  log_weight   → body_metrics.weight_kg
  log_metric   → body_metrics.body_fat_pct
  log_workout  → workout_sessions insert + 50 XP in xp_log
  check_status → query daily_activity + xp_log, summarise
  navigate     → emit navigation event to frontend router
${voiceRules}

RULES:
- Reference at least 2 specific numbers when data is available.
- Identify the biggest win and biggest improvement area.
- Give one concrete action for today.
- Keep the response under 180 words unless asked for a full plan.
- If meal ideas are requested, suggest 2 or 3 options that fit the user's targets.
- Use the user's actual logged meals when available.

${profileSection}

${activitySection}

${nutritionSection}

${workoutsSection}

${bodySection}

${historySection}

USER QUESTION: ${query}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body: any = {}

  try {
    body = await req.json()

    if (body.audioBase64) {
      // Prefer OpenAI Whisper-1 (higher accuracy) when key is present;
      // fall back to Groq whisper-large-v3-turbo when only GROQ_KEY is set.
      const useOpenAI = !!OPENAI_KEY
      if (!useOpenAI && !GROQ_KEY) {
        return jsonResponse({ error: 'Speech transcription is not configured yet.' }, 503)
      }

      // Audio is 16 kHz mono m4a from the VAD recording — Whisper's native format.
      const bytes = Uint8Array.from(atob(body.audioBase64), (c) => c.charCodeAt(0))
      const mime  = body.mimeType ?? 'audio/m4a'
      const ext   = mime.includes('webm') ? 'webm' : mime.includes('wav') ? 'wav' : 'm4a'
      const blob  = new Blob([bytes], { type: mime })

      const form = new FormData()
      form.append('file', blob, `audio.${ext}`)
      form.append('model', useOpenAI ? 'whisper-1' : 'whisper-large-v3-turbo')
      form.append('language', 'en')
      form.append('response_format', 'json')
      form.append('temperature', '0')  // deterministic — prevents creative hallucinations

      // Vocabulary hint: forces Whisper to snap to app-specific words rather than
      // phonetically similar alternatives ("Profile" not "Video file", etc.)
      const userName = body.userName ?? ''
      form.append(
        'prompt',
        `The user is ${userName || 'Maether'}. Common words: Profile, Fuel, Insights, Train, Home. ` +
        'Profile. Fuel. Insights. Train. Home. WorkoutActive. ' +
        'Log water. Log food. Log sleep. Log weight. Body fat. How am I doing. ' +
        'Protein. Carbs. Calories. Steps. Sleep hours.',
      )

      const sttEndpoint = useOpenAI
        ? 'https://api.openai.com/v1/audio/transcriptions'
        : 'https://api.groq.com/openai/v1/audio/transcriptions'
      const sttKey = useOpenAI ? OPENAI_KEY : GROQ_KEY

      const sttRes = await fetch(sttEndpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sttKey}` },
        body: form,
      })

      const sttData = await sttRes.json().catch(() => ({}))
      if (!sttRes.ok) {
        // If OpenAI fails, try Groq as fallback before giving up
        if (useOpenAI && GROQ_KEY) {
          console.warn('[ai-assistant] OpenAI Whisper failed, falling back to Groq:', sttData?.error?.message)
          const fallbackRes  = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${GROQ_KEY}` },
            body: form,
          })
          const fallbackData = await fallbackRes.json().catch(() => ({}))
          if (!fallbackRes.ok) {
            return jsonResponse({ error: fallbackData?.error?.message ?? 'Speech transcription failed.' }, 503)
          }
          return jsonResponse({ transcript: fallbackData.text ?? '' })
        }
        return jsonResponse({ error: sttData?.error?.message ?? 'Speech transcription failed.' }, 503)
      }

      return jsonResponse({ transcript: sttData.text ?? '' })
    }

    if (Array.isArray(body.messages)) {
      if (!GROQ_KEY) {
        return jsonResponse({
          response: "I'm not fully connected to live AI right now, but I can keep helping once the Groq key is configured.",
          fallback: true,
        })
      }

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          max_tokens: 512,
          messages: body.messages,
        }),
      })

      const groqData = await groqRes.json().catch(() => ({}))
      if (!groqRes.ok) {
        return jsonResponse({
          response: "I'm having trouble reaching live AI right now. Try again in a moment, or ask a shorter question.",
          fallback: true,
          details: groqData?.error?.message ?? null,
        })
      }

      return jsonResponse({
        response: groqData.choices?.[0]?.message?.content ?? "I'm here with you. Try sending that one more time.",
      })
    }

    const { userId, query, voiceMode = false, clientContext = {} as ClientContextShape } = body
    if (!query) return jsonResponse({ error: 'query is required' }, 400)

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return jsonResponse({
        response: buildFallbackResponse(query, defaultProfile(), null, null),
        fallback: true,
        reason: 'Supabase service role key is missing in edge function secrets.',
      })
    }

    let profile = {
      ...defaultProfile(),
      ...(clientContext?.profile ?? {}),
    }
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id, full_name, goal, activity_level, height_cm, weight_kg, gender,
            assistant_tone, experience, equipment, diet_pref, sleep_quality, stress_level
          `)
          .eq('id', userId)
          .maybeSingle()

        if (error) {
          console.error('[ai-assistant] profile query failed:', error.message)
        } else if (data) {
          profile = { ...profile, ...data }
        }
      } catch (error: any) {
        console.error('[ai-assistant] profile fetch crashed:', error?.message ?? error)
      }
    }

    const needs = classifyQuery(query)
    console.log(`[ai-assistant] Query classified: ${JSON.stringify(needs)}`)

    const [rpcActivity, rpcNutrition, rpcWorkouts, rpcBodyMetrics, rpcAiHistory] = userId
      ? await Promise.all([
          needs.activity ? safeRpc(supabase, 'get_user_full_activity_summary', { p_user_id: userId }) : Promise.resolve(null),
          needs.nutrition ? safeRpc(supabase, 'get_user_nutrition_summary', { p_user_id: userId }) : Promise.resolve(null),
          needs.workout ? safeRpc(supabase, 'get_user_workout_summary', { p_user_id: userId }) : Promise.resolve(null),
          needs.body ? safeRpc(supabase, 'get_user_body_metrics_history', { p_user_id: userId }) : Promise.resolve(null),
          needs.history ? safeRpc(supabase, 'get_user_ai_history', { p_user_id: userId }) : Promise.resolve(null),
        ])
      : [null, null, null, null, null]

    const activity = clientContext?.activity ?? rpcActivity
    const nutrition = clientContext?.nutrition ?? rpcNutrition
    const workouts = clientContext?.workouts ?? rpcWorkouts
    const bodyMetrics = clientContext?.bodyMetrics ?? rpcBodyMetrics
    const aiHistory = clientContext?.aiHistory ?? rpcAiHistory

    if (!GROQ_KEY) {
      return jsonResponse({
        response: buildFallbackResponse(query, profile, nutrition, activity),
        fallback: true,
        reason: 'GROQ_API_KEY is missing in edge function secrets.',
      })
    }

    const prompt = buildPrompt(profile, activity, nutrition, workouts, bodyMetrics, aiHistory, query, voiceMode)
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 400,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const groqData = await groqRes.json().catch(() => ({}))
    if (!groqRes.ok) {
      return jsonResponse({
        response: buildFallbackResponse(query, profile, nutrition, activity),
        fallback: true,
        reason: groqData?.error?.message ?? `Groq API error ${groqRes.status}`,
      })
    }

    const aiResponse = groqData.choices?.[0]?.message?.content
    if (!aiResponse) {
      return jsonResponse({
        response: buildFallbackResponse(query, profile, nutrition, activity),
        fallback: true,
        reason: 'No response generated by Groq.',
      })
    }

    console.log(`[ai-assistant] Tokens — input: ${groqData.usage?.prompt_tokens}, output: ${groqData.usage?.completion_tokens}`)

    // Execute any COMMAND:{...} lines embedded in the reply (voice mode logging)
    let executedCommands: string[] = []
    if (voiceMode && userId && supabase) {
      executedCommands = await executeVoiceCommands(supabase, userId, aiResponse)
      if (executedCommands.length > 0) {
        console.log(`[ai-assistant] Voice commands executed:`, executedCommands)
      }
    }

    // Extract NAVIGATE command so the frontend can route immediately (no chat UI)
    let navigateTo: string | null = null
    if (voiceMode) {
      const navMatch = aiResponse.match(/COMMAND:\{"action":"navigate","target":"([^"]+)"\}/i)
      if (navMatch) navigateTo = navMatch[1]
    }

    // Strip COMMAND lines from the spoken reply so they aren't read aloud
    const spokenResponse = aiResponse.replace(/COMMAND:\{[^\n]+\}/g, '').trim()

    if (userId) {
      await safeInsertInsight(supabase, {
        user_id: userId,
        insight_type: classifyInsightType(query),
        message: spokenResponse,
        source: 'alexi',
        is_read: false,
      })
    }

    return jsonResponse({
      response: spokenResponse,
      navigateTo,
      insight_type: classifyInsightType(query),
      model: 'llama-3.3-70b-versatile',
      usage: groqData.usage,
      fallback: false,
      executed: executedCommands,
    })
  } catch (err: any) {
    console.error('[ai-assistant] fatal error:', err?.message ?? err)

    if (body?.query) {
      return jsonResponse({
        response: buildFallbackResponse(body.query, defaultProfile(), null, null),
        fallback: true,
        reason: err?.message ?? 'Unexpected edge function error.',
      })
    }

    return jsonResponse({ error: err?.message ?? 'Unexpected edge function error.' }, 500)
  }
})
