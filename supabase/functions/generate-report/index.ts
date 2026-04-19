/**
 * supabase/functions/generate-report/index.ts
 *
 * Generates a PDF fitness report tailored to user performance, profile, and goals.
 * Report types: weekly, monthly, quarterly, biannual, yearly.
 *
 * Called by pg_cron (service role) at the end of each period — not user-triggered.
 * Flow: validate data → aggregate activity/nutrition/workouts/body/profile → Groq narrative → PDF → upload → insert row → return signed URL.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsPDF } from 'https://esm.sh/jspdf@2.5.2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''
const GROQ_KEY = Deno.env.get('GROQ_API_KEY') ?? ''

const sbAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

type ReportType = 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'yearly'

const ALL_TYPES: ReportType[] = ['weekly', 'monthly', 'quarterly', 'biannual', 'yearly']

const MIN_DATA_ROWS: Record<ReportType, number> = {
  weekly: 3,
  monthly: 10,
  quarterly: 25,
  biannual: 50,
  yearly: 90,
}

const EXPIRY_DAYS: Record<ReportType, number> = {
  weekly: 5,
  monthly: 14,
  quarterly: 21,
  biannual: 30,
  yearly: 45,
}

const TYPE_LABELS: Record<ReportType, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: '6-Month',
  yearly: 'Yearly',
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function computePeriod(reportType: ReportType): { start: string; end: string } {
  const now = new Date()
  let start: Date
  let end: Date

  if (reportType === 'weekly') {
    const dow = now.getDay()
    const daysSinceLastMon = dow === 0 ? 6 : dow - 1
    end = new Date(now)
    end.setDate(now.getDate() - daysSinceLastMon - 1)
    end.setHours(0, 0, 0, 0)
    start = new Date(end)
    start.setDate(end.getDate() - 6)
  } else if (reportType === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    end = new Date(now.getFullYear(), now.getMonth(), 0)
  } else if (reportType === 'quarterly') {
    end = new Date(now)
    end.setDate(now.getDate() - 1)
    end.setHours(0, 0, 0, 0)
    start = new Date(end)
    start.setDate(end.getDate() - 89)
  } else if (reportType === 'biannual') {
    end = new Date(now)
    end.setDate(now.getDate() - 1)
    end.setHours(0, 0, 0, 0)
    start = new Date(end)
    start.setDate(end.getDate() - 179)
  } else {
    end = new Date(now)
    end.setDate(now.getDate() - 1)
    end.setHours(0, 0, 0, 0)
    start = new Date(end)
    start.setDate(end.getDate() - 364)
  }

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { start: fmt(start), end: fmt(end) }
}

async function countDataRows(userId: string, start: string, end: string): Promise<number> {
  const { count: activityCount } = await sbAdmin
    .from('daily_activity')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)

  const { count: workoutCount } = await sbAdmin
    .from('workout_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('started_at', `${start}T00:00:00`)
    .lte('started_at', `${end}T23:59:59`)

  const { count: foodCount } = await sbAdmin
    .from('food_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('consumed_at', `${start}T00:00:00`)
    .lte('consumed_at', `${end}T23:59:59`)

  return (activityCount ?? 0) + (workoutCount ?? 0) + (foodCount ?? 0)
}

interface UserProfile {
  goal: string
  gender: string
  age: number | null
  height_cm: number | null
  weight_kg: number | null
  target_weight_kg: number | null
  activity_level: string
  experience: string | null
}

interface AggregatedData {
  profile: UserProfile
  activity: {
    avg_steps: number
    avg_sleep_hours: number
    avg_water_ml: number
    active_days: number
    total_days: number
  }
  nutrition: {
    avg_calories: number
    avg_protein_g: number
    avg_carbs_g: number
    avg_fat_g: number
    logged_days: number
  }
  workouts: {
    session_count: number
    total_calories_burned: number
    avg_duration_min: number
    exercises_performed: number
  }
  body_metrics: {
    weight_start_kg: number | null
    weight_end_kg: number | null
    weight_delta_kg: number | null
    body_fat_start_pct: number | null
    body_fat_end_pct: number | null
  }
  ai_insights: Array<{ insight_type: string; message: string; created_at: string }>
}

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const { data: profile } = await sbAdmin
    .from('profiles')
    .select('goal, gender, date_of_birth, height_cm, weight_kg, target_weight_kg, activity_level, experience')
    .eq('id', userId)
    .single()

  let age: number | null = null
  if (profile?.date_of_birth) {
    const dob = new Date(profile.date_of_birth)
    const now = new Date()
    age = now.getFullYear() - dob.getFullYear()
    if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) {
      age--
    }
  }

  return {
    goal: profile?.goal ?? 'maintain',
    gender: profile?.gender ?? 'other',
    age,
    height_cm: profile?.height_cm ?? null,
    weight_kg: profile?.weight_kg ?? null,
    target_weight_kg: profile?.target_weight_kg ?? null,
    activity_level: profile?.activity_level ?? 'moderate',
    experience: profile?.experience ?? null,
  }
}

async function aggregateData(userId: string, start: string, end: string): Promise<AggregatedData> {
  const profile = await fetchUserProfile(userId)

  const startDate = new Date(start)
  const endDate = new Date(end)
  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1

  // Daily activity
  const { data: activityRows } = await sbAdmin
    .from('daily_activity')
    .select('steps, sleep_hours, water_ml')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)

  const acts = activityRows ?? []
  const activeDays = acts.filter((r: any) => (r.steps ?? 0) > 0 || (r.sleep_hours ?? 0) > 0 || (r.water_ml ?? 0) > 0).length
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  const activity = {
    avg_steps: Math.round(avg(acts.map((r: any) => r.steps ?? 0))),
    avg_sleep_hours: Number(avg(acts.map((r: any) => r.sleep_hours ?? 0)).toFixed(1)),
    avg_water_ml: Math.round(avg(acts.map((r: any) => r.water_ml ?? 0))),
    active_days: activeDays,
    total_days: totalDays,
  }

  // Nutrition
  const { data: foodRows } = await sbAdmin
    .from('food_logs')
    .select('consumed_at, quantity_grams, food:foods(calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)')
    .eq('user_id', userId)
    .gte('consumed_at', `${start}T00:00:00`)
    .lte('consumed_at', `${end}T23:59:59`)

  const dailyNutrition: Record<string, { cal: number; protein: number; carbs: number; fat: number }> = {}
  for (const row of (foodRows ?? []) as any[]) {
    const food = row.food
    if (!food) continue
    const day = row.consumed_at.split('T')[0]
    if (!dailyNutrition[day]) dailyNutrition[day] = { cal: 0, protein: 0, carbs: 0, fat: 0 }
    const q = (row.quantity_grams ?? 0) / 100
    dailyNutrition[day].cal += (food.calories_per_100g ?? 0) * q
    dailyNutrition[day].protein += (food.protein_per_100g ?? 0) * q
    dailyNutrition[day].carbs += (food.carbs_per_100g ?? 0) * q
    dailyNutrition[day].fat += (food.fat_per_100g ?? 0) * q
  }

  const nutDays = Object.values(dailyNutrition)
  const nutrition = {
    avg_calories: Math.round(avg(nutDays.map(d => d.cal))),
    avg_protein_g: Math.round(avg(nutDays.map(d => d.protein))),
    avg_carbs_g: Math.round(avg(nutDays.map(d => d.carbs))),
    avg_fat_g: Math.round(avg(nutDays.map(d => d.fat))),
    logged_days: nutDays.length,
  }

  // Workouts
  const { data: workoutRows } = await sbAdmin
    .from('workout_sessions')
    .select('id, started_at, ended_at, calories_burned')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .gte('started_at', `${start}T00:00:00`)
    .lte('started_at', `${end}T23:59:59`)

  const wks = workoutRows ?? []
  const durations = (wks as any[]).map(w => {
    if (!w.started_at || !w.ended_at) return 0
    return (new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000
  })

  let exerciseCount = 0
  if (wks.length > 0) {
    const { count } = await sbAdmin
      .from('workout_exercises')
      .select('id', { count: 'exact', head: true })
      .in('workout_session_id', (wks as any[]).map(w => w.id))
    exerciseCount = count ?? 0
  }

  const workouts = {
    session_count: wks.length,
    total_calories_burned: (wks as any[]).reduce((sum: number, w: any) => sum + (w.calories_burned ?? 0), 0),
    avg_duration_min: Math.round(avg(durations)),
    exercises_performed: exerciseCount,
  }

  // Body metrics
  const { data: metricsStart } = await sbAdmin
    .from('body_metrics')
    .select('weight_kg, body_fat_pct')
    .eq('user_id', userId)
    .gte('recorded_at', `${start}T00:00:00`)
    .order('recorded_at', { ascending: true })
    .limit(1)

  const { data: metricsEnd } = await sbAdmin
    .from('body_metrics')
    .select('weight_kg, body_fat_pct')
    .eq('user_id', userId)
    .lte('recorded_at', `${end}T23:59:59`)
    .order('recorded_at', { ascending: false })
    .limit(1)

  const ms = (metricsStart as any[])?.[0]
  const me = (metricsEnd as any[])?.[0]
  const body_metrics = {
    weight_start_kg: ms?.weight_kg ?? null,
    weight_end_kg: me?.weight_kg ?? null,
    weight_delta_kg: ms?.weight_kg != null && me?.weight_kg != null ? Number((me.weight_kg - ms.weight_kg).toFixed(1)) : null,
    body_fat_start_pct: ms?.body_fat_pct ?? null,
    body_fat_end_pct: me?.body_fat_pct ?? null,
  }

  // AI insights from the period
  const { data: insightRows } = await sbAdmin
    .from('ai_insights')
    .select('insight_type, message, created_at')
    .eq('user_id', userId)
    .gte('created_at', `${start}T00:00:00`)
    .lte('created_at', `${end}T23:59:59`)
    .order('created_at', { ascending: false })
    .limit(10)

  return {
    profile,
    activity,
    nutrition,
    workouts,
    body_metrics,
    ai_insights: (insightRows ?? []) as any[],
  }
}

function buildNarrativePrompt(data: AggregatedData, reportType: ReportType, start: string, end: string): string {
  const p = data.profile
  const goalDescription = {
    lose_weight: 'lose weight',
    gain_muscle: 'gain muscle',
    maintain: 'maintain current fitness',
    get_fit: 'get fit and improve overall health',
    build_strength: 'build strength',
  }[p.goal] ?? p.goal

  return `You are Yara, the personal fitness coach AI inside the BodyQ app.
Write a ${TYPE_LABELS[reportType]} Performance Report narrative for the period ${start} to ${end} (${data.activity.total_days} days).

USER PROFILE:
- Goal: ${goalDescription}
- Gender: ${p.gender}, Age: ${p.age ?? 'unknown'}
- Height: ${p.height_cm ?? '?'} cm
- Current weight: ${p.weight_kg ?? '?'} kg, Target weight: ${p.target_weight_kg ?? 'not set'} kg
- Activity level: ${p.activity_level}, Experience: ${p.experience ?? 'unknown'}

PERFORMANCE DATA:
- Active days: ${data.activity.active_days} / ${data.activity.total_days} total days (${Math.round((data.activity.active_days / data.activity.total_days) * 100)}% consistency)
- Avg steps/day: ${data.activity.avg_steps}
- Avg sleep: ${data.activity.avg_sleep_hours} hrs/night
- Avg water: ${data.activity.avg_water_ml} ml/day
- Nutrition: ${data.nutrition.avg_calories} kcal/day avg, ${data.nutrition.avg_protein_g}g protein, ${data.nutrition.avg_carbs_g}g carbs, ${data.nutrition.avg_fat_g}g fat (${data.nutrition.logged_days} days logged)
- Workouts: ${data.workouts.session_count} sessions, ${data.workouts.total_calories_burned} kcal burned total, avg ${data.workouts.avg_duration_min} min/session, ${data.workouts.exercises_performed} exercises performed
- Body: weight ${data.body_metrics.weight_start_kg ?? '?'} → ${data.body_metrics.weight_end_kg ?? '?'} kg (delta ${data.body_metrics.weight_delta_kg ?? 'N/A'} kg), body fat ${data.body_metrics.body_fat_start_pct ?? '?'} → ${data.body_metrics.body_fat_end_pct ?? '?'}%
- Recent AI coaching insights: ${data.ai_insights.map(i => `[${i.insight_type}] ${i.message}`).join(' | ') || 'None'}

Write exactly 3 paragraphs:
1. WINS — Celebrate what went well. Reference actual numbers. Relate progress to their specific goal (${goalDescription}).
2. AREAS TO IMPROVE — Be honest but encouraging. Identify gaps (e.g., low consistency, missing nutrition logs, insufficient protein for muscle gain). Cite the data.
3. ACTION PLAN — Give 3–4 concrete, personalized next steps for the upcoming ${reportType === 'weekly' ? 'week' : reportType === 'monthly' ? 'month' : 'period'}. Tailor to their goal and experience level.

Rules:
- Reference ACTUAL numbers from the data. Never invent or round aggressively.
- Tailor advice to the user's specific goal, body stats, and experience level.
- Keep each paragraph 3–5 sentences. Warm, motivational, data-driven.
- Return ONLY the 3 paragraphs as plain text separated by blank lines. No headers, no markdown, no bullet points.`
}

async function callGroqNarrative(prompt: string): Promise<string> {
  if (!GROQ_KEY) throw new Error('GROQ_API_KEY not configured')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1200,
      temperature: 0.7,
      messages: [
        { role: 'system', content: 'You are Yara, a personal fitness coach AI. Write clear, data-grounded, personalized fitness report narratives.' },
        { role: 'user', content: prompt },
      ],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(`Groq error: ${JSON.stringify(data?.error)}`)

  return data.choices?.[0]?.message?.content?.trim() ?? ''
}

function buildPdf(
  narrative: string,
  data: AggregatedData,
  reportType: ReportType,
  start: string,
  end: string,
): Uint8Array {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentW = pageW - margin * 2
  let y = 20

  const checkPage = (needed: number) => {
    if (y + needed > 270) { doc.addPage(); y = 20 }
  }

  // Title
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(`BodyQ ${TYPE_LABELS[reportType]} Performance Report`, pageW / 2, y, { align: 'center' })
  y += 10

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`${start}  to  ${end}`, pageW / 2, y, { align: 'center' })
  y += 12

  // Divider
  doc.setDrawColor(111, 75, 242)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageW - margin, y)
  y += 10

  // User profile section
  const p = data.profile
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Athlete Profile', margin, y)
  y += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const goalLabel = { lose_weight: 'Lose Weight', gain_muscle: 'Gain Muscle', maintain: 'Maintain', get_fit: 'Get Fit', build_strength: 'Build Strength' }[p.goal] ?? p.goal
  const profileLines = [
    `Goal: ${goalLabel}  |  Gender: ${p.gender}  |  Age: ${p.age ?? 'N/A'}`,
    `Height: ${p.height_cm ?? '?'} cm  |  Weight: ${p.weight_kg ?? '?'} kg  |  Target: ${p.target_weight_kg ?? 'not set'} kg`,
    `Activity level: ${p.activity_level}  |  Experience: ${p.experience ?? 'N/A'}`,
  ]
  for (const line of profileLines) {
    doc.text(line, margin, y)
    y += 5
  }
  y += 4

  doc.line(margin, y, pageW - margin, y)
  y += 10

  // Stats summary
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Performance Summary', margin, y)
  y += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const consistency = data.activity.total_days > 0 ? Math.round((data.activity.active_days / data.activity.total_days) * 100) : 0
  const stats = [
    `Consistency: ${data.activity.active_days} / ${data.activity.total_days} active days (${consistency}%)`,
    `Avg steps: ${data.activity.avg_steps}/day  |  Sleep: ${data.activity.avg_sleep_hours} hrs  |  Water: ${data.activity.avg_water_ml} ml`,
    `Workouts: ${data.workouts.session_count} sessions, ${data.workouts.total_calories_burned} kcal burned, avg ${data.workouts.avg_duration_min} min`,
    `Nutrition: ${data.nutrition.avg_calories} kcal/day, P${data.nutrition.avg_protein_g}g C${data.nutrition.avg_carbs_g}g F${data.nutrition.avg_fat_g}g (${data.nutrition.logged_days} days logged)`,
    data.body_metrics.weight_delta_kg != null
      ? `Weight: ${data.body_metrics.weight_start_kg} → ${data.body_metrics.weight_end_kg} kg (${data.body_metrics.weight_delta_kg > 0 ? '+' : ''}${data.body_metrics.weight_delta_kg} kg)`
      : 'Weight: Not enough measurements in this period',
  ]

  for (const line of stats) {
    const split = doc.splitTextToSize(line, contentW) as string[]
    checkPage(split.length * 5)
    doc.text(split, margin, y)
    y += split.length * 5
  }

  y += 6
  doc.line(margin, y, pageW - margin, y)
  y += 10

  // Yara narrative
  checkPage(20)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text("Yara's Analysis", margin, y)
  y += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const paragraphs = narrative.split(/\n\s*\n/)
  for (const para of paragraphs) {
    const lines = doc.splitTextToSize(para.trim(), contentW) as string[]
    checkPage(lines.length * 5 + 4)
    doc.text(lines, margin, y)
    y += lines.length * 5 + 4
  }

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated by BodyQ on ${new Date().toISOString().split('T')[0]}`, pageW / 2, 285, { align: 'center' })

  return new Uint8Array(doc.output('arraybuffer'))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // This function is called by pg_cron with service role key
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')

    const body = await req.json().catch(() => ({}))
    const { userId, reportType } = body

    // Verify service role authorization
    if (token !== SERVICE_ROLE_KEY) {
      return json({ error: 'Unauthorized — reports are generated automatically' }, 401)
    }

    if (!userId) {
      return json({ error: 'userId is required' }, 400)
    }

    if (!reportType || !ALL_TYPES.includes(reportType)) {
      return json({ error: `reportType must be one of: ${ALL_TYPES.join(', ')}` }, 400)
    }

    const { start, end } = computePeriod(reportType)

    // Check minimum data threshold
    const dataRows = await countDataRows(userId, start, end)
    if (dataRows < MIN_DATA_ROWS[reportType]) {
      return json({
        error: 'INSUFFICIENT_DATA',
        message: `Need at least ${MIN_DATA_ROWS[reportType]} data entries for a ${reportType} report, found ${dataRows}.`,
        required: MIN_DATA_ROWS[reportType],
        found: dataRows,
      }, 422)
    }

    // Compute expiry
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS[reportType])

    const storagePath = `${userId}/${reportType}/${start}.pdf`

    // Insert row as 'generating'
    const { data: reportRow, error: insertErr } = await sbAdmin
      .from('user_reports')
      .insert({
        user_id: userId,
        report_type: reportType,
        period_start: start,
        period_end: end,
        storage_path: storagePath,
        status: 'generating',
        is_expired: false,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    try {
      // Aggregate data including user profile and goals
      const aggregated = await aggregateData(userId, start, end)

      // Generate personalized narrative via Groq
      const prompt = buildNarrativePrompt(aggregated, reportType, start, end)
      const narrative = await callGroqNarrative(prompt)

      // Build PDF with profile, stats, and narrative
      const pdfBytes = buildPdf(narrative, aggregated, reportType, start, end)

      // Upload to storage
      const { error: uploadErr } = await sbAdmin.storage
        .from('report-pdfs')
        .upload(storagePath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (uploadErr) throw uploadErr

      // Update row to available
      await sbAdmin
        .from('user_reports')
        .update({ status: 'available', narrative })
        .eq('id', reportRow.id)

      // Generate signed URL (1 hour TTL)
      const { data: signedUrlData, error: signErr } = await sbAdmin.storage
        .from('report-pdfs')
        .createSignedUrl(storagePath, 3600)

      if (signErr) throw signErr

      return json({
        success: true,
        report: { ...reportRow, status: 'available', narrative },
        signedUrl: signedUrlData.signedUrl,
      })
    } catch (genErr: any) {
      await sbAdmin
        .from('user_reports')
        .update({ status: 'failed', error_message: genErr.message })
        .eq('id', reportRow.id)

      throw genErr
    }
  } catch (err: any) {
    console.error('generate-report error:', err)
    const status = err.message === 'Unauthorized — reports are generated automatically' ? 401 : 500
    return json({ error: err.message }, status)
  }
})
