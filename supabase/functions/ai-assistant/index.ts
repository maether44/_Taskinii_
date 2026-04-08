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

const GROQ_KEY = Deno.env.get('GROQ_API_KEY') ?? ''
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

function buildFallbackResponse(query: string, profile?: ProfileShape | null, nutrition?: any, activity?: any) {
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
VOICE MODE:
- Keep the whole answer under 25 words.
- No bullets and no markdown.
- If the user explicitly asks to log water, append exactly: COMMAND:{"action":"log_water","amount":250}
- If the user explicitly asks to log sleep, append exactly: COMMAND:{"action":"log_sleep","hours":<number>}`
    : ''

  return `You are Aria, a personal AI health and fitness coach inside the BodyQ app.
Your coaching tone is: ${tone}
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
      if (!GROQ_KEY) {
        return jsonResponse({ error: 'Speech transcription is not configured yet.' }, 503)
      }

      const bytes = Uint8Array.from(atob(body.audioBase64), (c) => c.charCodeAt(0))
      const mime = body.mimeType ?? 'audio/m4a'
      const ext = mime.includes('webm') ? 'webm' : mime.includes('wav') ? 'wav' : 'm4a'
      const blob = new Blob([bytes], { type: mime })
      const form = new FormData()
      form.append('file', blob, `audio.${ext}`)
      form.append('model', 'whisper-large-v3-turbo')
      form.append('language', 'en')
      form.append('response_format', 'json')

      const sttRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_KEY}` },
        body: form,
      })

      const sttData = await sttRes.json().catch(() => ({}))
      if (!sttRes.ok) {
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
        temperature: 0.7,
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

    if (userId) {
      await safeInsertInsight(supabase, {
        user_id: userId,
        insight_type: classifyInsightType(query),
        message: aiResponse,
        source: 'rag',
        is_read: false,
      })
    }

    return jsonResponse({
      response: aiResponse,
      insight_type: classifyInsightType(query),
      model: 'llama-3.3-70b-versatile',
      usage: groqData.usage,
      fallback: false,
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
