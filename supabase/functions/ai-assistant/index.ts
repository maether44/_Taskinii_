/**
 * supabase/functions/ai-assistant/index.ts
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  ALLOWED_MEMORY_CATEGORIES,
  buildConstraintsSection,
  buildEventsSection,
  buildMemorySection,
  deriveConstraintsFromMemory,
  extractActionsFromResponse,
  extractMemoriesFromResponse,
  MemoryRow,
  ParsedAction,
  YaraEvent,
} from './memory.ts'
import { semanticSearch, buildRagContextSection } from './embeddings.ts'

type ActionResult = {
  ok: boolean
  action: string
  detail: string
}

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
        // Use AI-estimated macros when present; fall back to sensible single-serving
        // defaults so we never log a zero-calorie entry.
        const NOW_TS = new Date().toISOString()
        const foodName     = cmd.name      || 'Unknown Food'
        const foodCalories = cmd.calories  ?? 250   // ~1 average serving
        const foodProtein  = cmd.protein_g ?? 10
        const foodCarbs    = cmd.carbs_g   ?? 30
        const foodFat      = cmd.fat_g     ?? 8

        let foodId: string | null = null
        const { data: existing } = await supabase
          .from('foods').select('id').ilike('name', foodName).maybeSingle()
        if (existing) {
          foodId = existing.id
        } else {
          const { data: newFood } = await supabase.from('foods').insert({
            name:              foodName,
            calories_per_100g: foodCalories,
            protein_per_100g:  foodProtein,
            carbs_per_100g:    foodCarbs,
            fat_per_100g:      foodFat,
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

  return `Hey ${name}, I can still coach you even while live data is limited. Ask me about meals, training, recovery, or habits and I'll keep the advice practical and tailored to your goal of ${profile?.goal ?? 'general health'}.`
}

function buildTodaySection(today: TodaySnapshot | null | undefined): string {
  if (!today) return `TODAY'S SNAPSHOT: Not available.`

  const pct = (current?: number, target?: number) => {
    if (!target || target <= 0) return '—'
    return `${Math.round(((current ?? 0) / target) * 100)}%`
  }

  const mealsLine = Array.isArray(today.meals) && today.meals.length > 0
    ? today.meals.map((m) => `${m.meal_type}: ${m.foods}${m.calories ? ` (${m.calories} kcal)` : ''}`).join(' | ')
    : 'No meals logged yet today.'

  const fatigueLine = Array.isArray(today.muscle_fatigue) && today.muscle_fatigue.length > 0
    ? today.muscle_fatigue
        .slice()
        .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
        .slice(0, 6)
        .map((m) => `${m.muscle} ${m.pct}%`)
        .join(', ')
    : 'No muscle fatigue data.'

  const sleepLine = today.sleep_hours != null
    ? `${Number(today.sleep_hours).toFixed(1)} h${today.sleep_quality != null ? ` (quality ${today.sleep_quality}/10)` : ''}`
    : 'not logged yet'

  return `TODAY'S SNAPSHOT (${today.date ?? 'today'}):
Calories: ${today.calories_eaten ?? 0} / ${today.calorie_target ?? '?'} kcal (${pct(today.calories_eaten, today.calorie_target)})
Protein: ${today.protein_eaten ?? 0} / ${today.protein_target ?? '?'} g (${pct(today.protein_eaten, today.protein_target)})
Carbs:   ${today.carbs_eaten ?? 0} / ${today.carbs_target ?? '?'} g (${pct(today.carbs_eaten, today.carbs_target)})
Fat:     ${today.fat_eaten ?? 0} / ${today.fat_target ?? '?'} g (${pct(today.fat_eaten, today.fat_target)})
Water:   ${today.water_ml ?? 0} / ${today.water_target_ml ?? '?'} ml (${pct(today.water_ml, today.water_target_ml)})
Calories burned (workouts today): ${today.calories_burned ?? 0} kcal
Sleep last night: ${sleepLine}
Muscle fatigue: ${fatigueLine}
Meals logged today: ${mealsLine}`
}

// ─── Tone profiles ──────────────────────────────────────────────────────────
// Mechanical tone dispatch. Soft instructions like "be motivational" don't
// change llama-3.3-70b's voice reliably — it defaults to the same cheerful
// coach regardless. Giving the model a concrete voice rubric + a worked
// opener example + an emoji policy forces a measurable tone shift.

type ToneProfile = {
  label: string
  voice: string
  emojiPolicy: string
  openerExample: string
}

const TONE_PROFILES: Record<string, ToneProfile> = {
  motivational: {
    label: 'motivational',
    voice: 'Upbeat but concise. Lead with data, then one encouraging line. No rambling. Vary openers.',
    emojiPolicy: 'At most one celebratory emoji near the opener (🔥, 💪, ⚡). Never stack emojis.',
    openerExample: 'Vary each time. Examples: "Looking at your numbers…", "Let\'s talk about your week so far…", "Here\'s what stands out…". NEVER use a fixed catchphrase.',
  },
  strict: {
    label: 'strict',
    voice: 'Direct, no-nonsense, coach-sergeant. Short imperative sentences. Lead with the deficit, then the fix. No pep talk. No "great job" unless the user genuinely hit a target. Honest about misses.',
    emojiPolicy: 'Zero emojis. Ever.',
    openerExample: '"You missed protein by 38g. Fix it this meal — here is how."',
  },
  friendly: {
    label: 'friendly',
    voice: 'Warm but efficient. Uses the user\'s name. Data first, gentle framing second. One short check-in at most.',
    emojiPolicy: 'At most one warm emoji (🙂, ✨, 🌱) — optional.',
    openerExample: '"Hey Israa, I saw you logged a late workout — how is the energy holding up today?"',
  },
  clinical: {
    label: 'clinical',
    voice: 'Precise, evidence-based, neutral register. Leads with the numbers. States the mechanism or rationale briefly. Avoids motivational language entirely. Third person or impersonal ("the data shows").',
    emojiPolicy: 'Zero emojis. Ever.',
    openerExample: '"Average protein intake is tracking 22% below target over the past 7 days, which will blunt recovery from yesterday\'s session."',
  },
}

function resolveTone(raw: string | null | undefined): ToneProfile {
  const key = String(raw ?? '').toLowerCase().trim()
  return TONE_PROFILES[key] ?? TONE_PROFILES.motivational
}

function buildToneSection(tone: ToneProfile): string {
  return `COACHING TONE: ${tone.label}
- Voice: ${tone.voice}
- Emoji policy: ${tone.emojiPolicy}
- Opener guidance: ${tone.openerExample}
- This tone is non-negotiable. Do not drift toward generic "cheerful coach" style.
- IMPORTANT: Never copy example openers verbatim. Create a fresh, contextual opener every time.`
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
  ragContext = '',
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
- Respond in LESS THAN 12 WORDS. No greetings, no filler.
- You MUST use COMMAND:{"action":"navigate","target":"<Screen>"} for any navigation request.
- EXACT screen name targets (only these, no others):
    MainApp       → home / dashboard / main screen
    MealLogger    → log a meal / add food / food log
    FoodScanner   → scan / barcode / take a photo / scan this / scan food
    SleepLog      → log sleep / sleep tracker
    WorkoutActive → start workout / begin workout / let's train / any specific exercise (squats, bench, deadlift…)
    Train         → training page / exercise library / workout list
    Fuel          → nutrition / macros / food page
    Insights      → stats / analytics / progress / charts
    Profile       → profile / account / settings
- "scan" or "barcode" or "take a photo" → ALWAYS target FoodScanner.
- Any exercise name (squats, push-ups, deadlifts, bench press…) → ALWAYS target WorkoutActive.
- Say the spoken confirmation BEFORE the COMMAND line.
- Example: "Opening the scanner. COMMAND:{"action":"navigate","target":"FoodScanner"}"
- Example: "Let's do squats! COMMAND:{"action":"navigate","target":"WorkoutActive"}"`
    : ''

  // Prompt assembly. Order matters: tone → actions → voice rules → HARD
  // CONSTRAINTS → PROACTIVE SIGNALS → RULES → data sections → user question.
  // Constraints and events must appear BEFORE the freeform data so they stay
  // salient in the model's attention window.
  const sections: string[] = [
    `You are Alexi, a personal AI health and fitness coach inside the BodyQ app.`,
    toneSection,
    actionRules.trim(),
  ]

DATABASE SCHEMA (exact column names — use these in COMMAND generation):
  daily_activity:   user_id, date(date), steps(int), water_ml(int), sleep_hours(numeric)
  food_logs:        user_id, food_id(uuid→foods), consumed_at(timestamptz), meal_type, quantity_grams(numeric)
  foods:            id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source
  workout_sessions: user_id, started_at(timestamptz), ended_at(timestamptz), calories_burned(int), notes, source
  workout_exercises:workout_session_id, exercise_name, sets, reps, weight_kg, duration_seconds
  body_metrics:     user_id, weight_kg(numeric), body_fat_pct(numeric), logged_at(timestamptz)
  xp_log:           user_id, source, amount(int), earned_at(timestamptz)
  profiles:         goal, activity_level, assistant_tone, xp_current

  sections.push(`RULES:
- BANNED PHRASES: Never start with "Big day ahead", "Let's dive in", or any fixed catchphrase. Every reply must open differently based on what the user actually asked.
- Prefer TODAY'S SNAPSHOT over the 30-day averages when the user asks about "today", "right now", or current state.
- Use LONG-TERM MEMORY silently to personalise advice. Never recite the memory list back to the user unless they explicitly ask "what do you remember about me".
- HARD CONSTRAINTS above override every other rule, including this list. Before naming any exercise or food, scan the AVOID list; if your candidate is on it, pick a safe substitute and briefly explain the swap in one clause.
- PROACTIVE SIGNALS above reflect real events since we last spoke — weave ONE into your reply naturally when it fits the user's question. Never dump them as a list.
- Reference at least 2 specific numbers from the data when available.
- Identify the biggest win and biggest improvement area.
- Give one concrete action for today.
- If muscle fatigue is high (>=70%) for any group, recommend recovery for that group and training a different one.
- Keep replies 60–120 words. Lead with the key numbers and actionable advice. No filler, no pep talks, no restating what the user already knows. Only go longer (up to 200 words) if the user asks for a full plan or detailed breakdown.
- If meal ideas are requested, suggest 2 or 3 options that fit the user's remaining calories/macros for today.
- Use the user's actual logged meals when available.

${profileSection}

  sections.push(profileSection)
  sections.push(memorySection)
  sections.push(todaySection)
  sections.push(activitySection)
  sections.push(nutritionSection)
  sections.push(workoutsSection)
  sections.push(bodySection)
  sections.push(historySection)
  if (ragContext) sections.push(ragContext)
  sections.push(`USER QUESTION: ${query}`)

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
      // ── Key guard ────────────────────────────────────────────────────────────
      const useOpenAI = !!OPENAI_KEY
      if (!useOpenAI && !GROQ_KEY) {
        console.error('[ai-assistant] Missing AI API keys — set GROQ_API_KEY or OPENAI_API_KEY in Supabase secrets')
        return jsonResponse({ error: 'Missing AI API Keys — configure GROQ_API_KEY in Supabase secrets.' }, 500)
      }

      // ── Audio size guard ─────────────────────────────────────────────────────
      // A valid 3-second m4a clip is at least ~3 KB. Anything smaller is a
      // silent/empty file that Whisper will reject with a 400. Return a clean
      // empty transcript so the passive loop retries instead of crashing.
      if (!body.audioBase64 || body.audioBase64.length < 4000) {
        console.log('[ai-assistant] Audio too short, skipping transcription (bytes:', body.audioBase64?.length ?? 0, ')')
        return jsonResponse({ transcript: '' })
      }

      // Audio is 16 kHz mono m4a from the VAD recording — Whisper's native format.
      const bytes = Uint8Array.from(atob(body.audioBase64), (c) => c.charCodeAt(0))
      const mime  = body.mimeType ?? 'audio/m4a'
      const ext   = mime.includes('webm') ? 'webm' : mime.includes('wav') ? 'wav' : 'm4a'

      // ── Build FormData once per provider (FormData body is consumed on first fetch) ──
      function buildForm(model: string) {
        const blob = new Blob([bytes], { type: mime })
        const f = new FormData()
        f.append('file', blob, `audio.${ext}`)
        f.append('model', model)
        f.append('language', 'en')
        f.append('response_format', 'json')
        f.append('temperature', '0')
        f.append('prompt', 'BodyQ app. Commands: Alexi, Profile, Fuel, Train, Insights, Log Water, Log Food, Log Weight.')
        return f
      }

      // ── Primary: OpenAI Whisper-1 ────────────────────────────────────────────
      if (useOpenAI) {
        try {
          const sttRes  = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${OPENAI_KEY}` },
            body: buildForm('whisper-1'),
          })
          const sttData = await sttRes.json().catch(() => ({}))
          console.log('[ai-assistant] OpenAI STT status:', sttRes.status, 'error:', sttData?.error?.message ?? 'none')
          if (sttRes.ok) return jsonResponse({ transcript: sttData.text ?? '' })
          // Fall through to Groq if key is also available
          console.warn('[ai-assistant] OpenAI Whisper failed, trying Groq fallback')
        } catch (e: any) {
          console.error('[ai-assistant] OpenAI Whisper fetch crashed:', e?.message)
        }
        if (!GROQ_KEY) return jsonResponse({ error: 'Speech transcription failed (OpenAI error, no Groq fallback).' }, 503)
      }

      // ── Primary (or fallback): Groq whisper-large-v3-turbo ──────────────────
      try {
        const sttRes  = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${GROQ_KEY}` },
          body: buildForm('whisper-large-v3-turbo'),
        })
        const sttData = await sttRes.json().catch(() => ({}))
        console.log('[ai-assistant] Groq STT status:', sttRes.status, 'error:', sttData?.error?.message ?? 'none')
        if (!sttRes.ok) {
          console.error('[ai-assistant] Groq Whisper error body:', JSON.stringify(sttData))
          return jsonResponse({ error: sttData?.error?.message ?? 'Groq speech transcription failed.' }, 503)
        }
        return jsonResponse({ transcript: sttData.text ?? '' })
      } catch (e: any) {
        console.error('[ai-assistant] Groq Whisper fetch crashed:', e?.message)
        return jsonResponse({ error: `Groq fetch crashed: ${e?.message}` }, 503)
      }
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

    const safeSemanticSearch = async (): Promise<string> => {
      try {
        const ragChunks = await semanticSearch(supabase, userId, query)
        return buildRagContextSection(ragChunks)
      } catch (err: any) {
        console.error('[ai-assistant] semantic search failed (non-fatal):', err?.message ?? err)
        return ''
      }
    }

    const [rpcActivity, rpcNutrition, rpcWorkouts, rpcBodyMetrics, rpcAiHistory, memories, pendingEvents, ragContext] = userId
      ? await Promise.all([
          needs.activity ? safeRpc(supabase, 'get_user_full_activity_summary', { p_user_id: userId }) : Promise.resolve(null),
          needs.nutrition ? safeRpc(supabase, 'get_user_nutrition_summary', { p_user_id: userId }) : Promise.resolve(null),
          needs.workout ? safeRpc(supabase, 'get_user_workout_summary', { p_user_id: userId }) : Promise.resolve(null),
          needs.body ? safeRpc(supabase, 'get_user_body_metrics_history', { p_user_id: userId }) : Promise.resolve(null),
          needs.history ? safeRpc(supabase, 'get_user_ai_history', { p_user_id: userId }) : Promise.resolve(null),
          fetchUserMemory(supabase, userId),
          fetchPendingYaraEvents(supabase, userId),
          safeSemanticSearch(),
        ])
      : [null, null, null, null, null, [] as MemoryRow[], [] as YaraEvent[], '']

    const activity = rpcActivity ?? clientContext?.activity ?? null
    const nutrition = rpcNutrition ?? clientContext?.nutrition ?? null
    const workouts = rpcWorkouts ?? clientContext?.workouts ?? null
    const bodyMetrics = rpcBodyMetrics ?? clientContext?.bodyMetrics ?? null
    const aiHistory = rpcAiHistory ?? clientContext?.aiHistory ?? null
    const today = clientContext?.today ?? null

    if (!GROQ_KEY) {
      return jsonResponse({
        response: buildFallbackResponse(query, profile, nutrition, activity),
        fallback: true,
        reason: 'GROQ_API_KEY is missing in edge function secrets.',
      })
    }

    const prompt = buildPrompt(
      profile, today, activity, nutrition, workouts, bodyMetrics, aiHistory,
      memories ?? [], pendingEvents ?? [], query, voiceMode, ragContext,
    )
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: llmModel,
        max_tokens: llmMaxTok,
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
