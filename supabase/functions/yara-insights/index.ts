/**
 * supabase/functions/yara-insights/index.ts
 *
 * Generates 4 personalised AI fitness insight cards for the Insights screen.
 * Called by yaraInsightsService.js via supabase.functions.invoke('yara-insights').
 *
 * Body:  { period: string, stats: { workout_count, avg_calories, avg_steps, avg_sleep, weight_delta } }
 * Returns: Array<{ tag, title, text }>  (4 elements)
 *
 * SECURITY
 *   GROQ_API_KEY lives in Supabase secrets, never in the mobile app bundle.
 */
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { period, stats } = await req.json()

    if (!stats)   throw new Error('stats are required')
    if (!period)  throw new Error('period is required')

    const {
      workout_count = 0,
      avg_calories  = 0,
      avg_steps     = 0,
      avg_sleep     = 0,
      weight_delta  = 0,
    } = stats

    const userPrompt = `Analyze this user's ${period} fitness data and return exactly 4 personalised insights as a JSON array.

Stats:
- Workouts completed: ${workout_count}
- Average daily calories: ${Math.round(avg_calories)} kcal
- Average daily steps: ${Math.round(avg_steps)}
- Average sleep: ${avg_sleep} hours/night
- Weight change: ${weight_delta > 0 ? '+' : ''}${weight_delta} kg

Each object must use EXACTLY ONE tag chosen from this list: Performance, Correlation, Optimization, Prediction, Recovery, Nutrition.
Do NOT combine tags. Do NOT use separators like |. Pick the single best-fitting tag per insight.

Return ONLY a raw JSON array — no markdown fences, no explanation — with exactly 4 objects:
[{ "tag": "Performance", "title": "Short title (5-8 words)", "text": "One or two sentences of personalised advice based on the stats above." }]`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:      'llama-3.1-8b-instant',
        max_tokens: 700,
        messages: [
          {
            role:    'system',
            content: 'You are Yara, a fitness analytics AI inside the BodyQ app. Always respond with only the JSON array requested — nothing else.',
          },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    const groqData = await groqRes.json()
    if (!groqRes.ok) throw new Error(`Groq error: ${JSON.stringify(groqData?.error)}`)

    const content    = groqData.choices?.[0]?.message?.content ?? '[]'
    const jsonMatch  = content.match(/\[[\s\S]*\]/)
    const insights   = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    return new Response(
      JSON.stringify(insights),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
