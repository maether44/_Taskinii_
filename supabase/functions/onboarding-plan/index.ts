/**
 * supabase/functions/onboarding-plan/index.ts
 *
 * Generates a personalised training plan at the end of user onboarding.
 * Called by OnboardingGoal.js via supabase.functions.invoke('onboarding-plan').
 *
 * Body:    { answers: { goal, gender, age, height, weight, targetW, activity,
 *                       experience, injuries, days, duration, timeOfDay,
 *                       equipment, focus, sleep, stress, diet,
 *                       calTarget, protein } }
 * Returns: the parsed plan JSON object directly.
 *
 * SECURITY
 *   GROQ_API_KEY lives in Supabase secrets — never touches the app binary.
 *   This function can be called with the anon key (pre-auth onboarding flow).
 */
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { answers } = await req.json()
    if (!answers) throw new Error('answers are required')

    const {
      goal, gender, age, dob, height, weight, targetW, activity,
      experience, injuries, days, duration, timeOfDay,
      equipment, focus, sleep, stress, diet,
      calTarget, protein,
    } = answers

    let userAge = age
    if (!userAge && dob) {
      const parts = dob.includes('/') ? dob.split('/') : dob.split('-')
      if (parts.length === 3) {
        const y = parseInt(dob.includes('/') ? parts[2] : parts[0], 10)
        if (!isNaN(y) && y > 1900) userAge = new Date().getFullYear() - y
      }
    }
    if (!userAge) userAge = 25

    const injList   = injuries?.filter((x: string) => x !== 'none').join(', ') || 'none'
    const focusList = focus?.join(', ') || 'balanced'

    const goalLabel = {
      lose_fat: 'lose body fat', fat_loss: 'lose body fat',
      gain_muscle: 'build muscle', muscle: 'build muscle',
      maintain: 'stay healthy', gain_weight: 'gain weight',
      build_habits: 'build healthy habits', athletic: 'athletic performance',
    }[goal] || goal

    const prompt = `You are an expert fitness coach. Create a highly personalised ${days}-day training plan for this user.

USER PROFILE:
- Goal: ${goal} (${goalLabel})
- Gender: ${gender}, Age: ${userAge}, Height: ${height}cm, Weight: ${weight}kg${targetW ? `, Target: ${targetW}kg` : ''}
- Experience: ${experience}
- Equipment: ${equipment}
- Training: ${days} days/week, ${duration} min per session, ${timeOfDay} time preferred
- Focus areas: ${focusList}
- Injuries/limitations: ${injList}
- Sleep: ${sleep}, Stress: ${stress}, Diet: ${diet}
- Daily calorie target: ${calTarget} kcal, Protein: ${protein}g/day
- Activity level: ${activity}

Generate a ${days}-day weekly training split. For each day provide:
1. Session name (e.g. "Push Day", "Full Body A", "Legs & Glutes")
2. Exactly 5 exercises suited to their equipment, injuries, and focus areas
3. Sets × reps and rest time for each exercise — appropriate for their experience level and goal
4. One personalised coaching tip for that day

Also provide:
- A 2-sentence nutrition note based on their goal and diet preference
- One recovery tip based on their sleep and stress level
- One motivational note personalised to their specific situation

Be specific, practical, and genuinely tailored. Do NOT give generic advice. Reference their actual stats.

CRITICAL: Respond with ONLY a JSON object. No markdown. No code fences. No explanation. Start your response with { and end with }.
Use this exact structure:
{"intro":"string","days":[{"name":"string","focus":"string","exercises":[{"name":"string","sets":3,"reps":"string","rest":"string"}],"coachTip":"string"}],"nutritionNote":"string","recoveryNote":"string","motivationNote":"string"}`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        max_tokens:  4096,
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await groqRes.json()
    if (!groqRes.ok) throw new Error(JSON.stringify(data?.error))

    const text = data.choices?.[0]?.message?.content ?? ''

    // Extract the outermost JSON object from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    let clean = jsonMatch[0]

    // Try clean parse first
    try {
      return new Response(
        JSON.stringify(JSON.parse(clean)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (_) { /* fall through to repair */ }

    // Repair common LLM JSON issues: trailing commas, control chars, unclosed brackets
    clean = clean
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/[\x00-\x1F\x7F]/g, ' ')

    const opens  = (clean.match(/\{/g) || []).length
    const closes = (clean.match(/\}/g) || []).length
    for (let i = 0; i < opens - closes; i++) clean += '}'

    const aOpens  = (clean.match(/\[/g) || []).length
    const aCloses = (clean.match(/\]/g) || []).length
    for (let i = 0; i < aOpens - aCloses; i++) clean += ']'

    return new Response(
      JSON.stringify(JSON.parse(clean)),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
