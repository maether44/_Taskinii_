/**
 * supabase/functions/ai-assistant/embeddings.ts
 *
 * Vector embedding utilities for Yara's RAG pipeline.
 *
 * Handles:
 *   - Generating embeddings via Hugging Face Inference API (gte-small, 384 dims)
 *   - Chunking user data into embeddable text blocks
 *   - Semantic search (query embedding → match_rag_chunks RPC)
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type RagChunk = {
  id: string
  chunk_type: string
  source_key: string
  content: string
  metadata: Record<string, unknown>
  similarity: number
}

export type ChunkInput = {
  chunk_type: string
  source_key: string
  content: string
  metadata?: Record<string, unknown>
}

// ── Embedding provider ───────────────────────────────────────────────────────

const HF_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/Supabase/gte-small'
const EMBEDDING_DIM = 384

function getHfToken(): string {
  return Deno.env.get('HF_TOKEN') ?? ''
}

/**
 * Embeds one or more texts via Hugging Face Inference API (gte-small).
 * Returns an array of 384-dim vectors, one per input text.
 *
 * Falls back gracefully: if the API is unavailable, returns null so callers
 * can degrade to the keyword path.
 */
export async function embedTexts(
  texts: string[],
): Promise<number[][] | null> {
  const token = getHfToken()
  if (!token) {
    console.warn('[embeddings] HF_TOKEN not set — skipping embedding')
    return null
  }

  if (texts.length === 0) return []

  try {
    const res = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error(`[embeddings] HF API error ${res.status}: ${errBody}`)
      return null
    }

    const vectors: number[][] = await res.json()
    if (!Array.isArray(vectors) || vectors.length !== texts.length) {
      console.error('[embeddings] unexpected response shape from HF API')
      return null
    }

    return vectors
  } catch (err: any) {
    console.error('[embeddings] embedTexts failed:', err?.message ?? err)
    return null
  }
}

/**
 * Convenience: embed a single text. Returns a 384-dim vector or null.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const result = await embedTexts([text])
  return result?.[0] ?? null
}

// ── Semantic search ──────────────────────────────────────────────────────────

/**
 * Embeds the user query and runs cosine similarity search via the
 * match_rag_chunks RPC. Returns the top-k relevant chunks, or an empty
 * array if embeddings are unavailable.
 */
export async function semanticSearch(
  supabase: any,
  userId: string,
  query: string,
  matchCount = 8,
  matchThreshold = 0.5,
): Promise<RagChunk[]> {
  const queryEmbedding = await embedText(query)
  if (!queryEmbedding) return []

  try {
    const { data, error } = await supabase.rpc('match_rag_chunks', {
      p_user_id: userId,
      p_query_embedding: queryEmbedding,
      p_match_count: matchCount,
      p_match_threshold: matchThreshold,
    })

    if (error) {
      console.error('[embeddings] match_rag_chunks failed:', error.message)
      return []
    }

    return (data ?? []) as RagChunk[]
  } catch (err: any) {
    console.error('[embeddings] semanticSearch crashed:', err?.message ?? err)
    return []
  }
}

/**
 * Formats retrieved RAG chunks into a prompt section the LLM can consume.
 * Grouped by chunk_type for readability.
 */
export function buildRagContextSection(chunks: RagChunk[]): string {
  if (!chunks || chunks.length === 0) return ''

  const grouped: Record<string, string[]> = {}
  for (const c of chunks) {
    const label = c.chunk_type.replace(/_/g, ' ')
    if (!grouped[label]) grouped[label] = []
    grouped[label].push(c.content)
  }

  const lines: string[] = [
    'RELEVANT CONTEXT (retrieved via semantic search — most relevant to the user\'s question):',
  ]
  for (const [label, contents] of Object.entries(grouped)) {
    lines.push(`[${label}]`)
    for (const content of contents) {
      lines.push(`- ${content}`)
    }
  }

  return lines.join('\n')
}

// ── Chunk upsert helper ──────────────────────────────────────────────────────

/**
 * Embeds a batch of chunk inputs and upserts them into rag_chunks via RPC.
 * Used by the embedding pipeline to keep vectors fresh.
 */
export async function upsertChunks(
  supabase: any,
  userId: string,
  chunks: ChunkInput[],
): Promise<number> {
  if (chunks.length === 0) return 0

  const texts = chunks.map((c) => c.content)
  const vectors = await embedTexts(texts)
  if (!vectors) return 0

  let upserted = 0
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]
    try {
      const { error } = await supabase.rpc('upsert_rag_chunk', {
        p_user_id: userId,
        p_chunk_type: c.chunk_type,
        p_source_key: c.source_key,
        p_content: c.content,
        p_metadata: c.metadata ?? {},
        p_embedding: vectors[i],
      })
      if (error) {
        console.error(`[embeddings] upsert failed for ${c.source_key}:`, error.message)
      } else {
        upserted++
      }
    } catch (err: any) {
      console.error(`[embeddings] upsert crashed for ${c.source_key}:`, err?.message ?? err)
    }
  }

  return upserted
}

// ── Data chunkers ────────────────────────────────────────────────────────────

export function chunkProfile(profile: Record<string, any>): ChunkInput {
  const lines = [
    `User: ${profile.full_name ?? 'Unknown'}`,
    `Goal: ${profile.goal ?? 'not set'}`,
    `Activity level: ${profile.activity_level ?? 'not set'}`,
    `Experience: ${profile.experience ?? 'not set'}`,
    `Equipment: ${profile.equipment ?? 'not set'}`,
    `Diet preference: ${profile.diet_pref ?? 'not set'}`,
    `Weight: ${profile.weight_kg ?? '?'} kg, Height: ${profile.height_cm ?? '?'} cm, Gender: ${profile.gender ?? 'not set'}`,
    `Sleep quality: ${profile.sleep_quality ?? 'not set'}`,
    `Stress level: ${profile.stress_level ?? 'not set'}`,
  ]
  return {
    chunk_type: 'profile',
    source_key: 'profile:current',
    content: lines.join('. '),
    metadata: { updated: new Date().toISOString() },
  }
}

export function chunkNutritionSummary(nutrition: Record<string, any>): ChunkInput {
  const lines = [
    `30-day nutrition: avg ${Math.round(nutrition.avg_calories ?? 0)} kcal/day`,
    `avg protein ${Math.round(nutrition.avg_protein_g ?? 0)}g`,
    `avg carbs ${Math.round(nutrition.avg_carbs_g ?? 0)}g`,
    `avg fat ${Math.round(nutrition.avg_fat_g ?? 0)}g`,
    `${nutrition.logged_days ?? 0} days logged`,
    `Targets: ${nutrition.daily_calorie_target ?? 2000} kcal, ${nutrition.protein_target ?? 150}g protein, ${nutrition.carbs_target ?? 250}g carbs, ${nutrition.fat_target ?? 65}g fat`,
  ]
  return {
    chunk_type: 'nutrition_summary',
    source_key: 'nutrition_summary:30d',
    content: lines.join('. '),
    metadata: { updated: new Date().toISOString() },
  }
}

export function chunkActivitySummary(activity: Record<string, any>): ChunkInput {
  return {
    chunk_type: 'activity_summary',
    source_key: 'activity_summary:30d',
    content: [
      `30-day activity: avg ${Math.round(activity.avg_steps ?? 0)} steps/day`,
      `avg sleep ${Number(activity.avg_sleep_hours ?? 0).toFixed(1)}h/night`,
      `avg water ${Math.round(activity.avg_water_ml ?? 0)} ml/day`,
      `${activity.active_days ?? 0}/30 active days`,
      `best step day: ${activity.max_steps ?? 0} steps`,
    ].join('. '),
    metadata: { updated: new Date().toISOString() },
  }
}

export function chunkWorkoutSession(workout: Record<string, any>): ChunkInput {
  const date = new Date(workout.started_at)
  const dateStr = date.toISOString().split('T')[0]
  const durationMins = workout.started_at && workout.ended_at
    ? Math.round((new Date(workout.ended_at).getTime() - date.getTime()) / 60000)
    : null

  return {
    chunk_type: 'workout_session',
    source_key: `workout_session:${workout.id ?? dateStr}`,
    content: [
      `Workout on ${dateStr}`,
      durationMins != null ? `${durationMins} minutes` : null,
      workout.calories_burned ? `${workout.calories_burned} kcal burned` : null,
      workout.exercise_count ? `${workout.exercise_count} exercises` : null,
      workout.notes ? workout.notes : null,
    ].filter(Boolean).join(', '),
    metadata: { date: dateStr, duration_mins: durationMins },
  }
}

export function chunkMealLog(meal: Record<string, any>): ChunkInput {
  return {
    chunk_type: 'meal_log',
    source_key: `meal_log:${meal.date}:${meal.meal_type}`,
    content: `${meal.date} ${meal.meal_type}: ${meal.foods}`,
    metadata: { date: meal.date, meal_type: meal.meal_type },
  }
}

export function chunkMemoryFact(memory: { id: string; category: string; fact: string }): ChunkInput {
  return {
    chunk_type: 'memory_fact',
    source_key: `memory_fact:${memory.id}`,
    content: `[${memory.category}] ${memory.fact}`,
    metadata: { category: memory.category },
  }
}

export function chunkBodyMetric(metric: Record<string, any>): ChunkInput {
  const dateStr = new Date(metric.logged_at ?? metric.recorded_at).toISOString().split('T')[0]
  return {
    chunk_type: 'body_metric',
    source_key: `body_metric:${dateStr}`,
    content: [
      `Body measurement on ${dateStr}`,
      metric.weight_kg ? `weight ${metric.weight_kg} kg` : null,
      metric.body_fat_pct ? `body fat ${metric.body_fat_pct}%` : null,
    ].filter(Boolean).join(', '),
    metadata: { date: dateStr },
  }
}
