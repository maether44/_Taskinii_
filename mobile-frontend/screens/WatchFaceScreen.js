import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FadeInDown } from 'react-native-reanimated';
import AnimatedRN from 'react-native-reanimated';

import { useHealthSync } from '../hooks/useHealthSync';
import { wearSyncService } from '../services/wearSyncService';
import { COLORS } from '../constants/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatLastSynced(isoString) {
  if (!isoString) return null;
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(isoString).toLocaleDateString();
}

// ─── AnimatedCircle wrapper ───────────────────────────────────────────────────
// Uses React Native's built-in Animated (not Reanimated) which reliably
// handles SVG strokeDashoffset without new-arch compatibility concerns.
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── ProgressRing ─────────────────────────────────────────────────────────────
function ProgressRing({ progress, steps }) {
  const SIZE         = 228;
  const STROKE_TRACK = 16;
  const STROKE_PROG  = 16;
  const radius       = (SIZE - STROKE_PROG) / 2;
  const circumference = 2 * Math.PI * radius;

  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue:         Math.min(progress, 1),
      duration:        1400,
      useNativeDriver: false,
    }).start();
  }, [progress]); // eslint-disable-line react-hooks/exhaustive-deps

  const strokeDashoffset = animVal.interpolate({
    inputRange:  [0, 1],
    outputRange: [circumference, 0],
  });

  const pct = Math.min(Math.round(progress * 100), 100);

  return (
    <View style={ring.container}>
      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0"   stopColor="#C8F135" />
            <Stop offset="0.6" stopColor="#A0D400" />
            <Stop offset="1"   stopColor="#78B800" />
          </SvgGradient>
        </Defs>
        {/* Outer glow ring */}
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={radius + STROKE_PROG / 2 + 4}
          fill="none"
          stroke={COLORS.lime}
          strokeWidth={1}
          opacity={0.1}
        />
        {/* Track */}
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={radius}
          fill="none"
          stroke="#1E1A35"
          strokeWidth={STROKE_TRACK}
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={SIZE / 2} cy={SIZE / 2} r={radius}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={STROKE_PROG}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>

      {/* Centre content */}
      <View style={ring.centre} pointerEvents="none">
        <Text style={ring.stepNum}>
          {steps > 0 ? steps.toLocaleString() : '—'}
        </Text>
        <Text style={ring.stepLabel}>steps today</Text>
        <View style={ring.pctPill}>
          <Text style={ring.pctText}>{pct}% of goal</Text>
        </View>
      </View>
    </View>
  );
}

// ─── PlatformBadge ────────────────────────────────────────────────────────────
function PlatformBadge({ platform }) {
  const isApple   = platform === 'apple';
  const colors    = isApple ? ['#1a0a10', '#200a15'] : ['#0a101a', '#0a1520'];
  const border    = isApple ? '#FF375F55' : '#0082FC55';
  const accent    = isApple ? '#FF375F'  : '#0082FC';
  const icon      = isApple ? 'logo-apple'  : 'logo-android';
  const label     = isApple ? 'Apple Health' : 'Health Connect';

  return (
    <LinearGradient colors={colors} style={[badge.wrap, { borderColor: border }]}>
      <Ionicons name={icon} size={14} color={accent} />
      <Text style={[badge.text, { color: accent }]}>{label}</Text>
    </LinearGradient>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, unit, accent, delay }) {
  return (
    <AnimatedRN.View
      entering={FadeInDown.delay(delay).springify().damping(14)}
      style={[metric.card, { borderColor: accent + '30' }]}
    >
      <LinearGradient
        colors={[accent + '18', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <Text style={metric.icon}>{icon}</Text>
      <Text style={[metric.value, { color: accent }]}>{value}</Text>
      {unit ? <Text style={metric.unit}>{unit}</Text> : null}
      <Text style={metric.label}>{label}</Text>
    </AnimatedRN.View>
  );
}

// ─── HealthRow ────────────────────────────────────────────────────────────────
// Horizontal progress bar for a single metric inside the hero card.
function HealthRow({ icon, label, value, max, unit, color }) {
  const pct      = max > 0 ? Math.min(value / max, 1) : 0;
  const barAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, { toValue: pct, duration: 900, useNativeDriver: false }).start();
  }, [pct]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={row.wrap}>
      <Text style={row.icon}>{icon}</Text>
      <View style={row.body}>
        <View style={row.header}>
          <Text style={row.label}>{label}</Text>
          <Text style={[row.val, { color }]}>
            {value > 0 ? `${typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value.toLocaleString()}${unit}` : '—'}
          </Text>
        </View>
        <View style={row.track}>
          <Animated.View
            style={[row.fill, {
              backgroundColor: color,
              width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }]}
          />
        </View>
      </View>
    </View>
  );
}

// ─── WatchFaceScreen ──────────────────────────────────────────────────────────
export default function WatchFaceScreen() {
  const insets  = useSafeAreaInsets();
  const { steps, calories, sleep, stepsGoal, isSyncing, lastSynced, error, platform, syncData } =
    useHealthSync();

  const [time, setTime] = useState('');
  const spinAnim        = useRef(new Animated.Value(0)).current;

  // Live clock.
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Spin animation for the sync icon when syncing.
  useEffect(() => {
    if (!isSyncing) { spinAnim.setValue(0); return; }
    const loop = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [isSyncing]); // eslint-disable-line react-hooks/exhaustive-deps

  const spin    = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const synced  = !!lastSynced;
  const syncAgo = formatLastSynced(lastSynced);
  const stepPct = stepsGoal > 0 ? steps / stepsGoal : 0;

  const handleSync = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    syncData().then(() => {
      wearSyncService.sendData({ steps, calories, target: stepsGoal });
    });
  }, [syncData, steps, calories, stepsGoal]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <AnimatedRN.View entering={FadeInDown.delay(0).springify().damping(14)} style={s.header}>
          <View>
            <Text style={s.title}>Health Sync</Text>
            <Text style={s.subtitle}>
              {synced ? `Last synced ${syncAgo}` : 'Tap Sync to pull today\'s data'}
            </Text>
          </View>
          <View style={[s.syncedPill, synced ? s.syncedPillOn : s.syncedPillOff]}>
            <View style={[s.syncedDot, synced ? s.syncedDotOn : s.syncedDotOff]} />
            <Text style={[s.syncedText, { color: synced ? COLORS.lime : '#555' }]}>
              {synced ? 'Synced' : 'Not synced'}
            </Text>
          </View>
        </AnimatedRN.View>

        {/* ── Hero card ─────────────────────────────────────────────────────── */}
        <AnimatedRN.View entering={FadeInDown.delay(80).springify().damping(14)} style={s.heroCard}>
          <LinearGradient
            colors={['#1a1535', '#0f0b1e']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />

          {/* Time + platform row */}
          <View style={s.heroTop}>
            <Text style={s.heroTime}>{time}</Text>
            <PlatformBadge platform={platform} />
          </View>

          {/* Progress ring */}
          <ProgressRing progress={stepPct} steps={steps} stepsGoal={stepsGoal} />

          {/* Mini metric rows */}
          <View style={s.miniRows}>
            <HealthRow
              icon="🌙" label="Sleep"
              value={sleep} max={9} unit=" hrs"
              color="#A78BFA"
            />
            <View style={s.miniDivider} />
            <HealthRow
              icon="🔥" label="Calories burned"
              value={calories} max={800} unit=" kcal"
              color="#FF6B35"
            />
          </View>
        </AnimatedRN.View>

        {/* ── Error banner ──────────────────────────────────────────────────── */}
        {!!error && (
          <View style={s.errorBanner}>
            <Ionicons name="warning-outline" size={15} color="#FF6B35" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Metric cards ──────────────────────────────────────────────────── */}
        <View style={s.metricRow}>
          <MetricCard
            icon="👟" label="STEPS"
            value={steps > 0 ? steps.toLocaleString() : '--'}
            accent={COLORS.lime} delay={160}
          />
          <MetricCard
            icon="🌙" label="SLEEP"
            value={sleep > 0 ? sleep.toFixed(1) : '--'}
            unit={sleep > 0 ? ' hrs' : undefined}
            accent="#A78BFA" delay={220}
          />
          <MetricCard
            icon="🔥" label="CALORIES"
            value={calories > 0 ? calories.toLocaleString() : '--'}
            unit={calories > 0 ? ' kcal' : undefined}
            accent="#FF6B35" delay={280}
          />
        </View>

        {/* ── Sync button ───────────────────────────────────────────────────── */}
        <AnimatedRN.View entering={FadeInDown.delay(340).springify().damping(14)}>
          <Pressable
            style={({ pressed }) => [s.syncBtn, isSyncing && s.syncBtnLoading, pressed && s.pressed]}
            onPress={handleSync}
            disabled={isSyncing}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons
                name="sync"
                size={20}
                color={isSyncing ? COLORS.lime : '#000'}
              />
            </Animated.View>
            <Text style={[s.syncBtnText, isSyncing && { color: COLORS.lime }]}>
              {isSyncing ? 'Syncing…' : 'Sync Health Data'}
            </Text>
          </Pressable>
        </AnimatedRN.View>

        {/* ── Info footer ───────────────────────────────────────────────────── */}
        <AnimatedRN.View
          entering={FadeInDown.delay(400).springify().damping(14)}
          style={s.infoBox}
        >
          <Ionicons name="information-circle-outline" size={15} color="#6B5F8A" />
          <Text style={s.infoText}>
            {platform === 'apple'
              ? 'BodyQ reads Steps, Calories, and Sleep directly from Apple Health. Your watch syncs to Apple Health automatically — no extra setup needed.'
              : 'BodyQ reads Steps, Calories, and Sleep from Health Connect. Make sure your wearable app is set to sync with Health Connect.'}
          </Text>
        </AnimatedRN.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#0F0B1E' },
  scroll: { paddingHorizontal: 18, paddingTop: 10 },

  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   20,
  },
  title: {
    color:      '#fff',
    fontSize:   26,
    fontWeight: '900',
    fontFamily: 'Outfit-Bold',
  },
  subtitle: {
    color:      '#6B5F8A',
    fontSize:   13,
    marginTop:  4,
    fontFamily: 'Outfit-Regular',
  },

  syncedPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    borderRadius:      20,
    paddingHorizontal: 11,
    paddingVertical:   5,
    borderWidth:       1,
  },
  syncedPillOn:  { backgroundColor: COLORS.lime + '18', borderColor: COLORS.lime + '44' },
  syncedPillOff: { backgroundColor: '#1E1A35',          borderColor: '#2a2040' },
  syncedDot:     { width: 6, height: 6, borderRadius: 3 },
  syncedDotOn:   { backgroundColor: COLORS.lime },
  syncedDotOff:  { backgroundColor: '#555' },
  syncedText:    { fontSize: 11, fontWeight: '700' },

  // Hero card
  heroCard: {
    borderRadius:   28,
    overflow:       'hidden',
    borderWidth:    1,
    borderColor:    '#1E1A35',
    paddingBottom:  20,
    marginBottom:   14,
    alignItems:     'center',
    shadowColor:    COLORS.lime,
    shadowOpacity:  0.06,
    shadowRadius:   20,
    shadowOffset:   { width: 0, height: 4 },
    elevation:      6,
  },
  heroTop: {
    width:          '100%',
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: 20,
    paddingTop:     18,
    paddingBottom:  12,
  },
  heroTime: {
    color:       '#fff',
    fontSize:    32,
    fontWeight:  '900',
    fontFamily:  'Outfit-Bold',
    letterSpacing: 2,
  },

  miniRows: {
    width:             '100%',
    paddingHorizontal: 20,
    marginTop:         4,
    gap:               10,
  },
  miniDivider: {
    height:          1,
    backgroundColor: '#1E1A35',
    marginVertical:  2,
  },

  // Error
  errorBanner: {
    flexDirection:   'row',
    gap:             8,
    backgroundColor: '#FF6B3518',
    borderRadius:    14,
    padding:         12,
    marginBottom:    12,
    borderWidth:     1,
    borderColor:     '#FF6B3540',
    alignItems:      'flex-start',
  },
  errorText: {
    color:      '#FF6B35',
    fontSize:   12,
    flex:       1,
    lineHeight: 18,
  },

  // Metric cards
  metricRow: {
    flexDirection: 'row',
    gap:           10,
    marginBottom:  14,
  },

  // Sync button
  syncBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             10,
    backgroundColor: COLORS.lime,
    borderRadius:    18,
    paddingVertical: 17,
    marginBottom:    12,
    shadowColor:     COLORS.lime,
    shadowOpacity:   0.25,
    shadowRadius:    12,
    shadowOffset:    { width: 0, height: 4 },
    elevation:       4,
  },
  syncBtnLoading: {
    backgroundColor: '#161230',
    borderWidth:     1,
    borderColor:     COLORS.lime + '55',
  },
  syncBtnText: {
    color:       '#000',
    fontSize:    16,
    fontWeight:  '800',
    fontFamily:  'Outfit-Bold',
  },
  pressed: { opacity: 0.78 },

  // Info box
  infoBox: {
    flexDirection:   'row',
    gap:             9,
    backgroundColor: '#161230',
    borderRadius:    16,
    padding:         14,
    borderWidth:     1,
    borderColor:     '#1E1A35',
    alignItems:      'flex-start',
  },
  infoText: {
    color:      '#6B5F8A',
    fontSize:   12,
    lineHeight: 19,
    flex:       1,
  },
});

// ─── Ring styles ──────────────────────────────────────────────────────────────
const ring = StyleSheet.create({
  container: {
    alignItems:     'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  centre: {
    position:       'absolute',
    alignItems:     'center',
    justifyContent: 'center',
  },
  stepNum: {
    color:         '#fff',
    fontSize:      38,
    fontWeight:    '900',
    fontFamily:    'Outfit-Bold',
    letterSpacing: -1,
  },
  stepLabel: {
    color:      '#6B5F8A',
    fontSize:   12,
    fontWeight: '600',
    marginTop:  2,
  },
  pctPill: {
    backgroundColor: COLORS.lime + '22',
    borderRadius:    10,
    paddingHorizontal: 10,
    paddingVertical:   3,
    marginTop:       6,
    borderWidth:     1,
    borderColor:     COLORS.lime + '44',
  },
  pctText: {
    color:      COLORS.lime,
    fontSize:   11,
    fontWeight: '800',
  },
});

// ─── Platform badge styles ────────────────────────────────────────────────────
const badge = StyleSheet.create({
  wrap: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    borderRadius:      12,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderWidth:       1,
  },
  text: {
    fontSize:   11,
    fontWeight: '700',
  },
});

// ─── Metric card styles ───────────────────────────────────────────────────────
const metric = StyleSheet.create({
  card: {
    flex:            1,
    backgroundColor: '#161230',
    borderRadius:    22,
    borderWidth:     1,
    padding:         16,
    alignItems:      'center',
    overflow:        'hidden',
  },
  icon:  { fontSize: 22, marginBottom: 8 },
  value: { fontSize: 20, fontWeight: '900', fontFamily: 'Outfit-Bold' },
  unit:  { color: '#6B5F8A', fontSize: 10, fontWeight: '600', marginTop: 1 },
  label: { color: '#6B5F8A', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 6 },
});

// ─── Health row styles ────────────────────────────────────────────────────────
const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
    paddingVertical: 6,
  },
  icon:  { fontSize: 18, width: 24, textAlign: 'center' },
  body:  { flex: 1 },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginBottom:   5,
  },
  label: { color: '#6B5F8A', fontSize: 12 },
  val:   { fontSize: 12, fontWeight: '800' },
  track: {
    height:          4,
    backgroundColor: '#1E1A35',
    borderRadius:    2,
    overflow:        'hidden',
  },
  fill: { height: '100%', borderRadius: 2 },
});
