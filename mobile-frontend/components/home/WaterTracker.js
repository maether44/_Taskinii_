/**
 * components/home/WaterTracker.js
 *
 * Premium Yazio-style water intake tracker.
 * Grid of animated cups — tap to fill/unfill with spring physics,
 * wave surface, shine streak, glow burst, and haptic feedback.
 */

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// ─── Layout constants ────────────────────────────────────────────────────────
const CUP_ML      = 250;   // ml each cup represents
const COLS        = 5;     // cups per row
const CUP_BODY_H  = 48;    // fill-area height in px
const CUP_RIM_H   = 3;     // rim strip height in px
const WAVE_H      = 5;     // wave dome height in px
const STAGGER_MS  = 85;    // ms between staggered fills

// ─── Colours ─────────────────────────────────────────────────────────────────
const C = {
  blue:        '#007AFF',
  blueLight:   '#5AC8FA',
  blueMid:     '#2196F3',
  blueDark:    '#0050C8',
  bluePale:    '#EBF5FF',
  blueBorder:  '#B3D4FF',
  blueGlow:    '#007AFF',
  card:        '#161230',
  border:      '#1E1A35',
  text:        '#FFFFFF',
  sub:         '#6B5F8A',
  success:     '#34C759',
};

// ─── WaterCup ────────────────────────────────────────────────────────────────
function WaterCup({ index, filled, animDelay, onPress }) {
  const fillAnim  = useSharedValue(filled ? 1 : 0);
  const scaleAnim = useSharedValue(1);
  const glowAnim  = useSharedValue(0);

  // Animate fill level whenever prop changes
  useEffect(() => {
    fillAnim.value = withDelay(
      animDelay,
      withSpring(filled ? 1 : 0, {
        damping:   filled ? 13 : 22,
        stiffness: filled ? 110 : 260,
        mass:      0.65,
      })
    );
    if (filled) {
      glowAnim.value = withDelay(
        animDelay,
        withSequence(
          withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }),
        )
      );
    }
  }, [filled, animDelay]);

  // Fill bar grows from the bottom
  const fillStyle = useAnimatedStyle(() => ({
    height: interpolate(fillAnim.value, [0, 1], [0, CUP_BODY_H]),
  }));

  // Wave dome floats at the water surface
  const waveStyle = useAnimatedStyle(() => {
    const fillH = interpolate(fillAnim.value, [0, 1], [0, CUP_BODY_H]);
    return {
      bottom:  fillH - WAVE_H * 0.55,
      opacity: interpolate(fillAnim.value, [0, 0.05, 0.15, 1], [0, 0, 1, 1]),
    };
  });

  // Press bounce: compress → overshoot → settle
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  // Glow ring flashes on each fill
  const glowStyle = useAnimatedStyle(() => ({
    opacity:   interpolate(glowAnim.value, [0, 1], [0, 0.55]),
    transform: [{ scale: interpolate(glowAnim.value, [0, 1], [0.85, 1.18]) }],
  }));

  const handlePress = useCallback(() => {
    scaleAnim.value = withSequence(
      withSpring(0.78, { damping: 7,  stiffness: 700, mass: 0.35 }),
      withSpring(1.08, { damping: 9,  stiffness: 380 }),
      withSpring(1,    { damping: 15, stiffness: 280 }),
    );
    onPress(index);
  }, [index, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={6}
      style={cup.wrap}
      accessibilityRole="button"
      accessibilityLabel={`Water cup ${index + 1}, ${filled ? 'filled' : 'empty'}. ${CUP_ML} ml`}
    >
      <Animated.View style={[cup.outer, scaleStyle]}>

        {/* Glow burst ring */}
        <Animated.View
          style={[cup.glowRing, { backgroundColor: C.blueGlow + '22', borderColor: C.blueGlow + '60' }, glowStyle]}
        />

        {/* Rim strip */}
        <View style={[cup.rim, filled && { backgroundColor: C.blue, borderColor: C.blue }]} />

        {/* Cup body — overflow clipped */}
        <View style={[cup.body, filled && cup.bodyFilled]}>

          {/* Rising water fill */}
          <Animated.View style={[cup.fill, fillStyle]}>
            <LinearGradient
              colors={[C.blueLight, C.blue, C.blueDark]}
              locations={[0, 0.48, 1]}
              start={{ x: 0.25, y: 0 }}
              end={{ x: 0.25, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Left-side shine streak */}
            <View style={cup.shine} />
          </Animated.View>

          {/* Wave dome at water surface */}
          <Animated.View style={[cup.wave, waveStyle]} />

          {/* Top glass glare (static) */}
          <View style={cup.glare} />
        </View>

        {/* ml label below cup */}
        <Text style={[cup.label, filled && { color: C.blue, fontWeight: '800' }]}>
          {CUP_ML}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── WaterTracker ─────────────────────────────────────────────────────────────
export default function WaterTracker({ waterMl = 0, waterGoalMl = 2000, logWater }) {
  const totalCups   = Math.ceil(waterGoalMl / CUP_ML);          // 8 for 2000ml
  const filledCount = Math.min(Math.round(waterMl / CUP_ML), totalCups);
  const pct         = Math.min(waterMl / waterGoalMl, 1);
  const goalReached = pct >= 1;

  // Track previous filled count for stagger delay computation
  const prevFilled = useRef(filledCount);

  // ── Counter bounce animation ──────────────────────────────────────────────
  const counterScale = useSharedValue(1);
  const prevMlRef    = useRef(waterMl);

  useEffect(() => {
    if (waterMl !== prevMlRef.current) {
      counterScale.value = withSequence(
        withSpring(1.28, { damping: 6, stiffness: 550, mass: 0.4 }),
        withSpring(1,    { damping: 13, stiffness: 300 }),
      );
      prevMlRef.current = waterMl;
    }
  }, [waterMl]);

  const counterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: counterScale.value }],
  }));

  // ── Progress bar width animation ──────────────────────────────────────────
  const barWidth = useSharedValue(pct * 100);
  useEffect(() => {
    barWidth.value = withSpring(pct * 100, { damping: 20, stiffness: 120 });
  }, [pct]);
  const barStyle = useAnimatedStyle(() => ({ width: `${barWidth.value}%` }));

  // ── Per-cup stagger delay ─────────────────────────────────────────────────
  const getDelay = useCallback((i) => {
    const prev = prevFilled.current;
    // Only stagger cups that are newly being filled
    if (i >= prev && i < filledCount) return (i - prev) * STAGGER_MS;
    return 0;
  }, [filledCount]);

  useEffect(() => { prevFilled.current = filledCount; }, [filledCount]);

  // ── Cup press handler ────────────────────────────────────────────────────
  const handleCupPress = useCallback((index) => {
    if (index >= filledCount) {
      // Fill up to this cup (may fill multiple at once)
      const delta = (index + 1 - filledCount) * CUP_ML;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logWater(delta);
    } else if (index === filledCount - 1) {
      // Tap the last filled cup → unfill it
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      logWater(-CUP_ML);
    } else {
      // Inner filled cup — can't undo; light feedback only
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [filledCount, logWater]);

  // ── Quick-add / undo ──────────────────────────────────────────────────────
  const handleQuickAdd = useCallback((ml) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logWater(ml);
  }, [logWater]);

  const handleUndo = useCallback(() => {
    if (waterMl <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logWater(-CUP_ML);
  }, [waterMl, logWater]);

  // ── Render ────────────────────────────────────────────────────────────────
  // Build rows
  const rowCount = Math.ceil(totalCups / COLS);

  return (
    <View style={t.card}>

      {/* ── Header ── */}
      <View style={t.header}>
        <View>
          <Text style={t.sectionLabel}>💧  WATER</Text>
          <Animated.View style={counterStyle}>
            <Text adjustsFontSizeToFit numberOfLines={1} style={t.counterRow}>
              <Text style={t.counterVal}>{waterMl}</Text>
              <Text style={t.counterGoal}> / {waterGoalMl} ml</Text>
            </Text>
          </Animated.View>
        </View>

        <View style={[t.pctBadge, goalReached && t.pctBadgeDone]}>
          <Text style={[t.pctTxt, goalReached && t.pctTxtDone]}>
            {goalReached ? '🎉 Done' : `${Math.round(pct * 100)}%`}
          </Text>
        </View>
      </View>

      {/* ── Progress bar ── */}
      <View style={t.progressBg}>
        <Animated.View
          style={[
            t.progressFill,
            barStyle,
            goalReached && { backgroundColor: C.success },
          ]}
        />
      </View>

      {/* ── Cup grid ── */}
      <View style={t.grid}>
        {Array.from({ length: rowCount }).map((_, row) => (
          <View key={row} style={t.row}>
            {Array.from({ length: COLS }).map((_, col) => {
              const i = row * COLS + col;
              if (i >= totalCups) return <View key={col} style={cup.wrap} />;
              return (
                <WaterCup
                  key={i}
                  index={i}
                  filled={i < filledCount}
                  animDelay={getDelay(i)}
                  onPress={handleCupPress}
                />
              );
            })}
          </View>
        ))}
      </View>

      {/* ── Sub-label ── */}
      <Text style={t.glassesLabel}>
        {filledCount} / {totalCups} glasses · {totalCups * CUP_ML - waterMl > 0
          ? `${Math.max(totalCups * CUP_ML - waterMl, 0)} ml remaining`
          : 'Goal reached!'}
      </Text>

      {/* ── Quick-add row ── */}
      <View style={t.quickRow}>
        {[250, 500, 750].map(ml => (
          <Pressable
            key={ml}
            onPress={() => handleQuickAdd(ml)}
            style={({ pressed }) => [t.quickBtn, pressed && t.quickBtnActive]}
          >
            <Text style={t.quickBtnTxt}>+{ml}ml</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={handleUndo}
          style={({ pressed }) => [t.undoBtn, pressed && t.quickBtnActive, waterMl <= 0 && t.disabledBtn]}
        >
          <Text style={[t.undoBtnTxt, waterMl <= 0 && t.disabledTxt]}>↩</Text>
        </Pressable>
      </View>

    </View>
  );
}

// ─── Cup styles ───────────────────────────────────────────────────────────────
const cup = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  outer: {
    width: 40,
    alignItems: 'center',
  },
  glowRing: {
    position:     'absolute',
    width:        52,
    height:       52 + CUP_RIM_H,
    borderRadius: 18,
    borderWidth:  1.5,
    top:          0,
  },
  rim: {
    width:           40,
    height:          CUP_RIM_H,
    borderRadius:    3,
    backgroundColor: C.blueBorder,
    borderWidth:     1,
    borderColor:     C.blueBorder,
    zIndex:          2,
  },
  rimFilled: {
    backgroundColor: C.blue,
    borderColor:     C.blue,
  },
  body: {
    width:           40,
    height:          CUP_BODY_H,
    borderBottomLeftRadius:  14,
    borderBottomRightRadius: 14,
    borderTopLeftRadius:     2,
    borderTopRightRadius:    2,
    overflow:        'hidden',
    backgroundColor: C.bluePale,
    borderWidth:     1.5,
    borderTopWidth:  0,
    borderColor:     C.blueBorder,
  },
  bodyFilled: {
    borderColor: C.blue,
  },
  fill: {
    position: 'absolute',
    bottom:   0,
    left:     0,
    right:    0,
  },
  shine: {
    position:        'absolute',
    top:             0,
    bottom:          0,
    left:            6,
    width:           5,
    borderRadius:    3,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  wave: {
    position:        'absolute',
    left:            4,
    right:           4,
    height:          WAVE_H,
    borderRadius:    WAVE_H / 2,
    backgroundColor: C.blueLight + 'CC',
  },
  glare: {
    position:        'absolute',
    top:             3,
    left:            6,
    right:           6,
    height:          10,
    borderRadius:    5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  label: {
    marginTop: 5,
    fontSize:  10,
    fontWeight:'600',
    color:     C.sub,
    letterSpacing: 0.2,
  },
});

// ─── Tracker styles ───────────────────────────────────────────────────────────
const t = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius:    22,
    padding:         18,
    marginBottom:    14,
    borderWidth:     1,
    borderColor:     C.border,
    // Soft blue glow shadow
    shadowColor:     C.blue,
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.15,
    shadowRadius:    18,
    elevation:       8,
  },

  // Header
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   12,
  },
  sectionLabel: {
    color:         C.sub,
    fontSize:      10,
    fontWeight:    '800',
    letterSpacing: 1.3,
    marginBottom:  5,
  },
  counterRow: {
    flexDirection: 'row',
  },
  counterVal: {
    color:      C.text,
    fontSize:   28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  counterGoal: {
    color:      C.sub,
    fontSize:   14,
    fontWeight: '500',
    lineHeight: 36,
  },
  pctBadge: {
    backgroundColor: C.blue + '22',
    borderRadius:    20,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderWidth:     1,
    borderColor:     C.blue + '55',
    marginTop:       2,
  },
  pctBadgeDone: {
    backgroundColor: C.success + '22',
    borderColor:     C.success + '55',
  },
  pctTxt: {
    color:      C.blue,
    fontSize:   12,
    fontWeight: '800',
  },
  pctTxtDone: {
    color: C.success,
  },

  // Progress bar
  progressBg: {
    height:          5,
    backgroundColor: C.border,
    borderRadius:    3,
    overflow:        'hidden',
    marginBottom:    20,
  },
  progressFill: {
    height:          5,
    backgroundColor: C.blue,
    borderRadius:    3,
  },

  // Cup grid
  grid: {
    gap: 2,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Glasses sub-label
  glassesLabel: {
    color:         C.sub,
    fontSize:      11,
    fontWeight:    '500',
    textAlign:     'center',
    marginBottom:  16,
    marginTop:     2,
  },

  // Quick-add row
  quickRow: {
    flexDirection: 'row',
    gap:           8,
  },
  quickBtn: {
    flex:            1,
    backgroundColor: C.blue + '18',
    borderRadius:    12,
    paddingVertical: 11,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     C.blue + '35',
  },
  quickBtnActive: {
    backgroundColor: C.blue + '35',
  },
  quickBtnTxt: {
    color:      C.blue,
    fontSize:   13,
    fontWeight: '700',
  },
  undoBtn: {
    backgroundColor: C.border,
    borderRadius:    12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     C.sub + '40',
  },
  undoBtnTxt: {
    color:      C.sub,
    fontSize:   16,
    fontWeight: '700',
  },
  disabledBtn: { opacity: 0.35 },
  disabledTxt: { color: C.sub },
});
