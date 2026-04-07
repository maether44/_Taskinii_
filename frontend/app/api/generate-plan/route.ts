import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function buildPrompt(a: Record<string, unknown>): string {
  const injList = (a.injuries as string[] | undefined)?.filter((x) => x !== 'none').join(', ') || 'none';
  const focusList = (a.focus as string[] | undefined)?.join(', ') || 'balanced';
  const goalLabel: Record<string, string> = {
    lose_fat: 'lose body fat', gain_muscle: 'build muscle',
    maintain: 'stay healthy', gain_weight: 'healthy weight gain', build_habits: 'build consistent habits',
  };

  // Convert YYYY-MM-DD dob to age
  let age: number | null = null;
  if (typeof a.dob === 'string' && a.dob.length === 10) {
    const birth = new Date(a.dob);
    if (!isNaN(birth.getTime())) {
      const today = new Date();
      age = today.getFullYear() - birth.getFullYear();
      const hasBday =
        today.getMonth() > birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
      if (!hasBday) age--;
    }
  }

  return `You are an expert fitness coach. Create a highly personalised ${a.days}-day training plan for this user.

USER PROFILE:
- Goal: ${a.goal} (${goalLabel[a.goal as string] ?? a.goal})
- Gender: ${a.gender}, Age: ${age ?? 'unknown'}, Height: ${a.height}cm, Weight: ${a.weight}kg${a.targetW ? `, Target: ${a.targetW}kg` : ''}
- Experience: ${a.experience}
- Equipment: ${a.equipment}
- Training: ${a.days} days/week, ${a.duration} min per session, ${a.timeOfDay} time preferred
- Focus areas: ${focusList}
- Injuries/limitations: ${injList}
- Sleep: ${a.sleep}, Stress: ${a.stress}, Diet: ${a.diet}
- Daily calorie target: ${a.calTarget} kcal, Protein: ${a.protein}g/day
- Activity level: ${a.activity}

Generate a ${a.days}-day weekly training split. For each day provide:
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
{"intro":"string","days":[{"name":"string","focus":"string","exercises":[{"name":"string","sets":3,"reps":"string","rest":"string"}],"coachTip":"string"}],"nutritionNote":"string","recoveryNote":"string","motivationNote":"string"}`;
}

function parseGroqResponse(text: string): unknown {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');

  let clean = jsonMatch[0];
  try { return JSON.parse(clean); } catch { /* continue */ }

  clean = clean
    .replace(/,\s*\}/g, '}')
    .replace(/,\s*\]/g, ']')
    .replace(/[\x00-\x1F\x7F]/g, ' ');

  const opens = (clean.match(/\{/g) ?? []).length;
  const closes = (clean.match(/\}/g) ?? []).length;
  for (let i = 0; i < opens - closes; i++) clean += '}';

  const aOpens = (clean.match(/\[/g) ?? []).length;
  const aCloses = (clean.match(/\]/g) ?? []).length;
  for (let i = 0; i < aOpens - aCloses; i++) clean += ']';

  return JSON.parse(clean);
}

export async function POST(request: NextRequest) {
  // Verify authenticated
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
  }

  let answers: Record<string, unknown>;
  try {
    answers = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 4096,
        temperature: 0.4,
        messages: [{ role: 'user', content: buildPrompt(answers) }],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.error ?? 'Groq API error' }, { status: 500 });
    }

    const text: string = data.choices?.[0]?.message?.content ?? '';
    const plan = parseGroqResponse(text);
    return NextResponse.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Plan generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
