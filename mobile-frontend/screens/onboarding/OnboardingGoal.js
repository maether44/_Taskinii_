// screens/onboarding/OnboardingGoal.js
// AI-generated plan: when user reaches Step 6, Groq generates a real
// personalised plan based on ALL their answers. No more hardcoded logic.

import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions, StatusBar,
    StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';

const GROQ_API_KEY = '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';

const { width: W } = Dimensions.get('window');

const THEMES = {
    dark: {
        bg: '#0E0C15', surface: '#18152A', card: '#201C35', border: '#2D2850',
        text: '#F4F0FF', sub: '#8B82AD', muted: '#3D3560', purple: '#7B61FF',
        purpleLight: '#A08AFF', lime: '#B8F566', green: '#2ECC71',
        orange: '#F5A623', red: '#FF6B6B', pill: '#2D2850',
    },
    light: {
        bg: '#F7F5FF', surface: '#FFFFFF', card: '#FFFFFF', border: '#E5E1F8',
        text: '#1A1535', sub: '#6B5F8A', muted: '#C5BEE8', purple: '#7B61FF',
        purpleLight: '#A08AFF', lime: '#5CB832', green: '#2ECC71',
        orange: '#F5A623', red: '#FF6B6B', pill: '#EDE9FF',
    },
};

const STEPS = [
    { id: 'goal', emoji: '🎯', label: 'Your Goal' },
    { id: 'body', emoji: '📏', label: 'About You' },
    { id: 'xp', emoji: '💪', label: 'Experience' },
    { id: 'schedule', emoji: '📅', label: 'Schedule' },
    { id: 'equipment', emoji: '🏋️', label: 'Equipment' },
    { id: 'lifestyle', emoji: '🌙', label: 'Lifestyle' },
    { id: 'plan', emoji: '✨', label: 'Your Plan' },
];

const GOALS = [
    { id: 'fat_loss', emoji: '🔥', title: 'Lose Weight', sub: 'Burn fat, get leaner' },
    { id: 'muscle', emoji: '💪', title: 'Build Muscle', sub: 'Get stronger and bigger' },
    { id: 'maintain', emoji: '⚖️', title: 'Stay Healthy', sub: 'Maintain and feel great' },
    { id: 'athletic', emoji: '⚡', title: 'Get Athletic', sub: 'Speed, power, endurance' },
];
const EXPERIENCE = [
    { id: 'beginner', emoji: '🌱', title: 'Just Starting', sub: 'Less than 6 months' },
    { id: 'intermediate', emoji: '🏃', title: 'Some Experience', sub: '6 months – 2 years' },
    { id: 'advanced', emoji: '🦅', title: 'Experienced', sub: '2+ years of training' },
];
const DAYS = [2, 3, 4, 5, 6];
const DURATIONS = [
    { v: 30, label: '30 min' }, { v: 45, label: '45 min' },
    { v: 60, label: '1 hr' }, { v: 75, label: '75 min' }, { v: 90, label: '90 min' },
];
const TIMES = [
    { id: 'morning', emoji: '🌅', label: 'Morning' },
    { id: 'afternoon', emoji: '☀️', label: 'Afternoon' },
    { id: 'evening', emoji: '🌙', label: 'Evening' },
    { id: 'any', emoji: '🔄', label: 'Any time' },
];
const EQUIPMENT = [
    { id: 'full_gym', emoji: '🏢', title: 'Full Gym', sub: 'All machines & equipment' },
    { id: 'home_weights', emoji: '🏠', title: 'Home Gym', sub: 'Dumbbells & barbells' },
    { id: 'bodyweight', emoji: '🤸', title: 'No Equipment', sub: 'Just my body' },
    { id: 'bands', emoji: '🎽', title: 'Resistance Bands', sub: 'Bands & bodyweight' },
];
const FOCUS = [
    { id: 'chest', label: 'Chest' }, { id: 'back', label: 'Back' },
    { id: 'legs', label: 'Legs' }, { id: 'shoulders', label: 'Shoulders' },
    { id: 'arms', label: 'Arms' }, { id: 'core', label: 'Core' },
    { id: 'glutes', label: 'Glutes' }, { id: 'cardio', label: 'Cardio' },
];
const INJURIES = [
    { id: 'none', label: 'None ✓' }, { id: 'knee', label: 'Knee' },
    { id: 'back', label: 'Lower Back' }, { id: 'shoulder', label: 'Shoulder' },
    { id: 'wrist', label: 'Wrist' }, { id: 'hip', label: 'Hip' },
];
const SLEEP = [
    { id: 'poor', label: '< 6 hrs', color: '#FF6B6B' }, { id: 'ok', label: '6–7 hrs', color: '#F5A623' },
    { id: 'good', label: '7–8 hrs', color: '#2ECC71' }, { id: 'great', label: '8+ hrs', color: '#2ECC71' },
];
const STRESS = [
    { id: 'low', emoji: '😌', label: 'Relaxed' },
    { id: 'medium', emoji: '😐', label: 'Moderate' },
    { id: 'high', emoji: '😓', label: 'Stressed' },
];
const DIET = [
    { id: 'anything', label: 'I eat everything' }, { id: 'protein', label: 'High protein focus' },
    { id: 'veggie', label: 'Vegetarian' }, { id: 'vegan', label: 'Vegan' },
    { id: 'lowcarb', label: 'Low carb / Keto' },
];
const ACTIVITY = [
    { id: 'sedentary', label: 'Mostly sitting', mult: 1.2 },
    { id: 'light', label: 'Light movement', mult: 1.375 },
    { id: 'moderate', label: 'Active job/lifestyle', mult: 1.55 },
    { id: 'active', label: 'Very active', mult: 1.725 },
];

// ── AI PLAN GENERATOR ─────────────────────────────────────────────────────────
async function generateAIPlan(answers) {
    const {
        goal, gender, age, height, weight, targetW, activity,
        experience, injuries, days, duration, timeOfDay,
        equipment, focus, sleep, stress, diet,
        calTarget, protein, tdee,
    } = answers;

    const injList = injuries?.filter(x => x !== 'none').join(', ') || 'none';
    const focusList = focus?.join(', ') || 'balanced';

    const prompt = `You are an expert fitness coach. Create a highly personalised ${days}-day training plan for this user.

USER PROFILE:
- Goal: ${goal} (${goal === 'fat_loss' ? 'lose body fat' : goal === 'muscle' ? 'build muscle' : goal === 'maintain' ? 'stay healthy' : 'athletic performance'})
- Gender: ${gender}, Age: ${age}, Height: ${height}cm, Weight: ${weight}kg${targetW ? `, Target: ${targetW}kg` : ''}
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

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            max_tokens: 4096,
            temperature: 0.4,
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data?.error));

    const text = data.choices?.[0]?.message?.content ?? '';
    // Extract JSON - find the outermost { } block
    const jsonMatch = text.match(/{[\s\S]*}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    let clean = jsonMatch[0];
    // Try direct parse first
    try { return JSON.parse(clean); } catch (e) { }
    // Fix common issues: trailing commas, unclosed strings
    clean = clean
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/[\x00-\x1F\x7F]/g, ' '); // remove control chars
    // Close any unclosed brackets
    const opens = (clean.match(/{/g) || []).length;
    const closes = (clean.match(/}/g) || []).length;
    for (let i = 0; i < opens - closes; i++) clean += '}';
    const aOpens = (clean.match(/\[/g) || []).length;
    const aCloses = (clean.match(/\]/g) || []).length;
    for (let i = 0; i < aOpens - aCloses; i++) clean += ']';
    try { return JSON.parse(clean); }
    catch (e2) { throw new Error('Could not parse AI response. Please retry.'); }
}

// ── UI COMPONENTS ─────────────────────────────────────────────────────────────
function SelectCard({ emoji, title, sub, selected, onPress, T }) {
    return (
        <TouchableOpacity
            style={[gc.selCard, { backgroundColor: T.card, borderColor: selected ? T.purple : T.border },
            selected && { backgroundColor: T.purple + '14' }]}
            onPress={onPress} activeOpacity={0.75}
        >
            {emoji ? <Text style={gc.selEmoji}>{emoji}</Text> : null}
            <View style={{ flex: 1 }}>
                <Text style={[gc.selTitle, { color: selected ? T.text : T.sub }]}>{title}</Text>
                {sub ? <Text style={[gc.selSub, { color: T.sub }]}>{sub}</Text> : null}
            </View>
            <View style={[gc.selCheck, { borderColor: selected ? T.purple : T.border },
            selected && { backgroundColor: T.purple }]}>
                {selected && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}
            </View>
        </TouchableOpacity>
    );
}

function PillButton({ label, selected, onPress, color, T }) {
    const c = color || T.purple;
    return (
        <TouchableOpacity
            style={[gc.pill, { borderColor: selected ? c : T.border, backgroundColor: selected ? c + '18' : T.card }]}
            onPress={onPress}
        >
            <Text style={[gc.pillTxt, { color: selected ? c : T.sub }]}>{label}</Text>
        </TouchableOpacity>
    );
}

function FieldInput({ label, value, onChange, placeholder, unit, T, optional }) {
    return (
        <View style={{ marginBottom: 16 }}>
            <Text style={[gc.label, { color: T.sub }]}>
                {label}{optional && <Text style={{ color: T.muted }}> (optional)</Text>}
            </Text>
            <View style={[gc.inputWrap, { backgroundColor: T.card, borderColor: T.border }]}>
                <TextInput
                    style={[gc.input, { color: T.text }]}
                    value={value} onChangeText={onChange}
                    placeholder={placeholder} placeholderTextColor={T.muted}
                    keyboardType="numeric" maxLength={4}
                />
                {unit && <Text style={[gc.inputUnit, { color: T.sub }]}>{unit}</Text>}
            </View>
        </View>
    );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function OnboardingGoal({ onComplete }) {
    const [isDark, setIsDark] = useState(true);
    const T = THEMES[isDark ? 'dark' : 'light'];

    const [step, setStep] = useState(0);
    const [aiPlan, setAiPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(null);

    const progress = useRef(new Animated.Value(0)).current;
    const fade = useRef(new Animated.Value(1)).current;

    const [goal, setGoal] = useState(null);
    const [gender, setGender] = useState(null);
    const [age, setAge] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [targetW, setTargetW] = useState('');
    const [activity, setActivity] = useState(null);
    const [experience, setExperience] = useState(null);
    const [injuries, setInjuries] = useState([]);
    const [days, setDays] = useState(null);
    const [duration, setDuration] = useState(null);
    const [timeOfDay, setTimeOfDay] = useState(null);
    const [equipment, setEquipment] = useState(null);
    const [focus, setFocus] = useState([]);
    const [sleep, setSleep] = useState(null);
    const [stress, setStress] = useState(null);
    const [diet, setDiet] = useState(null);

    const toggleInjury = id => {
        if (id === 'none') { setInjuries(['none']); return; }
        setInjuries(p => p.filter(x => x !== 'none').includes(id)
            ? p.filter(x => x !== id) : [...p.filter(x => x !== 'none'), id]);
    };
    const toggleFocus = id => {
        setFocus(p => p.includes(id) ? p.filter(x => x !== id) : p.length < 3 ? [...p, id] : p);
    };

    const w = parseFloat(weight), h = parseFloat(height), a = parseFloat(age);
    const bmr = (w && h && a)
        ? Math.round(gender === 'female' ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5) : 0;
    const mult = ACTIVITY.find(x => x.id === activity)?.mult || 1.55;
    const tdee = bmr ? Math.round(bmr * mult) : 0;
    const calTarget = tdee ? (goal === 'fat_loss' ? tdee - 400 : goal === 'muscle' ? tdee + 200 : tdee) : 0;
    const protein = w ? Math.round(w * 2) : 0;
    const bmi = (w && h) ? (w / ((h / 100) ** 2)).toFixed(1) : null;

    const canGo = [
        !!goal,
        !!(gender && age && height && weight && activity),
        !!experience,
        !!(days && duration && timeOfDay),
        !!equipment,
        !!(sleep && stress && diet),
        true,
    ][step];

    const animateTo = next => {
        Animated.timing(fade, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
            setStep(next);
            Animated.timing(progress, { toValue: (next + 1) / STEPS.length, duration: 300, useNativeDriver: false }).start();
            Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
        });
    };

    // When moving to step 6, trigger AI plan generation
    const goNext = async () => {
        if (step === 5) {
            // Animate to step 6 and start generating
            animateTo(6);
            setLoading(true);
            setLoadError(null);
            try {
                const answers = {
                    goal, gender, age, height, weight, targetW, activity, experience,
                    injuries, days, duration, timeOfDay, equipment, focus, sleep, stress, diet,
                    calTarget, protein, bmr, tdee,
                };
                const plan = await generateAIPlan(answers);
                setAiPlan(plan);
            } catch (err) {
                console.error('AI plan error:', err);
                setLoadError('Could not generate your plan. Tap retry.');
            } finally {
                setLoading(false);
            }
            return;
        }

        if (step < STEPS.length - 1) { animateTo(step + 1); return; }

        // Final step — complete onboarding
        onComplete?.({
            goal, gender, age, height, weight, targetW, activity, experience,
            injuries, days, duration, timeOfDay, equipment, focus, sleep, stress, diet,
            calTarget, protein, bmr, tdee, aiPlan,
        });
    };

    const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

    return (
        <View style={[gc.root, { backgroundColor: T.bg }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Top bar */}
            <View style={gc.topBar}>
                <View style={[gc.progressTrack, { backgroundColor: T.border }]}>
                    <Animated.View style={[gc.progressFill, { width: progressWidth, backgroundColor: T.purple }]} />
                </View>
                <TouchableOpacity style={[gc.themeBtn, { backgroundColor: T.card, borderColor: T.border }]}
                    onPress={() => setIsDark(d => !d)}>
                    <Text style={{ fontSize: 14 }}>{isDark ? '☀️' : '🌙'}</Text>
                </TouchableOpacity>
            </View>

            {/* Step pill */}
            <View style={gc.stepPillRow}>
                <View style={[gc.stepPill, { backgroundColor: T.purple + '18', borderColor: T.purple + '30' }]}>
                    <Text style={gc.stepPillEmoji}>{STEPS[step].emoji}</Text>
                    <Text style={[gc.stepPillTxt, { color: T.purple }]}>{step + 1}/{STEPS.length} — {STEPS[step].label}</Text>
                </View>
            </View>

            <Animated.ScrollView style={{ opacity: fade }} contentContainerStyle={gc.scroll}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* ── STEP 0: GOAL ── */}
                {step === 0 && <>
                    <Text style={[gc.h1, { color: T.text }]}>{"What's your"}{`\n`}main goal?</Text>
                    <Text style={[gc.bodyTxt, { color: T.sub }]}>This shapes everything — your workouts, nutrition and how Yara coaches you.</Text>
                    <View style={gc.cardList}>
                        {GOALS.map(g => <SelectCard key={g.id} emoji={g.emoji} title={g.title} sub={g.sub} selected={goal === g.id} onPress={() => setGoal(g.id)} T={T} />)}
                    </View>
                </>}

                {/* ── STEP 1: BODY ── */}
                {step === 1 && <>
                    <Text style={[gc.h1, { color: T.text }]}>A bit about{'\n'}yourself</Text>
                    <Text style={[gc.bodyTxt, { color: T.sub }]}>This lets Yara calculate your exact calorie and macro targets.</Text>
                    <Text style={[gc.label, { color: T.sub }]}>Gender</Text>
                    <View style={gc.rowWrap}>
                        {['Male', 'Female', 'Other'].map(g => (
                            <TouchableOpacity key={g}
                                style={[gc.genderBtn, { backgroundColor: T.card, borderColor: gender === g.toLowerCase() ? T.purple : T.border }, gender === g.toLowerCase() && { backgroundColor: T.purple + '14' }]}
                                onPress={() => setGender(g.toLowerCase())}>
                                <Text style={[gc.genderTxt, { color: gender === g.toLowerCase() ? T.purple : T.sub }]}>{g}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={gc.twoCol}>
                        <View style={{ flex: 1 }}><FieldInput label="Age" value={age} onChange={setAge} placeholder="25" unit="yrs" T={T} /></View>
                        <View style={{ flex: 1 }}><FieldInput label="Height" value={height} onChange={setHeight} placeholder="175" unit="cm" T={T} /></View>
                    </View>
                    <View style={gc.twoCol}>
                        <View style={{ flex: 1 }}><FieldInput label="Current weight" value={weight} onChange={setWeight} placeholder="75" unit="kg" T={T} /></View>
                        <View style={{ flex: 1 }}><FieldInput label="Target weight" value={targetW} onChange={setTargetW} placeholder="68" unit="kg" T={T} optional /></View>
                    </View>
                    {bmi && (
                        <View style={[gc.bmiRow, { backgroundColor: T.card, borderColor: T.border }]}>
                            <View>
                                <Text style={[gc.bmiLabel, { color: T.sub }]}>Your BMI</Text>
                                <Text style={[gc.bmiVal, { color: bmi < 25 && bmi >= 18.5 ? T.green : T.orange }]}>{bmi}</Text>
                            </View>
                            <Text style={[gc.bmiStatus, { color: T.sub }]}>
                                {bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight ✅' : bmi < 30 ? 'Overweight' : 'Obese'}
                            </Text>
                        </View>
                    )}
                    <Text style={[gc.label, { color: T.sub, marginTop: 20 }]}>Daily activity level <Text style={{ color: T.muted, fontWeight: '400' }}>(outside gym)</Text></Text>
                    <View style={gc.cardList}>
                        {ACTIVITY.map(a => <SelectCard key={a.id} title={a.label} selected={activity === a.id} onPress={() => setActivity(a.id)} T={T} />)}
                    </View>
                </>}

                {/* ── STEP 2: EXPERIENCE ── */}
                {step === 2 && <>
                    <Text style={[gc.h1, { color: T.text }]}>Training{'\n'}experience</Text>
                    <Text style={[gc.bodyTxt, { color: T.sub }]}>Yara adjusts exercise complexity, volume and progression based on where you are.</Text>
                    <View style={gc.cardList}>
                        {EXPERIENCE.map(e => <SelectCard key={e.id} emoji={e.emoji} title={e.title} sub={e.sub} selected={experience === e.id} onPress={() => setExperience(e.id)} T={T} />)}
                    </View>
                    <Text style={[gc.label, { color: T.sub, marginTop: 28 }]}>Any injuries or limitations?</Text>
                    <Text style={[gc.hint, { color: T.sub }]}>Yara will automatically swap exercises to keep you safe.</Text>
                    <View style={gc.pillWrap}>
                        {INJURIES.map(inj => <PillButton key={inj.id} label={inj.label} selected={injuries.includes(inj.id)} onPress={() => toggleInjury(inj.id)} color={inj.id === 'none' ? T.green : T.orange} T={T} />)}
                    </View>
                </>}

                {/* ── STEP 3: SCHEDULE ── */}
                {step === 3 && <>
                    <Text style={[gc.h1, { color: T.text }]}>Your schedule</Text>
                    <Text style={[gc.bodyTxt, { color: T.sub }]}>Yara builds around your real life — not an ideal version of it.</Text>
                    <Text style={[gc.label, { color: T.sub }]}>Days per week</Text>
                    <View style={gc.dayRow}>
                        {DAYS.map(d => (
                            <TouchableOpacity key={d}
                                style={[gc.dayBtn, { backgroundColor: T.card, borderColor: days === d ? T.purple : T.border }, days === d && { backgroundColor: T.purple }]}
                                onPress={() => setDays(d)}>
                                <Text style={[gc.dayNum, { color: days === d ? '#fff' : T.sub }]}>{d}</Text>
                                <Text style={[gc.dayLbl, { color: days === d ? 'rgba(255,255,255,0.7)' : T.muted }]}>days</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={[gc.label, { color: T.sub, marginTop: 22 }]}>Session length</Text>
                    <View style={gc.pillWrap}>
                        {DURATIONS.map(d => <PillButton key={d.v} label={d.label} selected={duration === d.v} onPress={() => setDuration(d.v)} T={T} />)}
                    </View>
                    <Text style={[gc.label, { color: T.sub, marginTop: 22 }]}>Preferred workout time</Text>
                    <View style={gc.timeRow}>
                        {TIMES.map(t => (
                            <TouchableOpacity key={t.id}
                                style={[gc.timeBtn, { backgroundColor: T.card, borderColor: timeOfDay === t.id ? T.purple : T.border }, timeOfDay === t.id && { backgroundColor: T.purple + '14', borderColor: T.purple }]}
                                onPress={() => setTimeOfDay(t.id)}>
                                <Text style={gc.timeEmoji}>{t.emoji}</Text>
                                <Text style={[gc.timeTxt, { color: timeOfDay === t.id ? T.purple : T.sub }]}>{t.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>}

                {/* ── STEP 4: EQUIPMENT ── */}
                {step === 4 && <>
                    <Text style={[gc.h1, { color: T.text }]}>Equipment{'\n'}& focus</Text>
                    <Text style={[gc.bodyTxt, { color: T.sub }]}>Yara will only give you exercises you can actually do with what you have.</Text>
                    <View style={gc.cardList}>
                        {EQUIPMENT.map(e => <SelectCard key={e.id} emoji={e.emoji} title={e.title} sub={e.sub} selected={equipment === e.id} onPress={() => setEquipment(e.id)} T={T} />)}
                    </View>
                    <Text style={[gc.label, { color: T.sub, marginTop: 28 }]}>Priority muscle groups <Text style={{ color: T.muted, fontWeight: '400' }}>(pick up to 3)</Text></Text>
                    <Text style={[gc.hint, { color: T.sub }]}>Yara will give these areas extra attention each week.</Text>
                    <View style={gc.pillWrap}>
                        {FOCUS.map(f => <PillButton key={f.id} label={f.label} selected={focus.includes(f.id)} onPress={() => toggleFocus(f.id)} T={T} />)}
                    </View>
                </>}

                {/* ── STEP 5: LIFESTYLE ── */}
                {step === 5 && <>
                    <Text style={[gc.h1, { color: T.text }]}>{'Recovery &'}{`\n`}lifestyle</Text>
                    <Text style={[gc.bodyTxt, { color: T.sub }]}>Recovery is where progress actually happens. Yara takes this seriously.</Text>
                    <Text style={[gc.label, { color: T.sub }]}>How much do you sleep?</Text>
                    <View style={gc.pillWrap}>
                        {SLEEP.map(sl => <PillButton key={sl.id} label={sl.label} selected={sleep === sl.id} onPress={() => setSleep(sl.id)} color={sl.color} T={T} />)}
                    </View>
                    <Text style={[gc.label, { color: T.sub, marginTop: 22 }]}>Stress level day-to-day</Text>
                    <View style={gc.stressRow}>
                        {STRESS.map(st => (
                            <TouchableOpacity key={st.id}
                                style={[gc.stressBtn, { backgroundColor: T.card, borderColor: stress === st.id ? T.purple : T.border }, stress === st.id && { backgroundColor: T.purple + '14', borderColor: T.purple }]}
                                onPress={() => setStress(st.id)}>
                                <Text style={gc.stressEmoji}>{st.emoji}</Text>
                                <Text style={[gc.stressTxt, { color: stress === st.id ? T.purple : T.sub }]}>{st.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={[gc.label, { color: T.sub, marginTop: 22 }]}>Diet preference</Text>
                    <View style={gc.pillWrap}>
                        {DIET.map(d => <PillButton key={d.id} label={d.label} selected={diet === d.id} onPress={() => setDiet(d.id)} T={T} />)}
                    </View>
                </>}

                {/* ── STEP 6: AI PLAN ── */}
                {step === 6 && <>
                    {/* Yara intro card */}
                    <View style={[gc.yaraCard, { backgroundColor: T.purple }]}>
                        <View style={gc.yaraTop}>
                            <View style={gc.yaraAvatar}><Text style={{ fontSize: 28 }}>👩‍⚕️</Text></View>
                            <View style={{ flex: 1 }}>
                                <Text style={gc.yaraName}>Yara</Text>
                                <Text style={gc.yaraRole}>Your Personal Coach</Text>
                            </View>
                            <View style={gc.yaraBadge}><Text style={gc.yaraBadgeTxt}>AI ✦</Text></View>
                        </View>
                        <Text style={gc.yaraMsg}>
                            {loading
                                ? "I'm analysing everything you shared and building your personalised plan... this takes just a moment 🧠"
                                : aiPlan
                                    ? aiPlan.intro
                                    : loadError
                                        ? "Something went wrong generating your plan. Tap retry below."
                                        : "I've looked at everything you shared. Here's your personalised plan!"}
                        </Text>
                    </View>

                    {/* Loading spinner */}
                    {loading && (
                        <View style={[gc.card, { backgroundColor: T.card, borderColor: T.border, alignItems: 'center', padding: 40 }]}>
                            <ActivityIndicator size="large" color={T.purple} />
                            <Text style={[gc.bodyTxt, { color: T.sub, textAlign: 'center', marginTop: 16 }]}>
                                Yara is building your plan{'\n'}based on your answers...
                            </Text>
                        </View>
                    )}

                    {/* Error + retry */}
                    {loadError && !loading && (
                        <TouchableOpacity
                            style={[gc.cta, { backgroundColor: T.orange, marginTop: 0 }]}
                            onPress={() => {
                                setLoading(true); setLoadError(null);
                                generateAIPlan({ goal, gender, age, height, weight, targetW, activity, experience, injuries, days, duration, timeOfDay, equipment, focus, sleep, stress, diet, calTarget, protein, bmr, tdee })
                                    .then(plan => { setAiPlan(plan); setLoading(false); })
                                    .catch(err => { setLoadError('Still having trouble. Check your connection.'); setLoading(false); });
                            }}>
                            <Text style={gc.ctaTxt}>🔄 Retry Plan Generation</Text>
                        </TouchableOpacity>
                    )}

                    {/* AI-generated plan */}
                    {aiPlan && !loading && <>
                        {/* Calorie targets */}
                        {calTarget > 0 && (
                            <View style={[gc.card, { backgroundColor: T.card, borderColor: T.border }]}>
                                <Text style={[gc.sectionLabel, { color: T.sub }]}>Daily Nutrition Targets</Text>
                                <View style={gc.targetsRow}>
                                    <View style={[gc.targetBox, { backgroundColor: T.purple + '14', borderColor: T.purple + '30' }]}>
                                        <Text style={[gc.targetBig, { color: T.purple }]}>{calTarget}</Text>
                                        <Text style={[gc.targetUnit, { color: T.sub }]}>kcal / day</Text>
                                        <Text style={[gc.targetLbl, { color: T.muted }]}>Calorie Target</Text>
                                    </View>
                                    <View style={[gc.targetBox, { backgroundColor: T.green + '14', borderColor: T.green + '30' }]}>
                                        <Text style={[gc.targetBig, { color: T.green }]}>{protein}g</Text>
                                        <Text style={[gc.targetUnit, { color: T.sub }]}>protein / day</Text>
                                        <Text style={[gc.targetLbl, { color: T.muted }]}>Protein Goal</Text>
                                    </View>
                                </View>
                                <View style={[gc.calNoteBox, { backgroundColor: T.pill, borderColor: T.border }]}>
                                    <Text style={[gc.calNoteTxt, { color: T.sub }]}>{aiPlan.nutritionNote}</Text>
                                </View>
                            </View>
                        )}

                        {/* Training days */}
                        <View style={[gc.card, { backgroundColor: T.card, borderColor: T.border }]}>
                            <Text style={[gc.sectionLabel, { color: T.sub }]}>Your {days}-Day AI Training Split</Text>
                            {(aiPlan.days || []).map((day, i) => (
                                <View key={i} style={[gc.planDayWrap, i < (aiPlan.days || []).length - 1 && { borderBottomWidth: 1, borderBottomColor: T.border }]}>
                                    <View style={gc.planDayRow}>
                                        <View style={[gc.planDayNum, { backgroundColor: T.purple }]}>
                                            <Text style={gc.planDayNumTxt}>Day {i + 1}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[gc.planDayName, { color: T.text }]}>{day.name}</Text>
                                            <Text style={[gc.planDayMeta, { color: T.sub }]}>{day.focus} · {duration} min</Text>
                                        </View>
                                    </View>
                                    {(day.exercises || []).map((ex, j) => (
                                        <View key={j} style={gc.exRow}>
                                            <View style={[gc.exDot, { backgroundColor: T.purple + '40' }]} />
                                            <Text style={[gc.exName, { color: T.text }]}>{ex.name}</Text>
                                            <Text style={[gc.exSets, { color: T.purple }]}>{ex.sets}×{ex.reps}</Text>
                                            <Text style={[gc.exRest, { color: T.muted }]}>{ex.rest}</Text>
                                        </View>
                                    ))}
                                    <View style={[gc.coachTipBox, { backgroundColor: T.purple + '10', borderColor: T.purple + '30' }]}>
                                        <Text style={[gc.coachTipTxt, { color: T.purpleLight }]}>💬 {day.coachTip}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Recovery & motivation */}
                        <View style={[gc.card, { backgroundColor: T.card, borderColor: T.border }]}>
                            <Text style={[gc.sectionLabel, { color: T.sub }]}>{'Yara\'s Notes for You'}</Text>
                            {[
                                { icon: '🌙', note: aiPlan.recoveryNote },
                                { icon: '🔥', note: aiPlan.motivationNote },
                            ].map((n, i) => (
                                <View key={i} style={[gc.noteRow, i > 0 && { borderTopWidth: 1, borderTopColor: T.border }]}>
                                    <Text style={gc.noteIcon}>{n.icon}</Text>
                                    <Text style={[gc.noteTxt, { color: T.text }]}>{n.note}</Text>
                                </View>
                            ))}
                        </View>
                    </>}
                </>}

                {/* Navigation */}
                {!(step === 6 && loading) && (
                    <TouchableOpacity
                        style={[gc.cta, { backgroundColor: (canGo && !(step === 6 && !aiPlan && !loadError)) ? T.purple : T.muted }]}
                        onPress={goNext}
                        disabled={!canGo || (step === 6 && !aiPlan && !loadError)}
                        activeOpacity={0.82}
                    >
                        <Text style={gc.ctaTxt}>
                            {step === 6 ? "Start Training with Yara 🚀" : step === 5 ? "Generate My Plan ✨" : "Continue"}
                        </Text>
                    </TouchableOpacity>
                )}

                {step > 0 && step !== 6 && (
                    <TouchableOpacity style={gc.backBtn} onPress={() => animateTo(step - 1)}>
                        <Text style={[gc.backTxt, { color: T.sub }]}>← Back</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </Animated.ScrollView>
        </View>
    );
}

const gc = StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 20 },

    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 52, paddingBottom: 12, gap: 14 },
    progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: 6, borderRadius: 3 },
    themeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

    stepPillRow: { paddingHorizontal: 22, marginBottom: 18 },
    stepPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, gap: 7, borderWidth: 1 },
    stepPillEmoji: { fontSize: 14 },
    stepPillTxt: { fontSize: 13, fontWeight: '700' },

    h1: { fontSize: 30, fontWeight: '900', lineHeight: 38, letterSpacing: -0.5, marginBottom: 8 },
    bodyTxt: { fontSize: 15, lineHeight: 23, marginBottom: 24 },
    label: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
    hint: { fontSize: 12, lineHeight: 18, marginTop: -6, marginBottom: 12 },

    cardList: { gap: 10 },
    selCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, gap: 14, borderWidth: 1.5 },
    selEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
    selTitle: { fontSize: 15, fontWeight: '700' },
    selSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
    selCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

    pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 4 },
    pill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5 },
    pillTxt: { fontSize: 13, fontWeight: '600' },

    rowWrap: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    genderBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center', borderWidth: 1.5 },
    genderTxt: { fontSize: 14, fontWeight: '700' },

    twoCol: { flexDirection: 'row', gap: 12 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, gap: 8 },
    input: { flex: 1, fontSize: 18, fontWeight: '700' },
    inputUnit: { fontSize: 13 },

    bmiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 4 },
    bmiLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
    bmiVal: { fontSize: 28, fontWeight: '900' },
    bmiStatus: { fontSize: 13 },

    dayRow: { flexDirection: 'row', gap: 9 },
    dayBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5 },
    dayNum: { fontSize: 22, fontWeight: '900' },
    dayLbl: { fontSize: 9, fontWeight: '600', marginTop: 2 },

    timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
    timeBtn: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, padding: 14, borderWidth: 1.5 },
    timeEmoji: { fontSize: 18 },
    timeTxt: { fontSize: 13, fontWeight: '600' },

    stressRow: { flexDirection: 'row', gap: 9 },
    stressBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 6, borderWidth: 1.5 },
    stressEmoji: { fontSize: 22 },
    stressTxt: { fontSize: 12, fontWeight: '700' },

    yaraCard: { borderRadius: 22, padding: 22, marginBottom: 14, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    yaraTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    yaraAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    yaraName: { color: '#fff', fontSize: 17, fontWeight: '800' },
    yaraRole: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
    yaraBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
    yaraBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
    yaraMsg: { color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 22 },

    card: { borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1 },
    sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 14 },
    targetsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    targetBox: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1 },
    targetBig: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    targetUnit: { fontSize: 11, marginTop: 2 },
    targetLbl: { fontSize: 10, marginTop: 6, fontWeight: '600' },
    calNoteBox: { borderRadius: 12, padding: 12, borderWidth: 1 },
    calNoteTxt: { fontSize: 12, lineHeight: 18 },

    planDayWrap: { paddingVertical: 14 },
    planDayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    planDayNum: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
    planDayNumTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
    planDayName: { fontSize: 14, fontWeight: '700' },
    planDayMeta: { fontSize: 11, marginTop: 2 },
    exRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, marginBottom: 6 },
    exDot: { width: 6, height: 6, borderRadius: 3 },
    exName: { flex: 1, fontSize: 12 },
    exSets: { fontSize: 11, fontWeight: '700' },
    exRest: { fontSize: 10, marginLeft: 4 },
    coachTipBox: { borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1 },
    coachTipTxt: { fontSize: 12, lineHeight: 18, fontStyle: 'italic' },

    noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
    noteIcon: { fontSize: 20, marginTop: 1 },
    noteTxt: { flex: 1, fontSize: 13, lineHeight: 20 },

    cta: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
    ctaTxt: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
    backBtn: { alignItems: 'center', paddingVertical: 14 },
    backTxt: { fontSize: 14 },
});