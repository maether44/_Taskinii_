/**
 * supabase/functions/ai-assistant/memory.ts
 *
 * Pure helpers for Yara's cross-session memory.
 *
 * Kept in a separate module so unit tests can import them without booting
 * the HTTP server in index.ts (which calls `Deno.serve` at module load).
 */

export type MemoryRow = {
  id: string
  category: string
  fact: string
  created_at?: string
  last_used_at?: string
}

export const ALLOWED_MEMORY_CATEGORIES = new Set([
  'injury',
  'medical',
  'diet',
  'equipment',
  'schedule',
  'preference',
  'dislike',
  'goal',
  'other',
])

/**
 * Extracts the trailing `MEMORIES:[...]` JSON line that the model is instructed
 * to append when the user reveals a long-lived fact. Returns the cleaned reply
 * (with the line stripped) plus the parsed facts.
 */
export function extractMemoriesFromResponse(
  raw: string,
): { cleaned: string; facts: Array<{ category: string; fact: string }> } {
  if (!raw) return { cleaned: raw, facts: [] }

  // Match `MEMORIES:[...]` on its own line near the end of the response.
  // Non-greedy to avoid swallowing trailing prose, multiline-aware.
  const re = /(?:^|\n)\s*MEMORIES\s*:\s*(\[[\s\S]*?\])\s*$/i
  const match = raw.match(re)
  if (!match) return { cleaned: raw.trim(), facts: [] }

  let parsed: any = null
  try {
    parsed = JSON.parse(match[1])
  } catch {
    return { cleaned: raw.replace(re, '').trim(), facts: [] }
  }

  const facts: Array<{ category: string; fact: string }> = []
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const category = String(item?.category ?? '').toLowerCase().trim()
      const fact = String(item?.fact ?? '').trim()
      if (ALLOWED_MEMORY_CATEGORIES.has(category) && fact && fact.length <= 240) {
        facts.push({ category, fact })
      }
    }
  }

  return { cleaned: raw.replace(re, '').trim(), facts }
}

export function buildMemorySection(memories: MemoryRow[]): string {
  if (!memories || memories.length === 0) {
    return `LONG-TERM MEMORY ABOUT THIS USER: (no facts saved yet)`
  }
  // Group by category for readability — the model handles bullet lists better than flat blobs.
  const grouped: Record<string, string[]> = {}
  for (const m of memories) {
    const cat = m.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(m.fact)
  }
  const lines: string[] = []
  for (const [cat, facts] of Object.entries(grouped)) {
    lines.push(`- ${cat}: ${facts.join('; ')}`)
  }
  return `LONG-TERM MEMORY ABOUT THIS USER (use silently — do not list them back unless asked):
${lines.join('\n')}`
}

// ─── Constraint derivation ──────────────────────────────────────────────────
// Turns memory facts (e.g. "left knee injury") into concrete deny-lists the
// model cannot misinterpret. Plain-English rules like "respect injuries" are
// too soft for llama-3.3-70b; it needs explicit "AVOID: lunges, squats, …".

const JOINT_DENY_RULES: Array<{ match: RegExp; joint: string; forbidden: string[] }> = [
  {
    match: /\bknee(s)?\b/,
    joint: 'knee',
    forbidden: [
      'barbell back squats', 'front squats', 'hack squats', 'pistol squats',
      'deep lunges', 'walking lunges', 'reverse lunges', 'step-ups',
      'box jumps', 'jump squats', 'wall sits', 'Bulgarian split squats',
      'depth jumps', 'running sprints',
    ],
  },
  {
    match: /\bshoulder(s)?\b/,
    joint: 'shoulder',
    forbidden: [
      'overhead press', 'military press', 'push press', 'handstand push-ups',
      'upright rows', 'behind-the-neck press', 'kipping pull-ups',
      'snatches', 'jerks',
    ],
  },
  {
    match: /\b(lower back|lumbar|back pain|herniated disc|sciatica)\b/,
    joint: 'lower back',
    forbidden: [
      'conventional deadlifts', 'bent-over rows', 'good mornings',
      'barbell back squats', 'Jefferson curls', 'weighted sit-ups',
      'Russian twists with load',
    ],
  },
  {
    match: /\bwrist(s)?\b/,
    joint: 'wrist',
    forbidden: [
      'front squats', 'push-ups on flat palms', 'barbell cleans',
      'planche holds', 'full-plank burpees', 'handstands',
    ],
  },
  {
    match: /\b(ankle(s)?|achilles)\b/,
    joint: 'ankle',
    forbidden: [
      'box jumps', 'jump rope', 'jump squats', 'depth jumps',
      'sprinting', 'plyometric lunges',
    ],
  },
  {
    match: /\bhip(s)?\b/,
    joint: 'hip',
    forbidden: [
      'deep barbell squats', 'heavy hip thrusts', 'high kicks',
      'weighted lateral lunges', 'pigeon pose holds',
    ],
  },
  {
    match: /\belbow(s)?\b/,
    joint: 'elbow',
    forbidden: [
      'skull crushers', 'close-grip bench press', 'heavy curls',
      'triceps dips',
    ],
  },
]

const DIET_DENY_RULES: Array<{ match: RegExp; label: string; forbidden: string[] }> = [
  {
    match: /\bvegan\b/,
    label: 'vegan diet',
    forbidden: ['meat', 'fish', 'poultry', 'eggs', 'dairy', 'honey', 'whey protein', 'gelatin'],
  },
  {
    match: /\bvegetarian\b/,
    label: 'vegetarian diet',
    forbidden: ['meat', 'fish', 'poultry', 'gelatin'],
  },
  {
    match: /\b(lactose|dairy[- ]?free)\b/,
    label: 'lactose-free diet',
    forbidden: ['milk', 'cheese', 'yogurt', 'whey protein', 'cream', 'butter', 'ice cream'],
  },
  {
    match: /\b(gluten[- ]?free|celiac|coeliac)\b/,
    label: 'gluten-free diet',
    forbidden: ['wheat', 'bread', 'pasta', 'barley', 'rye', 'couscous', 'seitan'],
  },
  {
    match: /\b(nut allergy|allergic to nuts|peanut allergy)\b/,
    label: 'nut allergy',
    forbidden: ['peanuts', 'almonds', 'cashews', 'walnuts', 'pistachios', 'nut butters', 'trail mix'],
  },
  {
    match: /\bhalal\b/,
    label: 'halal diet',
    forbidden: ['pork', 'alcohol', 'non-halal meat'],
  },
  {
    match: /\bkosher\b/,
    label: 'kosher diet',
    forbidden: ['pork', 'shellfish', 'mixing meat and dairy'],
  },
]

export type DerivedConstraint = {
  reason: string
  forbidden: string[]
  source: 'injury' | 'medical' | 'diet' | 'dislike' | 'equipment' | 'other'
}

/**
 * Scans the user's memory rows and produces an explicit deny-list the prompt
 * can inject as HARD CONSTRAINTS. Known patterns (joints, common diets) expand
 * into concrete forbidden items; unmatched facts still surface as a plain
 * constraint line so the model can reason about them.
 */
export function deriveConstraintsFromMemory(memories: MemoryRow[]): DerivedConstraint[] {
  if (!memories || memories.length === 0) return []
  const out: DerivedConstraint[] = []

  for (const m of memories) {
    const cat = (m.category || '').toLowerCase()
    const factLower = (m.fact || '').toLowerCase()
    if (!factLower) continue

    if (cat === 'injury' || cat === 'medical') {
      let matched = false
      for (const rule of JOINT_DENY_RULES) {
        if (rule.match.test(factLower)) {
          out.push({ reason: m.fact, forbidden: rule.forbidden, source: cat })
          matched = true
        }
      }
      if (!matched) {
        out.push({ reason: m.fact, forbidden: [], source: cat })
      }
      continue
    }

    if (cat === 'diet' || cat === 'dislike') {
      let matched = false
      for (const rule of DIET_DENY_RULES) {
        if (rule.match.test(factLower)) {
          out.push({ reason: m.fact, forbidden: rule.forbidden, source: cat })
          matched = true
        }
      }
      if (!matched) {
        out.push({ reason: m.fact, forbidden: [], source: cat })
      }
      continue
    }

    if (cat === 'equipment') {
      out.push({ reason: m.fact, forbidden: [], source: 'equipment' })
    }
  }

  return out
}

export function buildConstraintsSection(constraints: DerivedConstraint[]): string {
  if (!constraints || constraints.length === 0) return ''
  const lines: string[] = [
    'HARD CONSTRAINTS — these override every other rule. Before each exercise or food suggestion, check this list. If a recommendation would include a forbidden item, substitute with a safe alternative and briefly explain the swap.',
  ]
  for (const c of constraints) {
    if (c.forbidden.length > 0) {
      lines.push(`- Reason: ${c.reason}`)
      lines.push(`  AVOID: ${c.forbidden.join(', ')}`)
    } else {
      lines.push(`- Constraint: ${c.reason}`)
    }
  }
  return lines.join('\n')
}

// ─── Proactive events (Phase 3 #3) ──────────────────────────────────────────
// Formats the events that DB triggers have queued in the yara_events table.
// The ai-assistant edge function fetches pending events per request, injects
// them into the prompt so Yara can surface them naturally, then marks them
// consumed so they don't repeat in the next conversation.

export type YaraEventSeverity = 'info' | 'celebrate' | 'warning'

export type YaraEvent = {
  id: string
  event_type: string
  payload: Record<string, unknown>
  severity: YaraEventSeverity
  created_at: string
}

function describeEvent(e: YaraEvent): string {
  const p = e.payload ?? {}
  switch (e.event_type) {
    case 'workout_streak_milestone':
      return `🔥 ${p.streak_days}-day workout streak hit (through ${p.through_date}).`
    case 'first_workout_of_week':
      return `First workout of week ${p.week} logged.`
    case 'water_target_hit':
      return `Hit ${p.water_ml ?? 2000} ml water target on ${p.date}.`
    case 'sleep_low_streak_2day':
      return `Two nights in a row under 6h (last: ${p.last_night_hours}h, prior: ${p.prior_night_hours}h).`
    case 'weight_logged': {
      const delta = Number(p.delta_kg ?? 0)
      const dir = delta === 0 ? 'first entry'
        : delta > 0 ? `+${delta.toFixed(1)} kg vs last`
        : `${delta.toFixed(1)} kg vs last`
      return `New weight logged: ${p.weight_kg} kg (${dir}).`
    }
    default:
      return `${e.event_type}: ${JSON.stringify(p)}`
  }
}

/**
 * Renders pending proactive events as a prompt block. Empty list → empty
 * string (caller omits the section entirely). Instructions tell the model to
 * weave ONE into the reply so we don't get a robotic "here are 4 notifications"
 * response.
 */
export function buildEventsSection(events: YaraEvent[]): string {
  if (!events || events.length === 0) return ''
  const lines: string[] = [
    'PROACTIVE SIGNALS (new things that happened since the last conversation — weave the most relevant ONE into your reply naturally; celebrate the wins, gently flag the warnings, never list them mechanically):',
  ]
  for (const e of events) {
    lines.push(`- [${e.severity}] ${describeEvent(e)}`)
  }
  return lines.join('\n')
}

// ─── Action tool calls (Phase 3 #5) ─────────────────────────────────────────
// Formalizes the ad-hoc COMMAND:{...} tool-call protocol the voice path used,
// so it's testable, whitelisted, and usable from text mode too. The edge
// function parses actions out of the raw LLM reply, executes them against the
// supabase client, and strips the markers before returning the visible text.

export const ALLOWED_ACTION_TYPES = new Set([
  'log_water',
  'log_sleep',
  'log_weight',
  'log_food',
  'log_workout',
  'forget_fact',
])

export type ParsedAction = {
  action: string
  params: Record<string, unknown>
}

/**
 * Extracts COMMAND:{...} lines from the model's reply. Returns the stripped
 * reply plus a list of validated actions. Unknown action types and malformed
 * JSON are dropped (but still stripped from the visible reply so the user
 * never sees raw tool-call syntax).
 */
export function extractActionsFromResponse(
  raw: string,
): { cleaned: string; actions: ParsedAction[] } {
  if (!raw) return { cleaned: raw, actions: [] }

  const re = /COMMAND:(\{[^\n]+\})/g
  const actions: ParsedAction[] = []
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      const action = String((parsed as any)?.action ?? '').toLowerCase().trim()
      if (!ALLOWED_ACTION_TYPES.has(action)) continue
      actions.push({ action, params: parsed as Record<string, unknown> })
    } catch {
      // Malformed JSON — skip but still strip the marker below.
    }
  }

  const cleaned = raw.replace(re, '').trim()
  return { cleaned, actions }
}
