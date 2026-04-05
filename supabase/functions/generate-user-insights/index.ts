/**
 * supabase/functions/generate-user-insights/index.ts
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const TYPE_META: Record<string, { icon: string; color: string }> = {
  Activity: { icon: '🏃', color: '#7B61FF' },
  Nutrition: { icon: '🥗', color: '#CDF27E' },
  Sleep: { icon: '🌙', color: '#A38DF2' },
  Training: { icon: '💪', color: '#6F4BF2' },
  Progress: { icon: '📈', color: '#7B61FF' },
  Mindset: { icon: '🧠', color: '#A38DF2' },
}

const VALID_TYPES = Object.keys(TYPE_META)
const GROQ_KEY = Deno.env.get('GROQ_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeType(raw: string): string {
  if (!raw) return 'Activity'
  const parts = String(raw).split(/[|,/\s]+/)
  for (const p of parts) {
    const match = VALID_TYPES.find((t) => t.toLowerCase() === p.trim().toLowerCase())
    if (match) return match
  }
  return 'Activity'
}

async function fetchStatsForUser(uid: string) {
  const { data: rpcData } = await sb.rpc('get_insights_data', {
    p_user_id: uid,
    p_period: 'Month',
  })
  const stats = (rpcData as any) ?? {}

  const { data: fatigue } = await sb
    .from('muscle_fatigue')
    .select('muscle_name, fatigue_pct')
    .eq('user_id', uid)
    .order('fatigue_pct', { ascending: false })
    .limit(3)

  const topMuscles =
    fatigue?.map((f: any) => `${f.muscle_name} (${f.fatigue_pct}%)`).join(', ') || 'none'

  const { count: sessionCount } = await sb
    .from('workout_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)

  return { stats, topMuscles, sessionCount: sessionCount ?? 0 }
}

function buildPrompt(stats: any, topMuscles: string, sessionCount: number): string {
  const {
    workout_count = 0,
    avg_calories = 0,
    avg_steps = 0,
    avg_sleep = 0,
    weight_delta = 0,
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
Return ONLY a raw JSON array with exactly 4 objects:
[{ "type": "Activity", "message": "Two sentences of personalised coaching insight." }]`
}

async function callGroq(prompt: string): Promise<Array<{ type: string; message: string }>> {
  if (!GROQ_KEY) return []

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content: 'You are Yara, a fitness analytics AI. Always respond with only the JSON array requested.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })

  const data = await groqRes.json().catch(() => ({}))
  if (!groqRes.ok) throw new Error(`Groq error: ${JSON.stringify(data?.error)}`)

  const content = data.choices?.[0]?.message?.content ?? '[]'
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  return jsonMatch ? JSON.parse(jsonMatch[0]) : []
}

function fallbackInsights(stats: any, topMuscles: string) {
  const avgSteps = Math.round(stats?.avg_steps ?? 0)
  const avgCalories = Math.round(stats?.avg_calories ?? 0)
  const avgSleep = Number(stats?.avg_sleep ?? 0).toFixed(1)
  const weightDelta = Number(stats?.weight_delta ?? 0).toFixed(1)

  return [
    { type: 'Activity', message: avgSteps > 7000 ? `Your activity base is solid at about ${avgSteps} steps a day. Keep protecting that consistency because it supports everything else.` : `Your average is around ${avgSteps} steps a day, so adding one extra walk would be an easy win this week.` },
    { type: 'Nutrition', message: avgCalories > 0 ? `You are averaging about ${avgCalories} kcal per day. Keep logging meals consistently so Yara can coach with better food precision.` : 'Meal logging is still light, so start with one fully logged meal each day to sharpen nutrition coaching.' },
    { type: 'Sleep', message: Number(avgSleep) >= 7 ? `Sleep is holding around ${avgSleep} hours, which is a strong recovery base. Keep your bedtime consistent.` : `Sleep is averaging about ${avgSleep} hours, so recovery may improve fast if you can add even 30 to 45 minutes.` },
    { type: 'Training', message: topMuscles !== 'none' ? `Your most fatigued muscles right now are ${topMuscles}. Plan recovery or lighter volume before pushing them hard again.` : 'Training data is still building, so keep logging workouts to unlock sharper recovery insights.' },
  ]
}

async function generateInsightsForUser(uid: string) {
  const { stats, topMuscles, sessionCount } = await fetchStatsForUser(uid)
  const prompt = buildPrompt(stats, topMuscles, sessionCount)

  let rawCards: Array<{ type: string; message: string }> = []
  try {
    rawCards = await callGroq(prompt)
  } catch (error) {
    console.error('generate-user-insights: Groq failed, using fallback', error)
  }

  if (!rawCards.length) {
    rawCards = fallbackInsights(stats, topMuscles)
  }

  const rows = rawCards.slice(0, 4).map((ins: any) => {
    const type = normalizeType(ins.type)
    const meta = TYPE_META[type]
    return {
      user_id: uid,
      insight_type: type,
      message: ins.message ?? '',
      icon: meta.icon,
      color: meta.color,
    }
  })

  await sb.from('user_insights').delete().eq('user_id', uid)
  await sb.from('user_insights').insert(rows)

  return rows
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { userId, all, adminKey } = body

    if (all) {
      const secret = Deno.env.get('ADMIN_SECRET')
      if (!secret || adminKey !== secret) {
        return response({ error: 'Unauthorized' }, 401)
      }

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

      return response({ success: true, processed, total: ids.length })
    }

    if (!userId) {
      return response({ error: 'userId is required' }, 400)
    }

    const rows = await generateInsightsForUser(userId)
    const cards = rows.map((r) => ({
      insight_type: r.insight_type,
      message: r.message,
      icon: r.icon,
      color: r.color,
    }))

    return response({ success: true, insights: cards })
  } catch (err: any) {
    console.error('generate-user-insights error:', err)
    return response({ error: err.message }, 500)
  }
})
