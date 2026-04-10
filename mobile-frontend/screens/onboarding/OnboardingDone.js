// src/screens/onboarding/OnboardingDone.js
// Final onboarding step — shows generated plan, creates Supabase account
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated, ScrollView,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { DEFAULT_TARGETS } from '../../constants/targets';

const C = {
    bg: '#0E0C15', surface: '#18152A', card: '#201C35', border: '#2D2850',
    text: '#F4F0FF', sub: '#8B82AD', muted: '#3D3560',
    purple: '#7B61FF', lime: '#B8F566', green: '#2ECC71', orange: '#F5A623',
};

function StatPill({ label, value, color = C.purple }) {
    return (
        <View style={[s.pill, { borderColor: color + '40', backgroundColor: color + '12' }]}>
            <Text style={[s.pillVal, { color }]}>{value}</Text>
            <Text style={s.pillLbl}>{label}</Text>
        </View>
    );
}

export default function OnboardingDone({ plan = {}, profile = {}, onComplete }) {
    const [saving, setSaving] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleStart = async () => {
        setSaving(true);
        try {
            await onComplete?.({ plan, profile });
        } catch (e) {
            console.error('OnboardingDone onComplete error:', e);
        } finally {
            setSaving(false);
        }
    };

    const dailyCals = plan.dailyCalories || DEFAULT_TARGETS.calorie_target;
    const proteinG = plan.proteinG || DEFAULT_TARGETS.protein_target;
    const carbsG = plan.carbsG || DEFAULT_TARGETS.carbs_target;
    const fatG = plan.fatG || DEFAULT_TARGETS.fat_target;
    const workoutDays = plan.workoutDaysPerWeek || 4;
    const workoutMins = plan.workoutDuration || 45;

    return (
        <View style={s.root}>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                    {/* Trophy */}
                    <View style={s.trophyWrap}>
                        <Text style={s.trophy}>✨</Text>
                        <Text style={s.title}>Your Plan is Ready!</Text>
                        <Text style={s.sub}>
                            Built specifically for{' '}
                            <Text style={{ color: C.purple }}>{profile.name || 'you'}</Text>.
                            {'\n'}Let's get to work.
                        </Text>
                    </View>

                    {/* Calorie target */}
                    <View style={[s.card, s.highlightCard]}>
                        <Text style={s.cardLabel}>DAILY CALORIE TARGET</Text>
                        <Text style={s.bigNum}>{dailyCals}</Text>
                        <Text style={s.bigUnit}>kcal / day</Text>
                    </View>

                    {/* Macros */}
                    <Text style={s.sectionLabel}>MACRO TARGETS</Text>
                    <View style={s.pillRow}>
                        <StatPill label="Protein" value={`${proteinG}g`} color={C.purple} />
                        <StatPill label="Carbs" value={`${carbsG}g`} color="#9D85F5" />
                        <StatPill label="Fat" value={`${fatG}g`} color={C.lime} />
                    </View>

                    {/* Training */}
                    <Text style={s.sectionLabel}>TRAINING PLAN</Text>
                    <View style={s.trainingCard}>
                        <View style={s.trainingRow}>
                            <Text style={s.trainingIcon}>📅</Text>
                            <View>
                                <Text style={s.trainingVal}>{workoutDays} days / week</Text>
                                <Text style={s.trainingSub}>Workout frequency</Text>
                            </View>
                        </View>
                        <View style={[s.trainingRow, { borderTopWidth: 1, borderTopColor: C.border, marginTop: 14, paddingTop: 14 }]}>
                            <Text style={s.trainingIcon}>⏱️</Text>
                            <View>
                                <Text style={s.trainingVal}>{workoutMins} min sessions</Text>
                                <Text style={s.trainingSub}>Per workout</Text>
                            </View>
                        </View>
                    </View>

                    {/* AI note */}
                    {plan.aiNote ? (
                        <>
                            <Text style={s.sectionLabel}>YARA SAYS</Text>
                            <View style={s.yaraCard}>
                                <Text style={s.yaraEmoji}>🤖</Text>
                                <Text style={s.yaraTxt}>{plan.aiNote}</Text>
                            </View>
                        </>
                    ) : null}

                    {/* CTA */}
                    <TouchableOpacity style={s.startBtn} onPress={handleStart} disabled={saving} activeOpacity={0.85}>
                        {saving
                            ? <ActivityIndicator color="#0D0D0D" />
                            : <Text style={s.startTxt}>Start My Journey 🚀</Text>
                        }
                    </TouchableOpacity>

                    <Text style={s.disclaimer}>
                        Your plan adapts as you log workouts and meals. Yara will guide you every step.
                    </Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },

    trophyWrap: { alignItems: 'center', marginBottom: 32 },
    trophy: { fontSize: 64, marginBottom: 16 },
    title: { color: C.text, fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },
    sub: { color: C.sub, fontSize: 15, textAlign: 'center', lineHeight: 24, marginTop: 10 },

    card: { backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: C.border },
    highlightCard: { alignItems: 'center', borderColor: C.purple + '40', backgroundColor: C.purple + '0A' },
    cardLabel: { color: C.sub, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },
    bigNum: { color: C.lime, fontSize: 56, fontWeight: '900', letterSpacing: -2 },
    bigUnit: { color: C.sub, fontSize: 14, marginTop: 4 },

    sectionLabel: { color: C.sub, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },
    pillRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    pill: { flex: 1, alignItems: 'center', borderRadius: 14, paddingVertical: 14, borderWidth: 1.5 },
    pillVal: { fontSize: 20, fontWeight: '900' },
    pillLbl: { color: C.sub, fontSize: 10, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },

    trainingCard: { backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: C.border },
    trainingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    trainingIcon: { fontSize: 28 },
    trainingVal: { color: C.text, fontSize: 16, fontWeight: '800' },
    trainingSub: { color: C.sub, fontSize: 12, marginTop: 2 },

    yaraCard: { flexDirection: 'row', gap: 12, backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 28, borderWidth: 1, borderColor: C.purple + '22' },
    yaraEmoji: { fontSize: 24, marginTop: 2 },
    yaraTxt: { flex: 1, color: C.sub, fontSize: 13, lineHeight: 21 },

    startBtn: {
        backgroundColor: C.lime, borderRadius: 16,
        paddingVertical: 18, alignItems: 'center', marginBottom: 16,
    },
    startTxt: { color: '#0D0D0D', fontSize: 16, fontWeight: '900' },
    disclaimer: { color: C.muted, fontSize: 11, textAlign: 'center', lineHeight: 18 },
});