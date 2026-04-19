/**
 * Unit tests for the memory parser + section builder.
 *
 * Run with:
 *   npx deno test supabase/functions/ai-assistant/index_test.ts
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts'
import { assert } from 'https://deno.land/std@0.224.0/assert/assert.ts'

import {
  buildConstraintsSection,
  buildEventsSection,
  buildMemorySection,
  deriveConstraintsFromMemory,
  extractActionsFromResponse,
  extractMemoriesFromResponse,
  type YaraEvent,
} from './memory.ts'

// ─── extractMemoriesFromResponse ────────────────────────────────────────────

Deno.test('extract: no MEMORIES line → returns reply untouched', () => {
  const raw = 'Hey Israa, you crushed your protein target today. Keep it up!'
  const out = extractMemoriesFromResponse(raw)
  assertEquals(out.facts.length, 0)
  assertEquals(out.cleaned, raw)
})

Deno.test('extract: trailing MEMORIES with single fact → strips line and returns fact', () => {
  const raw = `Hey, sounds like that knee is giving you trouble — let's avoid loaded squats and lunges for now.
MEMORIES:[{"category":"injury","fact":"Has a left knee injury — avoid heavy loaded squats and deep lunges"}]`
  const out = extractMemoriesFromResponse(raw)
  assertEquals(out.facts.length, 1)
  assertEquals(out.facts[0].category, 'injury')
  assert(out.facts[0].fact.startsWith('Has a left knee injury'))
  // The visible reply must NOT contain the MEMORIES line
  assert(!out.cleaned.includes('MEMORIES'))
  assert(out.cleaned.endsWith('deep lunges.') || out.cleaned.endsWith('lunges for now.'))
})

Deno.test('extract: multiple facts in one array', () => {
  const raw = `Got it — I'll keep things vegetarian and home-friendly going forward.
MEMORIES:[{"category":"diet","fact":"Vegetarian"},{"category":"equipment","fact":"Trains at home with dumbbells and a resistance band"}]`
  const out = extractMemoriesFromResponse(raw)
  assertEquals(out.facts.length, 2)
  assertEquals(out.facts[0].category, 'diet')
  assertEquals(out.facts[1].category, 'equipment')
  assert(!out.cleaned.includes('MEMORIES'))
})

Deno.test('extract: invalid category is rejected', () => {
  const raw = `Sure thing.
MEMORIES:[{"category":"random_made_up_thing","fact":"Likes purple gym shorts"}]`
  const out = extractMemoriesFromResponse(raw)
  assertEquals(out.facts.length, 0)
  // The line is still stripped from the visible reply even though no fact was kept
  assert(!out.cleaned.includes('MEMORIES'))
})

Deno.test('extract: malformed JSON → strips line, no facts, no crash', () => {
  const raw = `OK!
MEMORIES:[{category:injury, fact:not real json}]`
  const out = extractMemoriesFromResponse(raw)
  assertEquals(out.facts.length, 0)
  assert(!out.cleaned.includes('MEMORIES'))
})

Deno.test('extract: oversized fact (> 240 chars) is dropped', () => {
  const longFact = 'x'.repeat(300)
  const raw = `Sure.\nMEMORIES:[{"category":"preference","fact":"${longFact}"}]`
  const out = extractMemoriesFromResponse(raw)
  assertEquals(out.facts.length, 0)
})

Deno.test('extract: case-insensitive MEMORIES marker', () => {
  const raw = `Noted.
memories:[{"category":"goal","fact":"Wants to bench 100kg by August"}]`
  const out = extractMemoriesFromResponse(raw)
  assertEquals(out.facts.length, 1)
  assertEquals(out.facts[0].category, 'goal')
})

Deno.test('extract: extra whitespace and trailing newline tolerated', () => {
  const raw = `Got it.

   MEMORIES:   [{"category":"dislike","fact":"Hates running"}]
`
  const out = extractMemoriesFromResponse(raw)
  assertEquals(out.facts.length, 1)
  assertEquals(out.facts[0].fact, 'Hates running')
  assert(!out.cleaned.includes('MEMORIES'))
})

Deno.test('extract: empty input returns empty result', () => {
  const out = extractMemoriesFromResponse('')
  assertEquals(out.facts.length, 0)
  assertEquals(out.cleaned, '')
})

// ─── buildMemorySection ─────────────────────────────────────────────────────

Deno.test('section: empty memory list → "no facts saved yet" placeholder', () => {
  const section = buildMemorySection([])
  assert(section.includes('no facts saved yet'))
})

Deno.test('section: groups memories by category', () => {
  const section = buildMemorySection([
    { id: '1', category: 'injury', fact: 'left knee — avoid heavy squats' },
    { id: '2', category: 'diet', fact: 'vegetarian' },
    { id: '3', category: 'injury', fact: 'right shoulder — limit overhead press' },
    { id: '4', category: 'equipment', fact: 'home gym with dumbbells' },
  ])
  // injury should appear once with both facts joined
  const injuryLine = section.split('\n').find((l) => l.startsWith('- injury:'))
  assert(injuryLine, 'expected an injury line')
  assert(injuryLine!.includes('left knee'))
  assert(injuryLine!.includes('right shoulder'))
  // other categories present
  assert(section.includes('- diet: vegetarian'))
  assert(section.includes('- equipment: home gym'))
  // contains the "use silently" instruction
  assert(section.includes('use silently'))
})

// ─── deriveConstraintsFromMemory ────────────────────────────────────────────

Deno.test('constraints: empty memory list → empty array', () => {
  assertEquals(deriveConstraintsFromMemory([]).length, 0)
})

Deno.test('constraints: knee injury expands into lunge/squat deny-list', () => {
  const out = deriveConstraintsFromMemory([
    { id: '1', category: 'injury', fact: 'Has a left knee injury — avoid heavy loaded squats' },
  ])
  assertEquals(out.length, 1)
  assertEquals(out[0].source, 'injury')
  assert(out[0].forbidden.length > 0, 'expected a non-empty deny list')
  // The exact failure we saw in production: lunges were prescribed despite the knee note.
  const joined = out[0].forbidden.join(',').toLowerCase()
  assert(joined.includes('lunges'), 'deny list must include lunges')
  assert(joined.includes('squats'), 'deny list must include squats')
})

Deno.test('constraints: vegan diet expands into dairy/meat deny-list', () => {
  const out = deriveConstraintsFromMemory([
    { id: '1', category: 'diet', fact: 'Follows a strict vegan diet' },
  ])
  assertEquals(out.length, 1)
  assertEquals(out[0].source, 'diet')
  const joined = out[0].forbidden.join(',').toLowerCase()
  assert(joined.includes('dairy'))
  assert(joined.includes('meat'))
  assert(joined.includes('whey protein'))
})

Deno.test('constraints: unmatched injury fact still surfaces as a plain constraint', () => {
  const out = deriveConstraintsFromMemory([
    { id: '1', category: 'injury', fact: 'Recovering from a rotator cuff labrum tear' },
  ])
  assertEquals(out.length, 1)
  // "rotator cuff" is not in our joint regex list, so forbidden stays empty
  // but the reason is preserved so the model still sees the constraint.
  assertEquals(out[0].forbidden.length, 0)
  assert(out[0].reason.includes('rotator cuff'))
})

Deno.test('constraints: multiple categories produce independent entries', () => {
  const out = deriveConstraintsFromMemory([
    { id: '1', category: 'injury', fact: 'lower back — herniated disc' },
    { id: '2', category: 'diet', fact: 'lactose-free' },
    { id: '3', category: 'equipment', fact: 'home setup: dumbbells and a bench only' },
  ])
  assertEquals(out.length, 3)
  const sources = out.map((c) => c.source).sort()
  assertEquals(sources, ['diet', 'equipment', 'injury'])
  // Lower back rule fires and yields deadlift avoidance
  const injury = out.find((c) => c.source === 'injury')!
  assert(injury.forbidden.join(',').toLowerCase().includes('deadlifts'))
  // Lactose rule fires and yields whey avoidance
  const diet = out.find((c) => c.source === 'diet')!
  assert(diet.forbidden.join(',').toLowerCase().includes('whey'))
  // Equipment fact passes through unexpanded
  const equip = out.find((c) => c.source === 'equipment')!
  assertEquals(equip.forbidden.length, 0)
})

// ─── buildConstraintsSection ────────────────────────────────────────────────

Deno.test('constraints section: empty → empty string', () => {
  assertEquals(buildConstraintsSection([]), '')
})

Deno.test('constraints section: renders HARD CONSTRAINTS header + AVOID lines', () => {
  const section = buildConstraintsSection(
    deriveConstraintsFromMemory([
      { id: '1', category: 'injury', fact: 'left knee injury' },
    ]),
  )
  assert(section.startsWith('HARD CONSTRAINTS'))
  assert(section.includes('override every other rule'))
  assert(section.includes('Reason: left knee injury'))
  assert(section.toLowerCase().includes('avoid:'))
  assert(section.toLowerCase().includes('lunges'))
})

Deno.test('constraints section: unexpanded fact shows as a plain constraint line', () => {
  const section = buildConstraintsSection(
    deriveConstraintsFromMemory([
      { id: '1', category: 'injury', fact: 'tendonitis in the left pinky' },
    ]),
  )
  assert(section.includes('Constraint: tendonitis in the left pinky'))
  assert(!section.toLowerCase().includes('avoid:'))
})

// ─── extractActionsFromResponse (Phase 3 #5) ────────────────────────────────

Deno.test('actions: empty input → empty result, no crash', () => {
  const out = extractActionsFromResponse('')
  assertEquals(out.actions.length, 0)
  assertEquals(out.cleaned, '')
})

Deno.test('actions: no COMMAND markers → reply untouched, no actions', () => {
  const raw = 'Nice work on the workout today!'
  const out = extractActionsFromResponse(raw)
  assertEquals(out.actions.length, 0)
  assertEquals(out.cleaned, raw)
})

Deno.test('actions: single valid log_water action is parsed and stripped', () => {
  const raw = `Logged 500 ml for you.
COMMAND:{"action":"log_water","ml":500}`
  const out = extractActionsFromResponse(raw)
  assertEquals(out.actions.length, 1)
  assertEquals(out.actions[0].action, 'log_water')
  assertEquals(out.actions[0].params.ml, 500)
  assert(!out.cleaned.includes('COMMAND'))
  assert(out.cleaned.startsWith('Logged 500'))
})

Deno.test('actions: multiple COMMAND lines parsed independently', () => {
  const raw = `Done.
COMMAND:{"action":"log_water","ml":250}
COMMAND:{"action":"log_sleep","hours":7.5}`
  const out = extractActionsFromResponse(raw)
  assertEquals(out.actions.length, 2)
  assertEquals(out.actions[0].action, 'log_water')
  assertEquals(out.actions[1].action, 'log_sleep')
  assert(!out.cleaned.includes('COMMAND'))
})

Deno.test('actions: unknown action type is dropped but marker still stripped', () => {
  const raw = `Sure.
COMMAND:{"action":"launch_rocket","payload":"moon"}`
  const out = extractActionsFromResponse(raw)
  assertEquals(out.actions.length, 0)
  assert(!out.cleaned.includes('COMMAND'))
})

Deno.test('actions: malformed JSON is dropped, no crash', () => {
  const raw = `OK.
COMMAND:{action: log_water, ml: 500}`
  const out = extractActionsFromResponse(raw)
  assertEquals(out.actions.length, 0)
  // The marker is still removed from visible text
  assert(!out.cleaned.includes('COMMAND:{action'))
})

Deno.test('actions: mixed valid + invalid — only valid kept, all stripped', () => {
  const raw = `Logged it.
COMMAND:{"action":"log_weight","kg":72.3}
COMMAND:{"action":"definitely_fake","foo":"bar"}`
  const out = extractActionsFromResponse(raw)
  assertEquals(out.actions.length, 1)
  assertEquals(out.actions[0].action, 'log_weight')
  assertEquals(out.actions[0].params.kg, 72.3)
  assert(!out.cleaned.includes('COMMAND'))
})

Deno.test('actions: action field is lowercased before whitelist check', () => {
  const raw = `Done.
COMMAND:{"action":"LOG_WATER","ml":300}`
  const out = extractActionsFromResponse(raw)
  assertEquals(out.actions.length, 1)
  assertEquals(out.actions[0].action, 'log_water')
})

Deno.test('actions: forget_fact is whitelisted', () => {
  const raw = `Got it, forgetting that.
COMMAND:{"action":"forget_fact","match":"vegetarian"}`
  const out = extractActionsFromResponse(raw)
  assertEquals(out.actions.length, 1)
  assertEquals(out.actions[0].action, 'forget_fact')
  assertEquals(out.actions[0].params.match, 'vegetarian')
})

// ─── buildEventsSection (Phase 3 #3) ────────────────────────────────────────

Deno.test('events: empty list → empty string (caller omits section)', () => {
  assertEquals(buildEventsSection([]), '')
})

Deno.test('events: single celebrate event renders with PROACTIVE SIGNALS header', () => {
  const events: YaraEvent[] = [
    {
      id: 'e1',
      event_type: 'workout_streak_milestone',
      payload: { streak_days: 7, through_date: '2026-04-11' },
      severity: 'celebrate',
      created_at: '2026-04-11T10:00:00Z',
    },
  ]
  const section = buildEventsSection(events)
  assert(section.startsWith('PROACTIVE SIGNALS'))
  assert(section.includes('weave the most relevant ONE'))
  assert(section.includes('[celebrate]'))
  assert(section.includes('7-day workout streak'))
  assert(section.includes('2026-04-11'))
})

Deno.test('events: water_target_hit describes the ml + date', () => {
  const section = buildEventsSection([
    {
      id: 'e2',
      event_type: 'water_target_hit',
      payload: { water_ml: 2100, date: '2026-04-11' },
      severity: 'celebrate',
      created_at: '2026-04-11T18:00:00Z',
    },
  ])
  assert(section.includes('2100'))
  assert(section.includes('2026-04-11'))
})

Deno.test('events: sleep_low_streak_2day is marked as warning', () => {
  const section = buildEventsSection([
    {
      id: 'e3',
      event_type: 'sleep_low_streak_2day',
      payload: {
        nights: 2,
        last_night_hours: 5.2,
        prior_night_hours: 5.5,
        date: '2026-04-11',
      },
      severity: 'warning',
      created_at: '2026-04-11T08:00:00Z',
    },
  ])
  assert(section.includes('[warning]'))
  assert(section.includes('5.2'))
  assert(section.includes('5.5'))
})

Deno.test('events: weight_logged shows delta direction', () => {
  const lossSection = buildEventsSection([
    {
      id: 'e4',
      event_type: 'weight_logged',
      payload: { weight_kg: 71.2, delta_kg: -0.8, has_previous: true },
      severity: 'celebrate',
      created_at: '2026-04-11T07:00:00Z',
    },
  ])
  assert(lossSection.includes('71.2'))
  assert(lossSection.includes('-0.8'))

  const firstEntrySection = buildEventsSection([
    {
      id: 'e5',
      event_type: 'weight_logged',
      payload: { weight_kg: 70.0, delta_kg: 0, has_previous: false },
      severity: 'info',
      created_at: '2026-04-11T07:00:00Z',
    },
  ])
  assert(firstEntrySection.includes('first entry'))
})

Deno.test('events: multiple events render as separate lines', () => {
  const section = buildEventsSection([
    {
      id: 'e6',
      event_type: 'first_workout_of_week',
      payload: { week: '2026-W15', session_id: 'abc' },
      severity: 'celebrate',
      created_at: '2026-04-11T10:00:00Z',
    },
    {
      id: 'e7',
      event_type: 'water_target_hit',
      payload: { water_ml: 2000, date: '2026-04-11' },
      severity: 'celebrate',
      created_at: '2026-04-11T18:00:00Z',
    },
  ])
  const lines = section.split('\n').filter((l) => l.startsWith('- ['))
  assertEquals(lines.length, 2)
  assert(section.includes('2026-W15'))
  assert(section.includes('2000'))
})

Deno.test('events: unknown event_type falls back to generic description', () => {
  const section = buildEventsSection([
    {
      id: 'e8',
      event_type: 'mystery_future_event',
      payload: { foo: 'bar' },
      severity: 'info',
      created_at: '2026-04-11T10:00:00Z',
    },
  ])
  assert(section.includes('mystery_future_event'))
  assert(section.includes('foo'))
})
