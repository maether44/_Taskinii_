import { useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const C = {
  bg: '#0F0B1E',
  card: '#161230',
  border: '#1E1A35',
  purple: '#7C5CFC',
  lime: '#C8F135',
  accent: '#9D85F5',
  text: '#FFFFFF',
  sub: '#6B5F8A',
  green: '#34C759',
  orange: '#FF9500',
  red: '#FF3B30',
};

const POSTURE_HISTORY = [
  { day: 'Mon', score: 72 },
  { day: 'Tue', score: 78 },
  { day: 'Wed', score: 75 },
  { day: 'Thu', score: 82 },
  { day: 'Fri', score: 80 },
  { day: 'Sat', score: 85 },
  { day: 'Sun', score: 88 },
];

const BODY_ZONES = [
  {
    zone: 'Neck',
    status: 'Forward head posture',
    severity: 'medium',
    icon: '⚠️',
    tip: 'Tuck your chin and draw your head back over your shoulders.',
  },
  {
    zone: 'Shoulders',
    status: 'Good alignment',
    severity: 'good',
    icon: '✅',
    tip: 'Keep it up — shoulders are neutral and relaxed.',
  },
  {
    zone: 'Spine',
    status: 'Slight lumbar curve',
    severity: 'low',
    icon: '⚠️',
    tip: 'Engage your core slightly when sitting for long periods.',
  },
  {
    zone: 'Hips',
    status: 'Neutral position',
    severity: 'good',
    icon: '✅',
    tip: 'Hip alignment is ideal. Great foundation posture.',
  },
];

const EXERCISES = [
  { name: 'Chin Tuck', sets: '3 × 10 reps', target: 'Neck forward head', icon: '🧠' },
  { name: 'Wall Angel', sets: '3 × 12 reps', target: 'Shoulder mobility', icon: '🏋️' },
  { name: 'Cat-Cow Stretch', sets: '2 × 30 sec', target: 'Lumbar spine', icon: '🐱' },
  { name: 'Hip Flexor Stretch', sets: '2 × 45 sec', target: 'Hip flexors', icon: '🦵' },
];

const severityColor = { good: '#34C759', medium: '#FF9500', low: '#FFD60A' };
const severityBg = { good: '#34C75918', medium: '#FF950018', low: '#FFD60A18' };

export default function PostureAI({ navigation }) {
  const navigate = navigation.navigate.bind(navigation);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(true);
  const [score, setScore] = useState(88);
  const [expanded, setExpanded] = useState(null);

  const scanAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const startScan = () => {
    setScanning(true);
    setScanned(false);
    Animated.loop(
      Animated.timing(scanAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ).start();
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
      setScore(Math.floor(Math.random() * 15) + 80); // 80–95
      scanAnim.stopAnimation();
      scanAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    }, 2400);
  };

  const scanLineY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 220] });
  const scoreColor = score >= 85 ? C.green : score >= 70 ? C.orange : C.red;

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Posture AI</Text>
          <View style={s.aiBadge}>
            <Text style={s.aiBadgeTxt}>✨ AI Powered</Text>
          </View>
        </View>

        {/* Camera viewfinder */}
        <View style={s.cameraCard}>
          <View style={s.viewfinder}>
            {/* Corner brackets */}
            {['TL', 'TR', 'BL', 'BR'].map((pos) => (
              <View
                key={pos}
                style={[
                  s.corner,
                  pos === 'TL' && s.cornerTL,
                  pos === 'TR' && s.cornerTR,
                  pos === 'BL' && s.cornerBL,
                  pos === 'BR' && s.cornerBR,
                ]}
              />
            ))}

            {/* Silhouette */}
            <Text style={s.silhouette}>🧍</Text>

            {/* Scan line */}
            {scanning && (
              <Animated.View style={[s.scanLine, { transform: [{ translateY: scanLineY }] }]} />
            )}

            {/* Score overlay */}
            {scanned && !scanning && (
              <Animated.View style={[s.scoreOverlay, { opacity: fadeAnim }]}>
                <Text style={[s.overlayScore, { color: scoreColor }]}>{score}</Text>
                <Text style={s.overlayLabel}>Score</Text>
              </Animated.View>
            )}

            {/* Status label */}
            <View style={s.statusLabel}>
              <View
                style={[
                  s.statusDot,
                  { backgroundColor: scanning ? C.orange : scanned ? C.green : C.sub },
                ]}
              />
              <Text style={s.statusTxt}>
                {scanning ? 'Scanning…' : scanned ? 'Scan complete' : 'Ready to scan'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[s.scanBtn, scanning && s.scanBtnDisabled]}
            onPress={startScan}
            disabled={scanning}
            activeOpacity={0.85}
          >
            <Text style={s.scanBtnTxt}>{scanning ? '⏳  Analyzing…' : '📷  Scan Posture'}</Text>
          </TouchableOpacity>
        </View>

        {/* Score + history */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardLabel}>WEEKLY SCORE</Text>
            <Text style={[s.weekAvg, { color: scoreColor }]}>
              Avg{' '}
              {Math.round(
                POSTURE_HISTORY.reduce((a, h) => a + h.score, 0) / POSTURE_HISTORY.length,
              )}
            </Text>
          </View>
          <View style={s.chartRow}>
            {POSTURE_HISTORY.map((h, i) => {
              const isToday = i === POSTURE_HISTORY.length - 1;
              const barH = (h.score / 100) * 80;
              const col = h.score >= 85 ? C.green : h.score >= 70 ? C.orange : C.red;
              return (
                <View key={i} style={s.barCol}>
                  {isToday && <Text style={[s.barValLbl, { color: col }]}>{h.score}</Text>}
                  <View style={s.barBg}>
                    <View
                      style={[
                        s.barFill,
                        { height: barH, backgroundColor: isToday ? col : C.border },
                      ]}
                    />
                  </View>
                  <Text style={[s.barDay, isToday && { color: C.lime }]}>{h.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Body zone analysis */}
        <View style={s.card}>
          <Text style={s.cardLabel}>BODY ANALYSIS</Text>
          {BODY_ZONES.map((z, i) => {
            const isOpen = expanded === i;
            return (
              <TouchableOpacity
                key={i}
                style={[s.zoneRow, i < BODY_ZONES.length - 1 && s.zoneRowBorder]}
                onPress={() => setExpanded(isOpen ? null : i)}
                activeOpacity={0.75}
              >
                <Text style={s.zoneIcon}>{z.icon}</Text>
                <View style={s.zoneInfo}>
                  <Text style={s.zoneName}>{z.zone}</Text>
                  <Text style={s.zoneStatus}>{z.status}</Text>
                  {isOpen && <Text style={s.zoneTip}>{z.tip}</Text>}
                </View>
                <View style={[s.sevBadge, { backgroundColor: severityBg[z.severity] }]}>
                  <Text style={[s.sevTxt, { color: severityColor[z.severity] }]}>{z.severity}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Correction exercises */}
        <View style={s.card}>
          <Text style={s.cardLabel}>CORRECTION EXERCISES</Text>
          {EXERCISES.map((ex, i) => (
            <View key={i} style={[s.exRow, i < EXERCISES.length - 1 && s.exRowBorder]}>
              <View style={s.exIconWrap}>
                <Text style={s.exIcon}>{ex.icon}</Text>
              </View>
              <View style={s.exInfo}>
                <Text style={s.exName}>{ex.name}</Text>
                <Text style={s.exTarget}>{ex.target}</Text>
              </View>
              <View style={s.exSets}>
                <Text style={s.exSetsTxt}>{ex.sets}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  aiBadge: {
    backgroundColor: C.purple + '25',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: C.purple + '50',
  },
  aiBadgeTxt: { color: C.accent, fontSize: 12, fontWeight: '700' },

  cameraCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  viewfinder: {
    width: '100%',
    height: 240,
    backgroundColor: '#080614',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
  },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: C.lime, borderWidth: 3 },
  cornerTL: { top: 12, left: 12, borderRightWidth: 0, borderBottomWidth: 0, borderRadius: 4 },
  cornerTR: { top: 12, right: 12, borderLeftWidth: 0, borderBottomWidth: 0, borderRadius: 4 },
  cornerBL: { bottom: 12, left: 12, borderRightWidth: 0, borderTopWidth: 0, borderRadius: 4 },
  cornerBR: { bottom: 12, right: 12, borderLeftWidth: 0, borderTopWidth: 0, borderRadius: 4 },
  silhouette: { fontSize: 90, opacity: 0.5 },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: C.lime,
    shadowColor: C.lime,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  scoreOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: C.purple + 'DD',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.purple,
  },
  overlayScore: { fontSize: 28, fontWeight: '900' },
  overlayLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },
  statusLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  scanBtn: {
    backgroundColor: C.purple,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  scanBtnDisabled: { opacity: 0.5 },
  scanBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardLabel: {
    color: C.sub,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  weekAvg: { fontSize: 13, fontWeight: '700' },

  chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 4 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 5, height: 110 },
  barValLbl: { fontSize: 9, fontWeight: '800' },
  barBg: {
    width: '100%',
    height: 80,
    backgroundColor: C.border,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 6 },
  barDay: { color: C.sub, fontSize: 9, fontWeight: '600' },

  zoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  zoneRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  zoneIcon: { fontSize: 22, marginTop: 2 },
  zoneInfo: { flex: 1 },
  zoneName: { color: C.text, fontSize: 14, fontWeight: '700' },
  zoneStatus: { color: C.sub, fontSize: 12, marginTop: 2 },
  zoneTip: { color: C.accent, fontSize: 12, marginTop: 8, lineHeight: 18 },
  sevBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  sevTxt: { fontSize: 10, fontWeight: '700' },

  exRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  exRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  exIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exIcon: { fontSize: 18 },
  exInfo: { flex: 1 },
  exName: { color: C.text, fontSize: 13, fontWeight: '700' },
  exTarget: { color: C.sub, fontSize: 11, marginTop: 2 },
  exSets: { backgroundColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  exSetsTxt: { color: C.accent, fontSize: 11, fontWeight: '600' },
});
