const GROQ_API_KEY   = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY; // ← add this to your .env

const INTERNAL_LINE_RE = /^[^\n]*(COMMAND\s*:|MEMORIES\s*:|log_water|log_sleep|log_weight|log_food|log_workout|forget_fact|navigate)[^\n]*$/gim;

function cleanAiText(text) {
  if (!text) return text;
  return text.replace(INTERNAL_LINE_RE, '').replace(/\n{3,}/g, '\n\n').trim();
}

// ─── Plan generation prompt ───────────────────────────────────────────────────
function buildPrompt(answers) {
  const {
    goal, gender, age, height, weight, targetW, activity, experience,
    injuries, days, duration, timeOfDay, equipment, focus, sleep,
    stress, diet, calTarget, protein,
  } = answers;

  const injList   = injuries?.filter((x) => x !== "none").join(", ") || "none";
  const focusList = focus?.join(", ") || "balanced";
  const goalLabel = {
    lose_fat: "lose body fat", fat_loss: "lose body fat",
    gain_muscle: "build muscle", muscle: "build muscle",
    maintain: "stay healthy", gain_weight: "gain weight",
    build_habits: "build healthy habits", athletic: "athletic performance",
  }[goal] ?? goal;

  const equipmentHint = {
    full_gym:         "Use barbells, cables, machines, dumbbells and any gym equipment freely.",
    dumbbells:        "Use only dumbbells and bodyweight. No barbells or machines.",
    home:             "Bodyweight only — no equipment at all. Use floor, wall, chair variants.",
    resistance_bands: "Use resistance bands and bodyweight only.",
    kettlebells:      "Use kettlebells and bodyweight only.",
  }[equipment] ?? `Equipment available: ${equipment}.`;

  const experienceHint = {
    beginner:     "User is a BEGINNER — simple compound movements, no Olympic lifts, reps 10-15.",
    intermediate: "User is INTERMEDIATE — progressive overload, compound + isolation, reps 8-12.",
    advanced:     "User is ADVANCED — periodisation, complex movements, heavy compounds, reps 4-12.",
  }[experience] ?? "";

  const focusHint = focus?.length
    ? `Priority muscle groups: ${focusList}. Give these more exercises than other muscles.`
    : "Balanced full-body approach.";

  const injHint = injList !== "none"
    ? `IMPORTANT — Injuries/limitations: ${injList}. Avoid exercises that stress these areas.`
    : "";

  return `You are an expert fitness coach. Create a HIGHLY PERSONALISED ${days}-day training plan.

USER PROFILE:
- Goal: ${goalLabel} | Gender: ${gender} | Age: ${age ?? "unknown"} | Height: ${height}cm | Weight: ${weight}kg${targetW ? ` | Target: ${targetW}kg` : ""}
- Experience: ${experience} | Equipment: ${equipment} | ${days} days/week | ${duration} min/session
- Focus: ${focusList} | Injuries: ${injList} | Sleep: ${sleep} | Stress: ${stress} | Diet: ${diet}
- Calories: ${calTarget} kcal/day | Protein: ${protein}g/day | Activity: ${activity}

RULES:
1. ${equipmentHint}
2. ${experienceHint}
3. ${focusHint}
${injHint ? `4. ${injHint}` : ""}

Generate ${days} training days with exactly 5 exercises each. For each day include 4 meals with per-food calorie breakdown summing to ~${calTarget} kcal/day for a ${diet} diet.

CRITICAL: Output ONLY raw JSON. No markdown. No backticks. No explanation. The response must start with { and end with }.
Use this exact structure:
{"intro":"2 sentence intro","days":[{"name":"Push Day","focus":"Chest and Triceps","exercises":[{"name":"Bench Press","sets":4,"reps":"8-10","rest":"90s","muscle":"Chest"}],"coachTip":"one tip","meals":[{"type":"Breakfast","calories":420,"foods":[{"name":"Oats with banana","calories":280},{"name":"2 boiled eggs","calories":140}]},{"type":"Lunch","calories":550,"foods":[{"name":"Grilled chicken","calories":300},{"name":"Brown rice","calories":250}]},{"type":"Dinner","calories":500,"foods":[{"name":"Salmon","calories":300},{"name":"Sweet potato","calories":200}]},{"type":"Snack","calories":200,"foods":[{"name":"Greek yogurt","calories":120},{"name":"Almonds","calories":80}]}]}],"nutritionNote":"2 sentence note","recoveryNote":"1 sentence","motivationNote":"1 sentence"}`;
}

function parsePlanResponse(text) {
  const jsonMatch = text.match(/{[\s\S]*}/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  let clean = jsonMatch[0];
  try { return JSON.parse(clean); } catch (e) {}

  clean = clean
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x1F\x7F]/g, " ");

  const opens  = (clean.match(/{/g) || []).length;
  const closes = (clean.match(/}/g) || []).length;
  for (let i = 0; i < opens - closes; i++) clean += "}";

  const aOpens  = (clean.match(/\[/g) || []).length;
  const aCloses = (clean.match(/\]/g) || []).length;
  for (let i = 0; i < aOpens - aCloses; i++) clean += "]";

  try { return JSON.parse(clean); }
  catch (e) { throw new Error("Could not parse AI response. Please retry."); }
}

// ─── Plan generation — Gemini (1M tokens/min free tier, no rate limit issues) ─
export async function generateAIPlan(answers) {
  const prompt = buildPrompt(answers);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature:     0.7,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data?.error ?? data));

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Empty response from Gemini');

  return parsePlanResponse(text);
}

// ─── Yara chatbot (onboarding profile shape) — Groq ──────────────────────────
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
    lose_fat: 'lose body fat', fat_loss: 'lose body fat',
    gain_muscle: 'build muscle', muscle: 'build muscle',
    gain_weight: 'gain weight', build_habits: 'build healthy habits',
    maintain: 'stay healthy', athletic: 'improve athletic performance',
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
  return cleanAiText(body.choices?.[0]?.message?.content
    ?? "I'm having trouble connecting. Try again in a moment.");
}

// ─── Yara coach (Supabase profile shape) — Groq ──────────────────────────────
function buildYaraCoachSystem(profile, targets, scheduleMode = false) {
  const base = `You are Yara, a warm and direct personal fitness coach inside the BodyQ app.

Your voice:
- Conversational, human, coach-like. No AI stiffness.
- Short paragraphs. Plain language. Like a coach texting back.
- Never say "Great question!", "Certainly!", or "As an AI..."
- Confident. Honest. Caring but no-fluff.

Your expertise: fitness programming, progressive overload, nutrition, macros,
sports performance, recovery, sleep, motivation, mindset.

Rules:
- Keep replies to 2-4 short paragraphs unless a plan is requested.
- NEVER ask the user for info already in their profile below.
- Always reference their profile when giving advice.
- Never give dangerous medical advice. Refer to a physio for serious pain.${
  scheduleMode ? '\n- You MUST respond with a valid JSON object only. No text outside the JSON.' : ''
}`;

  if (!profile) return base;

  const goalMap = {
    lose_fat: 'lose body fat', gain_muscle: 'build muscle',
    gain_weight: 'gain weight', maintain: 'maintain fitness',
    build_habits: 'build healthy habits',
  };
  const age = profile.date_of_birth
    ? Math.floor((Date.now() - new Date(profile.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
    : 'unknown';

  return base + `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER PROFILE — memorise this, never ask for it again:
• Name: ${profile.full_name || 'User'}
• Goal: ${goalMap[profile.goal] || profile.goal || 'unknown'}
• Gender: ${profile.gender || 'unknown'} | Age: ${age} | Height: ${profile.height_cm || '?'}cm | Weight: ${profile.weight_kg || '?'}kg
• Activity level: ${profile.activity_level || 'moderate'}
• Daily calorie target: ${targets?.daily_calories || '?'} kcal
• Protein / Carbs / Fat: ${targets?.protein_target || '?'}g / ${targets?.carbs_target || '?'}g / ${targets?.fat_target || '?'}g
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use this to give precise, personalised advice every time.`;
}

export async function callYaraCoach(history, profile, targets, scheduleMode = false) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:           'llama-3.1-8b-instant',
      max_tokens:      scheduleMode ? 4096 : 512,
      temperature:     scheduleMode ? 0.3 : 0.7,
      response_format: scheduleMode ? { type: 'json_object' } : undefined,
      messages: [
        { role: 'system', content: buildYaraCoachSystem(profile, targets, scheduleMode) },
        ...history,
      ],
    }),
  });

  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body?.error ?? body));
  return cleanAiText(body.choices?.[0]?.message?.content
    ?? "I'm having trouble connecting. Try again in a moment.");
}