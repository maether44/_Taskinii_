const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY!;

function buildPrompt(answers) {
  const {
    goal,
    gender,
    age,
    height,
    weight,
    targetW,
    activity,
    experience,
    injuries,
    days,
    duration,
    timeOfDay,
    equipment,
    focus,
    sleep,
    stress,
    diet,
    calTarget,
    protein,
  } = answers;

  const injList = injuries?.filter((x) => x !== "none").join(", ") || "none";
  const focusList = focus?.join(", ") || "balanced";
  const goalLabel = {
    lose_fat: "lose body fat",
    fat_loss: "lose body fat",
    gain_muscle: "build muscle",
    muscle: "build muscle",
    maintain: "stay healthy",
    gain_weight: "gain weight",
    build_habits: "build healthy habits",
    athletic: "athletic performance",
  }[goal];

  return `You are an expert fitness coach. Create a highly personalised ${days}-day training plan for this user.

USER PROFILE:
- Goal: ${goal} (${goalLabel})
- Gender: ${gender}, Age: ${age}, Height: ${height}cm, Weight: ${weight}kg${targetW ? `, Target: ${targetW}kg` : ""}
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
{"intro":"string","days":[{"name":"string","focus":"string","exercises":[{"name":"string","sets":3,"reps":"string","rest":"string"}],"coachTip":"string"}],"nutritionNote":"string","recoveryNote":"string","motivationNote":"string"}`;
}

function parseGroqResponse(text) {
  const jsonMatch = text.match(/{[\s\S]*}/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  let clean = jsonMatch[0];
  try {
    return JSON.parse(clean);
  } catch (e) {}

  clean = clean
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x1F\x7F]/g, " ");

  const opens = (clean.match(/{/g) || []).length;
  const closes = (clean.match(/}/g) || []).length;
  for (let i = 0; i < opens - closes; i++) clean += "}";

  const aOpens = (clean.match(/\[/g) || []).length;
  const aCloses = (clean.match(/\]/g) || []).length;
  for (let i = 0; i < aOpens - aCloses; i++) clean += "]";

  try {
    return JSON.parse(clean);
  } catch (e) {
    throw new Error("Could not parse AI response. Please retry.");
  }
}

export async function generateAIPlan(answers) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: 4096,
      temperature: 0.4,
      messages: [{ role: "user", content: buildPrompt(answers) }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data?.error));

  const text = data.choices?.[0]?.message?.content ?? "";
  return parseGroqResponse(text);
}

// ============================================
// Yara chatbot assistant (onboarding profile shape)
// ============================================

function buildYaraSystem(profile) {
  const base = `You are Yara, a warm and direct personal fitness and sports coach inside a mobile app.

Your voice:
- Conversational, human, coach-like. No AI stiffness.
- Short paragraphs. Plain language. Like a coach texting back.
- Never say "Great question!", "Certainly!", or "As an AI..."
- Confident. Honest. Caring but no-fluff.

Your expertise:
- Fitness programming, progressive overload, exercise form
- Nutrition, protein targets, macros, meal timing, hydration
- Sports performance, recovery, sleep optimisation
- Injury management (always refer to a physio for serious pain)
- Motivation, consistency, mindset

Rules:
- Keep replies to 2-4 short paragraphs unless a detailed plan is requested.
- NEVER ask the user for info that is already in their profile below.
- Always reference their profile when giving advice.
- Never give dangerous medical advice.`;

  if (!profile) return base;

  const goalMap = {
    lose_fat: 'lose body fat',
    fat_loss: 'lose body fat',
    gain_muscle: 'build muscle',
    muscle: 'build muscle',
    gain_weight: 'gain weight',
    build_habits: 'build healthy habits',
    maintain: 'stay healthy',
    athletic: 'improve athletic performance',
  };
  const injList = profile.injuries?.filter(x => x !== 'none').join(', ') || 'none';

  return base + `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER PROFILE — memorise this, never ask for it again:
• Goal: ${goalMap[profile.goal] || profile.goal}
• Gender: ${profile.gender} | Age: ${profile.age} | Height: ${profile.height}cm | Weight: ${profile.weight}kg${profile.targetW ? ` | Target: ${profile.targetW}kg` : ''}
• Experience: ${profile.experience}
• Training: ${profile.days} days/week, ${profile.duration} min sessions, ${profile.timeOfDay} preferred
• Equipment: ${profile.equipment}
• Focus areas: ${profile.focus?.join(', ') || 'balanced'}
• Injuries: ${injList}
• Sleep: ${profile.sleep} | Stress: ${profile.stress} | Diet: ${profile.diet}
• Daily calories: ${profile.calTarget} kcal | Protein: ${profile.protein}g
• TDEE: ${profile.tdee} | BMR: ${profile.bmr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use this to give precise, personalised advice every time.`;
}


// ── CHAT MESSAGE ──────────────────────────────────────────────────────────────
export async function callYara(history, profile) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:      'llama-3.1-8b-instant',
      max_tokens: 512,
      messages: [
        { role: 'system', content: buildYaraSystem(profile) },
        ...history,
      ],
    }),
  });

  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body?.error ?? body));
  return body.choices?.[0]?.message?.content
    ?? "I'm having trouble connecting. Try again in a moment.";
}

// ============================================
// Yara coach — Supabase profile shape
// Used by YaraAssistant.js (reads profile via useProfile hook)
// ============================================

function buildYaraCoachSystem(profile: any, targets: any) {
  const base = `You are Yara, a warm and direct personal fitness coach inside the BodyQ app.

Your voice:
- Conversational, human, coach-like. No AI stiffness.
- Short paragraphs. Plain language. Like a coach texting back.
- Never say "Great question!", "Certainly!", or "As an AI..."
- Confident. Honest. Caring but no-fluff.

Your expertise: fitness programming, progressive overload, nutrition, macros,
sports performance, recovery, sleep, motivation, mindset.

Rules:
- Keep replies to 2–4 short paragraphs unless a plan is requested.
- NEVER ask the user for info already in their profile below.
- Always reference their profile when giving advice.
- Never give dangerous medical advice. Refer to a physio for serious pain.`;

  if (!profile) return base;

  const goalMap: Record<string, string> = {
    lose_fat: 'lose body fat', gain_muscle: 'build muscle',
    gain_weight: 'gain weight', maintain: 'maintain fitness',
    build_habits: 'build healthy habits',
  };
  const age = profile.date_of_birth
    ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
    : 'unknown';

  return base + `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER PROFILE — memorise this, never ask for it again:
• Name: ${profile.full_name || 'User'}
• Goal: ${goalMap[profile.goal] || profile.goal || 'unknown'}
• Gender: ${profile.gender || 'unknown'} | Age: ${age} | Height: ${profile.height_cm || '?'}cm | Weight: ${profile.weight_kg || '?'}kg
• Activity level: ${profile.activity_level || 'moderate'}
• Daily calorie target: ${targets?.daily_calories || '?'} kcal
• Protein / Carbs / Fat targets: ${targets?.protein_target || '?'}g / ${targets?.carbs_target || '?'}g / ${targets?.fat_target || '?'}g
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use this to give precise, personalised advice every time.`;
}

// callAriaCoach — identical to callYaraCoach but under the Aria brand name.
// useAriaChat.ts and AriaAssistant.js import this.
export async function callAriaCoach(
  history: { role: string; content: string }[],
  profile: any,
  targets: any,
): Promise<string> {
  return callYaraCoach(history, profile, targets);
}

export async function callYaraCoach(
  history: { role: string; content: string }[],
  profile: any,
  targets: any,
): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:      'llama-3.1-8b-instant',
      max_tokens: 512,
      messages: [
        { role: 'system', content: buildYaraCoachSystem(profile, targets) },
        ...history,
      ],
    }),
  });

  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body?.error ?? body));
  return body.choices?.[0]?.message?.content
    ?? "I'm having trouble connecting. Try again in a moment.";
}
