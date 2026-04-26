/**
 * supabase/functions/embed-user-data/index.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  upsertChunks,
  chunkProfile,
  chunkNutritionSummary,
  chunkActivitySummary,
  chunkWorkoutSession,
  chunkMealLog,
  chunkMemoryFact,
  chunkBodyMetric,
  type ChunkInput,
} from '../ai-assistant/embeddings.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''

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

const ALL_CHUNK_TYPES = [
  'profile',
  'nutrition_summary',
  'activity_summary',
  'workout_session',
  'meal_log',
  'memory_fact',
  'body_metric',
] as const

type ChunkType = (typeof ALL_CHUNK_TYPES)[number]

async function fetchProfile(sb: any, userId: string) {
  const { data } = await sb
    .from('profiles')
    .select(
      'full_name, goal, activity_level, height_cm, weight_kg, gender, experience, equipment, diet_pref, sleep_quality, stress_level',
    )
    .eq('id', userId)
    .maybeSingle()
  return data
}

async function fetchNutritionSummary(sb: any, userId: string) {
  const { data } = await sb.rpc('get_user_nutrition_summary', { p_user_id: userId })
  if (typeof data === 'string') {
    try { return JSON.parse(data) } catch { return null }
  }
  return data
}

async function fetchActivitySummary(sb: any, userId: string) {
  const { data } = await sb.rpc('get_user_full_activity_summary', { p_user_id: userId })
  if (typeof data === 'string') {
    try { return JSON.parse(data) } catch { return null }
  }
  return data
}

async function fetchWorkoutSessions(sb: any, userId: string) {
  const { data } = await sb
    .from('workout_sessions')
    .select('id, started_at, ended_at, calories_burned, notes')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(20)
  return data ?? []
}

function extractRecentMeals(nutritionData: any): any[] {
  return Array.isArray(nutritionData?.recent_meals) ? nutritionData.recent_meals : []
}

async function fetchMemoryFacts(sb: any, userId: string) {
  const { data } = await sb
    .from('user_memory')
    .select('id, category, fact')
    .eq('user_id', userId)
    .order('last_used_at', { ascending: false })
    .limit(30)
  return data ?? []
}

async function fetchBodyMetrics(sb: any, userId: string) {
  const { data } = await sb
    .from('body_metrics')
    .select('recorded_at, weight_kg, body_fat_pct')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(12)
  return (data ?? []).map((d: any) => ({ ...d, logged_at: d.recorded_at }))
}

async function embedUserData(
  sb: any,
  userId: string,
  targetTypes: Set<ChunkType>,
): Promise<{ upserted: number; cleaned: number; errors: string[] }> {
  const chunks: ChunkInput[] = []
  const sourceKeysByType: Record<string, string[]> = {}
  const errors: string[] = []

  function track(chunk: ChunkInput) {
    chunks.push(chunk)
    if (!sourceKeysByType[chunk.chunk_type]) sourceKeysByType[chunk.chunk_type] = []
    sourceKeysByType[chunk.chunk_type].push(chunk.source_key)
  }

  if (targetTypes.has('profile')) {
    try {
      const profile = await fetchProfile(sb, userId)
      if (profile) track(chunkProfile(profile))
    } catch (e: any) {
      errors.push(`profile: ${e?.message}`)
    }
  }

  let nutritionData: any = null
  if (targetTypes.has('nutrition_summary') || targetTypes.has('meal_log')) {
    try {
      nutritionData = await fetchNutritionSummary(sb, userId)
    } catch (e: any) {
      errors.push(`nutrition fetch: ${e?.message}`)
    }
  }

  if (targetTypes.has('nutrition_summary') && nutritionData) {
    try {
      track(chunkNutritionSummary(nutritionData))
    } catch (e: any) {
      errors.push(`nutrition_summary: ${e?.message}`)
    }
  }

  if (targetTypes.has('activity_summary')) {
    try {
      const activity = await fetchActivitySummary(sb, userId)
      if (activity) track(chunkActivitySummary(activity))
    } catch (e: any) {
      errors.push(`activity_summary: ${e?.message}`)
    }
  }

  if (targetTypes.has('workout_session')) {
    try {
      const workouts = await fetchWorkoutSessions(sb, userId)
      for (const w of workouts) track(chunkWorkoutSession(w))
    } catch (e: any) {
      errors.push(`workout_session: ${e?.message}`)
    }
  }

  if (targetTypes.has('meal_log')) {
    try {
      const meals = extractRecentMeals(nutritionData)
      for (const m of meals) track(chunkMealLog(m))
    } catch (e: any) {
      errors.push(`meal_log: ${e?.message}`)
    }
  }

  if (targetTypes.has('memory_fact')) {
    try {
      const memories = await fetchMemoryFacts(sb, userId)
      for (const m of memories) track(chunkMemoryFact(m))
    } catch (e: any) {
      errors.push(`memory_fact: ${e?.message}`)
    }
  }

  if (targetTypes.has('body_metric')) {
    try {
      const metrics = await fetchBodyMetrics(sb, userId)
      for (const m of metrics) track(chunkBodyMetric(m))
    } catch (e: any) {
      errors.push(`body_metric: ${e?.message}`)
    }
  }

  if (chunks.length === 0) {
    return { upserted: 0, cleaned: 0, errors }
  }

  const BATCH_SIZE = 16
  let totalUpserted = 0
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const upserted = await upsertChunks(sb, userId, batch)
    totalUpserted += upserted
  }

  let totalCleaned = 0
  for (const [chunkType, keys] of Object.entries(sourceKeysByType)) {
    try {
      const { data: deleted } = await sb.rpc('delete_stale_rag_chunks', {
        p_user_id: userId,
        p_chunk_type: chunkType,
        p_keep_source_keys: keys,
      })
      totalCleaned += (typeof deleted === 'number' ? deleted : 0)
    } catch (e: any) {
      errors.push(`cleanup ${chunkType}: ${e?.message}`)
    }
  }

  return { upserted: totalUpserted, cleaned: totalCleaned, errors }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const sb = getSupabaseAdmin()
    if (!sb) {
      return jsonResponse({ error: 'Supabase service role key not configured' }, 503)
    }

    if (body.all) {
      const secret = Deno.env.get('ADMIN_SECRET')
      if (!secret || body.adminKey !== secret) {
        return jsonResponse({ error: 'Unauthorized' }, 401)
      }

      const { data: profiles } = await sb.from('profiles').select('id')
      const ids: string[] = (profiles ?? []).map((p: any) => p.id)
      const targetTypes = new Set(ALL_CHUNK_TYPES) as Set<ChunkType>

      let processed = 0
      let totalUpserted = 0
      const batchErrors: string[] = []

      for (const uid of ids) {
        try {
          const result = await embedUserData(sb, uid, targetTypes)
          totalUpserted += result.upserted
          if (result.errors.length) batchErrors.push(`${uid}: ${result.errors.join('; ')}`)
          processed++
        } catch (e: any) {
          batchErrors.push(`${uid}: ${e?.message}`)
        }
      }

      return jsonResponse({
        success: true,
        processed,
        total: ids.length,
        total_upserted: totalUpserted,
        errors: batchErrors.length > 0 ? batchErrors : undefined,
      })
    }

    const { userId, chunkTypes } = body
    if (!userId) {
      return jsonResponse({ error: 'userId is required' }, 400)
    }

    let targetTypes: Set<ChunkType>
    if (Array.isArray(chunkTypes) && chunkTypes.length > 0) {
      targetTypes = new Set(
        chunkTypes.filter((t: string) => (ALL_CHUNK_TYPES as readonly string[]).includes(t)),
      ) as Set<ChunkType>
      if (targetTypes.size === 0) {
        return jsonResponse({ error: `Invalid chunkTypes. Valid: ${ALL_CHUNK_TYPES.join(', ')}` }, 400)
      }
    } else {
      targetTypes = new Set(ALL_CHUNK_TYPES) as Set<ChunkType>
    }

    const result = await embedUserData(sb, userId, targetTypes)

    return jsonResponse({
      success: true,
      upserted: result.upserted,
      cleaned: result.cleaned,
      chunk_types: [...targetTypes],
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (err: any) {
    console.error('[embed-user-data] fatal:', err?.message ?? err)
    return jsonResponse({ error: err?.message ?? 'Unexpected error' }, 500)
  }
})
