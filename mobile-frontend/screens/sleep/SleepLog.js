/**
 * screens/sleep/SleepLog.js
 * Full-screen sleep logger. Saves to daily_activity via useSleep hook.
 * Navigated to via Stack.Screen name="SleepLog".
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSleep } from '../../hooks/useSleep';
import {
    Colors, Spacing, Radius, FontSize, FontWeight, Shadow, CardStyle,
} from '../../constants/appTheme';

const QUALITY_OPTIONS = [
    { value: 1, label: 'Very Poor', emoji: '😫', color: Colors.error   },
    { value: 2, label: 'Poor',      emoji: '😕', color: Colors.warning  },
    { value: 3, label: 'Okay',      emoji: '😐', color: Colors.steps    },
    { value: 4, label: 'Good',      emoji: '😊', color: Colors.green    },
    { value: 5, label: 'Excellent', emoji: '😄', color: Colors.greenDark},
];

const HOUR_OPTIONS = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

const BEDTIMES  = ['9:00 PM','9:30 PM','10:00 PM','10:30 PM','11:00 PM','11:30 PM','12:00 AM','12:30 AM','1:00 AM'];
const WAKETIMES = ['4:00 AM','4:30 AM','5:00 AM','5:30 AM','6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM'];

const SLEEP_INSIGHTS = {
    1: "Poor sleep hurts recovery and performance. Try to get to bed earlier tonight.",
    2: "Below average. Your recovery score tomorrow will likely be reduced.",
    3: "Decent — you're functional but not fully recovered. Aim for 7.5h+ tonight.",
    4: "Good sleep! Your body had time to repair and recover properly.",
    5: "Excellent! You're fully recovered. Expect a great performance today.",
};

function sleepColor(h) {
    if (h >= 8)  return Colors.green;
    if (h >= 7)  return Colors.sleep;
    if (h >= 6)  return Colors.warning;
    return Colors.error;
}

export default function SleepLog({ navigation }) {
    const { logSleep } = useSleep();

    const [hours,    setHours]    = useState(7.5);
    const [quality,  setQuality]  = useState(null);
    const [bedtime,  setBedtime]  = useState('11:00 PM');
    const [wakeTime, setWakeTime] = useState('6:30 AM');
    const [saving,   setSaving]   = useState(false);
    const [saved,    setSaved]    = useState(false);

    const canSave   = quality !== null && !saving;
    const color     = sleepColor(hours);
    const qualityObj = QUALITY_OPTIONS.find(q => q.value === quality);

    const handleSave = async () => {
        if (!canSave) return;
        setSaving(true);
        const ok = await logSleep({ hours, quality });
        setSaving(false);
        if (ok) setSaved(true);
    };

    const handleClose = () => {
        if (navigation?.canGoBack()) navigation.goBack();
    };

    if (saved) {
        return (
            <View style={s.root}>
                <View style={s.successWrap}>
                    <Text style={s.successEmoji}>😴</Text>
                    <Text style={s.successTitle}>Sleep Logged!</Text>
                    <Text style={s.successSub}>{hours} hours · {qualityObj?.label}</Text>
                    <View style={[s.insightCard, { borderColor: qualityObj?.color + '50' }]}>
                        <Text style={s.insightEmoji}>{qualityObj?.emoji}</Text>
                        <Text style={[s.insightText, { color: qualityObj?.color }]}>
                            {SLEEP_INSIGHTS[quality]}
                        </Text>
                    </View>
                    <TouchableOpacity style={[s.saveBtn, { backgroundColor: Colors.green }]} onPress={handleClose}>
                        <Text style={s.saveBtnTxt}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={s.root}>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
                        <Text style={s.closeTxt}>✕</Text>
                    </TouchableOpacity>
                    <Text style={s.title}>🌙 Log Sleep</Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* Hours */}
                <Text style={s.sectionLabel}>How many hours did you sleep?</Text>
                <View style={s.hoursDisplay}>
                    <Text style={[s.hoursNum, { color }]}>{hours}</Text>
                    <Text style={s.hoursUnit}>hours</Text>
                </View>

                <ScrollView
                    horizontal showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: Spacing.md }}
                    contentContainerStyle={{ gap: Spacing.sm, paddingVertical: 4 }}
                >
                    {HOUR_OPTIONS.map(h => (
                        <TouchableOpacity
                            key={h}
                            style={[s.hourChip, hours === h && { borderColor: sleepColor(h), backgroundColor: sleepColor(h) + '15' }]}
                            onPress={() => setHours(h)}
                        >
                            <Text style={[s.hourChipTxt, hours === h && { color: sleepColor(h), fontWeight: FontWeight.bold }]}>{h}h</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Progress bar */}
                <View style={s.goalBar}>
                    <View style={s.goalBarBg}>
                        <View style={[s.goalBarFill, { width: `${Math.min(hours / 10, 1) * 100}%`, backgroundColor: color }]} />
                        <View style={s.goalLine} />
                    </View>
                    <View style={s.goalBarLabels}>
                        <Text style={s.goalBarLabel}>0h</Text>
                        <Text style={[s.goalBarLabel, { color: Colors.sleep }]}>Goal: 8h</Text>
                        <Text style={s.goalBarLabel}>10h</Text>
                    </View>
                </View>

                {/* Quality */}
                <Text style={s.sectionLabel}>Sleep quality</Text>
                <View style={s.qualityRow}>
                    {QUALITY_OPTIONS.map(q => (
                        <TouchableOpacity
                            key={q.value}
                            style={[s.qualityBtn, quality === q.value && { borderColor: q.color, backgroundColor: q.color + '12' }]}
                            onPress={() => setQuality(q.value)}
                        >
                            <Text style={s.qualityEmoji}>{q.emoji}</Text>
                            <Text style={[s.qualityLabel, quality === q.value && { color: q.color, fontWeight: FontWeight.bold }]}>{q.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Times */}
                <Text style={s.sectionLabel}>Times (optional)</Text>
                <View style={{ gap: Spacing.md, marginBottom: Spacing.lg }}>
                    {[
                        { label: 'Bedtime',   options: BEDTIMES,  value: bedtime,  set: setBedtime  },
                        { label: 'Wake Time', options: WAKETIMES, value: wakeTime, set: setWakeTime },
                    ].map(({ label, options, value, set }) => (
                        <View key={label}>
                            <Text style={s.timeLabel}>{label}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                                    {options.map(t => (
                                        <TouchableOpacity
                                            key={t}
                                            style={[s.timeChip, value === t && { backgroundColor: Colors.sleep + '20', borderColor: Colors.sleep }]}
                                            onPress={() => set(t)}
                                        >
                                            <Text style={[s.timeChipTxt, value === t && { color: Colors.sleep, fontWeight: FontWeight.bold }]}>{t}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    ))}
                </View>

                {/* Insight preview */}
                {quality && (
                    <View style={[s.insightCard, { borderColor: qualityObj.color + '50' }]}>
                        <Text style={s.insightEmoji}>{qualityObj.emoji}</Text>
                        <Text style={[s.insightText, { color: qualityObj.color }]}>{SLEEP_INSIGHTS[quality]}</Text>
                    </View>
                )}

                {/* Save */}
                <TouchableOpacity
                    style={[s.saveBtn, !canSave && { opacity: 0.38 }]}
                    onPress={handleSave}
                    disabled={!canSave}
                    activeOpacity={0.85}
                >
                    <Text style={s.saveBtnTxt}>{saving ? 'Saving…' : 'Save Sleep Log'}</Text>
                </TouchableOpacity>

                <View style={{ height: Spacing.xl }} />
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root:   { flex: 1, backgroundColor: Colors.bg },
    scroll: { paddingHorizontal: Spacing.screenH, paddingTop: Spacing.screenV, paddingBottom: Spacing.lg },

    header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl },
    closeBtn: { width: 36, height: 36, borderRadius: Radius.pill, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, ...Shadow.xs },
    closeTxt: { color: Colors.textSub, fontSize: FontSize.lg },
    title:    { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.heavy },

    sectionLabel: { color: Colors.textLabel, fontSize: FontSize.xs, fontWeight: FontWeight.heavy, letterSpacing: 1.2, marginBottom: Spacing.md, marginTop: Spacing.sm },

    hoursDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm, marginBottom: Spacing.md, justifyContent: 'center' },
    hoursNum:     { fontSize: 64, fontWeight: FontWeight.black, letterSpacing: -2 },
    hoursUnit:    { color: Colors.textSub, fontSize: FontSize.xl, fontWeight: FontWeight.semibold },

    hourChip:    { paddingHorizontal: Spacing.md, paddingVertical: 10, backgroundColor: Colors.card, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.border },
    hourChipTxt: { color: Colors.textSub, fontSize: FontSize.md },

    goalBar:       { marginBottom: Spacing.xl },
    goalBarBg:     { height: 8, backgroundColor: Colors.border, borderRadius: Radius.pill, overflow: 'hidden', position: 'relative', marginBottom: Spacing.xs },
    goalBarFill:   { height: 8, borderRadius: Radius.pill },
    goalLine:      { position: 'absolute', left: '80%', top: 0, bottom: 0, width: 2, backgroundColor: Colors.sleep },
    goalBarLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    goalBarLabel:  { color: Colors.textSub, fontSize: FontSize.xs },

    qualityRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, flexWrap: 'wrap' },
    qualityBtn: { flex: 1, minWidth: 58, backgroundColor: Colors.card, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: Colors.border },
    qualityEmoji: { fontSize: 22 },
    qualityLabel: { color: Colors.textSub, fontSize: FontSize.xs, textAlign: 'center' },

    timeLabel:  { color: Colors.textSub, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
    timeChip:   { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
    timeChipTxt:{ color: Colors.textSub, fontSize: FontSize.sm },

    insightCard:  { flexDirection: 'row', alignItems: 'flex-start', ...CardStyle, gap: Spacing.sm, marginBottom: Spacing.lg },
    insightEmoji: { fontSize: 22 },
    insightText:  { flex: 1, fontSize: FontSize.sm, lineHeight: 19, fontWeight: FontWeight.semibold },

    saveBtn:     { backgroundColor: Colors.green, borderRadius: Radius.md, paddingVertical: 17, alignItems: 'center', ...Shadow.green },
    saveBtnTxt:  { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.heavy },

    successWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
    successEmoji: { fontSize: 64, marginBottom: Spacing.md },
    successTitle: { color: Colors.text, fontSize: FontSize.h2, fontWeight: FontWeight.black, marginBottom: Spacing.xs },
    successSub:   { color: Colors.textSub, fontSize: FontSize.lg, marginBottom: Spacing.xl },
});
