import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { supabase } from '../lib/supabase';
import { getMuscleFatigue } from './workoutService';

// ── Image loading ────────────────────────────────────────────────────────────

async function loadImageBase64(mod) {
  try {
    const [asset] = await Asset.loadAsync(mod);
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/png;base64,${base64}`;
  } catch {
    return '';
  }
}

// ── Date helpers ─────────────────────────────────────────────────────────────

const REPORT_DAYS = { weekly: 7, monthly: 30, quarterly: 90, biannual: 180, yearly: 365 };

function getDateRange(reportType) {
  const days = REPORT_DAYS[reportType] ?? 7;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return { start, end, days };
}

function fmtShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtFull(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TYPE_LABELS = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: '6-Month',
  yearly: 'Yearly',
};

// ── Data fetching ────────────────────────────────────────────────────────────

async function fetchReportData(userId, reportType) {
  const { start } = getDateRange(reportType);
  const startIso = start.toISOString();

  const [profileRes, insightsRes, nutritionRes, workoutRes, fatigueData] =
    await Promise.all([
      supabase.from('profiles')
        .select('full_name, goal, weight_kg, height_cm, login_streak, longest_streak, level, xp_current')
        .eq('id', userId)
        .single(),
      supabase.rpc('get_insights_data', { p_user_id: userId, p_period: 'Month' }),
      supabase.from('food_logs')
        .select('consumed_at, quantity_grams, foods(calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)')
        .eq('user_id', userId)
        .gte('consumed_at', startIso),
      supabase.from('workout_sessions')
        .select('calories_burned, started_at, ended_at')
        .eq('user_id', userId)
        .gte('started_at', startIso)
        .not('ended_at', 'is', null),
      getMuscleFatigue(userId).catch(() => []),
    ]);

  const profile = profileRes.data ?? {};
  const stats = insightsRes.data ?? {};
  const nutritionRows = nutritionRes.data ?? [];
  const workoutRows = workoutRes.data ?? [];
  const fatigue = fatigueData ?? [];

  const dayMap = {};
  nutritionRows.forEach(row => {
    const day = row.consumed_at?.split('T')[0];
    if (!day || !row.foods) return;
    if (!dayMap[day]) dayMap[day] = { cal: 0, protein: 0, carbs: 0, fat: 0 };
    const q = (row.quantity_grams ?? 0) / 100;
    dayMap[day].cal     += (row.foods.calories_per_100g ?? 0) * q;
    dayMap[day].protein += (row.foods.protein_per_100g  ?? 0) * q;
    dayMap[day].carbs   += (row.foods.carbs_per_100g    ?? 0) * q;
    dayMap[day].fat     += (row.foods.fat_per_100g      ?? 0) * q;
  });
  const nutDays = Object.values(dayMap);
  const nutrition = nutDays.length ? {
    avgCal:     Math.round(nutDays.reduce((s, d) => s + d.cal, 0)     / nutDays.length),
    avgProtein: Math.round(nutDays.reduce((s, d) => s + d.protein, 0) / nutDays.length),
    avgCarbs:   Math.round(nutDays.reduce((s, d) => s + d.carbs, 0)   / nutDays.length),
    avgFat:     Math.round(nutDays.reduce((s, d) => s + d.fat, 0)     / nutDays.length),
    loggedDays: nutDays.length,
  } : null;

  const totalCal = workoutRows.reduce((s, w) => s + (w.calories_burned ?? 0), 0);
  const durations = workoutRows
    .filter(w => w.started_at && w.ended_at)
    .map(w => (new Date(w.ended_at) - new Date(w.started_at)) / 60000);
  const avgDuration = durations.length
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : 0;
  const longestSession = durations.length ? Math.round(Math.max(...durations)) : 0;
  const workout = { count: workoutRows.length, totalCal, avgDurationMin: avgDuration, longestSession };

  const heatmapDays = stats.heatmap_days ?? [];
  const healthScores = heatmapDays.map(d => {
    let s = 0;
    if (d.has_workout)        s += 35;
    if (d.steps > 8000)       s += 25;
    else if (d.steps > 4000)  s += 12;
    if (d.calories > 0)       s += 20;
    if (d.sleep >= 7)         s += 15;
    else if (d.sleep >= 6)    s += 8;
    if (d.water >= 2000)      s += 5;
    return Math.min(s, 100);
  });
  const peakScore = healthScores.length ? Math.max(...healthScores) : 0;
  const avgScore = healthScores.length
    ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
    : 0;

  return {
    profile, stats, nutrition, workout,
    fatigue: fatigue.slice(0, 4),
    healthScores: healthScores.length ? healthScores : [0],
    peakScore, avgScore,
  };
}

// ── Analysis helpers ─────────────────────────────────────────────────────────

function buildWins(data) {
  const { profile, workout, nutrition, peakScore } = data;
  const streak = profile.login_streak ?? 0;
  const wins = [];
  if (streak >= 7)       wins.push(`Maintained a ${streak}-day streak — outstanding consistency`);
  else if (streak >= 3)  wins.push(`Built a ${streak}-day streak — momentum is building`);
  if (workout.count >= 4)          wins.push(`Completed ${workout.count} workouts this period`);
  else if (workout.count > 0)      wins.push(`Logged ${workout.count} workout${workout.count > 1 ? 's' : ''} — every session counts`);
  if (nutrition?.avgProtein >= 50)  wins.push(`Strong protein intake at ${nutrition.avgProtein}g/day avg`);
  if (nutrition?.loggedDays >= 5)   wins.push(`Tracked nutrition for ${nutrition.loggedDays} days`);
  if (peakScore >= 80)             wins.push(`Hit a peak health score of ${peakScore}/100`);
  if ((data.stats.avg_sleep ?? 0) >= 7) wins.push(`Averaging ${Number(data.stats.avg_sleep).toFixed(1)}h sleep — solid recovery`);
  if (!wins.length) wins.push('You showed up — that is the first win');
  return wins.slice(0, 4);
}

function buildImprovements(data) {
  const { profile, workout, nutrition, fatigue } = data;
  const streak = profile.login_streak ?? 0;
  const items = [];
  if (streak < 3)                   items.push('Build a consistent daily logging habit');
  if (workout.count < 3)            items.push('Increase workout frequency to 3+ sessions/week');
  if (nutrition && nutrition.avgProtein < 50)
    items.push(`Boost protein intake (currently ${nutrition.avgProtein}g/day)`);
  if (!nutrition)                    items.push('Start logging meals for better nutrition insights');
  if ((data.stats.avg_sleep ?? 0) > 0 && (data.stats.avg_sleep ?? 0) < 7)
    items.push(`Improve sleep — currently ${Number(data.stats.avg_sleep).toFixed(1)}h avg (target: 7h+)`);
  const overworked = fatigue.filter(m => m.fatigue_pct >= 70);
  if (overworked.length)
    items.push(`Allow recovery for ${overworked.map(m => m.muscle_name).join(', ')}`);
  if (!items.length) items.push('Keep it up — you\'re on track across all areas');
  return items.slice(0, 4);
}

function buildActionPlan(data) {
  const { workout, nutrition, profile } = data;
  const streak = profile.login_streak ?? 0;
  const actions = [];
  if (workout.count < 3)  actions.push('Schedule 3 workouts this coming week');
  else                    actions.push('Maintain your current training frequency');
  if (!nutrition)         actions.push('Log at least 1 full day of meals');
  else if (nutrition.avgProtein < 50) actions.push('Add a protein-rich meal or shake daily');
  else                    actions.push('Keep tracking meals — consistency sharpens coaching');
  if ((data.stats.avg_sleep ?? 0) < 7) actions.push('Set a fixed bedtime to reach 7h+ sleep');
  if (streak < 7)         actions.push('Log activity daily to build toward your 7-day streak');
  else                    actions.push('Protect your streak — keep the daily habit alive');
  return actions.slice(0, 4);
}

// ── SVG chart ────────────────────────────────────────────────────────────────

function buildHealthChart(values) {
  if (!values.length) return '';
  const w = 480, h = 80;
  const max = Math.max(...values, 1);
  const barW = Math.max(3, Math.min(14, (w - 20) / values.length - 1));
  const gap = 1;
  const totalW = values.length * (barW + gap);
  const ox = (w - totalW) / 2;

  const bars = values.map((v, i) => {
    const bH = Math.max(1, (v / max) * (h - 10));
    const x = ox + i * (barW + gap);
    const y = h - bH;
    const fill = v >= 70 ? '#6F4BF2' : v >= 40 ? '#A38DF2' : '#D0C4F0';
    return `<rect x="${x}" y="${y}" width="${barW}" height="${bH}" rx="1.5" fill="${fill}"/>`;
  }).join('');

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}

function buildMacroBar(protein, carbs, fat) {
  const total = protein + carbs + fat;
  if (!total) return '';
  const w = 220, h = 10;
  const pW = (protein / total) * w;
  const cW = (carbs / total) * w;
  const fW = (fat / total) * w;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" rx="5" fill="#E8E3FF"/>
    <rect width="${pW}" height="${h}" rx="5" fill="#6F4BF2"/>
    <rect x="${pW}" width="${cW}" height="${h}" fill="#CDF27E"/>
    <rect x="${pW + cW}" width="${fW}" height="${h}" rx="5" fill="#FF9500"/>
  </svg>`;
}

// ── HTML template (single page, white background) ────────────────────────────

function buildReportHtml({ reportType, data, logoUri, mascotUri }) {
  const { profile, stats, nutrition, workout, fatigue, healthScores, peakScore, avgScore } = data;
  const { start, end, days } = getDateRange(reportType);
  const userName = profile.full_name || 'BodyQ User';
  const typeLabel = TYPE_LABELS[reportType] ?? reportType;
  const streak = profile.login_streak ?? 0;
  const goal = profile.goal ?? 'General Fitness';

  const wins = buildWins(data);
  const improvements = buildImprovements(data);
  const actions = buildActionPlan(data);
  const healthChart = buildHealthChart(healthScores);
  const macroBar = nutrition ? buildMacroBar(nutrition.avgProtein, nutrition.avgCarbs, nutrition.avgFat) : '';

  const fatigueHtml = fatigue.length ? fatigue.map(m => {
    const pct = m.fatigue_pct ?? 0;
    const color = pct >= 70 ? '#6F4BF2' : pct >= 40 ? '#FF9500' : '#34C759';
    return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
      <span style="font-size:8px;color:#555;width:65px;">${m.muscle_name}</span>
      <div style="flex:1;height:5px;background:#EDE9F7;border-radius:3px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
      </div>
      <span style="font-size:7px;color:${color};font-weight:700;width:24px;text-align:right;">${pct}%</span>
    </div>`;
  }).join('') : '<span style="font-size:8px;color:#999;">No data yet</span>';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page { size: letter; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    background: #fff;
    color: #1a1a2e;
    width: 612px;
    height: 792px;
    overflow: hidden;
    padding: 24px 28px 20px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 2px solid #6F4BF2;
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .header-logo { height: 36px; }
  .header-mascot { height: 40px; }
  .header-title { font-size: 16px; font-weight: 800; color: #1a1a2e; }
  .header-sub { font-size: 9px; color: #777; margin-top: 1px; }
  .header-right { text-align: right; }
  .header-period { font-size: 9px; color: #6F4BF2; font-weight: 700; }
  .header-user { font-size: 11px; font-weight: 700; color: #1a1a2e; }
  .header-meta { font-size: 8px; color: #999; margin-top: 1px; }

  .cols { display: flex; gap: 16px; }
  .col-left { flex: 1.1; }
  .col-right { flex: 0.9; }

  .section { margin-bottom: 12px; }
  .section-head {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #6F4BF2;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .section-icon { font-size: 11px; }

  .card {
    background: #F8F7FC;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 10px;
  }

  .stats-row {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }
  .stat-box {
    flex: 1;
    background: #F8F7FC;
    border-radius: 8px;
    padding: 8px;
    text-align: center;
  }
  .stat-val { font-size: 18px; font-weight: 800; color: #6F4BF2; }
  .stat-lbl { font-size: 7px; color: #777; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.4px; }

  .list-item {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 4px;
    font-size: 9px;
    line-height: 1.4;
    color: #333;
  }
  .bullet-win { color: #34C759; font-weight: 700; font-size: 10px; }
  .bullet-fix { color: #FF9500; font-weight: 700; font-size: 10px; }
  .bullet-act { color: #6F4BF2; font-weight: 700; font-size: 10px; }

  .peak-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }
  .peak-box {
    flex: 1;
    background: linear-gradient(135deg, #6F4BF2 0%, #A38DF2 100%);
    border-radius: 8px;
    padding: 8px 10px;
    text-align: center;
    color: #fff;
  }
  .peak-val { font-size: 18px; font-weight: 800; }
  .peak-lbl { font-size: 7px; opacity: 0.85; margin-top: 1px; text-transform: uppercase; letter-spacing: 0.4px; }

  .macro-row {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-top: 6px;
  }
  .macro-legend { display: flex; gap: 8px; }
  .macro-dot { width: 6px; height: 6px; border-radius: 3px; display: inline-block; margin-right: 2px; }
  .macro-label { font-size: 7px; color: #777; }

  .alexi-box {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background: #F0ECFA;
    border-radius: 8px;
    padding: 8px 10px;
    border-left: 3px solid #6F4BF2;
  }
  .alexi-img { width: 30px; border-radius: 15px; flex-shrink: 0; margin-top: 2px; }
  .alexi-text { font-size: 8px; color: #444; line-height: 1.5; }
  .alexi-name { font-size: 8px; font-weight: 700; color: #6F4BF2; margin-bottom: 2px; }

  .footer {
    position: absolute;
    bottom: 12px;
    left: 28px;
    right: 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #EDE9F7;
    padding-top: 6px;
  }
  .footer span { font-size: 7px; color: #bbb; }
  .footer-logo { height: 16px; opacity: 0.4; }
</style>
</head>
<body>

  <!-- ── HEADER ── -->
  <div class="header">
    <div class="header-left">
      ${logoUri ? `<img src="${logoUri}" class="header-logo"/>` : ''}
      ${mascotUri ? `<img src="${mascotUri}" class="header-mascot"/>` : ''}
      <div>
        <div class="header-title">${typeLabel} Performance Report</div>
        <div class="header-sub">Powered by Alexi, your AI fitness coach</div>
      </div>
    </div>
    <div class="header-right">
      <div class="header-user">${userName}</div>
      <div class="header-period">${fmtShort(start)} – ${fmtShort(end)} · ${days} days</div>
      <div class="header-meta">${streak}d streak · Goal: ${goal}</div>
    </div>
  </div>

  <!-- ── PEAK PERFORMANCES ── -->
  <div class="peak-row">
    <div class="peak-box">
      <div class="peak-val">${peakScore}</div>
      <div class="peak-lbl">Peak Score</div>
    </div>
    <div class="peak-box">
      <div class="peak-val">${avgScore}</div>
      <div class="peak-lbl">Avg Score</div>
    </div>
    <div class="peak-box">
      <div class="peak-val">${streak}d</div>
      <div class="peak-lbl">Streak</div>
    </div>
    <div class="peak-box">
      <div class="peak-val">${workout.count}</div>
      <div class="peak-lbl">Workouts</div>
    </div>
    <div class="peak-box">
      <div class="peak-val">${workout.totalCal}</div>
      <div class="peak-lbl">kcal Burned</div>
    </div>
  </div>

  <!-- ── HEALTH TREND CHART ── -->
  <div class="section">
    <div class="section-head"><span class="section-icon">📈</span> Health Score Trend</div>
    <div class="card" style="text-align:center;padding:6px 8px;">
      ${healthChart}
    </div>
  </div>

  <!-- ── TWO-COLUMN LAYOUT ── -->
  <div class="cols">

    <!-- LEFT COLUMN -->
    <div class="col-left">

      <div class="section">
        <div class="section-head"><span class="section-icon">🏆</span> Wins</div>
        ${wins.map(w => `<div class="list-item"><span class="bullet-win">✓</span> ${w}</div>`).join('')}
      </div>

      <div class="section">
        <div class="section-head"><span class="section-icon">🎯</span> Areas to Improve</div>
        ${improvements.map(item => `<div class="list-item"><span class="bullet-fix">!</span> ${item}</div>`).join('')}
      </div>

      <div class="section">
        <div class="section-head"><span class="section-icon">🚀</span> Action Plan</div>
        ${actions.map((a, i) => `<div class="list-item"><span class="bullet-act">${i + 1}.</span> ${a}</div>`).join('')}
      </div>

      <div class="section">
        <div class="section-head"><span class="section-icon">🤖</span> Alexi's Take</div>
        <div class="alexi-box">
          ${mascotUri ? `<img src="${mascotUri}" class="alexi-img"/>` : ''}
          <div>
            <div class="alexi-name">Alexi</div>
            <div class="alexi-text">${buildAlexiSummary(data)}</div>
          </div>
        </div>
      </div>

    </div>

    <!-- RIGHT COLUMN -->
    <div class="col-right">

      <div class="section">
        <div class="section-head"><span class="section-icon">💪</span> Training</div>
        <div class="stats-row">
          <div class="stat-box">
            <div class="stat-val">${workout.count}</div>
            <div class="stat-lbl">Sessions</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${workout.avgDurationMin}<span style="font-size:10px;">m</span></div>
            <div class="stat-lbl">Avg Duration</div>
          </div>
        </div>
        ${workout.longestSession ? `<div style="font-size:8px;color:#777;text-align:center;margin-bottom:6px;">Longest session: ${workout.longestSession} min</div>` : ''}
      </div>

      <div class="section">
        <div class="section-head"><span class="section-icon">🥗</span> Nutrition</div>
        ${nutrition ? `
          <div class="card">
            <div style="font-size:20px;font-weight:800;color:#6F4BF2;">${nutrition.avgCal}</div>
            <div style="font-size:7px;color:#777;margin-bottom:6px;">AVG KCAL / DAY · ${nutrition.loggedDays} days logged</div>
            ${macroBar}
            <div class="macro-row">
              <div class="macro-legend">
                <span><span class="macro-dot" style="background:#6F4BF2;"></span><span class="macro-label">P ${nutrition.avgProtein}g</span></span>
                <span><span class="macro-dot" style="background:#CDF27E;"></span><span class="macro-label">C ${nutrition.avgCarbs}g</span></span>
                <span><span class="macro-dot" style="background:#FF9500;"></span><span class="macro-label">F ${nutrition.avgFat}g</span></span>
              </div>
            </div>
          </div>
        ` : `<div class="card"><span style="font-size:8px;color:#999;">No meals logged yet</span></div>`}
      </div>

      <div class="section">
        <div class="section-head"><span class="section-icon">😴</span> Sleep & Recovery</div>
        <div class="card">
          <div style="display:flex;gap:12px;margin-bottom:8px;">
            <div style="text-align:center;">
              <div style="font-size:16px;font-weight:800;color:#6F4BF2;">${(stats.avg_sleep ?? 0) > 0 ? `${Number(stats.avg_sleep).toFixed(1)}h` : '–'}</div>
              <div style="font-size:7px;color:#777;">AVG SLEEP</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:16px;font-weight:800;color:#6F4BF2;">${Math.round(stats.avg_steps ?? 0) >= 1000 ? `${(Math.round(stats.avg_steps ?? 0) / 1000).toFixed(1)}k` : Math.round(stats.avg_steps ?? 0)}</div>
              <div style="font-size:7px;color:#777;">AVG STEPS</div>
            </div>
          </div>
          ${fatigueHtml}
        </div>
      </div>

    </div>
  </div>

  <!-- ── FOOTER ── -->
  <div class="footer">
    ${logoUri ? `<img src="${logoUri}" class="footer-logo"/>` : ''}
    <span>Generated ${fmtFull(new Date())} · BodyQ — Your Intelligent Fitness Companion</span>
  </div>

</body>
</html>`;
}

function buildAlexiSummary(data) {
  const { workout, nutrition, profile, peakScore } = data;
  const streak = profile.login_streak ?? 0;
  const parts = [];

  if (streak >= 7)
    parts.push(`${streak}-day streak — that consistency is your superpower.`);
  else if (streak > 0)
    parts.push(`You're at ${streak} days. Keep showing up daily to build momentum.`);

  if (workout.count >= 3)
    parts.push(`${workout.count} workouts logged — solid volume.`);
  else if (workout.count > 0)
    parts.push(`${workout.count} workout${workout.count > 1 ? 's' : ''} so far. Aim for 3+ next period.`);

  if (peakScore >= 70)
    parts.push(`Peak score of ${peakScore} shows you can perform at a high level.`);

  if (nutrition?.avgProtein >= 50)
    parts.push(`Protein is on point.`);
  else if (nutrition)
    parts.push(`Bump up protein for better recovery.`);

  if (!parts.length)
    parts.push(`Start logging consistently and we'll unlock sharper insights together.`);

  return parts.join(' ');
}

// ── Main exports ─────────────────────────────────────────────────────────────

export async function buildReportHtmlForViewing(userId, reportType) {
  const [logoUri, mascotUri, data] = await Promise.all([
    loadImageBase64(require('../assets/BodyQ_Logo.png')),
    loadImageBase64(require('../assets/yara_spirit.png')),
    fetchReportData(userId, reportType),
  ]);

  return buildReportHtml({ reportType, data, logoUri, mascotUri });
}

export async function saveReportAsPdf(html) {
  const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 });
  const { isAvailableAsync, shareAsync } = await import('expo-sharing');
  if (await isAvailableAsync()) {
    await shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
  return uri;
}
