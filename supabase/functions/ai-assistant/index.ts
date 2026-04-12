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

type TodaySnapshot = {
  date?: string
  calories_eaten?: number
  calorie_target?: number
  protein_eaten?: number
  protein_target?: number
  carbs_eaten?: number
  carbs_target?: number
  fat_eaten?: number
  fat_target?: number
  water_ml?: number
  water_target_ml?: number
  calories_burned?: number
  sleep_hours?: number | null
  sleep_quality?: number | null
  muscle_fatigue?: Array<{ muscle: string; pct: number }>
  meals?: Array<{ meal_type: string; foods: string; calories?: number }>
}

type ClientContextShape = {
  profile?: ProfileShape | null
  today?: TodaySnapshot | null
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

/**
 * Executes a list of pre-parsed action tool-calls emitted by Yara. Parser
 * lives in memory.ts (extractActionsFromResponse); this stays here because it
 * mutates the supabase client. Returns a structured result list the caller
 * can surface to the user as "Logged 250ml ✓" confirmations.
 */
async function executeActions(
  supabase: any,
  userId: string,
  actions: ParsedAction[],
): Promise<ActionResult[]> {
  const results: ActionResult[] = []
  const TODAY = new Date().toISOString().split('T')[0]

  for (const a of actions) {
    const cmd = a.params as any
    try {
      if (a.action === 'log_water') {
        const { data: ex } = await supabase
          .from('daily_activity').select('id, water_ml').eq('user_id', userId).eq('date', TODAY).maybeSingle()
        const newMl = (ex?.water_ml ?? 0) + (cmd.amount ?? 250)
        if (ex) await supabase.from('daily_activity').update({ water_ml: newMl }).eq('id', ex.id)
        else     await supabase.from('daily_activity').insert({ user_id: userId, date: TODAY, water_ml: newMl })
        results.push({ ok: true, action: 'log_water', detail: `water total ${newMl} ml today` })

      } else if (a.action === 'log_sleep') {
        await supabase.from('daily_activity')
          .upsert({ user_id: userId, date: TODAY, sleep_hours: cmd.hours }, { onConflict: 'user_id,date' })
        results.push({ ok: true, action: 'log_sleep', detail: `sleep ${cmd.hours}h logged` })

      } else if (a.action === 'log_weight') {
        await supabase.from('body_metrics').insert({
          user_id: userId, weight_kg: cmd.weight_kg, recorded_at: new Date().toISOString(),
        })
        results.push({ ok: true, action: 'log_weight', detail: `${cmd.weight_kg} kg logged` })

      } else if (a.action === 'log_food') {
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
            source: 'yara_action',
          }).select('id').single()
          foodId = newFood?.id ?? null
        }
        if (foodId) {
          await supabase.from('food_logs').insert({
            user_id: userId, food_id: foodId,
            consumed_at: new Date().toISOString(),
            meal_type: cmd.meal_type ?? 'snack',
            quantity_grams: 100,
          })
          results.push({ ok: true, action: 'log_food', detail: `logged ${cmd.name}` })
        } else {
          results.push({ ok: false, action: 'log_food', detail: `could not resolve or create food "${cmd.name}"` })
        }

      } else if (a.action === 'log_workout') {
        const now = new Date().toISOString()
        const durationMins = cmd.duration_minutes ?? 30
        const startedAt = new Date(Date.now() - durationMins * 60000).toISOString()
        await supabase.from('workout_sessions').insert({
          user_id: userId,
          started_at: startedAt,
          ended_at: now,
          calories_burned: cmd.calories_burned ?? null,
          notes: 'logged via yara action',
        })
        const XP = 50
        await supabase.from('xp_log').insert({ user_id: userId, source: 'workout', amount: XP, earned_at: now }).catch(() => {})
        await supabase.rpc('increment_xp', { p_user_id: userId, p_amount: XP }).catch(() => {})
        results.push({ ok: true, action: 'log_workout', detail: `workout ${durationMins} min logged (+${XP} xp)` })

      } else if (a.action === 'forget_fact') {
        const needle = String(cmd.fact_contains ?? cmd.fact ?? '').trim()
        if (!needle) {
          results.push({ ok: false, action: 'forget_fact', detail: 'missing fact_contains parameter' })
          continue
        }
        const { data: rows } = await supabase
          .from('user_memory')
          .select('id, fact')
          .eq('user_id', userId)
          .ilike('fact', `%${needle}%`)
        const ids: string[] = (rows ?? []).map((r: any) => r.id)
        if (ids.length === 0) {
          results.push({ ok: false, action: 'forget_fact', detail: `no memory matched "${needle}"` })
          continue
        }
        await Promise.all(
          ids.map((id) => supabase.rpc('delete_user_memory', { p_user_id: userId, p_id: id })),
        )
        results.push({ ok: true, action: 'forget_fact', detail: `forgot ${ids.length} fact(s) matching "${needle}"` })
      }
    } catch (e: any) {
      console.error('[ai-assistant] executeActions failed on', a.action, e?.message ?? e)
      results.push({ ok: false, action: a.action, detail: e?.message ?? 'execution failed' })
    }
  }
  return results
}

// ─── Cross-session memory ───────────────────────────────────────────────────
// Pure helpers (parser, section builder, types) live in ./memory.ts so they
// can be unit-tested without booting the HTTP server. The functions below
// touch the supabase client, so they stay here.

async function fetchUserMemory(supabase: any, userId: string): Promise<MemoryRow[]> {
  if (!userId) return []
  try {
    const { data, error } = await supabase.rpc('get_user_memory', { p_user_id: userId, p_limit: 30 })
    if (error) {
      console.error('[ai-assistant] get_user_memory failed:', error.message)
      return []
    }
    if (Array.isArray(data)) return data as MemoryRow[]
    if (typeof data === 'string') {
      try { return JSON.parse(data) as MemoryRow[] } catch { return [] }
    }
    return []
  } catch (error: any) {
    console.error('[ai-assistant] get_user_memory crashed:', error?.message ?? error)
    return []
  }
}

async function storeMemoryFact(supabase: any, userId: string, category: string, fact: string) {
  if (!userId || !ALLOWED_MEMORY_CATEGORIES.has(category)) return
  if (!fact || fact.length > 240) return
  try {
    const { error } = await supabase.rpc('add_user_memory', {
      p_user_id: userId,
      p_category: category,
      p_fact: fact,
    })
    if (error) console.error('[ai-assistant] add_user_memory failed:', error.message)
  } catch (error: any) {
    console.error('[ai-assistant] add_user_memory crashed:', error?.message ?? error)
  }
}

// extractMemoriesFromResponse and buildMemorySection live in ./memory.ts

// ─── Proactive events (Phase 3 #3) ──────────────────────────────────────────

async function fetchPendingYaraEvents(supabase: any, userId: string): Promise<YaraEvent[]> {
  if (!userId) return []
  try {
    const { data, error } = await supabase.rpc('get_pending_yara_events', { p_user_id: userId, p_limit: 10 })
    if (error) {
      console.error('[ai-assistant] get_pending_yara_events failed:', error.message)
      return []
    }
    if (Array.isArray(data)) return data as YaraEvent[]
    return []
  } catch (error: any) {
    console.error('[ai-assistant] get_pending_yara_events crashed:', error?.message ?? error)
    return []
  }
}

async function consumeYaraEvents(supabase: any, userId: string, ids: string[]) {
  if (!userId || ids.length === 0) return
  try {
    const { error } = await supabase.rpc('consume_yara_events', { p_user_id: userId, p_ids: ids })
    if (error) console.error('[ai-assistant] consume_yara_events failed:', error.message)
  } catch (error: any) {
    console.error('[ai-assistant] consume_yara_events crashed:', error?.message ?? error)
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

function buildFallbackResponse(
  query: string,
  profile?: ProfileShape | null,
  nutrition?: any,
  activity?: any,
  today?: TodaySnapshot | null,
) {
  const q = query.toLowerCase()
  const name = profile?.full_name || 'there'

  if (/meal plan|what should i eat|food plan|eat today|meal ideas|nutrition/.test(q)) {
    const target = today?.calorie_target ?? nutrition?.daily_calorie_target ?? 2000
    const protein = today?.protein_target ?? nutrition?.protein_target ?? 150
    const eatenToday = today?.calories_eaten ?? 0
    const proteinToday = today?.protein_eaten ?? 0
    const remaining = Math.max(0, target - eatenToday)
    const meals = Array.isArray(today?.meals) && today!.meals!.length > 0
      ? today!.meals!.slice(0, 3)
      : (Array.isArray(nutrition?.recent_meals) ? nutrition.recent_meals.slice(0, 3) : [])
    const recent = meals.length
      ? `So far today: ${meals.map((meal: any) => `${meal.meal_type} (${meal.foods})`).join('; ')}.`
      : 'You have not logged any meals yet today — start by logging breakfast or lunch.'
    return `Hey ${name}, aim for ${target} kcal and ${protein}g protein today. You have about ${remaining} kcal and ${Math.max(0, protein - proteinToday)}g protein left. ${recent} Build each remaining meal around a clear protein, add a smart carb if energy is low, and finish with fruit or vegetables.`
  }

  if (/sleep|water|steps|activity/.test(q)) {
    const water = today?.water_ml ?? 0
    const waterTarget = today?.water_target_ml ?? 2500
    const sleep = today?.sleep_hours
    const sleepLine = sleep != null ? `You logged ${Number(sleep).toFixed(1)}h sleep last night.` : 'No sleep logged for last night yet.'
    return `Hey ${name}, ${sleepLine} Water is at ${water}/${waterTarget} ml today — keep sipping, aim for a short walk, and protect sleep tonight. Consistency beats perfect days.`
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
    voice: 'Energetic, upbeat, encouraging. Use short punchy sentences. Celebrate wins. Frame gaps as opportunities, never failures. Second person ("you got this"). Never condescending.',
    emojiPolicy: 'At most one celebratory emoji near the opener (🔥, 💪, ⚡). Never stack emojis.',
    openerExample: '"Big day ahead — you already crushed X, now let\'s stack one more win."',
  },
  strict: {
    label: 'strict',
    voice: 'Direct, no-nonsense, coach-sergeant. Short imperative sentences. Lead with the deficit, then the fix. No pep talk. No "great job" unless the user genuinely hit a target. Honest about misses.',
    emojiPolicy: 'Zero emojis. Ever.',
    openerExample: '"You missed protein by 38g. Fix it this meal — here is how."',
  },
  friendly: {
    label: 'friendly',
    voice: 'Warm, conversational, like a supportive friend who happens to know the science. Longer flowing sentences. Uses the user\'s name. Gentle framing. Asks one light check-in.',
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
- Example opener in this voice: ${tone.openerExample}
- This tone is non-negotiable. Do not drift toward generic "cheerful coach" style.`
}

function buildPrompt(
  profile: any,
  today: TodaySnapshot | null | undefined,
  activity: any,
  nutrition: any,
  workouts: any,
  bodyMetrics: any,
  aiHistory: any,
  memories: MemoryRow[],
  events: YaraEvent[],
  query: string,
  voiceMode = false,
): string {
  const tone = resolveTone(profile.assistant_tone)
  const toneSection = buildToneSection(tone)

  // Derive explicit deny-lists from memory facts. This hoists constraints out
  // of soft prose ("respect injuries") into mechanical AVOID lines the model
  // cannot misread — the root cause of the prior "prescribed lunges despite
  // knee injury" compliance bug.
  const derivedConstraints = deriveConstraintsFromMemory(memories)
  const constraintsSection = buildConstraintsSection(derivedConstraints)

  const eventsSection = buildEventsSection(events)

  const todaySection = buildTodaySection(today)
  const memorySection = buildMemorySection(memories)

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

  // Action tool-call protocol (Phase 3 #5). Available in both text and voice
  // modes, but voice mode gets the extra brevity rules. The edge function
  // parses COMMAND lines out of the reply via extractActionsFromResponse,
  // executes them, and strips the markers before returning visible text.
  const actionRules = `
ACTIONS (optional tool calls — use ONLY if the user explicitly asked you to log, forget, or perform one of these):
- Log water:   COMMAND:{"action":"log_water","amount":250}
- Log sleep:   COMMAND:{"action":"log_sleep","hours":<number>}
- Log weight:  COMMAND:{"action":"log_weight","weight_kg":<number>}
- Log food:    COMMAND:{"action":"log_food","name":"<food name>","calories":<number>,"protein_g":<number>,"carbs_g":<number>,"fat_g":<number>,"meal_type":"breakfast|lunch|dinner|snack"}
- Log workout: COMMAND:{"action":"log_workout","duration_minutes":<number>,"calories_burned":<number>}
- Forget a memorised fact: COMMAND:{"action":"forget_fact","fact_contains":"<substring that uniquely identifies the fact>"}
- Put each COMMAND on its own line at the very end of your reply. Never emit a COMMAND for anything the user did not clearly ask for.
- Never reference the COMMAND line in your visible prose — the user only sees confirmation once the action runs.`

  const voiceRules = voiceMode
    ? `
VOICE MODE:
- Keep the whole spoken reply under 25 words.
- No bullets, no markdown, no emojis.
- Still use the ACTIONS grammar above for any logging the user asks for.`
    : ''

  // Prompt assembly. Order matters: tone → actions → voice rules → HARD
  // CONSTRAINTS → PROACTIVE SIGNALS → RULES → data sections → user question.
  // Constraints and events must appear BEFORE the freeform data so they stay
  // salient in the model's attention window.
  const sections: string[] = [
    `You are Yara, a personal AI health and fitness coach inside the BodyQ app.`,
    toneSection,
    actionRules.trim(),
  ]

  if (voiceRules) sections.push(voiceRules.trim())
  if (constraintsSection) sections.push(constraintsSection)
  if (eventsSection) sections.push(eventsSection)

  sections.push(`RULES:
- Prefer TODAY'S SNAPSHOT over the 30-day averages when the user asks about "today", "right now", or current state.
- Use LONG-TERM MEMORY silently to personalise advice. Never recite the memory list back to the user unless they explicitly ask "what do you remember about me".
- HARD CONSTRAINTS above override every other rule, including this list. Before naming any exercise or food, scan the AVOID list; if your candidate is on it, pick a safe substitute and briefly explain the swap in one clause.
- PROACTIVE SIGNALS above reflect real events since we last spoke — weave ONE into your reply naturally when it fits the user's question. Never dump them as a list.
- Reference at least 2 specific numbers from the data when available.
- Identify the biggest win and biggest improvement area.
- Give one concrete action for today.
- If muscle fatigue is high (>=70%) for any group, recommend recovery for that group and training a different one.
- Keep the response under 180 words unless asked for a full plan.
- If meal ideas are requested, suggest 2 or 3 options that fit the user's remaining calories/macros for today.
- Use the user's actual logged meals when available.

MEMORY EXTRACTION (very important):
- If the user's message reveals a long-lived fact about themselves that is NOT already in LONG-TERM MEMORY, append at the very end of your reply, on its own final line, exactly:
  MEMORIES:[{"category":"<one of: injury|medical|diet|equipment|schedule|preference|dislike|goal|other>","fact":"<short third-person fact, max 200 chars>"}]
- Multiple facts may be included as a JSON array. Do NOT wrap in markdown or code fences.
- Only include facts that will still be relevant in a week (injuries, allergies, dietary rules, equipment owned, weekly schedule, strong preferences/dislikes, durable goals). Skip transient state like "I'm tired today" or "I ate pasta for lunch".
- If there is nothing memorable, omit the MEMORIES line entirely. Never write an empty array.
- Never reference the MEMORIES line in your visible reply.`)

  sections.push(profileSection)
  sections.push(memorySection)
  sections.push(todaySection)
  sections.push(activitySection)
  sections.push(nutritionSection)
  sections.push(workoutsSection)
  sections.push(bodySection)
  sections.push(historySection)
  sections.push(`USER QUESTION: ${query}`)

  return sections.join('\n\n')
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
        response: buildFallbackResponse(query, defaultProfile(), null, null, clientContext?.today ?? null),
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

    const [rpcActivity, rpcNutrition, rpcWorkouts, rpcBodyMetrics, rpcAiHistory, memories, pendingEvents] = userId
      ? await Promise.all([
          needs.activity ? safeRpc(supabase, 'get_user_full_activity_summary', { p_user_id: userId }) : Promise.resolve(null),
          needs.nutrition ? safeRpc(supabase, 'get_user_nutrition_summary', { p_user_id: userId }) : Promise.resolve(null),
          needs.workout ? safeRpc(supabase, 'get_user_workout_summary', { p_user_id: userId }) : Promise.resolve(null),
          needs.body ? safeRpc(supabase, 'get_user_body_metrics_history', { p_user_id: userId }) : Promise.resolve(null),
          needs.history ? safeRpc(supabase, 'get_user_ai_history', { p_user_id: userId }) : Promise.resolve(null),
          fetchUserMemory(supabase, userId),
          fetchPendingYaraEvents(supabase, userId),
        ])
      : [null, null, null, null, null, [] as MemoryRow[], [] as YaraEvent[]]

    // 30-day averages always come from RPCs (client-side "today" data is a separate section).
    // Legacy clients may still send activity/nutrition as overrides — respected only if RPC returned null.
    const activity = rpcActivity ?? clientContext?.activity ?? null
    const nutrition = rpcNutrition ?? clientContext?.nutrition ?? null
    const workouts = rpcWorkouts ?? clientContext?.workouts ?? null
    const bodyMetrics = rpcBodyMetrics ?? clientContext?.bodyMetrics ?? null
    const aiHistory = rpcAiHistory ?? clientContext?.aiHistory ?? null
    const today = clientContext?.today ?? null

    if (!GROQ_KEY) {
      return jsonResponse({
        response: buildFallbackResponse(query, profile, nutrition, activity, today),
        fallback: true,
        reason: 'GROQ_API_KEY is missing in edge function secrets.',
      })
    }

    const prompt = buildPrompt(
      profile, today, activity, nutrition, workouts, bodyMetrics, aiHistory,
      memories ?? [], pendingEvents ?? [], query, voiceMode,
    )
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
        response: buildFallbackResponse(query, profile, nutrition, activity, today),
        fallback: true,
        reason: groqData?.error?.message ?? `Groq API error ${groqRes.status}`,
      })
    }

    const rawResponse = groqData.choices?.[0]?.message?.content
    if (!rawResponse) {
      return jsonResponse({
        response: buildFallbackResponse(query, profile, nutrition, activity, today),
        fallback: true,
        reason: 'No response generated by Groq.',
      })
    }

    // Split visible reply from any MEMORIES:[…] tail line and persist new facts.
    const { cleaned: postMemory, facts: newFacts } = extractMemoriesFromResponse(rawResponse)
    if (userId && newFacts.length > 0) {
      console.log(`[ai-assistant] Extracted ${newFacts.length} new memory fact(s)`)
      await Promise.all(newFacts.map((f) => storeMemoryFact(supabase, userId, f.category, f.fact)))
    }

    // Parse, execute, and strip COMMAND:{...} tool calls (Phase 3 #5). Runs
    // in both text and voice mode now — actions are a first-class feature,
    // not a voice-only hack.
    const { cleaned: aiResponse, actions: parsedActions } = extractActionsFromResponse(postMemory)
    let actionResults: ActionResult[] = []
    if (userId && parsedActions.length > 0) {
      actionResults = await executeActions(supabase, userId, parsedActions)
      console.log(`[ai-assistant] Actions executed:`, actionResults.map((r) => `${r.action}:${r.ok ? 'ok' : 'fail'}`))
    }

    // Consume pending yara_events so they don't repeat in the next conversation.
    if (userId && pendingEvents && pendingEvents.length > 0) {
      await consumeYaraEvents(supabase, userId, pendingEvents.map((e) => e.id))
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
      memories_added: newFacts.length,
      actions: actionResults,
      events_surfaced: pendingEvents?.length ?? 0,
      // Legacy field: previous shape returned a string[] of successful commands.
      // Keep as an alias so existing mobile clients don't break.
      executed: actionResults.filter((r) => r.ok).map((r) => r.action),
      fallback: false,
    })
  } catch (err: any) {
    console.error('[ai-assistant] fatal error:', err?.message ?? err)

    if (body?.query) {
      return jsonResponse({
        response: buildFallbackResponse(body.query, defaultProfile(), null, null, body?.clientContext?.today ?? null),
        fallback: true,
        reason: err?.message ?? 'Unexpected edge function error.',
      })
    }

    return jsonResponse({ error: err?.message ?? 'Unexpected edge function error.' }, 500)
  }
})
