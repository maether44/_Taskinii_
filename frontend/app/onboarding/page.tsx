'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

// ── Data (mirrors mobile-frontend/constants/onBoardingData.js exactly) ────────
const STEPS = [
  { id: 'goal',      emoji: '🎯', label: 'Your Goal'  },
  { id: 'body',      emoji: '📏', label: 'About You'  },
  { id: 'xp',        emoji: '💪', label: 'Experience' },
  { id: 'schedule',  emoji: '📅', label: 'Schedule'   },
  { id: 'equipment', emoji: '🏋️', label: 'Equipment'  },
  { id: 'lifestyle', emoji: '🌙', label: 'Lifestyle'  },
  { id: 'plan',      emoji: '✨', label: 'Your Plan'  },
];

const GOALS = [
  { id: 'lose_fat',     emoji: '🔥', title: 'Lose Weight',  sub: 'Burn fat, get leaner'      },
  { id: 'gain_muscle',  emoji: '💪', title: 'Build Muscle', sub: 'Get stronger and bigger'   },
  { id: 'maintain',     emoji: '⚖️', title: 'Stay Healthy', sub: 'Maintain and feel great'   },
  { id: 'gain_weight',  emoji: '🍽️', title: 'Gain Weight',  sub: 'Healthy bulk and mass'     },
  { id: 'build_habits', emoji: '🧠', title: 'Build Habits', sub: 'Consistency and lifestyle' },
];

const EXPERIENCE = [
  { id: 'beginner',     emoji: '🌱', title: 'Just Starting',   sub: 'Less than 6 months'   },
  { id: 'intermediate', emoji: '🏃', title: 'Some Experience', sub: '6 months – 2 years'   },
  { id: 'advanced',     emoji: '🦅', title: 'Experienced',     sub: '2+ years of training' },
];

const DAYS = [2, 3, 4, 5, 6];

const DURATIONS = [
  { v: 30, label: '30 min' }, { v: 45, label: '45 min' },
  { v: 60, label: '1 hr'   }, { v: 75, label: '75 min' }, { v: 90, label: '90 min' },
];

const TIMES = [
  { id: 'morning',   emoji: '🌅', label: 'Morning'   },
  { id: 'afternoon', emoji: '☀️', label: 'Afternoon' },
  { id: 'evening',   emoji: '🌙', label: 'Evening'   },
  { id: 'any',       emoji: '🔄', label: 'Any time'  },
];

const EQUIPMENT = [
  { id: 'full_gym',     emoji: '🏢', title: 'Full Gym',         sub: 'All machines & equipment' },
  { id: 'home_weights', emoji: '🏠', title: 'Home Gym',         sub: 'Dumbbells & barbells'     },
  { id: 'bodyweight',   emoji: '🤸', title: 'No Equipment',     sub: 'Just my body'             },
  { id: 'bands',        emoji: '🎽', title: 'Resistance Bands', sub: 'Bands & bodyweight'       },
];

const FOCUS_OPTIONS = [
  { id: 'chest',     label: 'Chest'     }, { id: 'back',      label: 'Back'      },
  { id: 'legs',      label: 'Legs'      }, { id: 'shoulders', label: 'Shoulders' },
  { id: 'arms',      label: 'Arms'      }, { id: 'core',      label: 'Core'      },
  { id: 'glutes',    label: 'Glutes'    }, { id: 'cardio',    label: 'Cardio'    },
];

const INJURIES = [
  { id: 'none',     label: 'None ✓'     }, { id: 'knee',     label: 'Knee'       },
  { id: 'back',     label: 'Lower Back' }, { id: 'shoulder', label: 'Shoulder'   },
  { id: 'wrist',    label: 'Wrist'      }, { id: 'hip',       label: 'Hip'        },
];

const SLEEP = [
  { id: 'poor',  label: '< 6 hrs', color: '#FF6B6B' },
  { id: 'ok',    label: '6–7 hrs', color: '#F5A623' },
  { id: 'good',  label: '7–8 hrs', color: '#2ECC71' },
  { id: 'great', label: '8+ hrs',  color: '#2ECC71' },
];

const STRESS = [
  { id: 'low',    emoji: '😌', label: 'Relaxed'  },
  { id: 'medium', emoji: '😐', label: 'Moderate' },
  { id: 'high',   emoji: '😓', label: 'Stressed' },
];

const DIET = [
  { id: 'anything', label: 'I eat everything'   },
  { id: 'protein',  label: 'High protein focus' },
  { id: 'veggie',   label: 'Vegetarian'          },
  { id: 'vegan',    label: 'Vegan'               },
  { id: 'lowcarb',  label: 'Low carb / Keto'    },
];

const ACTIVITY = [
  { id: 'sedentary',   label: 'Mostly sitting',       mult: 1.2   },
  { id: 'light',       label: 'Light movement',       mult: 1.375 },
  { id: 'moderate',    label: 'Active job/lifestyle', mult: 1.55  },
  { id: 'active',      label: 'Very active',          mult: 1.725 },
  { id: 'very_active', label: 'Extremely active',     mult: 1.9   },
];

// ── Calculations (mirrors mobile-frontend/lib/calculations.ts) ────────────────
function calcAgeFromISO(dob: string): number | null {
  if (!dob || dob.length !== 10) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasBday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasBday) age--;
  return age;
}

function calcBMR(gender: string | null, weight: string, height: string, dob: string): number {
  const w = parseFloat(weight), h = parseFloat(height), a = calcAgeFromISO(dob);
  if (!w || !h || !a) return 0;
  return Math.round(
    gender === 'female' ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5
  );
}

function calcTDEE(bmr: number, activityId: string | null): number {
  const mult = ACTIVITY.find((x) => x.id === activityId)?.mult ?? 1.55;
  return bmr ? Math.round(bmr * mult) : 0;
}

function calcCalTarget(tdee: number, goal: string | null): number {
  if (!tdee) return 0;
  if (goal === 'lose_fat') return tdee - 400;
  if (goal === 'gain_muscle') return tdee + 200;
  return tdee;
}

function calcProtein(weight: string): number {
  const w = parseFloat(weight);
  return w ? Math.round(w * 2) : 0;
}

function calcBMI(weight: string, height: string): string | null {
  const w = parseFloat(weight), h = parseFloat(height);
  return w && h ? (w / (h / 100) ** 2).toFixed(1) : null;
}

function bmiStatus(bmi: string | null): string {
  if (!bmi) return '';
  const n = parseFloat(bmi);
  if (n < 18.5) return 'Underweight';
  if (n < 25) return 'Normal weight ✅';
  if (n < 30) return 'Overweight';
  return 'Obese';
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Exercise { name: string; sets: number; reps: string; rest: string; }
interface PlanDay  { name: string; focus: string; exercises: Exercise[]; coachTip: string; }
interface AIPlan   { intro: string; days: PlanDay[]; nutritionNote: string; recoveryNote: string; motivationNote: string; }

// ── Sub-components ─────────────────────────────────────────────────────────────
function SelectCard({ emoji, title, sub, selected, onSelect }: {
  emoji?: string; title: string; sub?: string; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
        background: selected ? 'rgba(124,92,252,0.15)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? '#7C5CFC' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
        transition: 'all 150ms ease', marginBottom: 8,
      }}
      onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
    >
      {emoji && <span style={{ fontSize: 20, flexShrink: 0 }}>{emoji}</span>}
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: 14, color: selected ? '#fff' : 'rgba(255,255,255,0.55)' }}>{title}</div>
        {sub && <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{sub}</div>}
      </div>
      {selected && (
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#7C5CFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
        </div>
      )}
    </button>
  );
}

function PillBtn({ label, selected, onSelect, color }: {
  label: string; selected: boolean; onSelect: () => void; color?: string;
}) {
  const activeColor = color ?? '#7C5CFC';
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        border: `1px solid ${selected ? activeColor : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 999, padding: '10px 20px',
        background: selected ? `${activeColor}30` : 'transparent',
        color: selected ? '#fff' : 'rgba(255,255,255,0.5)',
        fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: selected ? 500 : 400,
        cursor: 'pointer', transition: 'all 150ms ease', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function FieldInput({ label, value, onChange, placeholder, unit, inputType = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; unit?: string; inputType?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', height: 48, background: 'rgba(30,23,53,1)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
            padding: unit ? '0 40px 0 16px' : '0 16px',
            fontFamily: 'var(--font-inter)', fontSize: 15, color: '#fff',
            outline: 'none', boxSizing: 'border-box', transition: 'border-color 150ms ease, box-shadow 150ms ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#7C5CFC';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,92,252,0.20)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        {unit && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const h2Style: React.CSSProperties = {
  fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 28,
  color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.01em',
  lineHeight: 1.1, margin: '0 0 10px',
};
const descStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter)', fontWeight: 400, fontSize: 15,
  color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, margin: 0,
};
const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--font-inter)', fontWeight: 500, fontSize: 11,
  textTransform: 'uppercase', letterSpacing: '0.10em',
  color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 10,
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  // Navigation state
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [userRole, setUserRole] = useState('');

  // Form fields
  const [goal, setGoal] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [dob, setDob] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetW, setTargetW] = useState('');
  const [activity, setActivity] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [injuries, setInjuries] = useState<string[]>([]);
  const [days, setDays] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [focus, setFocus] = useState<string[]>([]);
  const [sleep, setSleep] = useState<string | null>(null);
  const [stress, setStress] = useState<string | null>(null);
  const [diet, setDiet] = useState<string | null>(null);

  // UI state
  const [aiPlan, setAiPlan] = useState<AIPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Derived
  const bmr = calcBMR(gender, weight, height, dob);
  const tdee = calcTDEE(bmr, activity);
  const calTarget = calcCalTarget(tdee, goal);
  const protein = calcProtein(weight);
  const bmi = calcBMI(weight, height);

  // Multi-select toggles
  const toggleInjury = (id: string) => {
    if (id === 'none') { setInjuries(['none']); return; }
    setInjuries((p) =>
      p.filter((x) => x !== 'none').includes(id)
        ? p.filter((x) => x !== id)
        : [...p.filter((x) => x !== 'none'), id]
    );
  };
  const toggleFocus = (id: string) => {
    setFocus((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p));
  };

  // Per-step validation (matches mobile exactly)
  const canGoArr = [
    !!goal,
    !!(gender && dob && dob.length === 10 && height && weight && activity),
    !!experience,
    !!(days && duration && timeOfDay),
    !!equipment,
    !!(sleep && stress && diet),
    true,
  ];
  const canGo = canGoArr[step] ?? false;

  // Resume from existing profile on mount
  useEffect(() => {
    async function checkResume() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('goal, onboarded, gender, date_of_birth, height_cm, weight_kg, activity_level, experience, equipment, sleep_quality, stress_level, diet_pref, role')
        .eq('id', user.id)
        .single();

      if (profile?.onboarded) {
        const role = profile.role as string ?? '';
        router.push(['admin', 'super_admin'].includes(role) ? '/dashboard' : '/app');
        return;
      }

      // Pre-populate existing data
      if (profile?.goal) setGoal(profile.goal as string);
      if (profile?.gender) setGender(profile.gender as string);
      if (profile?.date_of_birth) setDob(profile.date_of_birth as string);
      if (profile?.height_cm) setHeight(String(profile.height_cm));
      if (profile?.weight_kg) setWeight(String(profile.weight_kg));
      if (profile?.activity_level) setActivity(profile.activity_level as string);
      if (profile?.experience) setExperience(profile.experience as string);
      if (profile?.equipment) setEquipment(profile.equipment as string);
      if (profile?.sleep_quality) setSleep(profile.sleep_quality as string);
      if (profile?.stress_level) setStress(profile.stress_level as string);
      if (profile?.diet_pref) setDiet(profile.diet_pref as string);

      // Determine resume step
      if (!profile?.goal) { setStep(0); return; }
      if (!profile?.gender || !profile?.date_of_birth || !profile?.height_cm || !profile?.weight_kg || !profile?.activity_level) { setStep(1); return; }
      if (!profile?.experience) { setStep(2); return; }
      if (!profile?.equipment) { setStep(4); return; }
      if (!profile?.sleep_quality || !profile?.stress_level || !profile?.diet_pref) { setStep(5); return; }
    }
    checkResume();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation handlers
  const goNext = async () => {
    // Step 5 → 6: generate AI plan
    if (step === 5) {
      setDirection(1);
      setStep(6);
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal, gender, dob, height, weight, targetW, activity, experience, injuries, days, duration, timeOfDay, equipment, focus, sleep, stress, diet, calTarget, protein }),
        });
        if (!res.ok) throw new Error('Plan generation failed');
        const plan = await res.json();
        if (plan.error) throw new Error(plan.error);
        setAiPlan(plan as AIPlan);
      } catch {
        setLoadError('Could not generate your plan. Please retry.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Step 6: save and complete
    if (step === 6) {
      setSavingProfile(true);
      setSaveError(null);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user found');

        // Save profile — column names match mobile profileService.ts exactly
        const { error: profErr } = await supabase.from('profiles').upsert({
          id: user.id,
          gender,
          date_of_birth: dob,
          height_cm: parseFloat(height),
          weight_kg: parseFloat(weight),
          goal,
          activity_level: activity,
          onboarded: true,
          updated_at: new Date().toISOString(),
          experience,
          equipment,
          sleep_quality: sleep,
          stress_level: stress,
          diet_pref: diet,
        });
        if (profErr) throw new Error(profErr.message);

        // Save calorie targets — matches mobile profileService.ts exactly
        const { error: calErr } = await supabase.from('calorie_targets').insert({
          user_id: user.id,
          daily_calories: parseInt(String(calTarget)),
          protein_target: parseInt(String(protein)),
          effective_from: new Date().toISOString().split('T')[0],
        });
        // Ignore duplicate inserts (retry scenario)
        if (calErr && !calErr.message.toLowerCase().includes('duplicate')) throw new Error(calErr.message);

        // Fetch name + role for completion screen
        const { data: prof } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single();
        setFirstName(((prof?.full_name as string | null) ?? '').split(' ')[0]);
        setUserRole((prof?.role as string | null) ?? '');
        setCompleted(true);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save your profile. Please try again.');
      } finally {
        setSavingProfile(false);
      }
      return;
    }

    setDirection(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step === 0) return;
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const retryPlan = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, gender, dob, height, weight, targetW, activity, experience, injuries, days, duration, timeOfDay, equipment, focus, sleep, stress, diet, calTarget, protein }),
      });
      if (!res.ok) throw new Error('Plan generation failed');
      const plan = await res.json();
      if (plan.error) throw new Error(plan.error);
      setAiPlan(plan as AIPlan);
    } catch {
      setLoadError('Still having trouble. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    router.push(['admin', 'super_admin'].includes(userRole) ? '/dashboard' : '/app');
  };

  const isCTADisabled = !canGo || (step === 6 && !aiPlan && !loadError) || loading || savingProfile;
  const ctaLabel = step === 6 ? 'Start Training with Yara 🚀' : step === 5 ? 'Generate My Plan ✨' : 'Continue';

  // Framer Motion named variants — safe typing with custom direction
  const stepVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  };

  // ── Completion screen ────────────────────────────────────────────────────────
  if (completed) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% -10%, rgba(124,92,252,0.40) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 480 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <motion.circle
                cx="40" cy="40" r="36"
                stroke="#C8F135" strokeWidth="3" fill="none"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={prefersReducedMotion ? {} : { duration: 0.6, ease: 'easeOut' }}
              />
              <motion.path
                d="M24 40l12 12 20-20"
                stroke="#C8F135" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={prefersReducedMotion ? {} : { duration: 0.4, ease: 'easeOut', delay: 0.5 }}
              />
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 32, color: '#fff', marginBottom: 16, lineHeight: 1.1 }}>
            YOU&apos;RE ALL SET{firstName ? `, ${firstName.toUpperCase()}` : ''}!
          </h1>
          <p style={{ fontFamily: 'var(--font-inter)', fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 32 }}>
            Your personalised plan is ready. Yara is waiting to coach you.
          </p>
          <button
            onClick={handleFinish}
            style={{ background: '#C8F135', color: '#000', fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: 999, padding: '14px 40px', border: 'none', cursor: 'pointer', transition: 'all 150ms ease' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#D4FF4A'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#C8F135'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            {['admin', 'super_admin'].includes(userRole) ? 'Go to Dashboard' : 'Start Training with Yara 🚀'}
          </button>
        </div>
      </div>
    );
  }

  // ── Main onboarding flow ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 80 }}>
      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 50% -10%, rgba(124,92,252,0.40) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.06)', zIndex: 20 }}>
        <motion.div
          style={{ height: '100%', background: '#C8F135', borderRadius: 1 }}
          animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          transition={prefersReducedMotion ? {} : { duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 560, padding: '60px 24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 10 : 8, height: i === step ? 10 : 8, borderRadius: '50%',
              background: i === step ? '#C8F135' : i < step ? '#7C5CFC' : 'rgba(255,255,255,0.15)',
              transition: 'all 200ms ease', flexShrink: 0,
            }} />
          ))}
        </div>

        {/* Step pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(124,92,252,0.12)', border: '1px solid rgba(124,92,252,0.25)', borderRadius: 999, padding: '6px 14px', marginBottom: 24 }}>
          <span style={{ fontSize: 14 }}>{STEPS[step].emoji}</span>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'rgba(200,160,255,0.85)', fontWeight: 500 }}>
            {step + 1}/{STEPS.length} — {STEPS[step].label}
          </span>
        </div>

        {/* Card */}
        <div style={{ width: '100%', background: 'rgba(124,92,252,0.08)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 40 }}>

          {/* Save error banner */}
          {saveError && (
            <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: '#EF4444', flex: 1 }}>{saveError}</span>
              <button type="button" onClick={goNext} style={{ background: '#C8F135', color: '#000', fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 12, borderRadius: 999, padding: '6px 14px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Retry Save
              </button>
            </div>
          )}

          {/* Animated step content */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial={prefersReducedMotion ? false : 'enter'}
              animate="center"
              exit={prefersReducedMotion ? undefined : 'exit'}
              transition={{ duration: 0.2 }}
            >

              {/* ── STEP 0: GOAL ── */}
              {step === 0 && (
                <>
                  <h2 style={h2Style}>WHAT&apos;S YOUR<br />MAIN GOAL?</h2>
                  <p style={descStyle}>This shapes everything — your workouts, nutrition and how Yara coaches you.</p>
                  <div style={{ marginTop: 24 }}>
                    {GOALS.map((g) => (
                      <SelectCard key={g.id} emoji={g.emoji} title={g.title} sub={g.sub} selected={goal === g.id} onSelect={() => setGoal(g.id)} />
                    ))}
                  </div>
                </>
              )}

              {/* ── STEP 1: BODY ── */}
              {step === 1 && (
                <>
                  <h2 style={h2Style}>A BIT ABOUT<br />YOURSELF</h2>
                  <p style={descStyle}>This lets Yara calculate your exact calorie and macro targets.</p>
                  <div style={{ marginTop: 24 }}>
                    <span style={sectionLabel}>Gender</span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                      {['Male', 'Female', 'Other'].map((g) => (
                        <PillBtn key={g} label={g} selected={gender === g.toLowerCase()} onSelect={() => setGender(g.toLowerCase())} />
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <FieldInput label="Height" value={height} onChange={setHeight} placeholder="175" unit="cm" />
                      <FieldInput label="Date of Birth" value={dob} onChange={setDob} inputType="date" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <FieldInput label="Current Weight" value={weight} onChange={setWeight} placeholder="75" unit="kg" />
                      <FieldInput label="Target Weight" value={targetW} onChange={setTargetW} placeholder="68" unit="kg" />
                    </div>
                    {bmi && (
                      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Your BMI</div>
                          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 24, color: parseFloat(bmi) >= 18.5 && parseFloat(bmi) < 25 ? '#2ECC71' : '#F5A623' }}>{bmi}</div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{bmiStatus(bmi)}</div>
                      </div>
                    )}
                    <span style={{ ...sectionLabel, marginTop: 8 }}>Daily activity level <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(outside gym)</span></span>
                    <div style={{ marginTop: 4 }}>
                      {ACTIVITY.map((a) => (
                        <SelectCard key={a.id} title={a.label} selected={activity === a.id} onSelect={() => setActivity(a.id)} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 2: EXPERIENCE ── */}
              {step === 2 && (
                <>
                  <h2 style={h2Style}>TRAINING<br />EXPERIENCE</h2>
                  <p style={descStyle}>Yara adjusts exercise complexity, volume and progression based on where you are.</p>
                  <div style={{ marginTop: 24 }}>
                    {EXPERIENCE.map((e) => (
                      <SelectCard key={e.id} emoji={e.emoji} title={e.title} sub={e.sub} selected={experience === e.id} onSelect={() => setExperience(e.id)} />
                    ))}
                  </div>
                  <div style={{ marginTop: 28 }}>
                    <span style={sectionLabel}>Any injuries or limitations?</span>
                    <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
                      Yara will automatically swap exercises to keep you safe.
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {INJURIES.map((inj) => (
                        <PillBtn key={inj.id} label={inj.label} selected={injuries.includes(inj.id)} onSelect={() => toggleInjury(inj.id)} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 3: SCHEDULE ── */}
              {step === 3 && (
                <>
                  <h2 style={h2Style}>YOUR SCHEDULE</h2>
                  <p style={descStyle}>Yara builds around your real life — not an ideal version of it.</p>
                  <div style={{ marginTop: 24 }}>
                    <span style={sectionLabel}>Days per week</span>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                      {DAYS.map((d) => (
                        <button
                          key={d} type="button" onClick={() => setDays(d)}
                          style={{
                            width: 52, height: 60, borderRadius: 10,
                            background: days === d ? '#7C5CFC' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${days === d ? '#7C5CFC' : 'rgba(255,255,255,0.08)'}`,
                            cursor: 'pointer', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 2, transition: 'all 150ms ease',
                          }}
                        >
                          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 20, color: days === d ? '#fff' : 'rgba(255,255,255,0.55)' }}>{d}</span>
                          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: days === d ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}>days</span>
                        </button>
                      ))}
                    </div>
                    <span style={{ ...sectionLabel, marginBottom: 12 }}>Session length</span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                      {DURATIONS.map((d) => (
                        <PillBtn key={d.v} label={d.label} selected={duration === d.v} onSelect={() => setDuration(d.v)} />
                      ))}
                    </div>
                    <span style={{ ...sectionLabel, marginBottom: 12 }}>Preferred workout time</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                      {TIMES.map((t) => (
                        <button
                          key={t.id} type="button" onClick={() => setTimeOfDay(t.id)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                            padding: '14px 12px',
                            background: timeOfDay === t.id ? 'rgba(124,92,252,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${timeOfDay === t.id ? '#7C5CFC' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 10, cursor: 'pointer', transition: 'all 150ms ease',
                          }}
                        >
                          <span style={{ fontSize: 20 }}>{t.emoji}</span>
                          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 500, color: timeOfDay === t.id ? '#7C5CFC' : 'rgba(255,255,255,0.5)' }}>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 4: EQUIPMENT & FOCUS ── */}
              {step === 4 && (
                <>
                  <h2 style={h2Style}>EQUIPMENT<br />&amp; FOCUS</h2>
                  <p style={descStyle}>Yara will only give you exercises you can actually do with what you have.</p>
                  <div style={{ marginTop: 24 }}>
                    {EQUIPMENT.map((e) => (
                      <SelectCard key={e.id} emoji={e.emoji} title={e.title} sub={e.sub} selected={equipment === e.id} onSelect={() => setEquipment(e.id)} />
                    ))}
                  </div>
                  <div style={{ marginTop: 28 }}>
                    <span style={sectionLabel}>Priority muscle groups <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(pick up to 3)</span></span>
                    <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
                      Yara will give these areas extra attention each week.
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {FOCUS_OPTIONS.map((f) => (
                        <PillBtn key={f.id} label={f.label} selected={focus.includes(f.id)} onSelect={() => toggleFocus(f.id)} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 5: LIFESTYLE ── */}
              {step === 5 && (
                <>
                  <h2 style={h2Style}>RECOVERY &amp;<br />LIFESTYLE</h2>
                  <p style={descStyle}>Recovery is where progress actually happens. Yara takes this seriously.</p>
                  <div style={{ marginTop: 24 }}>
                    <span style={sectionLabel}>How much do you sleep?</span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                      {SLEEP.map((sl) => (
                        <PillBtn key={sl.id} label={sl.label} selected={sleep === sl.id} onSelect={() => setSleep(sl.id)} color={sl.color} />
                      ))}
                    </div>
                    <span style={{ ...sectionLabel, marginBottom: 12 }}>Stress level day-to-day</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
                      {STRESS.map((st) => (
                        <button
                          key={st.id} type="button" onClick={() => setStress(st.id)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 12px',
                            background: stress === st.id ? 'rgba(124,92,252,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${stress === st.id ? '#7C5CFC' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 10, cursor: 'pointer', transition: 'all 150ms ease',
                          }}
                        >
                          <span style={{ fontSize: 20 }}>{st.emoji}</span>
                          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 500, color: stress === st.id ? '#7C5CFC' : 'rgba(255,255,255,0.5)' }}>{st.label}</span>
                        </button>
                      ))}
                    </div>
                    <span style={{ ...sectionLabel, marginBottom: 12 }}>Diet preference</span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {DIET.map((d) => (
                        <PillBtn key={d.id} label={d.label} selected={diet === d.id} onSelect={() => setDiet(d.id)} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 6: AI PLAN ── */}
              {step === 6 && (
                <>
                  {/* Yara coach card */}
                  <div style={{ background: 'linear-gradient(135deg, #7C5CFC 0%, #4A28D4 100%)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                        👩‍⚕️
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, color: '#fff' }}>Yara</div>
                        <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>Your Personal Coach</div>
                      </div>
                      <div style={{ background: 'rgba(200,241,53,0.2)', border: '1px solid rgba(200,241,53,0.4)', borderRadius: 999, padding: '3px 10px', fontFamily: 'var(--font-inter)', fontSize: 11, color: '#C8F135', fontWeight: 600 }}>
                        AI ✦
                      </div>
                    </div>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: 0 }}>
                      {loading
                        ? "I'm analysing everything you shared and building your personalised plan... 🧠"
                        : aiPlan
                          ? aiPlan.intro
                          : loadError
                            ? 'Something went wrong generating your plan. Tap retry below.'
                            : "I've looked at everything you shared. Here's your personalised plan!"}
                    </p>
                  </div>

                  {/* Loading spinner */}
                  {loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 16 }}>
                      <div className="ob-spinner" />
                      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                        Yara is building your plan...
                      </p>
                    </div>
                  )}

                  {/* Load error */}
                  {loadError && !loading && (
                    <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: '#EF4444', flex: 1 }}>{loadError}</span>
                      <button type="button" onClick={retryPlan} style={{ background: '#C8F135', color: '#000', fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 12, borderRadius: 999, padding: '6px 14px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Plan display */}
                  {aiPlan && !loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
                      {/* Nutrition targets */}
                      {calTarget > 0 && (
                        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
                          <span style={sectionLabel}>Daily Nutrition Targets</span>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                            <div style={{ background: 'rgba(124,92,252,0.12)', border: '1px solid rgba(124,92,252,0.25)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 24, color: '#7C5CFC' }}>{calTarget}</div>
                              <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>kcal / day</div>
                              <div style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Calorie Target</div>
                            </div>
                            <div style={{ background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.25)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 24, color: '#2ECC71' }}>{protein}g</div>
                              <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>protein / day</div>
                              <div style={{ fontFamily: 'var(--font-inter)', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Protein Goal</div>
                            </div>
                          </div>
                          {aiPlan.nutritionNote && (
                            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, marginTop: 12, marginBottom: 0 }}>
                              {aiPlan.nutritionNote}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Training split */}
                      {aiPlan.days?.length > 0 && (
                        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
                          <span style={sectionLabel}>Your {days}-Day AI Training Split</span>
                          {aiPlan.days.map((day, i) => (
                            <div key={i} style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingTop: i > 0 ? 12 : 10, paddingBottom: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <div style={{ background: '#7C5CFC', borderRadius: 6, padding: '3px 10px', fontFamily: 'var(--font-inter)', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                                  Day {i + 1}
                                </div>
                                <div>
                                  <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 600, color: '#fff' }}>{day.name}</div>
                                  <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{day.focus} · {duration} min</div>
                                </div>
                              </div>
                              {day.exercises?.map((ex, j) => (
                                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: j > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(124,92,252,0.6)', flexShrink: 0 }} />
                                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: '#fff', flex: 1 }}>{ex.name}</span>
                                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: '#7C5CFC', fontWeight: 600, flexShrink: 0 }}>{ex.sets}×{ex.reps}</span>
                                  <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{ex.rest}</span>
                                </div>
                              ))}
                              {day.coachTip && (
                                <div style={{ background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.20)', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontFamily: 'var(--font-inter)', fontSize: 12, color: 'rgba(200,160,255,0.85)' }}>
                                  💬 {day.coachTip}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Coach notes */}
                      {(aiPlan.recoveryNote || aiPlan.motivationNote) && (
                        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
                          <span style={sectionLabel}>Yara&apos;s Notes for You</span>
                          {[{ icon: '🌙', note: aiPlan.recoveryNote }, { icon: '🔥', note: aiPlan.motivationNote }].map((n, i) =>
                            n.note ? (
                              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                                <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
                                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.55, margin: 0 }}>{n.note}</p>
                              </div>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Saving state */}
                  {savingProfile && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 12 }}>
                      <div className="ob-spinner" />
                      <p style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Saving your profile...</p>
                    </div>
                  )}
                </>
              )}

            </motion.div>
          </AnimatePresence>

          {/* CTA button (hidden while loading/saving) */}
          {!(step === 6 && (loading || savingProfile)) && (
            <div style={{ marginTop: 28 }}>
              <button
                type="button"
                onClick={goNext}
                disabled={isCTADisabled}
                style={{
                  width: '100%',
                  background: isCTADisabled ? 'rgba(200,241,53,0.25)' : '#C8F135',
                  color: isCTADisabled ? 'rgba(0,0,0,0.35)' : '#000',
                  fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 14,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  borderRadius: 999, padding: '14px 40px',
                  border: 'none', cursor: isCTADisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!isCTADisabled) {
                    (e.currentTarget as HTMLButtonElement).style.background = '#D4FF4A';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCTADisabled) {
                    (e.currentTarget as HTMLButtonElement).style.background = '#C8F135';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                  }
                }}
              >
                {ctaLabel}
              </button>
            </div>
          )}
        </div>

        {/* Back button — ghost, below card */}
        {step > 0 && !savingProfile && (
          <button
            type="button"
            onClick={goBack}
            style={{ marginTop: 20, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontSize: 14, color: 'rgba(255,255,255,0.4)', transition: 'color 150ms ease', padding: '8px 16px' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'; }}
          >
            ← Back
          </button>
        )}
      </div>

      {/* Spinner keyframes */}
      <style>{`
        .ob-spinner {
          width: 40px; height: 40px; border-radius: 50%;
          border: 3px solid rgba(200,241,53,0.2);
          border-top-color: #C8F135;
          animation: ob-spin 0.8s linear infinite;
        }
        @keyframes ob-spin { to { transform: rotate(360deg); } }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); }
        input::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
}
